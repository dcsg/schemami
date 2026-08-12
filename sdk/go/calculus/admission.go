package calculus

import (
	"fmt"
	"math/big"
	"sort"
	"strings"
)

// ValidateReachableGraphs proves graph invariants for every distinct active
// graph induced by the recipe's finite choice/toggle/measurement predicates.
// Equivalent graphs are checked once. Resource exhaustion is explicit.
func ValidateReachableGraphs(recipe map[string]any) []Problem {
	return ValidateReachableGraphsWithBudgets(recipe, NewAdmissionBudget(10000, 10000))
}

// AdmissionBudget keeps request-scoped semantic-occurrence and implementation
// analysis-state counters. One budget may be shared by every document in a
// bundle so no embedded document resets either limit.
type AdmissionBudget struct {
	semanticLimit int
	analysisLimit int
	semanticUsed  int
	analysisUsed  int
}

func NewAdmissionBudget(semanticOccurrences, analysisStates int) *AdmissionBudget {
	return &AdmissionBudget{semanticLimit: semanticOccurrences, analysisLimit: analysisStates}
}

// ConsumeSemanticOccurrences charges registered protocol objects evaluated
// during static admission or in one completed deduplicated active graph.
func (budget *AdmissionBudget) ConsumeSemanticOccurrences(count int) bool {
	if budget == nil || count < 0 || budget.semanticLimit < 1 || count > budget.semanticLimit-budget.semanticUsed {
		return false
	}
	budget.semanticUsed += count
	return true
}

func (budget *AdmissionBudget) consumeAnalysisState() bool {
	if budget == nil || budget.analysisLimit < 1 || budget.analysisUsed >= budget.analysisLimit {
		return false
	}
	budget.analysisUsed++
	return true
}

// ValidateReachableGraphsWithBudget is retained for callers of the initial Go
// release-candidate API. New code should provide both independent limits.
func ValidateReachableGraphsWithBudget(recipe map[string]any, semanticOccurrences int) []Problem {
	return ValidateReachableGraphsWithBudgets(recipe, NewAdmissionBudget(semanticOccurrences, semanticOccurrences))
}

// ValidateReachableGraphsWithBudgets performs graph admission with independent
// counters for normative semantic occurrences and internal analysis states.
func ValidateReachableGraphsWithBudgets(recipe map[string]any, budget *AdmissionBudget) []Problem {
	if budget == nil || budget.semanticLimit < 1 || budget.analysisLimit < 1 {
		return []Problem{{Type: problemBase + "resource-limit", Pointer: ""}}
	}
	usedParameters := activationParameterIDs(recipe)
	parameters := []map[string]any{}
	for _, parameter := range arrayObjects(recipe["parameters"]) {
		if usedParameters[stringValue(parameter["id"])] {
			parameters = append(parameters, parameter)
		}
	}
	candidates := make([][]any, len(parameters))
	for index, parameter := range parameters {
		candidates[index] = parameterCandidates(recipe, parameter)
		if len(candidates[index]) == 0 {
			return []Problem{{Type: problemBase + "invalid-document", Pointer: "/parameters"}}
		}
	}
	objectCount := semanticObjectCount(recipe)
	if objectCount == 0 {
		objectCount = 1
	}

	alternatives := map[string]any{}
	for _, ingredient := range arrayObjects(recipe["ingredients"]) {
		declared, present := ingredient["alternatives"].(map[string]any)
		if !present {
			continue
		}
		if value, present := declared["default"].(string); present {
			alternatives[stringValue(ingredient["id"])] = value
		} else {
			options := arrayObjects(declared["options"])
			alternatives[stringValue(ingredient["id"])] = options[0]["id"]
		}
	}

	distinct := map[string]struct{}{}
	partialStates := map[string]struct{}{}
	bindings := map[string]any{}
	problems := []Problem{}
	var explore func(int) bool
	explore = func(index int) bool {
		state := fmt.Sprintf("%d|%s", index, residualActivationSignature(recipe, bindings))
		if _, duplicate := partialStates[state]; duplicate {
			return true
		}
		partialStates[state] = struct{}{}
		if !budget.consumeAnalysisState() {
			problems = append(problems, Problem{Type: problemBase + "resource-limit"})
			return false
		}
		if index < len(parameters) {
			id := stringValue(parameters[index]["id"])
			for _, candidate := range candidates[index] {
				bindings[id] = candidate
				if !explore(index + 1) {
					return false
				}
			}
			delete(bindings, id)
			return true
		}
		selection := map[string]any{
			"component_path": []any{},
			"bindings":       cloneMap(bindings),
			"alternatives":   alternatives,
		}
		context, envelope := newOperationContext("resolve_selection", map[string]any{
			"recipe":    recipe,
			"arguments": map[string]any{"selections": []any{selection}},
		}, EvaluationLimits{RecursiveLevels: 64, SelectedComponentInstances: 1024})
		if envelope != nil {
			problems = append(problems, envelope.Problems...)
			return true
		}
		nodes := context.activeMethod("")
		signature := activeGraphSignature(context, nodes)
		if _, duplicate := distinct[signature]; duplicate {
			return true
		}
		if !budget.ConsumeSemanticOccurrences(objectCount) {
			problems = append(problems, Problem{Type: problemBase + "resource-limit"})
			return false
		}
		distinct[signature] = struct{}{}
		problems = append(problems, validateActiveGraph(context, nodes)...)
		return true
	}
	explore(0)
	return normalizeProblems(problems)
}

// residualActivationSignature substitutes the bindings already chosen into
// every normative activation and simplifies the remaining Boolean expression.
// Equal residuals have exactly the same future activation behavior, so only
// one of them needs exploration. This avoids exponential work for equivalent
// regions without skipping genuinely different reachable graphs.
func residualActivationSignature(recipe map[string]any, bindings map[string]any) string {
	parts := []string{}
	for _, activation := range normativeActivations(recipe) {
		parts = append(parts, residualActivation(activation, bindings))
	}
	return strings.Join(parts, ";")
}

func residualActivation(activation map[string]any, bindings map[string]any) string {
	kind := stringValue(activation["kind"])
	if kind == "choice_is" || kind == "toggle_is" || kind == "measurement_compare" {
		parameter := stringValue(activation["parameter"])
		value, bound := bindings[parameter]
		if !bound {
			switch kind {
			case "choice_is":
				return "choice(" + parameter + "=" + stringValue(activation["option"]) + ")"
			case "toggle_is":
				if activation["enabled"] == false {
					return "!toggle(" + parameter + ")"
				}
				return "toggle(" + parameter + ")"
			default:
				measurement, _ := activation["measurement"].(map[string]any)
				return "measure(" + parameter + "," + stringValue(activation["operator"]) + "," + stringValue(measurement["value"]) + "," + stringValue(measurement["unit"]) + ")"
			}
		}
		matches, known := residualLeafValue(kind, value, activation)
		if !known {
			return "invalid"
		}
		if matches {
			return "1"
		}
		return "0"
	}
	if kind == "not" {
		condition, _ := activation["condition"].(map[string]any)
		value := residualActivation(condition, bindings)
		if value == "1" {
			return "0"
		}
		if value == "0" {
			return "1"
		}
		if strings.HasPrefix(value, "!") {
			return strings.TrimPrefix(value, "!")
		}
		return "!(" + value + ")"
	}
	if kind == "all" || kind == "any" {
		identity, absorbing := "1", "0"
		if kind == "any" {
			identity, absorbing = "0", "1"
		}
		children := []string{}
		seen := map[string]struct{}{}
		for _, condition := range arrayObjects(activation["conditions"]) {
			value := residualActivation(condition, bindings)
			if value == absorbing {
				return absorbing
			}
			if value == identity {
				continue
			}
			if _, duplicate := seen[value]; !duplicate {
				seen[value] = struct{}{}
				children = append(children, value)
			}
		}
		if len(children) == 0 {
			return identity
		}
		if len(children) == 1 {
			return children[0]
		}
		sort.Strings(children)
		return kind + "(" + strings.Join(children, ",") + ")"
	}
	return "invalid"
}

func residualLeafValue(kind string, value any, activation map[string]any) (bool, bool) {
	switch kind {
	case "choice_is":
		return value == activation["option"], true
	case "toggle_is":
		return value == activation["enabled"], true
	case "measurement_compare":
		bound, ok := value.(map[string]any)
		measurement, measurementOK := activation["measurement"].(map[string]any)
		if !ok || !measurementOK {
			return false, false
		}
		left, code := parseCanonicalDecimal(stringValue(bound["value"]))
		if code != "" {
			return false, false
		}
		right, code := parseCanonicalDecimal(stringValue(measurement["value"]))
		if code != "" {
			return false, false
		}
		right, code = convert(right, stringValue(measurement["unit"]), stringValue(bound["unit"]))
		if code != "" {
			return false, false
		}
		comparison := newIntCompare(left, right)
		switch activation["operator"] {
		case "equal":
			return comparison == 0, true
		case "less_than":
			return comparison < 0, true
		case "less_than_or_equal":
			return comparison <= 0, true
		case "greater_than":
			return comparison > 0, true
		case "greater_than_or_equal":
			return comparison >= 0, true
		}
	}
	return false, false
}

// Parameters that cannot affect an activation site use their authored
// defaults and do not create distinct reachable graphs. Pruning them before
// region enumeration prevents an otherwise unbounded 2^N no-op search.
func activationParameterIDs(recipe map[string]any) map[string]bool {
	result := map[string]bool{}
	stack := make([]any, 0)
	for _, activation := range normativeActivations(recipe) {
		stack = append(stack, activation)
	}
	for len(stack) > 0 {
		current := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		switch typed := current.(type) {
		case map[string]any:
			if kind := stringValue(typed["kind"]); kind == "choice_is" || kind == "toggle_is" || kind == "measurement_compare" {
				if parameter := stringValue(typed["parameter"]); parameter != "" {
					result[parameter] = true
				}
			}
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
	return result
}

// normativeActivations returns only activation expressions in protocol-owned
// fields. Extension values are opaque and must never influence admission work.
func normativeActivations(recipe map[string]any) []map[string]any {
	result := []map[string]any{}
	appendObjectActivation := func(object map[string]any) {
		if activation, ok := object["activation"].(map[string]any); ok {
			result = append(result, activation)
		}
	}
	for _, collection := range []string{"ingredients", "components", "equipment"} {
		for _, object := range arrayObjects(recipe[collection]) {
			appendObjectActivation(object)
		}
	}
	method, _ := recipe["method"].(map[string]any)
	stack := arrayObjects(method["sequence"])
	for len(stack) > 0 {
		node := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		appendObjectActivation(node)
		for _, action := range arrayObjects(node["actions"]) {
			appendObjectActivation(action)
		}
		stack = append(stack, arrayObjects(node["sequence"])...)
	}
	return result
}

func parameterCandidates(recipe map[string]any, parameter map[string]any) []any {
	switch parameter["kind"] {
	case "choice":
		result := []any{}
		for _, option := range arrayObjects(parameter["options"]) {
			result = append(result, option["id"])
		}
		return result
	case "toggle":
		return []any{false, true}
	case "measurement":
		id := stringValue(parameter["id"])
		thresholds := measurementThresholds(recipe, id)
		if len(thresholds) == 0 {
			if value, present := parameter["default"]; present {
				return []any{value}
			}
			return []any{map[string]any{"kind": "measured", "value": "0", "unit": parameter["unit"]}}
		}
		result := []any{}
		seen := map[string]struct{}{}
		for _, threshold := range thresholds {
			value, code := parseCanonicalDecimal(stringValue(threshold["value"]))
			if code != "" {
				continue
			}
			unit := stringValue(threshold["unit"])
			for _, candidate := range []rational{
				value.subtract(newRational(big.NewInt(1), big.NewInt(10000))),
				value,
				value.add(newRational(big.NewInt(1), big.NewInt(10000))),
			} {
				formatted, code := formatCanonicalDecimal(candidate)
				if code != "" {
					continue
				}
				key := unit + "\x00" + formatted
				if _, duplicate := seen[key]; duplicate {
					continue
				}
				seen[key] = struct{}{}
				result = append(result, map[string]any{"kind": "measured", "value": formatted, "unit": unit})
			}
		}
		return result
	}
	return nil
}

func measurementThresholds(recipe map[string]any, parameter string) []map[string]any {
	result := []map[string]any{}
	stack := make([]any, 0)
	for _, activation := range normativeActivations(recipe) {
		stack = append(stack, activation)
	}
	for len(stack) > 0 {
		current := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		switch typed := current.(type) {
		case map[string]any:
			if typed["kind"] == "measurement_compare" && typed["parameter"] == parameter {
				if measurement, ok := typed["measurement"].(map[string]any); ok {
					result = append(result, measurement)
				}
			}
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
	return result
}

func activeGraphSignature(context *operationContext, nodes []methodNodeV1) string {
	parts := []string{}
	for _, collection := range []string{"ingredients", "components", "equipment"} {
		for _, object := range arrayObjects(context.root[collection]) {
			if context.active("", object) {
				parts = append(parts, collection+":"+stringValue(object["id"]))
			}
		}
	}
	for _, node := range nodes {
		if !node.active {
			continue
		}
		parts = append(parts, "node:"+node.kind+":"+node.id)
		for _, action := range context.activeActions("", node.object) {
			parts = append(parts, "action:"+node.id+":"+stringValue(action))
		}
		for _, field := range []string{"after", "uses", "produces"} {
			parts = append(parts, graphReferenceParts(node, field, nodes)...)
		}
	}
	for _, formula := range arrayObjects(context.root["formulas"]) {
		for _, term := range arrayObjects(formula["terms"]) {
			input := term["input"].(map[string]any)
			if context.inputActive("", context.root, input) {
				parts = append(parts, "formula:"+stringValue(formula["id"])+":"+referenceKeyV1(input))
			}
		}
	}
	return strings.Join(parts, "|")
}

func graphReferenceParts(node methodNodeV1, field string, nodes []methodNodeV1) []string {
	result := []string{}
	if field == "after" {
		for _, id := range stringSlice(node.object[field]) {
			if methodNodeActive(nodes, id) {
				result = append(result, "after:"+id+">"+node.id)
			}
		}
		return result
	}
	for _, reference := range arrayObjects(node.object[field]) {
		result = append(result, field+":"+node.id+":"+referenceKeyV1(reference))
	}
	return result
}

func validateActiveGraph(context *operationContext, nodes []methodNodeV1) []Problem {
	problems := []Problem{}
	activeSteps := []Step{}
	activeResources := map[string]bool{}
	for _, collection := range []string{"ingredients", "components", "equipment"} {
		kind := strings.TrimSuffix(collection, "s")
		for _, object := range arrayObjects(context.root[collection]) {
			if context.active("", object) {
				activeResources[kind+"\x00"+stringValue(object["id"])] = true
			}
		}
	}
	for _, preparation := range arrayObjects(context.root["preparations"]) {
		activeResources["preparation\x00"+stringValue(preparation["id"])] = true
	}
	for _, output := range arrayObjects(context.root["outputs"]) {
		activeResources["output\x00"+stringValue(output["id"])] = true
	}
	producers := map[string]int{}
	consumers := map[string]int{}
	timingEdges := map[string][]string{}
	for _, node := range nodes {
		if !node.active {
			continue
		}
		if timing, present := node.object["relative_timing"].(map[string]any); present {
			anchor := stringValue(timing["anchor_step"])
			if !methodNodeActive(nodes, anchor) {
				problems = append(problems, Problem{Type: problemBase + "inactive-reference", Pointer: "/method"})
			} else if timing["relation"] == "before" {
				timingEdges[node.id] = append(timingEdges[node.id], anchor)
			} else {
				timingEdges[anchor] = append(timingEdges[anchor], node.id)
			}
		}
		if node.kind != "step" {
			continue
		}
		actions := context.activeActions("", node.object)
		if _, authored := node.object["actions"]; authored && len(actions) == 0 {
			problems = append(problems, Problem{Type: problemBase + "missing-fact", Pointer: "/method"})
		}
		after := []string{}
		for _, dependency := range stringSlice(node.object["after"]) {
			if methodNodeActive(nodes, dependency) {
				after = append(after, dependency)
				timingEdges[dependency] = append(timingEdges[dependency], node.id)
			}
		}
		activeSteps = append(activeSteps, Step{ID: node.id, After: after})
		for _, field := range []string{"uses", "produces"} {
			for _, reference := range arrayObjects(node.object[field]) {
				key := referenceKeyV1(reference)
				if !activeResources[key] {
					problems = append(problems, Problem{Type: problemBase + "inactive-reference", Pointer: "/method"})
					continue
				}
				if field == "produces" {
					producers[key]++
				} else if reference["kind"] == "preparation" {
					consumers[key]++
				}
			}
		}
	}
	if result := ReadingOrder(activeSteps); result.Status != "ok" {
		problems = append(problems, Problem{Type: problemBase + "dependency-cycle", Pointer: "/method"})
	}
	if stringGraphCycle(timingEdges) {
		problems = append(problems, Problem{Type: problemBase + "relative-timing-conflict", Pointer: "/method"})
	}
	for key, count := range producers {
		if count > 1 {
			problems = append(problems, Problem{Type: problemBase + "multiple-producers", Pointer: resourcePointer(key)})
		}
	}
	for key := range consumers {
		if producers[key] == 0 {
			problems = append(problems, Problem{Type: problemBase + "missing-producer", Pointer: resourcePointer(key)})
		}
	}
	return normalizeProblems(problems)
}

func normalizeProblems(problems []Problem) []Problem {
	seen := map[string]struct{}{}
	result := make([]Problem, 0, len(problems))
	for _, problem := range problems {
		key := problem.Pointer + "\x00" + problem.Type
		if _, duplicate := seen[key]; duplicate {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, problem)
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].Pointer == result[j].Pointer {
			return result[i].Type < result[j].Type
		}
		return result[i].Pointer < result[j].Pointer
	})
	return result
}

func semanticObjectCount(value any) int {
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

func cloneMap(value map[string]any) map[string]any {
	result := make(map[string]any, len(value))
	for key, child := range value {
		result[key] = child
	}
	return result
}

func stringGraphCycle(edges map[string][]string) bool {
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

func resourcePointer(key string) string {
	parts := strings.SplitN(key, "\x00", 2)
	collection := parts[0] + "s"
	if parts[0] == "equipment" {
		collection = "equipment"
	} else if parts[0] == "preparation" {
		collection = "preparations"
	}
	return fmt.Sprintf("/%s/%s", collection, parts[1])
}
