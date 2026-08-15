package schemami_test

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"os"
	"testing"

	schemami "github.com/dcsg/schemami/sdk/go"
)

type resourceBudgetCorpus struct {
	Vectors           []resourceBudgetVector           `json:"vectors"`
	DiagnosticVectors []resourceBudgetDiagnosticVector `json:"diagnostic_vectors"`
}

type resourceBudgetDiagnosticVector struct {
	ID               string                   `json:"id"`
	Fixture          string                   `json:"fixture"`
	Budgets          schemami.ResourceBudgets `json:"budgets"`
	ExpectedProblems []schemami.Problem       `json:"expected_problems"`
}

type resourceBudgetVector struct {
	ID        string                  `json:"id"`
	Generator resourceBudgetGenerator `json:"generator"`
	Expected  resourceBudgetExpected  `json:"expected"`
}

type resourceBudgetGenerator struct {
	Kind           string `json:"kind"`
	Width          int    `json:"width"`
	ParameterOrder string `json:"parameter_order"`
	Activation     string `json:"activation"`
}

type resourceBudgetExpected struct {
	StaticSemanticOccurrences int `json:"static_semantic_occurrences"`
	DistinctReachableGraphs   int `json:"distinct_reachable_graphs"`
	TotalSemanticOccurrences  int `json:"total_semantic_occurrences"`
	AnalysisStates            int `json:"analysis_states"`
	DefaultAnalysisStates     int `json:"default_analysis_states"`
	BelowExactAnalysisStates  int `json:"below_exact_analysis_states"`
	ExactAnalysisStates       int `json:"exact_analysis_states"`
}

func TestPublicAPIAdmitsAndRetainsSubmittedBytes(t *testing.T) {
	raw, err := os.ReadFile("testdata/phase9-minimal.schemami.json")
	if err != nil {
		t.Fatal(err)
	}
	parsed := schemami.Parse(raw, schemami.ProtocolFloor)
	if !parsed.OK() {
		t.Fatalf("parse refused: %#v", parsed.Problems)
	}
	admission := schemami.Admit(parsed.Parsed, schemami.ProtocolFloor)
	if !admission.OK() || admission.Recipe == nil {
		t.Fatalf("admission refused: %#v", admission.Problems)
	}
	if !bytes.Equal(admission.Recipe.SubmittedJSON(), raw) {
		t.Fatal("submitted bytes were not retained exactly")
	}
	if len(admission.Recipe.CanonicalJSON()) == 0 || len(admission.Recipe.SHA256()) != 64 {
		t.Fatal("canonical identity missing")
	}
}

func TestPublicAPIRejectsDuplicateMembers(t *testing.T) {
	result := schemami.Parse([]byte(`{"schemami":"1","schemami":"1"}`), schemami.ProtocolFloor)
	if result.OK() || len(result.Problems) != 1 || result.Problems[0].Type != "https://schemami.dev/problems/invalid-json" {
		t.Fatalf("unexpected result: %#v", result)
	}
}

func TestPublicAPIRejectsLossyIJSONBeforeIdentity(t *testing.T) {
	cases := map[string][]byte{
		"invalid UTF-8": {'{', '"', 'x', '"', ':', '"', 0xff, '"', '}'},
		"overflow":      []byte(`{"x":1e400}`),
		"underflow":     []byte(`{"x":1e-400}`),
	}
	for name, raw := range cases {
		t.Run(name, func(t *testing.T) {
			result := schemami.Parse(raw, schemami.ProtocolFloor)
			if result.OK() || len(result.Problems) != 1 || result.Problems[0].Type != "https://schemami.dev/problems/invalid-json" {
				t.Fatalf("unexpected result: %#v", result)
			}
		})
	}
}

func TestReturnedValuesAreDefensiveCopies(t *testing.T) {
	raw, err := os.ReadFile("testdata/phase9-minimal.schemami.json")
	if err != nil {
		t.Fatal(err)
	}
	parsed := schemami.Parse(raw, schemami.ProtocolFloor)
	first := parsed.Parsed.Value()
	first["title"] = "changed"
	if parsed.Parsed.Value()["title"] == "changed" {
		t.Fatal("parsed document leaked mutable state")
	}
}

func TestEvaluateRequiresAdmittedInputAndNeverPanicsForMalformedArguments(t *testing.T) {
	result := schemami.Evaluate(schemami.OperationRequest{Operation: "schedule", Arguments: map[string]any{}}, schemami.OperationInput{}, schemami.ProtocolFloor)
	if result.Status != "refused" || len(result.Problems) != 1 || result.Problems[0].Type != "https://schemami.dev/problems/invalid-operation-arguments" {
		t.Fatalf("unexpected refusal: %#v", result)
	}
	result = schemami.Evaluate(schemami.OperationRequest{Operation: "convert_quantity", Arguments: map[string]any{}}, schemami.OperationInput{}, schemami.ProtocolFloor)
	if result.Status != "refused" {
		t.Fatalf("malformed conversion did not refuse: %#v", result)
	}
}

func TestEvaluateRejectsUnknownNestedOperationMembers(t *testing.T) {
	raw, err := os.ReadFile("testdata/phase9-minimal.schemami.json")
	if err != nil {
		t.Fatal(err)
	}
	parsed := schemami.Parse(raw, schemami.ProtocolFloor)
	admission := schemami.Admit(parsed.Parsed, schemami.ProtocolFloor)
	if !admission.OK() || admission.Recipe == nil {
		t.Fatalf("admission refused: %#v", admission.Problems)
	}
	result := schemami.Evaluate(schemami.OperationRequest{Operation: "resolve_selection", Arguments: map[string]any{
		"selections": []any{map[string]any{"component_path": []any{}, "bindings": map[string]any{}, "unexpected": true}},
	}}, schemami.OperationInput{Recipe: admission.Recipe}, schemami.ProtocolFloor)
	if result.Status != "refused" || result.Problems[0].Type != "https://schemami.dev/problems/invalid-operation-arguments" {
		t.Fatalf("nested unknown member was accepted: %#v", result)
	}
}

func TestEvaluateEnforcesSelectedComponentBudget(t *testing.T) {
	raw, err := os.ReadFile("testdata/phase9.schemami-bundle.json")
	if err != nil {
		t.Fatal(err)
	}
	parsed := schemami.Parse(raw, schemami.ProtocolFloor)
	admission := schemami.Admit(parsed.Parsed, schemami.ProtocolFloor)
	if !admission.OK() || admission.Bundle == nil {
		t.Fatalf("bundle admission refused: %#v", admission.Problems)
	}
	budgets := schemami.ProtocolFloor
	budgets.SelectedComponentInstances = 1
	result := schemami.Evaluate(
		schemami.OperationRequest{Operation: "resolve_selection", Arguments: map[string]any{}},
		schemami.OperationInput{Bundle: admission.Bundle}, budgets,
	)
	if result.Status != "refused" || len(result.Problems) != 1 || result.Problems[0].Type != "https://schemami.dev/problems/resource-limit" {
		t.Fatalf("component budget did not refuse deterministically: %#v", result)
	}
}

func TestEvaluateEnforcesSemanticOccurrenceBudget(t *testing.T) {
	raw, err := os.ReadFile("testdata/phase9-minimal.schemami.json")
	if err != nil {
		t.Fatal(err)
	}
	parsed := schemami.Parse(raw, schemami.ProtocolFloor)
	admission := schemami.Admit(parsed.Parsed, schemami.ProtocolFloor)
	if !admission.OK() || admission.Recipe == nil {
		t.Fatalf("admission refused: %#v", admission.Problems)
	}
	budgets := schemami.ProtocolFloor
	budgets.SemanticOccurrences = countProtocolSurface(admission.Recipe.Value()) - 1
	result := schemami.Evaluate(
		schemami.OperationRequest{Operation: "resolve_selection", Arguments: map[string]any{}},
		schemami.OperationInput{Recipe: admission.Recipe}, budgets,
	)
	if result.Status != "refused" || len(result.Problems) != 1 || result.Problems[0].Type != "https://schemami.dev/problems/resource-limit" {
		t.Fatalf("operation semantic budget did not refuse: %#v", result)
	}
}

func TestEvaluateChargesRepeatedRootPassOnce(t *testing.T) {
	raw, err := os.ReadFile("testdata/phase9-minimal.schemami.json")
	if err != nil {
		t.Fatal(err)
	}
	parsed := schemami.Parse(raw, schemami.ProtocolFloor)
	admission := schemami.Admit(parsed.Parsed, schemami.ProtocolFloor)
	if !admission.OK() || admission.Recipe == nil {
		t.Fatalf("admission refused: %#v", admission.Problems)
	}
	budgets := schemami.ProtocolFloor
	budgets.SemanticOccurrences = countProtocolSurface(admission.Recipe.Value())
	budgets.AnalysisStates = 1
	result := schemami.Evaluate(
		schemami.OperationRequest{Operation: "scale", Arguments: map[string]any{"factor": "2"}},
		schemami.OperationInput{Recipe: admission.Recipe}, budgets,
	)
	if result.Status != "not_applicable" {
		t.Fatalf("exact root-instance semantic budget refused or operation charged analysis states: %#v", result)
	}
}

func TestEvaluateChargesRepeatedNestedRecipePerInstancePath(t *testing.T) {
	raw, err := os.ReadFile("testdata/phase9.schemami-bundle.json")
	if err != nil {
		t.Fatal(err)
	}
	var bundle map[string]any
	if err := json.Unmarshal(raw, &bundle); err != nil {
		t.Fatal(err)
	}
	documents := bundle["documents"].([]any)
	rootEntry := documents[0].(map[string]any)
	root := rootEntry["document"].(map[string]any)
	child := documents[1].(map[string]any)["document"].(map[string]any)
	components := root["components"].([]any)
	encodedComponent, err := json.Marshal(components[0])
	if err != nil {
		t.Fatal(err)
	}
	var sibling map[string]any
	if err := json.Unmarshal(encodedComponent, &sibling); err != nil {
		t.Fatal(err)
	}
	sibling["id"] = "child-sibling"
	sibling["name"] = "Sibling component"
	root["components"] = append(components, sibling)
	rootDigest := canonicalDigest(t, root)
	rootEntry["sha256"] = rootDigest
	bundle["root"].(map[string]any)["sha256"] = rootDigest

	bundleRaw, err := json.Marshal(bundle)
	if err != nil {
		t.Fatal(err)
	}
	parsed := schemami.Parse(bundleRaw, schemami.ProtocolFloor)
	admission := schemami.Admit(parsed.Parsed, schemami.ProtocolFloor)
	if !admission.OK() || admission.Bundle == nil {
		t.Fatalf("bundle admission refused: %#v", admission.Problems)
	}
	rootOccurrences := countProtocolSurface(root)
	childOccurrences := countProtocolSurface(child)
	request := schemami.OperationRequest{Operation: "resolve_selection", Arguments: map[string]any{}}

	budgets := schemami.ProtocolFloor
	budgets.SemanticOccurrences = rootOccurrences + childOccurrences
	refused := schemami.Evaluate(request, schemami.OperationInput{Bundle: admission.Bundle}, budgets)
	if refused.Status != "refused" || len(refused.Problems) != 1 || refused.Problems[0].Type != "https://schemami.dev/problems/resource-limit" {
		t.Fatalf("second child instance did not consume semantic occurrences: %#v", refused)
	}

	budgets.SemanticOccurrences = rootOccurrences + 2*childOccurrences
	accepted := schemami.Evaluate(request, schemami.OperationInput{Bundle: admission.Bundle}, budgets)
	if accepted.Status != "ok" {
		t.Fatalf("exact nested-instance semantic budget refused: %#v", accepted)
	}
}

func TestEvaluateScheduleSharesSemanticLedgerAcrossPasses(t *testing.T) {
	raw, err := os.ReadFile("testdata/phase9.schemami-bundle.json")
	if err != nil {
		t.Fatal(err)
	}
	var bundleValue map[string]any
	if err := json.Unmarshal(raw, &bundleValue); err != nil {
		t.Fatal(err)
	}
	documents := bundleValue["documents"].([]any)
	root := documents[0].(map[string]any)["document"].(map[string]any)
	child := documents[1].(map[string]any)["document"].(map[string]any)
	parsed := schemami.Parse(raw, schemami.ProtocolFloor)
	admission := schemami.Admit(parsed.Parsed, schemami.ProtocolFloor)
	if !admission.OK() || admission.Bundle == nil {
		t.Fatalf("bundle admission refused: %#v", admission.Problems)
	}
	request := schemami.OperationRequest{Operation: "schedule", Arguments: map[string]any{}}
	budgets := schemami.ProtocolFloor
	budgets.SemanticOccurrences = countProtocolSurface(root) + countProtocolSurface(child)
	result := schemami.Evaluate(request, schemami.OperationInput{Bundle: admission.Bundle}, budgets)
	if result.Status != "ok" {
		t.Fatalf("schedule recharged an entered instance during a later pass: %#v", result)
	}
	budgets.SemanticOccurrences--
	refused := schemami.Evaluate(request, schemami.OperationInput{Bundle: admission.Bundle}, budgets)
	if refused.Status != "refused" || len(refused.Problems) != 1 || refused.Problems[0].Type != "https://schemami.dev/problems/resource-limit" {
		t.Fatalf("schedule did not charge both entered instances: %#v", refused)
	}
}

func TestBundleAdmissionEnforcesConfiguredDocumentBudget(t *testing.T) {
	raw, err := os.ReadFile("testdata/phase9.schemami-bundle.json")
	if err != nil {
		t.Fatal(err)
	}
	parsed := schemami.Parse(raw, schemami.ProtocolFloor)
	budgets := schemami.ProtocolFloor
	budgets.BundleDocuments = 1
	admission := schemami.Admit(parsed.Parsed, budgets)
	if admission.OK() || len(admission.Problems) != 1 || admission.Problems[0].Type != "https://schemami.dev/problems/resource-limit" {
		t.Fatalf("bundle document budget did not refuse: %#v", admission)
	}
}

func TestBundleAdmissionEnforcesAggregateSemanticBudget(t *testing.T) {
	raw, err := os.ReadFile("testdata/phase9.schemami-bundle.json")
	if err != nil {
		t.Fatal(err)
	}
	parsed := schemami.Parse(raw, schemami.ProtocolFloor)
	budgets := schemami.ProtocolFloor
	budgets.SemanticOccurrences = 20
	admission := schemami.Admit(parsed.Parsed, budgets)
	if admission.OK() || len(admission.Problems) != 1 || admission.Problems[0].Type != "https://schemami.dev/problems/resource-limit" {
		t.Fatalf("bundle semantic budget was reset per document: %#v", admission)
	}
}

func TestRecipeAdmissionEnforcesConfiguredSemanticBudget(t *testing.T) {
	raw, err := os.ReadFile("testdata/phase9-minimal.schemami.json")
	if err != nil {
		t.Fatal(err)
	}
	parsed := schemami.Parse(raw, schemami.ProtocolFloor)
	budgets := schemami.ProtocolFloor
	budgets.SemanticOccurrences = 1
	admission := schemami.Admit(parsed.Parsed, budgets)
	if admission.OK() || len(admission.Problems) != 1 || admission.Problems[0].Type != "https://schemami.dev/problems/resource-limit" {
		t.Fatalf("recipe semantic budget did not refuse: %#v", admission)
	}
}

func TestOpaqueExtensionDoesNotSupplyProtocolQuantitySemantics(t *testing.T) {
	raw := []byte(`{"schemami":"1","collection":"test","id":"opaque","revision":1,"content_language":"en-GB","title":"Opaque","ingredients":[],"method":{"sequence":[]},"x-adversary":{"kind":"measured","value":"1","unit":"not-a-protocol-unit","nested":{"a":{"b":true}}}}`)
	parsed := schemami.Parse(raw, schemami.ProtocolFloor)
	budgets := schemami.ProtocolFloor
	// Three static protocol objects and the same three objects in the one
	// completed graph consume six normative semantic occurrences. The x-* tree
	// itself remains opaque and contributes neither semantic nor analysis work.
	budgets.SemanticOccurrences = 6
	admission := schemami.Admit(parsed.Parsed, budgets)
	if !admission.OK() || admission.Recipe == nil {
		t.Fatalf("opaque extension affected admission: %#v", admission.Problems)
	}
	budgets.SemanticOccurrences = countProtocolSurface(admission.Recipe.Value())
	operation := schemami.Evaluate(
		schemami.OperationRequest{Operation: "resolve_selection", Arguments: map[string]any{}},
		schemami.OperationInput{Recipe: admission.Recipe}, budgets,
	)
	if operation.Status != "ok" {
		t.Fatalf("opaque extension affected operation accounting: %#v", operation)
	}
}

func TestAdmissionSeparatesAnalysisStatesFromSemanticOccurrences(t *testing.T) {
	corpusRaw, err := os.ReadFile("resources/conformance/resource-budgets.json")
	if err != nil {
		t.Fatal(err)
	}
	var corpus resourceBudgetCorpus
	if err := json.Unmarshal(corpusRaw, &corpus); err != nil {
		t.Fatal(err)
	}
	var vector *resourceBudgetVector
	for index := range corpus.Vectors {
		if corpus.Vectors[index].ID == "toggle-vector-equality-14" {
			vector = &corpus.Vectors[index]
			break
		}
	}
	if vector == nil {
		t.Fatal("toggle-vector-equality-14 resource vector not found")
	}
	if vector.Generator.Kind != "toggle-vector-equality" || vector.Generator.ParameterOrder != "all-left-then-all-right" || vector.Generator.Activation != "all-pairwise-equality" {
		t.Fatalf("unsupported resource-vector generator: %#v", vector.Generator)
	}
	recipe := map[string]any{
		"schemami": "1", "collection": "test", "id": "analysis-states", "revision": 1,
		"content_language": "en-GB", "title": "Analysis states",
		"ingredients": []any{},
		"method":      map[string]any{"sequence": []any{}},
	}
	addVectorEquality(t, recipe, vector.Generator.Width, "analysis")
	if surface := countProtocolSurface(recipe); surface != vector.Expected.StaticSemanticOccurrences {
		t.Fatalf("generated static semantic surface = %d, want %d", surface, vector.Expected.StaticSemanticOccurrences)
	}
	if total := vector.Expected.StaticSemanticOccurrences * (1 + vector.Expected.DistinctReachableGraphs); total != vector.Expected.TotalSemanticOccurrences {
		t.Fatalf("resource vector total semantic occurrences = %d, calculated %d", vector.Expected.TotalSemanticOccurrences, total)
	}
	if vector.Expected.AnalysisStates != vector.Expected.ExactAnalysisStates || schemami.ProtocolFloor.AnalysisStates != vector.Expected.DefaultAnalysisStates {
		t.Fatalf("resource vector analysis boundaries do not match Go defaults: %#v", vector.Expected)
	}
	raw, err := json.Marshal(recipe)
	if err != nil {
		t.Fatal(err)
	}
	parsed := schemami.Parse(raw, schemami.ProtocolFloor)
	if !parsed.OK() {
		t.Fatalf("parse refused: %#v", parsed.Problems)
	}
	defaultAdmission := schemami.Admit(parsed.Parsed, schemami.ProtocolFloor)
	if defaultAdmission.OK() || len(defaultAdmission.Problems) != 1 || defaultAdmission.Problems[0].Type != "https://schemami.dev/problems/resource-limit" {
		t.Fatalf("default analysis-state budget did not refuse: %#v", defaultAdmission)
	}
	boundary := schemami.ProtocolFloor
	boundary.SemanticOccurrences = vector.Expected.TotalSemanticOccurrences
	boundary.AnalysisStates = vector.Expected.BelowExactAnalysisStates
	boundaryAdmission := schemami.Admit(parsed.Parsed, boundary)
	if boundaryAdmission.OK() || len(boundaryAdmission.Problems) != 1 || boundaryAdmission.Problems[0].Type != "https://schemami.dev/problems/resource-limit" {
		t.Fatalf("below-exact analysis-state boundary did not refuse: %#v", boundaryAdmission)
	}
	raised := boundary
	raised.AnalysisStates = vector.Expected.ExactAnalysisStates
	belowSemantic := raised
	belowSemantic.SemanticOccurrences = vector.Expected.TotalSemanticOccurrences - 1
	belowSemanticAdmission := schemami.Admit(parsed.Parsed, belowSemantic)
	if belowSemanticAdmission.OK() || len(belowSemanticAdmission.Problems) != 1 || belowSemanticAdmission.Problems[0].Type != "https://schemami.dev/problems/resource-limit" {
		t.Fatalf("below-exact semantic-occurrence boundary did not refuse: %#v", belowSemanticAdmission)
	}
	raisedAdmission := schemami.Admit(parsed.Parsed, raised)
	if !raisedAdmission.OK() || raisedAdmission.Recipe == nil {
		t.Fatalf("exact analysis-state boundary refused a two-graph recipe: %#v", raisedAdmission.Problems)
	}
}

func TestAdmissionResourceDiagnosticsMatchSharedCorpus(t *testing.T) {
	corpusRaw, err := os.ReadFile("resources/conformance/resource-budgets.json")
	if err != nil {
		t.Fatal(err)
	}
	var corpus resourceBudgetCorpus
	if err := json.Unmarshal(corpusRaw, &corpus); err != nil {
		t.Fatal(err)
	}
	for _, vector := range corpus.DiagnosticVectors {
		raw, err := os.ReadFile("testdata/" + vector.Fixture)
		if err != nil {
			t.Fatal(err)
		}
		parsed := schemami.Parse(raw, schemami.ProtocolFloor)
		if !parsed.OK() {
			t.Fatalf("%s parse refused: %#v", vector.ID, parsed.Problems)
		}
		admission := schemami.Admit(parsed.Parsed, vector.Budgets)
		problemsEqual := len(admission.Problems) == len(vector.ExpectedProblems)
		if problemsEqual {
			for index := range admission.Problems {
				if admission.Problems[index].Type != vector.ExpectedProblems[index].Type ||
					admission.Problems[index].Pointer != vector.ExpectedProblems[index].Pointer {
					problemsEqual = false
					break
				}
			}
		}
		if admission.OK() || !problemsEqual {
			t.Fatalf("%s problems = %#v, want %#v", vector.ID, admission.Problems, vector.ExpectedProblems)
		}
	}
}

func TestBundleAdmissionSharesAnalysisStateBudgetAcrossDocuments(t *testing.T) {
	raw, err := os.ReadFile("testdata/phase9.schemami-bundle.json")
	if err != nil {
		t.Fatal(err)
	}
	var bundle map[string]any
	if err := json.Unmarshal(raw, &bundle); err != nil {
		t.Fatal(err)
	}
	documents := bundle["documents"].([]any)
	rootEntry := documents[0].(map[string]any)
	childEntry := documents[1].(map[string]any)
	root := rootEntry["document"].(map[string]any)
	child := childEntry["document"].(map[string]any)
	addVectorEquality(t, root, 11, "root-analysis")
	addVectorEquality(t, child, 11, "child-analysis")

	childDigest := canonicalDigest(t, child)
	childEntry["sha256"] = childDigest
	root["components"].([]any)[0].(map[string]any)["recipe"].(map[string]any)["sha256"] = childDigest
	rootDigest := canonicalDigest(t, root)
	rootEntry["sha256"] = rootDigest
	bundle["root"].(map[string]any)["sha256"] = rootDigest

	for _, document := range []map[string]any{root, child} {
		documentRaw, marshalErr := json.Marshal(document)
		if marshalErr != nil {
			t.Fatal(marshalErr)
		}
		parsedDocument := schemami.Parse(documentRaw, schemami.ProtocolFloor)
		admission := schemami.Admit(parsedDocument.Parsed, schemami.ProtocolFloor)
		if !admission.OK() {
			t.Fatalf("document did not fit the per-request default analysis budget: %#v", admission.Problems)
		}
	}

	bundleRaw, err := json.Marshal(bundle)
	if err != nil {
		t.Fatal(err)
	}
	parsed := schemami.Parse(bundleRaw, schemami.ProtocolFloor)
	defaultAdmission := schemami.Admit(parsed.Parsed, schemami.ProtocolFloor)
	if defaultAdmission.OK() || len(defaultAdmission.Problems) != 1 || defaultAdmission.Problems[0].Type != "https://schemami.dev/problems/resource-limit" {
		t.Fatalf("bundle reset its analysis-state budget per document: %#v", defaultAdmission)
	}
	raised := schemami.ProtocolFloor
	raised.AnalysisStates = 100_000
	raisedAdmission := schemami.Admit(parsed.Parsed, raised)
	if !raisedAdmission.OK() || raisedAdmission.Bundle == nil {
		t.Fatalf("raised aggregate analysis-state budget refused: %#v", raisedAdmission.Problems)
	}
}

func addVectorEquality(t *testing.T, recipe map[string]any, width int, prefix string) {
	t.Helper()
	parameters := make([]any, 0, width*2)
	equalities := make([]any, 0, width)
	leftIDs := make([]string, width)
	rightIDs := make([]string, width)
	for index := range width {
		leftIDs[index] = fmt.Sprintf("%s-left-%d", prefix, index)
		rightIDs[index] = fmt.Sprintf("%s-right-%d", prefix, index)
		parameters = append(parameters, map[string]any{"id": leftIDs[index], "kind": "toggle", "name": "Left"})
	}
	for index := range width {
		parameters = append(parameters, map[string]any{"id": rightIDs[index], "kind": "toggle", "name": "Right"})
	}
	for index := range width {
		left := leftIDs[index]
		right := rightIDs[index]
		equalities = append(equalities, map[string]any{"kind": "any", "conditions": []any{
			map[string]any{"kind": "all", "conditions": []any{
				map[string]any{"kind": "toggle_is", "parameter": left, "enabled": true},
				map[string]any{"kind": "toggle_is", "parameter": right, "enabled": true},
			}},
			map[string]any{"kind": "all", "conditions": []any{
				map[string]any{"kind": "toggle_is", "parameter": left, "enabled": false},
				map[string]any{"kind": "toggle_is", "parameter": right, "enabled": false},
			}},
		}})
	}
	recipe["parameters"] = parameters
	ingredients, _ := recipe["ingredients"].([]any)
	recipe["ingredients"] = append(ingredients, map[string]any{"id": prefix + "-conditional", "name": "Conditional", "activation": map[string]any{
		"kind": "all", "conditions": equalities,
	}})
}

func canonicalDigest(t *testing.T, value any) string {
	t.Helper()
	canonical, err := schemami.CanonicalJSON(value)
	if err != nil {
		t.Fatal(err)
	}
	digest := sha256.Sum256(canonical)
	return fmt.Sprintf("%x", digest)
}

func countProtocolSurface(value any) int {
	count := 0
	stack := []any{value}
	for len(stack) > 0 {
		current := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		switch typed := current.(type) {
		case map[string]any:
			count++
			for name, child := range typed {
				if len(name) >= 2 && name[:2] == "x-" {
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

func TestGenericCanonicalJSONRefusesCyclesAndDeepValues(t *testing.T) {
	cyclic := map[string]any{}
	cyclic["self"] = cyclic
	if _, err := schemami.CanonicalJSON(cyclic); err == nil {
		t.Fatal("cyclic programmer value received canonical bytes")
	}
	var deep any = float64(1)
	for range 257 {
		deep = []any{deep}
	}
	if _, err := schemami.CanonicalJSON(deep); err == nil {
		t.Fatal("deep programmer value bypassed canonicalization depth limit")
	}
	shared := []any{float64(1)}
	dag := []any{shared, shared}
	if _, err := schemami.CanonicalJSON(dag); err == nil {
		t.Fatal("shared-container DAG bypassed canonicalization work bound")
	}
}

func TestStrictParserBoundsRawJSONNesting(t *testing.T) {
	raw := []byte(`{"x":` + string(bytes.Repeat([]byte{'['}, 257)) + `0` + string(bytes.Repeat([]byte{']'}, 257)) + `}`)
	if result := schemami.Parse(raw, schemami.ProtocolFloor); result.OK() {
		t.Fatal("deep JSON bypassed the parser safety ceiling")
	}
}
