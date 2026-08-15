package schemami

import (
	"encoding/json"

	"github.com/dcsg/schemami/sdk/go/calculus"
)

// OperationRequest is one of the six closed Recipe Calculus requests.
// Arguments contain only operation-specific data; admitted recipe bytes are
// supplied separately through OperationInput.
type OperationRequest struct {
	Operation string         `json:"operation"`
	Arguments map[string]any `json:"arguments"`
}

// OperationInput prevents callers from presenting an arbitrary map as an
// admitted recipe. Exactly one admitted handle is used by recipe operations;
// standalone convert_quantity uses neither.
type OperationInput struct {
	Recipe *AdmittedRecipe
	Bundle *AdmittedBundle
}

// Evaluate executes a closed Schemami v1 operation over admitted input.
// Invalid request shapes return a stable refusal rather than panicking.
func Evaluate(request OperationRequest, input OperationInput, budgets ResourceBudgets) (result calculus.Envelope) {
	defer func() {
		if recover() != nil {
			result = invalidOperation(request.Operation)
		}
	}()
	if !validOperationArguments(request.Operation, request.Arguments) {
		return invalidOperation(request.Operation)
	}
	if _, err := json.Marshal(request.Arguments); err != nil {
		return invalidOperation(request.Operation)
	}
	wire := map[string]any{"arguments": cloneObject(request.Arguments)}
	if request.Operation == "convert_quantity" {
		if input.Recipe != nil || input.Bundle != nil {
			return invalidOperation(request.Operation)
		}
	} else {
		if (input.Recipe == nil) == (input.Bundle == nil) {
			return invalidOperation(request.Operation)
		}
		if input.Recipe != nil {
			wire["recipe"] = input.Recipe.Value()
		} else {
			wire["bundle"] = input.Bundle.Value()
		}
	}
	return calculus.EvaluateRequestWithLimits(request.Operation, wire, calculus.EvaluationLimits{
		RecursiveLevels:            budgets.RecursiveLevels,
		SemanticOccurrences:        budgets.SemanticOccurrences,
		SelectedComponentInstances: budgets.SelectedComponentInstances,
	})
}

func invalidOperation(operation string) calculus.Envelope {
	return calculus.Envelope{Operation: operation, Status: "refused", Problems: []calculus.Problem{{
		Type: "https://schemami.dev/problems/invalid-operation-arguments",
	}}}
}

func validOperationArguments(operation string, arguments map[string]any) bool {
	if arguments == nil {
		return false
	}
	allowed := map[string]map[string]bool{
		"convert_quantity":  {"quantity": true, "target_unit": true},
		"resolve_selection": {"selections": true},
		"resolve_formula":   {"formula_id": true, "selections": true},
		"scale":             {"factor": true, "formula_target": true, "selections": true},
		"reading_order":     {"selections": true},
		"schedule":          {"selections": true},
	}
	fields, present := allowed[operation]
	if !present {
		return false
	}
	for field := range arguments {
		if !fields[field] {
			return false
		}
	}
	switch operation {
	case "convert_quantity":
		quantity := validMeasuredQuantity(arguments["quantity"])
		_, target := arguments["target_unit"].(string)
		return quantity && target
	case "resolve_formula":
		_, ok := arguments["formula_id"].(string)
		return ok && validSelections(arguments["selections"])
	case "scale":
		_, factor := arguments["factor"]
		_, target := arguments["formula_target"]
		if target {
			object, ok := arguments["formula_target"].(map[string]any)
			if !ok || !closedMap(object, map[string]bool{"formula_id": true, "quantity": true}) || stringValueLocal(object["formula_id"]) == "" || !validMeasuredQuantity(object["quantity"]) {
				return false
			}
		}
		return factor != target && validSelections(arguments["selections"])
	default:
		return validSelections(arguments["selections"])
	}
}

func validSelections(value any) bool {
	if value == nil {
		return true
	}
	selections, ok := value.([]any)
	if !ok {
		return false
	}
	for _, raw := range selections {
		selection, ok := raw.(map[string]any)
		if !ok || !closedMap(selection, map[string]bool{"component_path": true, "bindings": true, "alternatives": true}) {
			return false
		}
		path, ok := selection["component_path"].([]any)
		if !ok {
			return false
		}
		for _, id := range path {
			if _, ok := id.(string); !ok {
				return false
			}
		}
		if rawBindings, present := selection["bindings"]; present {
			bindings, ok := rawBindings.(map[string]any)
			if !ok {
				return false
			}
			for _, binding := range bindings {
				switch binding.(type) {
				case string, bool:
				default:
					if !validMeasuredQuantity(binding) {
						return false
					}
				}
			}
		}
		if rawAlternatives, present := selection["alternatives"]; present {
			alternatives, ok := rawAlternatives.(map[string]any)
			if !ok {
				return false
			}
			for _, option := range alternatives {
				if _, ok := option.(string); !ok {
					return false
				}
			}
		}
	}
	return true
}

func validMeasuredQuantity(value any) bool {
	quantity, ok := value.(map[string]any)
	if !ok || !closedMap(quantity, map[string]bool{"kind": true, "value": true, "unit": true}) || quantity["kind"] != "measured" {
		return false
	}
	_, valueOK := quantity["value"].(string)
	_, unitOK := quantity["unit"].(string)
	return valueOK && unitOK
}

func closedMap(value map[string]any, allowed map[string]bool) bool {
	for key := range value {
		if !allowed[key] {
			return false
		}
	}
	return true
}

func stringValueLocal(value any) string { result, _ := value.(string); return result }
