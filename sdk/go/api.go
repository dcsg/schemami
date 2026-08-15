// Package schemami implements strict Schemami v1 parsing, admission,
// canonical identity, and retained document access.
package schemami

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"

	"github.com/dcsg/schemami/sdk/go/calculus"
)

// Problem is a stable protocol diagnostic addressed by an RFC 6901 pointer.
type Problem struct {
	Type    string         `json:"type"`
	Pointer string         `json:"pointer,omitempty"`
	Details map[string]any `json:"details,omitempty"`
}

// ResourceBudgets declares protocol resource limits plus AnalysisStates, a
// separate deterministic ceiling on implementation search states. Analysis
// states never substitute for normative semantic-occurrence accounting.
type ResourceBudgets struct {
	RecursiveLevels            int `json:"recursive_levels"`
	SemanticOccurrences        int `json:"semantic_occurrences"`
	AnalysisStates             int `json:"analysis_states"`
	BundleDocuments            int `json:"bundle_documents"`
	SelectedComponentInstances int `json:"selected_component_instances"`
}

// ProtocolFloor supplies the Schemami v1 interoperability floors and the
// reference engine's default admission-analysis ceiling.
var ProtocolFloor = ResourceBudgets{
	RecursiveLevels: 64, SemanticOccurrences: 10_000, AnalysisStates: 10_000,
	BundleDocuments: 1_024, SelectedComponentInstances: 1_024,
}

// ParsedDocument retains the exact submitted bytes and decoded JSON value.
// Values returned by SubmittedJSON and Value are defensive copies.
type ParsedDocument struct {
	submitted []byte
	value     map[string]any
}

type ParseResult struct {
	Parsed   *ParsedDocument `json:"-"`
	Problems []Problem       `json:"problems"`
}

func (result ParseResult) OK() bool { return result.Parsed != nil && len(result.Problems) == 0 }

// Parse accepts strict JSON only. YAML is an authoring adapter and is not part
// of canonical SDK admission.
func Parse(data []byte, _ ResourceBudgets) ParseResult {
	if err := rejectDuplicateJSONKeys(data); err != nil {
		return ParseResult{Problems: []Problem{{Type: stableProblemBase + "invalid-json"}}}
	}
	var value any
	if err := json.Unmarshal(data, &value); err != nil {
		return ParseResult{Problems: []Problem{{Type: stableProblemBase + "invalid-json"}}}
	}
	document, ok := value.(map[string]any)
	if !ok {
		return ParseResult{Problems: []Problem{{Type: stableProblemBase + "invalid-document"}}}
	}
	return ParseResult{Parsed: &ParsedDocument{submitted: append([]byte(nil), data...), value: cloneObject(document)}}
}

func (parsed *ParsedDocument) SubmittedJSON() []byte {
	if parsed == nil {
		return nil
	}
	return append([]byte(nil), parsed.submitted...)
}

func (parsed *ParsedDocument) Value() map[string]any {
	if parsed == nil {
		return nil
	}
	return cloneObject(parsed.value)
}

type AdmittedRecipe struct {
	parsed    *ParsedDocument
	canonical []byte
	digest    string
}
type AdmittedBundle struct {
	parsed    *ParsedDocument
	canonical []byte
	digest    string
}

type AdmissionResult struct {
	Recipe   *AdmittedRecipe `json:"-"`
	Bundle   *AdmittedBundle `json:"-"`
	Problems []Problem       `json:"problems"`
}

func (result AdmissionResult) OK() bool {
	return (result.Recipe != nil || result.Bundle != nil) && len(result.Problems) == 0
}

func Admit(parsed *ParsedDocument, budgets ResourceBudgets) AdmissionResult {
	if parsed == nil {
		return AdmissionResult{Problems: []Problem{{Type: stableProblemBase + "invalid-document"}}}
	}
	document := cloneObject(parsed.value)
	isBundle := document["root"] != nil || document["documents"] != nil
	schemaName := "schemami-v1-core.schema.json"
	if isBundle {
		schemaName = "schemami-v1-bundle.schema.json"
	}
	schema, err := namedSchemaFor("embedded.schemami.json", schemaName)
	if err != nil {
		return AdmissionResult{Problems: []Problem{{Type: stableProblemBase + "invalid-document"}}}
	}
	if isBundle {
		if err := schema.Validate(document); err != nil {
			return AdmissionResult{Problems: []Problem{{Type: stableProblemBase + "invalid-document"}}}
		}
		if err := validateBundleSemanticsWithBudgets(document, budgets); err != nil {
			code := "invalid-document"
			if len(err.Error()) >= 15 && err.Error()[:15] == "resource-limit:" {
				code = "resource-limit"
			}
			return AdmissionResult{Problems: []Problem{{Type: stableProblemBase + code}}}
		}
	} else {
		budget := calculus.NewAdmissionBudget(budgets.SemanticOccurrences, budgets.AnalysisStates)
		stable := stableAdmissionProblemsWithBudget(document, schema.Validate(document), budget, true, budgets.RecursiveLevels)
		if len(stable) > 0 {
			return AdmissionResult{Problems: publicProblems(stable)}
		}
	}
	canonical, err := canonicalise(document)
	if err != nil {
		return AdmissionResult{Problems: []Problem{{Type: stableProblemBase + "invalid-document"}}}
	}
	sum := sha256.Sum256([]byte(canonical))
	digest := hex.EncodeToString(sum[:])
	retained := &ParsedDocument{submitted: parsed.SubmittedJSON(), value: cloneObject(document)}
	if isBundle {
		return AdmissionResult{Bundle: &AdmittedBundle{parsed: retained, canonical: []byte(canonical), digest: digest}}
	}
	return AdmissionResult{Recipe: &AdmittedRecipe{parsed: retained, canonical: []byte(canonical), digest: digest}}
}

func (document *AdmittedRecipe) SubmittedJSON() []byte { return document.parsed.SubmittedJSON() }
func (document *AdmittedRecipe) Value() map[string]any { return document.parsed.Value() }
func (document *AdmittedRecipe) CanonicalJSON() []byte {
	return append([]byte(nil), document.canonical...)
}
func (document *AdmittedRecipe) SHA256() string        { return document.digest }
func (document *AdmittedBundle) SubmittedJSON() []byte { return document.parsed.SubmittedJSON() }
func (document *AdmittedBundle) Value() map[string]any { return document.parsed.Value() }
func (document *AdmittedBundle) CanonicalJSON() []byte {
	return append([]byte(nil), document.canonical...)
}
func (document *AdmittedBundle) SHA256() string { return document.digest }

// CanonicalJSON produces RFC 8785 bytes for an I-JSON value. Integrators
// should normally call the method on an admitted document.
func CanonicalJSON(value any) ([]byte, error) {
	canonical, err := canonicalise(value)
	return []byte(canonical), err
}

func publicProblems(values []calculus.Problem) []Problem {
	result := make([]Problem, len(values))
	for index, value := range values {
		result[index] = Problem{Type: value.Type, Pointer: value.Pointer}
	}
	return result
}

func cloneObject(value map[string]any) map[string]any {
	if value == nil {
		return nil
	}
	return cloneValue(value).(map[string]any)
}

func cloneValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		result := make(map[string]any, len(typed))
		for key, child := range typed {
			result[key] = cloneValue(child)
		}
		return result
	case []any:
		result := make([]any, len(typed))
		for index, child := range typed {
			result[index] = cloneValue(child)
		}
		return result
	default:
		return typed
	}
}
