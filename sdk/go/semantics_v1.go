package schemami

import (
	"fmt"
	"math/big"
	"strings"

	"github.com/dcsg/schemami/sdk/go/calculus"
	"golang.org/x/text/language"
)

const (
	minimumRecursiveDepth  = 64
	minimumSemanticObjects = 10000
)

type methodEntry struct {
	kind    string
	id      string
	pointer string
	object  map[string]any
}

func validateSemantics(doc map[string]any) error {
	contentLanguage, _ := doc["content_language"].(string)
	if _, err := language.Parse(contentLanguage); err != nil {
		return fmt.Errorf("content_language is not a well-formed BCP 47 tag: %w", err)
	}
	if err := validateOrigin(doc); err != nil {
		return err
	}
	if countProtocolObjects(doc) > minimumSemanticObjects {
		return fmt.Errorf("resource-limit: document exceeds %d semantic objects", minimumSemanticObjects)
	}

	collections := map[string]map[string]map[string]any{}
	for _, name := range []string{"parameters", "ingredients", "components", "preparations", "outputs", "techniques", "equipment", "formulas"} {
		items, err := namedCollection(doc, name)
		if err != nil {
			return err
		}
		collections[name] = items
	}

	if err := validateParameters(doc, collections["parameters"]); err != nil {
		return err
	}
	if err := validateIngredientAlternatives(doc); err != nil {
		return err
	}
	method, err := collectMethod(doc)
	if err != nil {
		return err
	}
	if err := validateMethod(doc, method, collections); err != nil {
		return err
	}
	if err := validateCompletionDepth(method); err != nil {
		return err
	}
	if err := validateFormulasV1(doc, collections); err != nil {
		return err
	}
	if err := validateActivationSites(doc, method, collections["parameters"]); err != nil {
		return err
	}
	if problems := calculus.ValidateReachableGraphs(doc); len(problems) > 0 {
		return fmt.Errorf("%s%s: reachable graph admission failed", problems[0].Type, problems[0].Pointer)
	}
	if err := validateSourcesAndEvidence(doc); err != nil {
		return err
	}
	return validateMeasurements(doc)
}

func validateCompletionDepth(method []methodEntry) error {
	type frame struct {
		value   map[string]any
		pointer string
		depth   int
	}
	for _, entry := range method {
		sites := []struct {
			value   any
			pointer string
		}{{entry.object["completion"], entry.pointer + "/completion"}}
		actions, _ := entry.object["actions"].([]any)
		for index, candidate := range actions {
			action := candidate.(map[string]any)
			sites = append(sites, struct {
				value   any
				pointer string
			}{action["completion"], fmt.Sprintf("%s/actions/%d/completion", entry.pointer, index)})
		}
		for _, site := range sites {
			root, present := site.value.(map[string]any)
			if !present {
				continue
			}
			stack := []frame{{value: root, pointer: site.pointer, depth: 1}}
			for len(stack) > 0 {
				current := stack[len(stack)-1]
				stack = stack[:len(stack)-1]
				if current.depth > minimumRecursiveDepth {
					return fmt.Errorf("resource-limit: %s exceeds %d recursive levels", current.pointer, minimumRecursiveDepth)
				}
				conditions, _ := current.value["conditions"].([]any)
				for index := len(conditions) - 1; index >= 0; index-- {
					stack = append(stack, frame{value: conditions[index].(map[string]any), pointer: fmt.Sprintf("%s/conditions/%d", current.pointer, index), depth: current.depth + 1})
				}
			}
		}
	}
	return nil
}

func countProtocolObjects(value any) int {
	count := 0
	stack := []any{value}
	for len(stack) > 0 {
		current := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		switch typed := current.(type) {
		case map[string]any:
			count++
			for name, child := range typed {
				if strings.HasPrefix(name, "x-") {
					continue
				}
				stack = append(stack, child)
			}
		case []any:
			stack = append(stack, typed...)
		}
	}
	return count
}

func validateParameters(doc map[string]any, parameters map[string]map[string]any) error {
	items, _ := doc["parameters"].([]any)
	for index, value := range items {
		parameter := value.(map[string]any)
		id, _ := parameter["id"].(string)
		switch parameter["kind"] {
		case "choice":
			seen := map[string]struct{}{}
			options, _ := parameter["options"].([]any)
			for optionIndex, candidate := range options {
				option := candidate.(map[string]any)
				optionID, _ := option["id"].(string)
				if _, duplicate := seen[optionID]; duplicate {
					return fmt.Errorf("parameters/%d/options/%d duplicates option id %q", index, optionIndex, optionID)
				}
				seen[optionID] = struct{}{}
			}
			if defaultID, present := parameter["default"].(string); present {
				if _, declared := seen[defaultID]; !declared {
					return fmt.Errorf("parameters/%d/default references undeclared option %q", index, defaultID)
				}
			}
		case "measurement":
			if defaultValue, present := parameter["default"].(map[string]any); present {
				declaredUnit, _ := parameter["unit"].(string)
				defaultUnit, _ := defaultValue["unit"].(string)
				if !calculus.UnitsCompatible(defaultUnit, declaredUnit) {
					return fmt.Errorf("parameters/%d/default/unit is incompatible with parameter %q", index, id)
				}
			}
		}
	}
	_ = parameters
	return nil
}

func validateIngredientAlternatives(doc map[string]any) error {
	items, _ := doc["ingredients"].([]any)
	for index, value := range items {
		ingredient := value.(map[string]any)
		alternatives, present := ingredient["alternatives"].(map[string]any)
		if !present {
			continue
		}
		seen := map[string]struct{}{}
		options, _ := alternatives["options"].([]any)
		for optionIndex, candidate := range options {
			option := candidate.(map[string]any)
			id, _ := option["id"].(string)
			if _, duplicate := seen[id]; duplicate {
				return fmt.Errorf("ingredients/%d/alternatives/options/%d duplicates option id %q", index, optionIndex, id)
			}
			seen[id] = struct{}{}
		}
		if defaultID, hasDefault := alternatives["default"].(string); hasDefault {
			if _, declared := seen[defaultID]; !declared {
				return fmt.Errorf("ingredients/%d/alternatives/default references undeclared option %q", index, defaultID)
			}
		}
	}
	return nil
}

func collectMethod(doc map[string]any) ([]methodEntry, error) {
	method, _ := doc["method"].(map[string]any)
	root, _ := method["sequence"].([]any)
	type frame struct {
		value   any
		pointer string
		depth   int
	}
	stack := make([]frame, 0, len(root))
	for index := len(root) - 1; index >= 0; index-- {
		stack = append(stack, frame{value: root[index], pointer: fmt.Sprintf("/method/sequence/%d", index), depth: 1})
	}
	entries := make([]methodEntry, 0)
	seen := map[string]string{}
	for len(stack) > 0 {
		current := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		if current.depth > minimumRecursiveDepth {
			return nil, fmt.Errorf("resource-limit: method exceeds %d recursive levels", minimumRecursiveDepth)
		}
		object := current.value.(map[string]any)
		kind, _ := object["kind"].(string)
		id, _ := object["id"].(string)
		if previous, duplicate := seen[id]; duplicate {
			return nil, fmt.Errorf("%s/id duplicates method-node id %q first declared at %s", current.pointer, id, previous)
		}
		seen[id] = current.pointer
		entries = append(entries, methodEntry{kind: kind, id: id, pointer: current.pointer, object: object})
		if kind == "section" {
			children, _ := object["sequence"].([]any)
			for index := len(children) - 1; index >= 0; index-- {
				stack = append(stack, frame{value: children[index], pointer: fmt.Sprintf("%s/sequence/%d", current.pointer, index), depth: current.depth + 1})
			}
		}
	}
	return entries, nil
}

func validateMethod(doc map[string]any, entries []methodEntry, collections map[string]map[string]map[string]any) error {
	steps := map[string]methodEntry{}
	for _, entry := range entries {
		if entry.kind == "step" {
			steps[entry.id] = entry
		}
	}
	for _, entry := range entries {
		if timing, present := entry.object["relative_timing"].(map[string]any); present {
			anchor, _ := timing["anchor_step"].(string)
			if _, exists := steps[anchor]; !exists {
				return fmt.Errorf("%s/relative_timing/anchor_step references undeclared step %q", entry.pointer, anchor)
			}
			if entry.kind == "step" {
				if anchor == entry.id {
					return fmt.Errorf("%s/relative_timing/anchor_step must not reference itself", entry.pointer)
				}
			}
		}
		if entry.kind != "step" {
			continue
		}
		after := stringArray(entry.object["after"])
		for _, dependency := range after {
			if dependency == entry.id {
				return fmt.Errorf("%s/after must not reference itself", entry.pointer)
			}
			if _, exists := steps[dependency]; !exists {
				return fmt.Errorf("%s/after references undeclared step %q", entry.pointer, dependency)
			}
		}
		if duration, present := entry.object["duration"]; present && calculus.ValidateDurationWindow(duration) != "" {
			return fmt.Errorf("%s/duration window is not ordered", entry.pointer)
		}
		if err := validateMethodReferences(entry, collections); err != nil {
			return err
		}
		if err := validateActions(entry, collections); err != nil {
			return err
		}
	}
	_ = doc
	return nil
}

func validateMethodReferences(entry methodEntry, collections map[string]map[string]map[string]any) error {
	for _, field := range []string{"uses", "produces"} {
		values, _ := entry.object[field].([]any)
		for index, value := range values {
			if err := validateResourceReference(value.(map[string]any), field, collections); err != nil {
				return fmt.Errorf("%s/%s/%d: %w", entry.pointer, field, index, err)
			}
		}
	}
	for _, field := range []string{"techniques", "equipment"} {
		for index, id := range stringArray(entry.object[field]) {
			if _, exists := collections[field][id]; !exists {
				return fmt.Errorf("%s/%s/%d references undeclared id %q", entry.pointer, field, index, id)
			}
		}
	}
	return nil
}

func validateActions(entry methodEntry, collections map[string]map[string]map[string]any) error {
	actions, _ := entry.object["actions"].([]any)
	stepUses := referenceSet(entry.object["uses"])
	stepProduces := referenceSet(entry.object["produces"])
	seen := map[string]struct{}{}
	for index, value := range actions {
		action := value.(map[string]any)
		id, _ := action["id"].(string)
		if _, duplicate := seen[id]; duplicate {
			return fmt.Errorf("%s/actions/%d duplicates action id %q", entry.pointer, index, id)
		}
		seen[id] = struct{}{}
		for _, field := range []string{"uses", "produces"} {
			values, _ := action[field].([]any)
			for referenceIndex, candidate := range values {
				reference := candidate.(map[string]any)
				if err := validateResourceReference(reference, field, collections); err != nil {
					return fmt.Errorf("%s/actions/%d/%s/%d: %w", entry.pointer, index, field, referenceIndex, err)
				}
				key := referenceKey(reference)
				parent := stepUses
				if field == "produces" {
					parent = stepProduces
				}
				if _, declared := parent[key]; !declared {
					return fmt.Errorf("%s/actions/%d/%s/%d is not declared by its containing step", entry.pointer, index, field, referenceIndex)
				}
			}
		}
		for _, field := range []string{"techniques", "equipment"} {
			for referenceIndex, reference := range stringArray(action[field]) {
				if _, exists := collections[field][reference]; !exists {
					return fmt.Errorf("%s/actions/%d/%s/%d references undeclared id %q", entry.pointer, index, field, referenceIndex, reference)
				}
			}
		}
	}
	return nil
}

func validateResourceReference(reference map[string]any, field string, collections map[string]map[string]map[string]any) error {
	kind, _ := reference["kind"].(string)
	id, _ := reference["id"].(string)
	collection := kind + "s"
	if kind == "preparation" {
		collection = "preparations"
	}
	if field == "produces" && kind == "output" {
		collection = "outputs"
	}
	if _, exists := collections[collection][id]; !exists {
		return fmt.Errorf("references undeclared %s id %q", kind, id)
	}
	return nil
}

func validateFormulasV1(doc map[string]any, collections map[string]map[string]map[string]any) error {
	formulas, _ := doc["formulas"].([]any)
	claimed := map[string]string{}
	for formulaIndex, value := range formulas {
		formula := value.(map[string]any)
		formulaID, _ := formula["id"].(string)
		terms, _ := formula["terms"].([]any)
		seen := map[string]struct{}{}
		basisKey := ""
		if basis, present := formula["basis"].(map[string]any); present {
			basisKey = referenceKey(basis)
			if err := validateInputReference(basis, collections); err != nil {
				return fmt.Errorf("formulas/%d/basis: %w", formulaIndex, err)
			}
		}
		basisIndex := -1
		for termIndex, candidate := range terms {
			term := candidate.(map[string]any)
			input := term["input"].(map[string]any)
			if err := validateInputReference(input, collections); err != nil {
				return fmt.Errorf("formulas/%d/terms/%d/input: %w", formulaIndex, termIndex, err)
			}
			key := referenceKey(input)
			if _, duplicate := seen[key]; duplicate {
				return fmt.Errorf("formulas/%d repeats input %s", formulaIndex, key)
			}
			seen[key] = struct{}{}
			if previous, duplicate := claimed[key]; duplicate {
				return fmt.Errorf("formulas/%d input %s is already owned by formula %q", formulaIndex, key, previous)
			}
			claimed[key] = formulaID
			kind, id := input["kind"].(string), input["id"].(string)
			if _, explicit := collections[kind+"s"][id]["quantity"]; explicit {
				return fmt.Errorf("formulas/%d input %s must not also carry explicit quantity", formulaIndex, key)
			}
			if key == basisKey {
				basisIndex = termIndex
			}
		}
		if formula["kind"] == "percentage" {
			if basisIndex < 0 {
				return fmt.Errorf("formulas/%d/basis must occur exactly once in terms", formulaIndex)
			}
			basisTerm := terms[basisIndex].(map[string]any)
			if basisTerm["percentage"] != "100" {
				return fmt.Errorf("formulas/%d/terms/%d/percentage must be 100 for the basis", formulaIndex, basisIndex)
			}
		}
	}
	components, _ := doc["components"].([]any)
	for index, value := range components {
		component := value.(map[string]any)
		key := "component\x00" + component["id"].(string)
		_, formulaAuthority := claimed[key]
		_, explicitAuthority := component["quantity"]
		if formulaAuthority == explicitAuthority {
			return fmt.Errorf("components/%d must have exactly one quantity authority", index)
		}
	}
	return nil
}

func validateInputReference(reference map[string]any, collections map[string]map[string]map[string]any) error {
	kind, _ := reference["kind"].(string)
	id, _ := reference["id"].(string)
	if _, exists := collections[kind+"s"][id]; !exists {
		return fmt.Errorf("references undeclared %s id %q", kind, id)
	}
	return nil
}

func validateActivationSites(doc map[string]any, method []methodEntry, parameters map[string]map[string]any) error {
	type site struct {
		value   any
		pointer string
	}
	sites := []site{}
	for _, collection := range []string{"ingredients", "components", "equipment"} {
		items, _ := doc[collection].([]any)
		for index, value := range items {
			object := value.(map[string]any)
			if activation, present := object["activation"]; present {
				sites = append(sites, site{activation, fmt.Sprintf("/%s/%d/activation", collection, index)})
			}
		}
	}
	for _, entry := range method {
		if activation, present := entry.object["activation"]; present {
			sites = append(sites, site{activation, entry.pointer + "/activation"})
		}
		actions, _ := entry.object["actions"].([]any)
		for index, value := range actions {
			action := value.(map[string]any)
			if activation, present := action["activation"]; present {
				sites = append(sites, site{activation, fmt.Sprintf("%s/actions/%d/activation", entry.pointer, index)})
			}
		}
	}
	for _, candidate := range sites {
		if err := validateActivation(candidate.value.(map[string]any), candidate.pointer, parameters, 1); err != nil {
			return err
		}
	}
	return nil
}

func validateActivation(activation map[string]any, pointer string, parameters map[string]map[string]any, depth int) error {
	if depth > minimumRecursiveDepth {
		return fmt.Errorf("resource-limit: %s exceeds %d recursive levels", pointer, minimumRecursiveDepth)
	}
	kind, _ := activation["kind"].(string)
	switch kind {
	case "choice_is", "toggle_is", "measurement_compare":
		parameterID, _ := activation["parameter"].(string)
		parameter, exists := parameters[parameterID]
		if !exists {
			return fmt.Errorf("%s/parameter references undeclared parameter %q", pointer, parameterID)
		}
		expected := map[string]string{"choice_is": "choice", "toggle_is": "toggle", "measurement_compare": "measurement"}[kind]
		if parameter["kind"] != expected {
			return fmt.Errorf("%s kind %s requires a %s parameter", pointer, kind, expected)
		}
		if kind == "choice_is" {
			optionID, _ := activation["option"].(string)
			if !choiceHasOption(parameter, optionID) {
				return fmt.Errorf("%s/option references undeclared option %q", pointer, optionID)
			}
		}
		if kind == "measurement_compare" {
			measurement := activation["measurement"].(map[string]any)
			if !calculus.UnitsCompatible(measurement["unit"].(string), parameter["unit"].(string)) {
				return fmt.Errorf("%s/measurement/unit is incompatible with parameter %q", pointer, parameterID)
			}
		}
	case "all", "any":
		conditions, _ := activation["conditions"].([]any)
		for index, value := range conditions {
			if err := validateActivation(value.(map[string]any), fmt.Sprintf("%s/conditions/%d", pointer, index), parameters, depth+1); err != nil {
				return err
			}
		}
	case "not":
		return validateActivation(activation["condition"].(map[string]any), pointer+"/condition", parameters, depth+1)
	}
	return nil
}

func validateMeasurements(doc map[string]any) error {
	type item struct {
		value   any
		pointer string
	}
	stack := []item{{doc, ""}}
	for len(stack) > 0 {
		current := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		switch typed := current.value.(type) {
		case map[string]any:
			kind, _ := typed["kind"].(string)
			if kind == "measured" || kind == "range" || kind == "open" {
				if err := validateQuantityUnit(typed, current.pointer); err != nil {
					return err
				}
				if err := validateQuantityRangeExact(typed, current.pointer); err != nil {
					return err
				}
			}
			for key, child := range typed {
				if strings.HasPrefix(key, "x-") {
					continue
				}
				stack = append(stack, item{child, current.pointer + "/" + escapePointerToken(key)})
			}
		case []any:
			for index, child := range typed {
				stack = append(stack, item{child, fmt.Sprintf("%s/%d", current.pointer, index)})
			}
		}
	}
	return nil
}

func validateQuantityRangeExact(quantity map[string]any, pointer string) error {
	if quantity["kind"] == "range" {
		minimum, _ := new(big.Rat).SetString(quantity["minimum"].(string))
		maximum, _ := new(big.Rat).SetString(quantity["maximum"].(string))
		if minimum.Cmp(maximum) > 0 {
			return fmt.Errorf("%s minimum exceeds maximum", pointer)
		}
	}
	return nil
}

func choiceHasOption(parameter map[string]any, optionID string) bool {
	options, _ := parameter["options"].([]any)
	for _, candidate := range options {
		if candidate.(map[string]any)["id"] == optionID {
			return true
		}
	}
	return false
}

func graphHasCycle(edges map[string][]string) bool {
	state := map[string]uint8{}
	var visit func(string) bool
	visit = func(node string) bool {
		if state[node] == 1 {
			return true
		}
		if state[node] == 2 {
			return false
		}
		state[node] = 1
		for _, child := range edges[node] {
			if visit(child) {
				return true
			}
		}
		state[node] = 2
		return false
	}
	for node := range edges {
		if visit(node) {
			return true
		}
	}
	return false
}

func stringArray(value any) []string {
	items, _ := value.([]any)
	result := make([]string, 0, len(items))
	for _, item := range items {
		result = append(result, item.(string))
	}
	return result
}

func referenceSet(value any) map[string]struct{} {
	items, _ := value.([]any)
	result := make(map[string]struct{}, len(items))
	for _, item := range items {
		result[referenceKey(item.(map[string]any))] = struct{}{}
	}
	return result
}

func referenceKey(reference map[string]any) string {
	return reference["kind"].(string) + "\x00" + reference["id"].(string)
}

func escapePointerToken(value string) string {
	return strings.NewReplacer("~", "~0", "/", "~1").Replace(value)
}
