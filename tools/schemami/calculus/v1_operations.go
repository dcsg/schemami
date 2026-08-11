package calculus

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"math/big"
	"sort"
	"strconv"
	"strings"
	"unicode/utf16"
)

type operationContext struct {
	request               map[string]any
	root                  map[string]any
	bundle                map[string]any
	selections            map[string]map[string]any
	effective             map[string]map[string]effectiveValue
	effectiveAlternatives map[string]map[string]effectiveValue
	problems              []Problem
	operation             string
	requireAll            bool
	requireAlternates     bool
}

type effectiveValue struct {
	value  any
	source string
}

type methodNodeV1 struct {
	kind       string
	id         string
	object     map[string]any
	parentLive bool
	active     bool
	order      int
}

type exactFormulaQuantity struct {
	input   map[string]any
	value   rational
	unit    string
	active  bool
	pointer string
}

type formulaEvaluation struct {
	formula       map[string]any
	quantities    []exactFormulaQuantity
	authoredTotal rational
	selectedTotal rational
	unit          string
}

type exactInputQuantity struct {
	public Quantity
	exact  rational
	unit   string
}

// EvaluateRequest evaluates one accepted Schemami v1 operation request. The
// request is already structurally admitted by the caller; this function still
// refuses malformed operation arguments and never reads prose.
func EvaluateRequest(operation string, request map[string]any) Envelope {
	if operation == "convert_quantity" {
		arguments, _ := request["arguments"].(map[string]any)
		quantity := decodeQuantity(arguments["quantity"])
		target, _ := arguments["target_unit"].(string)
		return ConvertQuantity(quantity, target, "/arguments/quantity")
	}
	context, envelope := newOperationContext(operation, request)
	if envelope != nil {
		return *envelope
	}
	var result Envelope
	switch operation {
	case "resolve_selection":
		result = context.resolveSelection()
	case "resolve_formula":
		result = context.resolveFormula()
	case "scale":
		result = context.scale()
	case "reading_order":
		result = context.readingOrder(false)
	case "schedule":
		result = context.readingOrder(true)
	default:
		return refused(operation, "invalid-operation-arguments", "/operation")
	}
	if result.Status == "ok" {
		result.Evaluation = context.evaluation()
	}
	return result
}

func newOperationContext(operation string, request map[string]any) (*operationContext, *Envelope) {
	_, hasRecipe := request["recipe"]
	_, hasBundle := request["bundle"]
	if hasRecipe == hasBundle {
		envelope := refused(operation, "invalid-operation-arguments", "")
		return nil, &envelope
	}
	arguments, ok := request["arguments"].(map[string]any)
	if !ok {
		envelope := refused(operation, "invalid-operation-arguments", "/arguments")
		return nil, &envelope
	}
	context := &operationContext{
		request: request, selections: map[string]map[string]any{},
		effective: map[string]map[string]effectiveValue{}, effectiveAlternatives: map[string]map[string]effectiveValue{}, operation: operation,
		requireAll: operation == "resolve_selection", requireAlternates: operation == "resolve_selection",
	}
	if hasRecipe {
		context.root, ok = request["recipe"].(map[string]any)
		if !ok {
			envelope := refused(operation, "invalid-operation-arguments", "/recipe")
			return nil, &envelope
		}
	} else {
		context.bundle, ok = request["bundle"].(map[string]any)
		if !ok {
			envelope := refused(operation, "invalid-operation-arguments", "/bundle")
			return nil, &envelope
		}
		documents, _ := context.bundle["documents"].([]any)
		if len(documents) == 0 {
			envelope := refused(operation, "unresolved-reference", "/bundle/documents")
			return nil, &envelope
		}
		entry, _ := documents[0].(map[string]any)
		context.root, ok = entry["document"].(map[string]any)
		if !ok {
			envelope := refused(operation, "unresolved-reference", "/bundle/documents/0/document")
			return nil, &envelope
		}
	}
	selections, _ := arguments["selections"].([]any)
	for index, candidate := range selections {
		selection, ok := candidate.(map[string]any)
		if !ok {
			context.addProblem("invalid-binding", fmt.Sprintf("/arguments/selections/%d", index))
			continue
		}
		path := componentPathKey(selection["component_path"])
		if _, duplicate := context.selections[path]; duplicate {
			context.addProblem("invalid-binding", fmt.Sprintf("/arguments/selections/%d/component_path", index))
			continue
		}
		context.selections[path] = selection
	}
	if len(context.problems) > 0 {
		envelope := context.refusal()
		return nil, &envelope
	}
	context.validateSelectionArguments()
	if len(context.problems) > 0 {
		envelope := context.refusal()
		return nil, &envelope
	}
	return context, nil
}

func (context *operationContext) resolveSelection() Envelope {
	instances, problem := context.resolveSelectionInstance(context.root, "", map[string]bool{})
	if problem != nil {
		return Envelope{Operation: context.operation, Status: "refused", Problems: []Problem{*problem}}
	}
	if len(context.problems) > 0 {
		return context.refusal()
	}
	return Envelope{Operation: context.operation, Status: "ok", Result: map[string]any{"active_instances": instances}}
}

func (context *operationContext) resolveSelectionInstance(recipe map[string]any, path string, visiting map[string]bool) ([]any, *Problem) {
	reference := documentReference(recipe)
	if visiting[reference] {
		problem := Problem{Type: problemBase + "component-cycle", Pointer: "/bundle/documents"}
		return nil, &problem
	}
	visiting[reference] = true
	defer delete(visiting, reference)
	for _, parameter := range arrayObjects(recipe["parameters"]) {
		context.binding(path, parameter)
	}
	for _, ingredient := range arrayObjects(recipe["ingredients"]) {
		context.activeIn(recipe, path, ingredient)
		context.alternative(path, ingredient)
	}
	for _, component := range arrayObjects(recipe["components"]) {
		context.activeIn(recipe, path, component)
	}
	for _, equipment := range arrayObjects(recipe["equipment"]) {
		context.activeIn(recipe, path, equipment)
	}
	nodes := context.activeMethodIn(recipe, path)
	activeMethod := make([]any, 0)
	actions := make([]any, 0)
	for _, node := range nodes {
		if !node.active {
			continue
		}
		activeMethod = append(activeMethod, map[string]any{"kind": node.kind, "id": node.id})
		if node.kind == "step" {
			activeActions := context.activeActionsIn(recipe, path, node.object)
			if _, authored := node.object["actions"]; authored && len(activeActions) == 0 {
				context.addProblem("missing-fact", methodPointer(recipe, node.id)+"/actions")
			}
			if len(activeActions) > 0 {
				actions = append(actions, map[string]any{"step": node.id, "actions": activeActions})
			}
		}
	}
	instance := map[string]any{
		"component_path": pathArray(path),
		"recipe":         recipeIdentity(recipe),
		"ingredients":    activeIDsIn(context, recipe, path, recipe["ingredients"]),
		"components":     activeIDsIn(context, recipe, path, recipe["components"]),
		"equipment":      activeIDsIn(context, recipe, path, recipe["equipment"]),
		"method":         activeMethod,
		"actions":        actions,
	}
	result := []any{instance}
	for _, component := range arrayObjects(recipe["components"]) {
		if !context.activeIn(recipe, path, component) {
			continue
		}
		child, problem := context.bundleRecipe(component["recipe"].(map[string]any))
		if problem != nil {
			return nil, problem
		}
		childPath := joinComponentPath(path, stringValue(component["id"]))
		children, problem := context.resolveSelectionInstance(child, childPath, visiting)
		if problem != nil {
			return nil, problem
		}
		result = append(result, children...)
	}
	return result, nil
}

func (context *operationContext) resolveFormula() Envelope {
	arguments := context.request["arguments"].(map[string]any)
	formulaID, ok := arguments["formula_id"].(string)
	if !ok {
		return refused(context.operation, "invalid-operation-arguments", "/arguments/formula_id")
	}
	formula := findByID(context.root["formulas"], formulaID)
	if formula == nil {
		return refused(context.operation, "invalid-operation-arguments", "/arguments/formula_id")
	}
	evaluation, problem := context.evaluateFormula("", context.root, formula, integer(1))
	if problem != nil {
		return Envelope{Operation: context.operation, Status: "refused", Problems: []Problem{*problem}}
	}
	if evaluation == nil || evaluation.selectedTotal.numerator.Sign() == 0 {
		return Envelope{Operation: context.operation, Status: "not_applicable"}
	}
	quantities, problem := publicFormulaQuantities(evaluation.quantities, integer(1))
	if problem != nil {
		return Envelope{Operation: context.operation, Status: "refused", Problems: []Problem{*problem}}
	}
	result := Envelope{Operation: context.operation, Status: "ok", Result: map[string]any{"quantities": quantities}}
	formulaResult, problem := publicFormulaEvaluation("", evaluation, nil)
	if problem != nil {
		return Envelope{Operation: context.operation, Status: "refused", Problems: []Problem{*problem}}
	}
	result.FormulaEvaluations = []any{formulaResult}
	return result
}

func (context *operationContext) scale() Envelope {
	arguments := context.request["arguments"].(map[string]any)
	factorRaw, hasFactor := arguments["factor"].(string)
	target, hasTarget := arguments["formula_target"].(map[string]any)
	if hasFactor == hasTarget {
		return refused(context.operation, "invalid-operation-arguments", "/arguments")
	}
	factor := integer(1)
	if hasFactor {
		parsed, problem := parsePositiveDecimal(factorRaw)
		if problem != "" {
			return refused(context.operation, "invalid-operation-arguments", "/arguments/factor")
		}
		factor = parsed
	} else {
		formulaID, _ := target["formula_id"].(string)
		formula := findByID(context.root["formulas"], formulaID)
		if formula == nil {
			return refused(context.operation, "invalid-operation-arguments", "/arguments/formula_target/formula_id")
		}
		evaluation, problem := context.evaluateFormula("", context.root, formula, integer(1))
		if problem != nil {
			return Envelope{Operation: context.operation, Status: "refused", Problems: []Problem{*problem}}
		}
		if evaluation == nil || evaluation.selectedTotal.numerator.Sign() <= 0 {
			return refused(context.operation, "missing-fact", "/arguments/formula_target/formula_id")
		}
		quantity, ok := target["quantity"].(map[string]any)
		if !ok || quantity["kind"] != "measured" {
			return refused(context.operation, "unsupported-quantity-kind", "/arguments/formula_target/quantity")
		}
		value, code := parsePositiveDecimal(stringValue(quantity["value"]))
		if code != "" {
			return refused(context.operation, code, "/arguments/formula_target/quantity/value")
		}
		converted, code := convert(value, stringValue(quantity["unit"]), evaluation.unit)
		if code != "" {
			return refused(context.operation, code, "/arguments/formula_target/quantity/unit")
		}
		if anchorFixed(formula) && newIntCompare(converted, evaluation.selectedTotal) != 0 {
			return refused(context.operation, "invalid-operation-arguments", "/arguments/formula_target")
		}
		factor = converted.divide(evaluation.selectedTotal)
	}

	visiting := map[string]bool{documentReference(context.root): true}
	quantities, componentInstances, formulaResults, envelope := context.scaleRecipeInstance(context.root, "", factor, visiting)
	if envelope != nil {
		return *envelope
	}
	if len(context.problems) > 0 {
		return context.refusal()
	}
	if len(quantities) == 0 {
		return Envelope{Operation: context.operation, Status: "not_applicable"}
	}
	result := Envelope{Operation: context.operation, Status: "ok", Result: map[string]any{"quantities": quantities, "component_instances": componentInstances}}
	if len(formulaResults) > 0 {
		result.FormulaEvaluations = formulaResults
	}
	return result
}

func (context *operationContext) scaleRecipeInstance(recipe map[string]any, path string, factor rational, visiting map[string]bool) ([]any, []any, []any, *Envelope) {
	formulaValues := map[string]exactInputQuantity{}
	formulaResults := make([]any, 0)
	for _, formula := range arrayObjects(recipe["formulas"]) {
		evaluation, problem := context.evaluateFormula(path, recipe, formula, factor)
		if problem != nil {
			envelope := Envelope{Operation: context.operation, Status: "refused", Problems: []Problem{*problem}}
			return nil, nil, nil, &envelope
		}
		if evaluation == nil || evaluation.selectedTotal.numerator.Sign() == 0 {
			continue
		}
		appliedFactor := factor
		if anchorFixed(formula) {
			appliedFactor = integer(1)
		}
		for _, quantity := range evaluation.quantities {
			if !quantity.active {
				continue
			}
			exact := quantity.value.multiply(appliedFactor)
			formatted, code := formatCanonicalDecimal(exact)
			if code != "" {
				envelope := refused(context.operation, code, quantity.pointer)
				return nil, nil, nil, &envelope
			}
			formulaValues[referenceKeyV1(quantity.input)] = exactInputQuantity{public: Quantity{Kind: "measured", Value: formatted, Unit: quantity.unit}, exact: exact, unit: quantity.unit}
		}
		public, problem := publicFormulaEvaluation(path, evaluation, &appliedFactor)
		if problem != nil {
			envelope := Envelope{Operation: context.operation, Status: "refused", Problems: []Problem{*problem}}
			return nil, nil, nil, &envelope
		}
		formulaResults = append(formulaResults, public)
	}

	quantities := make([]any, 0)
	for index, ingredient := range arrayObjects(recipe["ingredients"]) {
		if !context.activeIn(recipe, path, ingredient) {
			continue
		}
		input := map[string]any{"kind": "ingredient", "id": ingredient["id"]}
		resolved, formulaOwned := formulaValues[referenceKeyV1(input)]
		if !formulaOwned {
			raw, present := ingredient["quantity"].(map[string]any)
			if !present {
				envelope := refused(context.operation, "missing-fact", fmt.Sprintf("/recipe/ingredients/%d/quantity", index))
				return nil, nil, nil, &envelope
			}
			quantity, problem := scaleQuantity(decodeQuantity(raw), factor, fmt.Sprintf("/recipe/ingredients/%d/quantity", index))
			if problem != nil {
				return nil, nil, nil, problem
			}
			resolved.public = quantity
			if raw["kind"] == "measured" {
				exact, _ := parseCanonicalDecimal(stringValue(raw["value"]))
				if raw["scaling"] != "fixed" {
					exact = exact.multiply(factor)
				}
				resolved.exact, resolved.unit = exact, stringValue(raw["unit"])
			}
		}
		quantities = append(quantities, map[string]any{"input": input, "quantity": resolved.public})
	}

	componentInstances := make([]any, 0)
	for index, component := range arrayObjects(recipe["components"]) {
		if !context.activeIn(recipe, path, component) {
			continue
		}
		input := map[string]any{"kind": "component", "id": component["id"]}
		resolved, formulaOwned := formulaValues[referenceKeyV1(input)]
		if !formulaOwned {
			raw, present := component["quantity"].(map[string]any)
			if !present {
				envelope := refused(context.operation, "missing-fact", fmt.Sprintf("/recipe/components/%d/quantity", index))
				return nil, nil, nil, &envelope
			}
			if raw["kind"] != "measured" {
				envelope := refused(context.operation, "unsupported-quantity-kind", fmt.Sprintf("/recipe/components/%d/quantity", index))
				return nil, nil, nil, &envelope
			}
			exact, code := parsePositiveDecimal(stringValue(raw["value"]))
			if code != "" {
				envelope := refused(context.operation, code, fmt.Sprintf("/recipe/components/%d/quantity/value", index))
				return nil, nil, nil, &envelope
			}
			if raw["scaling"] != "fixed" {
				exact = exact.multiply(factor)
			}
			formatted, code := formatCanonicalDecimal(exact)
			if code != "" {
				envelope := refused(context.operation, code, fmt.Sprintf("/recipe/components/%d/quantity/value", index))
				return nil, nil, nil, &envelope
			}
			resolved = exactInputQuantity{public: Quantity{Kind: "measured", Value: formatted, Unit: stringValue(raw["unit"]), Scaling: stringValue(raw["scaling"])}, exact: exact, unit: stringValue(raw["unit"])}
		}
		quantities = append(quantities, map[string]any{"input": input, "quantity": resolved.public})
		child, problem := context.bundleRecipe(component["recipe"].(map[string]any))
		if problem != nil {
			envelope := Envelope{Operation: context.operation, Status: "refused", Problems: []Problem{*problem}}
			return nil, nil, nil, &envelope
		}
		output := findByID(child["outputs"], stringValue(component["output"]))
		if output == nil {
			envelope := refused(context.operation, "unresolved-reference", fmt.Sprintf("/recipe/components/%d/output", index))
			return nil, nil, nil, &envelope
		}
		yield, present := output["yield"].(map[string]any)
		if !present || yield["kind"] != "measured" {
			envelope := refused(context.operation, "missing-fact", fmt.Sprintf("/recipe/components/%d/output", index))
			return nil, nil, nil, &envelope
		}
		yieldValue, code := parsePositiveDecimal(stringValue(yield["value"]))
		if code != "" {
			envelope := refused(context.operation, code, fmt.Sprintf("/recipe/components/%d/output", index))
			return nil, nil, nil, &envelope
		}
		required, code := convert(resolved.exact, resolved.unit, stringValue(yield["unit"]))
		if code != "" {
			envelope := refused(context.operation, code, fmt.Sprintf("/recipe/components/%d/quantity/unit", index))
			return nil, nil, nil, &envelope
		}
		childFactor := required.divide(yieldValue)
		childReference := documentReference(child)
		if visiting[childReference] {
			envelope := refused(context.operation, "component-cycle", fmt.Sprintf("/recipe/components/%d/recipe", index))
			return nil, nil, nil, &envelope
		}
		visiting[childReference] = true
		childPath := joinComponentPath(path, stringValue(component["id"]))
		childQuantities, nestedInstances, childFormulaResults, envelope := context.scaleRecipeInstance(child, childPath, childFactor, visiting)
		delete(visiting, childReference)
		if envelope != nil {
			return nil, nil, nil, envelope
		}
		instance := map[string]any{
			"component_path": pathArray(childPath),
			"recipe":         component["recipe"],
			"output":         component["output"],
			"quantity":       resolved.public,
			"quantities":     childQuantities,
		}
		componentInstances = append(componentInstances, instance)
		componentInstances = append(componentInstances, nestedInstances...)
		formulaResults = append(formulaResults, childFormulaResults...)
	}
	return quantities, componentInstances, formulaResults, nil
}

func (context *operationContext) bundleRecipe(reference map[string]any) (map[string]any, *Problem) {
	if context.bundle == nil {
		problem := Problem{Type: problemBase + "unresolved-reference", Pointer: "/recipe/components"}
		return nil, &problem
	}
	for _, entry := range arrayObjects(context.bundle["documents"]) {
		document, _ := entry["document"].(map[string]any)
		if document == nil || document["collection"] != reference["collection"] || document["id"] != reference["id"] || document["revision"] != reference["revision"] {
			continue
		}
		if digestJCS(document) != reference["sha256"] || entry["sha256"] != reference["sha256"] {
			problem := Problem{Type: problemBase + "unresolved-reference", Pointer: "/bundle/documents"}
			return nil, &problem
		}
		return document, nil
	}
	problem := Problem{Type: problemBase + "unresolved-reference", Pointer: "/bundle/documents"}
	return nil, &problem
}

func (context *operationContext) readingOrder(scheduleMode bool) Envelope {
	if scheduleMode {
		return context.composedSchedule()
	}
	return context.composedReadingOrder()
}

func (context *operationContext) flattenedReadingOrder(scheduleMode bool) Envelope {
	nodes := context.activeMethod("")
	steps := make([]Step, 0)
	for _, node := range nodes {
		if node.kind != "step" || !node.active {
			continue
		}
		if _, authored := node.object["actions"]; authored && len(context.activeActions("", node.object)) == 0 {
			context.addProblem("missing-fact", methodPointer(context.root, node.id)+"/actions")
			continue
		}
		after := make([]string, 0)
		for _, dependency := range stringSlice(node.object["after"]) {
			if methodNodeActive(nodes, dependency) {
				after = append(after, dependency)
			}
		}
		steps = append(steps, Step{ID: node.id, After: after, Duration: node.object["duration"]})
	}
	if len(context.problems) > 0 {
		return context.refusal()
	}
	if len(steps) == 0 {
		return refused(context.operation, "missing-fact", "/recipe/method/sequence")
	}
	if !scheduleMode {
		base := ReadingOrder(steps)
		base.Operation = context.operation
		if base.Status != "ok" {
			return base
		}
		ids := base.Result.(ReadingOrderResult).Steps
		result := make([]any, len(ids))
		for index, id := range ids {
			result[index] = map[string]any{"component_path": []any{}, "id": id}
		}
		return Envelope{Operation: context.operation, Status: "ok", Result: map[string]any{"steps": result, "unplaced_components": unconsumedComponents(context)}}
	}
	base := Schedule(steps)
	base.Operation = context.operation
	if base.Status != "ok" {
		return base
	}
	items := base.Result.(ScheduleResult).Steps
	result := make([]any, len(items))
	for index, item := range items {
		result[index] = map[string]any{"component_path": []any{}, "id": item.ID, "start": item.Start, "duration": item.Duration, "end": item.End}
	}
	return Envelope{Operation: context.operation, Status: "ok", Result: map[string]any{"steps": result, "unscheduled_components": unconsumedComponents(context)}}
}

func (context *operationContext) activeMethod(path string) []methodNodeV1 {
	return context.activeMethodIn(context.root, path)
}

func (context *operationContext) activeMethodIn(recipe map[string]any, path string) []methodNodeV1 {
	method, _ := recipe["method"].(map[string]any)
	sequence, _ := method["sequence"].([]any)
	type frame struct {
		object map[string]any
		parent bool
	}
	stack := make([]frame, 0, len(sequence))
	for index := len(sequence) - 1; index >= 0; index-- {
		stack = append(stack, frame{sequence[index].(map[string]any), true})
	}
	result := make([]methodNodeV1, 0)
	for len(stack) > 0 {
		current := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		active := current.parent && context.activeIn(recipe, path, current.object)
		node := methodNodeV1{kind: stringValue(current.object["kind"]), id: stringValue(current.object["id"]), object: current.object, parentLive: current.parent, active: active, order: len(result)}
		result = append(result, node)
		if node.kind == "section" {
			children, _ := current.object["sequence"].([]any)
			for index := len(children) - 1; index >= 0; index-- {
				stack = append(stack, frame{children[index].(map[string]any), active})
			}
		}
	}
	return result
}

func (context *operationContext) activeActions(path string, step map[string]any) []any {
	return context.activeActionsIn(context.root, path, step)
}

func (context *operationContext) activeActionsIn(recipe map[string]any, path string, step map[string]any) []any {
	result := []any{}
	for _, action := range arrayObjects(step["actions"]) {
		if context.activeIn(recipe, path, action) {
			result = append(result, action["id"])
		}
	}
	return result
}

func (context *operationContext) active(path string, object map[string]any) bool {
	return context.activeIn(context.root, path, object)
}

func (context *operationContext) activeIn(recipe map[string]any, path string, object map[string]any) bool {
	activation, present := object["activation"].(map[string]any)
	if !present {
		return true
	}
	active, known := context.evaluateActivationIn(recipe, path, activation)
	if !known {
		return false
	}
	return active
}

func (context *operationContext) evaluateActivation(path string, activation map[string]any) (bool, bool) {
	return context.evaluateActivationIn(context.root, path, activation)
}

func (context *operationContext) evaluateActivationIn(recipe map[string]any, path string, activation map[string]any) (bool, bool) {
	kind := stringValue(activation["kind"])
	switch kind {
	case "choice_is", "toggle_is", "measurement_compare":
		parameter := findByID(recipe["parameters"], stringValue(activation["parameter"]))
		if parameter == nil {
			context.addProblem("invalid-binding", "/arguments/selections")
			return false, false
		}
		value, ok := context.binding(path, parameter)
		if !ok {
			return false, false
		}
		switch kind {
		case "choice_is":
			return value == activation["option"], true
		case "toggle_is":
			return value == activation["enabled"], true
		default:
			bound, ok := value.(map[string]any)
			if !ok {
				context.addProblem("invalid-binding", "/arguments/selections")
				return false, false
			}
			measurement := activation["measurement"].(map[string]any)
			left, code := parseCanonicalDecimal(stringValue(bound["value"]))
			if code != "" {
				context.addProblem("invalid-binding", "/arguments/selections")
				return false, false
			}
			right, code := parseCanonicalDecimal(stringValue(measurement["value"]))
			if code != "" {
				context.addProblem(code, "/arguments/selections")
				return false, false
			}
			right, code = convert(right, stringValue(measurement["unit"]), stringValue(bound["unit"]))
			if code != "" {
				context.addProblem(code, "/arguments/selections")
				return false, false
			}
			cmp := newIntCompare(left, right)
			switch activation["operator"] {
			case "equal":
				return cmp == 0, true
			case "less_than":
				return cmp < 0, true
			case "less_than_or_equal":
				return cmp <= 0, true
			case "greater_than":
				return cmp > 0, true
			default:
				return cmp >= 0, true
			}
		}
	case "all", "any":
		values := arrayObjects(activation["conditions"])
		if kind == "all" {
			for _, condition := range values {
				value, known := context.evaluateActivationIn(recipe, path, condition)
				if !known {
					return false, false
				}
				if !value {
					return false, true
				}
			}
			return true, true
		}
		for _, condition := range values {
			value, known := context.evaluateActivationIn(recipe, path, condition)
			if !known {
				return false, false
			}
			if value {
				return true, true
			}
		}
		return false, true
	case "not":
		value, known := context.evaluateActivationIn(recipe, path, activation["condition"].(map[string]any))
		return !value, known
	}
	return false, false
}

func (context *operationContext) binding(path string, parameter map[string]any) (any, bool) {
	id := stringValue(parameter["id"])
	if _, present := context.effective[path]; !present {
		context.effective[path] = map[string]effectiveValue{}
	}
	if existing, present := context.effective[path][id]; present {
		return existing.value, true
	}
	selection := context.selections[path]
	bindings, _ := selection["bindings"].(map[string]any)
	if value, present := bindings[id]; present {
		context.effective[path][id] = effectiveValue{value, "argument"}
		return value, true
	}
	if value, present := parameter["default"]; present {
		context.effective[path][id] = effectiveValue{value, "default"}
		return value, true
	}
	context.addProblem("missing-binding", "/arguments/selections")
	return nil, false
}

func (context *operationContext) alternative(path string, ingredient map[string]any) (string, bool) {
	alternatives, present := ingredient["alternatives"].(map[string]any)
	if !present {
		return "", true
	}
	selection := context.selections[path]
	values, _ := selection["alternatives"].(map[string]any)
	id := stringValue(ingredient["id"])
	if _, present := context.effectiveAlternatives[path]; !present {
		context.effectiveAlternatives[path] = map[string]effectiveValue{}
	}
	if value, present := values[id].(string); present {
		context.effectiveAlternatives[path][id] = effectiveValue{value: value, source: "argument"}
		return value, true
	}
	if value, present := alternatives["default"].(string); present {
		context.effectiveAlternatives[path][id] = effectiveValue{value: value, source: "default"}
		return value, true
	}
	if context.requireAlternates {
		context.addProblem("missing-binding", "/arguments/selections")
		return "", false
	}
	return "", true
}

func (context *operationContext) evaluateFormula(path string, recipe, formula map[string]any, factor rational) (*formulaEvaluation, *Problem) {
	terms := arrayObjects(formula["terms"])
	quantities := make([]exactFormulaQuantity, len(terms))
	authored := integer(0)
	selected := integer(0)
	unit := ""
	if formula["kind"] == "ratio" {
		target, present := formula["target"].(map[string]any)
		if !present {
			problem := Problem{Type: problemBase + "missing-fact", Pointer: "/recipe/formulas/" + stringValue(formula["id"]) + "/target"}
			return nil, &problem
		}
		value, code := parsePositiveDecimal(stringValue(target["value"]))
		if code != "" {
			problem := Problem{Type: problemBase + code, Pointer: "/recipe/formulas"}
			return nil, &problem
		}
		unit = stringValue(target["unit"])
		parts := make([]rational, len(terms))
		total := integer(0)
		for index, term := range terms {
			part, code := parsePositiveDecimal(stringValue(term["parts"]))
			if code != "" {
				problem := Problem{Type: problemBase + code, Pointer: "/recipe/formulas"}
				return nil, &problem
			}
			parts[index] = part
			total = total.add(part)
		}
		for index, term := range terms {
			input := term["input"].(map[string]any)
			exact := value.multiply(parts[index]).divide(total)
			active := context.inputActive(path, recipe, input)
			quantities[index] = exactFormulaQuantity{input, exact, unit, active, "/recipe/formulas"}
			authored = authored.add(exact)
			if active {
				selected = selected.add(exact)
			}
		}
	} else {
		basisQuantity, present := formula["basis_quantity"].(map[string]any)
		if !present {
			problem := Problem{Type: problemBase + "missing-fact", Pointer: "/recipe/formulas/" + stringValue(formula["id"]) + "/basis_quantity"}
			return nil, &problem
		}
		basis, code := parsePositiveDecimal(stringValue(basisQuantity["value"]))
		if code != "" {
			problem := Problem{Type: problemBase + code, Pointer: "/recipe/formulas"}
			return nil, &problem
		}
		unit = stringValue(basisQuantity["unit"])
		basisRef := formula["basis"].(map[string]any)
		basisActive := context.inputActive(path, recipe, basisRef)
		for index, term := range terms {
			percentage, code := parsePositiveDecimal(stringValue(term["percentage"]))
			if code != "" {
				problem := Problem{Type: problemBase + code, Pointer: "/recipe/formulas"}
				return nil, &problem
			}
			input := term["input"].(map[string]any)
			exact := basis.multiply(percentage).divide(integer(100))
			active := context.inputActive(path, recipe, input)
			quantities[index] = exactFormulaQuantity{input, exact, unit, active, "/recipe/formulas"}
			authored = authored.add(exact)
			if active {
				selected = selected.add(exact)
			}
		}
		if !basisActive && selected.numerator.Sign() > 0 {
			problem := Problem{Type: problemBase + "inactive-reference", Pointer: "/recipe/formulas"}
			return nil, &problem
		}
	}
	if len(context.problems) > 0 {
		return nil, &context.problems[0]
	}
	_ = factor
	return &formulaEvaluation{formula, quantities, authored, selected, unit}, nil
}

func (context *operationContext) inputActive(path string, recipe map[string]any, input map[string]any) bool {
	object := findByID(recipe[stringValue(input["kind"])+"s"], stringValue(input["id"]))
	return object != nil && context.activeIn(recipe, path, object)
}

func publicFormulaQuantities(quantities []exactFormulaQuantity, factor rational) ([]any, *Problem) {
	result := []any{}
	for _, item := range quantities {
		if !item.active {
			continue
		}
		value, code := formatCanonicalDecimal(item.value.multiply(factor))
		if code != "" {
			problem := Problem{Type: problemBase + code, Pointer: item.pointer}
			return nil, &problem
		}
		result = append(result, map[string]any{"input": item.input, "quantity": Quantity{Kind: "measured", Value: value, Unit: item.unit}})
	}
	return result, nil
}

func publicFormulaEvaluation(path string, evaluation *formulaEvaluation, factor *rational) (map[string]any, *Problem) {
	authored, code := formatCanonicalDecimal(evaluation.authoredTotal)
	if code != "" {
		problem := Problem{Type: problemBase + code}
		return nil, &problem
	}
	selected, code := formatCanonicalDecimal(evaluation.selectedTotal)
	if code != "" {
		problem := Problem{Type: problemBase + code}
		return nil, &problem
	}
	result := map[string]any{"component_path": pathArray(path), "formula_id": evaluation.formula["id"], "authored_total": Quantity{Kind: "measured", Value: authored, Unit: evaluation.unit}, "selected_total": Quantity{Kind: "measured", Value: selected, Unit: evaluation.unit}}
	if factor != nil {
		scaled, code := formatCanonicalDecimal(evaluation.selectedTotal.multiply(*factor))
		if code != "" {
			problem := Problem{Type: problemBase + code}
			return nil, &problem
		}
		result["scaled_total"] = Quantity{Kind: "measured", Value: scaled, Unit: evaluation.unit}
	}
	return result, nil
}

func (context *operationContext) evaluation() map[string]any {
	result := map[string]any{"recipe": recipeIdentityWithDigest(context.root), "selections": context.effectiveSelection()}
	if context.bundle != nil {
		result["bundle_sha256"] = digestJCS(context.bundle)
	}
	return result
}

func (context *operationContext) effectiveSelection() []any {
	allPaths := map[string]struct{}{}
	for path := range context.effective {
		allPaths[path] = struct{}{}
	}
	for path := range context.effectiveAlternatives {
		allPaths[path] = struct{}{}
	}
	paths := make([]string, 0, len(allPaths))
	for path := range allPaths {
		paths = append(paths, path)
	}
	sort.Strings(paths)
	result := make([]any, 0, len(paths))
	for _, path := range paths {
		values := context.effective[path]
		bindings := []any{}
		recipe, _ := context.recipeForPath(path)
		for _, parameter := range arrayObjects(recipe["parameters"]) {
			id := stringValue(parameter["id"])
			if value, present := values[id]; present {
				bindings = append(bindings, map[string]any{"parameter": id, "value": value.value, "source": value.source})
			}
		}
		alternatives := []any{}
		for _, ingredient := range arrayObjects(recipe["ingredients"]) {
			id := stringValue(ingredient["id"])
			if value, present := context.effectiveAlternatives[path][id]; present {
				alternatives = append(alternatives, map[string]any{"ingredient": id, "option": value.value, "source": value.source})
			}
		}
		result = append(result, map[string]any{"component_path": pathArray(path), "bindings": bindings, "alternatives": alternatives})
	}
	return result
}

func (context *operationContext) validateSelectionArguments() {
	if len(context.selections) > 1024 {
		context.addProblem("resource-limit", "/arguments/selections")
		return
	}
	for path, selection := range context.selections {
		recipe, problem := context.recipeForPath(path)
		if problem != nil {
			context.problems = append(context.problems, *problem)
			continue
		}
		bindings, _ := selection["bindings"].(map[string]any)
		for id, value := range bindings {
			parameter := findByID(recipe["parameters"], id)
			if parameter == nil || !validBindingValue(parameter, value) {
				context.addProblem("invalid-binding", "/arguments/selections")
			}
		}
		alternatives, _ := selection["alternatives"].(map[string]any)
		for id, value := range alternatives {
			ingredient := findByID(recipe["ingredients"], id)
			declared, present := ingredient["alternatives"].(map[string]any)
			option, isString := value.(string)
			if ingredient == nil || !present || !isString || findByID(declared["options"], option) == nil {
				context.addProblem("invalid-binding", "/arguments/selections")
			}
		}
	}
}

func validBindingValue(parameter map[string]any, value any) bool {
	switch parameter["kind"] {
	case "choice":
		option, ok := value.(string)
		return ok && findByID(parameter["options"], option) != nil
	case "toggle":
		_, ok := value.(bool)
		return ok
	case "measurement":
		measurement, ok := value.(map[string]any)
		if !ok || measurement["kind"] != "measured" {
			return false
		}
		if _, code := parseCanonicalDecimal(stringValue(measurement["value"])); code != "" {
			return false
		}
		return UnitsCompatible(stringValue(measurement["unit"]), stringValue(parameter["unit"]))
	}
	return false
}

func (context *operationContext) recipeForPath(path string) (map[string]any, *Problem) {
	current := context.root
	if path == "" {
		return current, nil
	}
	for _, componentID := range strings.Split(path, "/") {
		component := findByID(current["components"], componentID)
		if component == nil {
			problem := Problem{Type: problemBase + "invalid-binding", Pointer: "/arguments/selections"}
			return nil, &problem
		}
		child, problem := context.bundleRecipe(component["recipe"].(map[string]any))
		if problem != nil {
			problem.Type = problemBase + "invalid-binding"
			problem.Pointer = "/arguments/selections"
			return nil, problem
		}
		current = child
	}
	return current, nil
}

func (context *operationContext) addProblem(code, pointer string) {
	for _, problem := range context.problems {
		if problem.Type == problemBase+code && problem.Pointer == pointer {
			return
		}
	}
	context.problems = append(context.problems, Problem{Type: problemBase + code, Pointer: pointer})
}
func (context *operationContext) refusal() Envelope {
	sort.Slice(context.problems, func(i, j int) bool {
		if context.problems[i].Pointer == context.problems[j].Pointer {
			return context.problems[i].Type < context.problems[j].Type
		}
		return context.problems[i].Pointer < context.problems[j].Pointer
	})
	return Envelope{Operation: context.operation, Status: "refused", Problems: context.problems}
}

func activeIDs(context *operationContext, path string, value any) []any {
	return activeIDsIn(context, context.root, path, value)
}
func activeIDsIn(context *operationContext, recipe map[string]any, path string, value any) []any {
	result := []any{}
	for _, object := range arrayObjects(value) {
		if context.activeIn(recipe, path, object) {
			result = append(result, object["id"])
		}
	}
	return result
}
func arrayObjects(value any) []map[string]any {
	items, _ := value.([]any)
	result := make([]map[string]any, 0, len(items))
	for _, item := range items {
		if object, ok := item.(map[string]any); ok {
			result = append(result, object)
		}
	}
	return result
}
func findByID(value any, id string) map[string]any {
	for _, item := range arrayObjects(value) {
		if item["id"] == id {
			return item
		}
	}
	return nil
}
func stringSlice(value any) []string {
	items, _ := value.([]any)
	result := make([]string, 0, len(items))
	for _, item := range items {
		if text, ok := item.(string); ok {
			result = append(result, text)
		}
	}
	return result
}
func stringValue(value any) string { text, _ := value.(string); return text }
func decodeQuantity(value any) Quantity {
	raw, _ := json.Marshal(value)
	var quantity Quantity
	_ = json.Unmarshal(raw, &quantity)
	return quantity
}
func referenceKeyV1(reference map[string]any) string {
	return stringValue(reference["kind"]) + "\x00" + stringValue(reference["id"])
}
func recipeIdentity(recipe map[string]any) map[string]any {
	return map[string]any{"collection": recipe["collection"], "id": recipe["id"], "revision": recipe["revision"], "sha256": digestJCS(recipe)}
}
func recipeIdentityWithDigest(recipe map[string]any) map[string]any { return recipeIdentity(recipe) }
func documentReference(recipe map[string]any) string {
	return fmt.Sprintf("%v\x00%v\x00%v\x00%s", recipe["collection"], recipe["id"], recipe["revision"], digestJCS(recipe))
}
func joinComponentPath(parent, child string) string {
	if parent == "" {
		return child
	}
	return parent + "/" + child
}
func anchorFixed(formula map[string]any) bool {
	if formula["kind"] == "ratio" {
		target, _ := formula["target"].(map[string]any)
		return target["scaling"] == "fixed"
	}
	basis, _ := formula["basis_quantity"].(map[string]any)
	return basis["scaling"] == "fixed"
}
func methodNodeActive(nodes []methodNodeV1, id string) bool {
	for _, node := range nodes {
		if node.id == id {
			return node.active
		}
	}
	return false
}
func methodPointer(recipe map[string]any, id string) string { return "/recipe/method/sequence" }
func componentPathKey(value any) string                     { parts := stringSlice(value); return strings.Join(parts, "/") }
func pathArray(path string) []any {
	if path == "" {
		return []any{}
	}
	parts := strings.Split(path, "/")
	result := make([]any, len(parts))
	for index, part := range parts {
		result[index] = part
	}
	return result
}
func unconsumedComponents(context *operationContext) []any {
	used := map[string]bool{}
	for _, node := range context.activeMethod("") {
		if !node.active || node.kind != "step" {
			continue
		}
		for _, reference := range arrayObjects(node.object["uses"]) {
			if reference["kind"] == "component" {
				used[stringValue(reference["id"])] = true
			}
		}
	}
	result := []any{}
	for _, component := range arrayObjects(context.root["components"]) {
		if context.active("", component) && !used[stringValue(component["id"])] {
			result = append(result, map[string]any{"component_path": []any{component["id"]}, "reason": "not-consumed"})
		}
	}
	return result
}

func newIntCompare(left, right rational) int {
	return new(big.Int).Mul(left.numerator, right.denominator).Cmp(new(big.Int).Mul(right.numerator, left.denominator))
}

func digestJCS(value any) string {
	encoded := canonicalJCS(value)
	digest := sha256.Sum256([]byte(encoded))
	return hex.EncodeToString(digest[:])
}
func canonicalJCS(value any) string {
	var output strings.Builder
	writeCanonical(&output, value)
	return output.String()
}
func writeCanonical(output *strings.Builder, value any) {
	switch typed := value.(type) {
	case nil:
		output.WriteString("null")
	case bool:
		output.WriteString(strconv.FormatBool(typed))
	case string:
		writeJCSStringV1(output, typed)
	case float64:
		output.WriteString(formatJCSNumberV1(typed))
	case int:
		output.WriteString(strconv.Itoa(typed))
	case int64:
		output.WriteString(strconv.FormatInt(typed, 10))
	case []any:
		output.WriteByte('[')
		for index, child := range typed {
			if index > 0 {
				output.WriteByte(',')
			}
			writeCanonical(output, child)
		}
		output.WriteByte(']')
	case map[string]any:
		keys := make([]string, 0, len(typed))
		for key := range typed {
			keys = append(keys, key)
		}
		sort.Slice(keys, func(i, j int) bool { return compareUTF16(keys[i], keys[j]) < 0 })
		output.WriteByte('{')
		for index, key := range keys {
			if index > 0 {
				output.WriteByte(',')
			}
			writeJCSStringV1(output, key)
			output.WriteByte(':')
			writeCanonical(output, typed[key])
		}
		output.WriteByte('}')
	default:
		raw, _ := json.Marshal(typed)
		var normalized any
		_ = json.Unmarshal(raw, &normalized)
		writeCanonical(output, normalized)
	}
}
func compareUTF16(left, right string) int {
	a, b := utf16.Encode([]rune(left)), utf16.Encode([]rune(right))
	for index := 0; index < len(a) && index < len(b); index++ {
		if a[index] < b[index] {
			return -1
		}
		if a[index] > b[index] {
			return 1
		}
	}
	if len(a) < len(b) {
		return -1
	}
	if len(a) > len(b) {
		return 1
	}
	return 0
}

func writeJCSStringV1(output *strings.Builder, value string) {
	output.WriteByte('"')
	for _, character := range value {
		switch character {
		case '"':
			output.WriteString(`\"`)
		case '\\':
			output.WriteString(`\\`)
		case '\b':
			output.WriteString(`\b`)
		case '\f':
			output.WriteString(`\f`)
		case '\n':
			output.WriteString(`\n`)
		case '\r':
			output.WriteString(`\r`)
		case '\t':
			output.WriteString(`\t`)
		default:
			if character < 0x20 {
				fmt.Fprintf(output, `\u%04x`, character)
			} else {
				output.WriteRune(character)
			}
		}
	}
	output.WriteByte('"')
}

func formatJCSNumberV1(value float64) string {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return "null"
	}
	if value == 0 {
		return "0"
	}
	scientific := strconv.FormatFloat(value, 'e', -1, 64)
	parts := strings.SplitN(scientific, "e", 2)
	exponent, _ := strconv.Atoi(parts[1])
	mantissa, sign := parts[0], ""
	if strings.HasPrefix(mantissa, "-") {
		sign, mantissa = "-", mantissa[1:]
	}
	digits := strings.ReplaceAll(mantissa, ".", "")
	if exponent >= 21 || exponent <= -7 {
		result := sign + digits[:1]
		if len(digits) > 1 {
			result += "." + digits[1:]
		}
		if exponent >= 0 {
			return result + "e+" + strconv.Itoa(exponent)
		}
		return result + "e" + strconv.Itoa(exponent)
	}
	if exponent >= 0 {
		if len(digits) <= exponent+1 {
			return sign + digits + strings.Repeat("0", exponent+1-len(digits))
		}
		return sign + digits[:exponent+1] + "." + digits[exponent+1:]
	}
	return sign + "0." + strings.Repeat("0", -exponent-1) + digits
}
