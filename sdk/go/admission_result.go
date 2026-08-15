package schemami

import (
	"fmt"
	"sort"
	"strings"

	"github.com/dcsg/schemami/sdk/go/calculus"
	"golang.org/x/text/language"
)

const stableProblemBase = "https://schemami.dev/problems/"

func stableAdmissionProblems(document map[string]any, schemaError error) []calculus.Problem {
	budget := calculus.NewAdmissionBudget(minimumSemanticObjects, minimumSemanticObjects)
	return stableAdmissionProblemsWithBudget(document, schemaError, budget, true, minimumRecursiveDepth)
}

func stableAdmissionProblemsWithBudget(document map[string]any, schemaError error, budget *calculus.AdmissionBudget, chargeStatic bool, recursiveLevels int) []calculus.Problem {
	if schemaError != nil {
		return []calculus.Problem{{Type: stableProblemBase + "invalid-document"}}
	}
	if chargeStatic && !budget.ConsumeSemanticOccurrences(countProtocolObjects(document)) {
		return []calculus.Problem{{Type: stableProblemBase + "resource-limit"}}
	}
	if exceedsRecursiveBudget(document, recursiveLevels) {
		return []calculus.Problem{{Type: stableProblemBase + "resource-limit"}}
	}
	if problems := stableSemanticFoundationProblems(document); len(problems) > 0 {
		return problems
	}
	if problems := calculus.ValidateReachableGraphsWithBudgets(document, budget); len(problems) > 0 {
		return problems
	}
	return nil
}

func exceedsRecursiveBudget(document map[string]any, limit int) bool {
	if limit < 1 {
		return true
	}
	type frame struct {
		value any
		depth int
	}
	method, _ := document["method"].(map[string]any)
	sequence, _ := method["sequence"].([]any)
	stack := make([]frame, 0, len(sequence))
	for _, value := range sequence {
		stack = append(stack, frame{value: value, depth: 1})
	}
	for len(stack) > 0 {
		current := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		if current.depth > limit {
			return true
		}
		object, _ := current.value.(map[string]any)
		if object["kind"] == "section" {
			children, _ := object["sequence"].([]any)
			for _, child := range children {
				stack = append(stack, frame{value: child, depth: current.depth + 1})
			}
		}
	}
	return false
}

func stableSemanticFoundationProblems(document map[string]any) []calculus.Problem {
	problems := []calculus.Problem{}
	add := func(err error) {
		if err == nil {
			return
		}
		message := err.Error()
		if strings.HasPrefix(message, "resource-limit:") {
			problems = append(problems, calculus.Problem{Type: stableProblemBase + "resource-limit"})
			return
		}
		problems = append(problems, calculus.Problem{Type: stableProblemBase + "invalid-document", Pointer: semanticErrorPointer(document, message)})
	}
	contentLanguage, _ := document["content_language"].(string)
	if _, err := language.Parse(contentLanguage); err != nil {
		problems = append(problems, calculus.Problem{Type: stableProblemBase + "invalid-document", Pointer: "/content_language"})
	}
	add(validateOrigin(document))
	collections := map[string]map[string]map[string]any{}
	for _, name := range []string{"parameters", "ingredients", "components", "preparations", "outputs", "techniques", "equipment", "formulas"} {
		items, err := namedCollection(document, name)
		add(err)
		if items == nil {
			items = map[string]map[string]any{}
		}
		collections[name] = items
	}
	add(validateParameters(document, collections["parameters"]))
	add(validateIngredientAlternatives(document))
	method, methodErr := collectMethod(document)
	add(methodErr)
	if methodErr == nil {
		add(validateMethod(document, method, collections))
		add(validateCompletionDepth(method))
		add(validateActivationSites(document, method, collections["parameters"]))
	}
	add(validateFormulasV1(document, collections))
	add(validateSourcesAndEvidence(document))
	add(validateMeasurements(document))
	return normalizeStableProblems(problems)
}

func normalizeStableProblems(problems []calculus.Problem) []calculus.Problem {
	seen := map[string]bool{}
	result := make([]calculus.Problem, 0, len(problems))
	for _, problem := range problems {
		key := problem.Pointer + "\x00" + problem.Type
		if seen[key] {
			continue
		}
		seen[key] = true
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

func semanticErrorPointer(document map[string]any, message string) string {
	token := strings.Fields(message)[0]
	token = strings.TrimSuffix(token, ":")
	if strings.HasPrefix(token, "evidence/") || strings.HasPrefix(token, "sources/") {
		parts := strings.Split(token, "/")
		if len(parts) >= 3 {
			collection := parts[0]
			for index, candidate := range document[collection].([]any) {
				if candidate.(map[string]any)["id"] == parts[1] {
					return fmt.Sprintf("/%s/%d/%s", collection, index, strings.Join(parts[2:], "/"))
				}
			}
		}
	}
	if strings.HasPrefix(token, "/") {
		return token
	}
	for _, prefix := range []string{"origin/", "parameters/", "ingredients/", "components/", "formulas/", "method/", "sources/", "evidence/"} {
		if strings.HasPrefix(token, prefix) {
			return "/" + token
		}
	}
	return ""
}
