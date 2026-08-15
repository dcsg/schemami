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
	parameters := arrayObjects(recipe["parameters"])
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
	graphBudget := 10000 / objectCount
	if graphBudget < 1 {
		return []Problem{{Type: problemBase + "resource-limit", Pointer: ""}}
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
	bindings := map[string]any{}
	problems := []Problem{}
	var explore func(int) bool
	explore = func(index int) bool {
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
		})
		if envelope != nil {
			problems = append(problems, envelope.Problems...)
			return true
		}
		nodes := context.activeMethod("")
		signature := activeGraphSignature(context, nodes)
		if _, duplicate := distinct[signature]; duplicate {
			return true
		}
		if len(distinct) >= graphBudget {
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

func measurementThresholds(value any, parameter string) []map[string]any {
	result := []map[string]any{}
	stack := []any{value}
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
			for _, child := range typed {
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
			for _, child := range typed {
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
