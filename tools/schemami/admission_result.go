package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"sort"
	"strings"

	sdk "github.com/dcsg/schemami/sdk/go"
	"github.com/dcsg/schemami/tools/schemami/calculus"
	"golang.org/x/text/language"
)

const stableProblemBase = "https://schemami.dev/problems/"

type admissionArtifact struct {
	Operation       string             `json:"operation"`
	Status          string             `json:"status"`
	SubmittedSHA256 string             `json:"submitted_sha256"`
	CanonicalSHA256 string             `json:"canonical_sha256,omitempty"`
	Problems        []calculus.Problem `json:"problems"`
}

func admitFile(path string) (admissionArtifact, error) {
	if err := validateFileSuffix(path); err != nil {
		return admissionArtifact{}, err
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		return admissionArtifact{}, err
	}
	submitted := sha256.Sum256(raw)
	result := admissionArtifact{
		Operation: "admit", Status: "refused",
		SubmittedSHA256: hex.EncodeToString(submitted[:]),
		Problems:        []calculus.Problem{},
	}
	if !strings.HasSuffix(path, ".json") {
		result.Problems = []calculus.Problem{{Type: stableProblemBase + "invalid-json"}}
		return result, nil
	}
	{
		parsed := sdk.Parse(raw, sdk.ProtocolFloor)
		if !parsed.OK() {
			result.Problems = publicSDKProblems(parsed.Problems)
			return result, nil
		}
		admission := sdk.Admit(parsed.Parsed, sdk.ProtocolFloor)
		if !admission.OK() || admission.Recipe == nil {
			result.Problems = publicSDKProblems(admission.Problems)
			return result, nil
		}
		result.Status = "ok"
		result.CanonicalSHA256 = admission.Recipe.SHA256()
		return result, nil
	}
}

func publicSDKProblems(values []sdk.Problem) []calculus.Problem {
	result := make([]calculus.Problem, len(values))
	for index, value := range values {
		result[index] = calculus.Problem{Type: value.Type, Pointer: value.Pointer}
	}
	return result
}

func stableAdmissionProblems(document map[string]any, schemaError error) []calculus.Problem {
	if schemaError != nil {
		return []calculus.Problem{{Type: stableProblemBase + "invalid-document"}}
	}
	if problems := stableSemanticFoundationProblems(document); len(problems) > 0 {
		return problems
	}
	if problems := calculus.ValidateReachableGraphs(document); len(problems) > 0 {
		return problems
	}
	return nil
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
	if countProtocolObjects(document) > minimumSemanticObjects {
		problems = append(problems, calculus.Problem{Type: stableProblemBase + "resource-limit"})
	}
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
