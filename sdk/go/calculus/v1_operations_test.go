package calculus

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

func TestStructuredSharedEnvelopeByteParity(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "resources", "conformance", "structured-calculus.json"))
	if err != nil {
		t.Fatal(err)
	}
	var corpus struct {
		Vectors []struct {
			ID            string         `json:"id"`
			Fixture       string         `json:"fixture"`
			RecipeFixture string         `json:"recipe_fixture"`
			Recipe        map[string]any `json:"recipe"`
			Operation     string         `json:"operation"`
			Arguments     map[string]any `json:"arguments"`
			Digest        string         `json:"expected_jcs_sha256"`
		} `json:"vectors"`
	}
	if err := json.Unmarshal(raw, &corpus); err != nil {
		t.Fatal(err)
	}
	for _, vector := range corpus.Vectors {
		t.Run(vector.ID, func(t *testing.T) {
			request := map[string]any{"arguments": vector.Arguments}
			if vector.Fixture != "" {
				fixture, err := os.ReadFile(filepath.Join("..", "testdata", vector.Fixture))
				if err != nil {
					t.Fatal(err)
				}
				var bundle map[string]any
				if err := json.Unmarshal(fixture, &bundle); err != nil {
					t.Fatal(err)
				}
				request["bundle"] = bundle
			} else if vector.RecipeFixture != "" {
				fixture, err := os.ReadFile(filepath.Join("..", "testdata", vector.RecipeFixture))
				if err != nil {
					t.Fatal(err)
				}
				var recipe map[string]any
				if err := json.Unmarshal(fixture, &recipe); err != nil {
					t.Fatal(err)
				}
				request["recipe"] = recipe
			} else {
				request["recipe"] = vector.Recipe
			}
			envelope := EvaluateRequest(vector.Operation, request)
			digest := sha256.Sum256([]byte(canonicalJCS(envelope)))
			if got := hex.EncodeToString(digest[:]); got != vector.Digest {
				t.Fatalf("envelope JCS sha256 = %s, want %s", got, vector.Digest)
			}
		})
	}
}

func phase9Recipe(t *testing.T) map[string]any {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join("..", "testdata", "phase9-structured.schemami.json"))
	if err != nil {
		t.Fatal(err)
	}
	var recipe map[string]any
	if err := json.Unmarshal(raw, &recipe); err != nil {
		t.Fatal(err)
	}
	return recipe
}

func cloneTestMap(t *testing.T, value map[string]any) map[string]any {
	t.Helper()
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	var clone map[string]any
	if err := json.Unmarshal(raw, &clone); err != nil {
		t.Fatal(err)
	}
	return clone
}

func TestResolveSelectionUsesOnlyAuthoredDefaults(t *testing.T) {
	recipeInput := phase9Recipe(t)
	delete(recipeInput, "components")
	sequence := recipeInput["method"].(map[string]any)["sequence"].([]any)
	mix := sequence[0].(map[string]any)["sequence"].([]any)[0].(map[string]any)
	mix["uses"] = mix["uses"].([]any)[:3]
	result := EvaluateRequest("resolve_selection", map[string]any{
		"recipe":    recipeInput,
		"arguments": map[string]any{},
	})
	if result.Status != "ok" {
		t.Fatalf("status = %s; problems = %#v", result.Status, result.Problems)
	}
	evaluation := result.Evaluation.(map[string]any)
	recipe := evaluation["recipe"].(map[string]any)
	if recipe["sha256"] != digestJCS(recipeInput) {
		t.Fatalf("recipe digest = %v", recipe["sha256"])
	}
	instances := result.Result.(map[string]any)["active_instances"].([]any)
	method := instances[0].(map[string]any)["method"].([]any)
	for _, value := range method {
		if value.(map[string]any)["id"] == "ambient-proof" {
			t.Fatal("inactive ambient branch appears in resolved selection")
		}
	}
}

func TestResolveSelectionMissingConsequentialBindingRefuses(t *testing.T) {
	recipe := phase9Recipe(t)
	delete(recipe, "components")
	sequence := recipe["method"].(map[string]any)["sequence"].([]any)
	mix := sequence[0].(map[string]any)["sequence"].([]any)[0].(map[string]any)
	mix["uses"] = mix["uses"].([]any)[:3]
	parameters := recipe["parameters"].([]any)
	delete(parameters[0].(map[string]any), "default")
	result := EvaluateRequest("resolve_selection", map[string]any{
		"recipe":    recipe,
		"arguments": map[string]any{},
	})
	if result.Status != "refused" || len(result.Problems) == 0 || result.Problems[0].Type != problemBase+"missing-binding" {
		t.Fatalf("result = %#v", result)
	}
}

func TestResolveFormulaAndTargetScaleUseExactSelectedTotal(t *testing.T) {
	recipe := phase9Recipe(t)
	delete(recipe, "components")
	formula := recipe["formulas"].([]any)[0].(map[string]any)
	formula["terms"] = formula["terms"].([]any)[:3]
	resolved := EvaluateRequest("resolve_formula", map[string]any{
		"recipe":    recipe,
		"arguments": map[string]any{"formula_id": "dough"},
	})
	if resolved.Status != "ok" {
		t.Fatalf("resolve = %#v", resolved)
	}
	formulaEvaluations := resolved.FormulaEvaluations.([]any)
	selected := formulaEvaluations[0].(map[string]any)["selected_total"].(Quantity)
	if selected.Value != "1770" {
		t.Fatalf("selected total = %#v", selected)
	}

	scaled := EvaluateRequest("scale", map[string]any{
		"recipe": recipe,
		"arguments": map[string]any{
			"formula_target": map[string]any{
				"formula_id": "dough",
				"quantity":   map[string]any{"kind": "measured", "value": "3540", "unit": "g"},
			},
		},
	})
	if scaled.Status != "ok" {
		t.Fatalf("scale = %#v", scaled)
	}
	quantities := scaled.Result.(map[string]any)["quantities"].([]any)
	first := quantities[0].(map[string]any)["quantity"].(Quantity)
	if first.Value != "2000" {
		t.Fatalf("scaled flour = %#v", first)
	}
}

func TestInactiveFormulaTermDoesNotRedistribute(t *testing.T) {
	recipe := map[string]any{
		"schemami": "1", "collection": "conformance", "id": "optional-formula", "revision": float64(1),
		"parameters": []any{map[string]any{"id": "include-c", "kind": "toggle", "default": false}},
		"ingredients": []any{
			map[string]any{"id": "a"},
			map[string]any{"id": "b"},
			map[string]any{"id": "c", "activation": map[string]any{"kind": "toggle_is", "parameter": "include-c", "enabled": true}},
		},
		"formulas": []any{map[string]any{
			"id": "mix", "kind": "ratio",
			"terms": []any{
				map[string]any{"input": map[string]any{"kind": "ingredient", "id": "a"}, "parts": "1"},
				map[string]any{"input": map[string]any{"kind": "ingredient", "id": "b"}, "parts": "2"},
				map[string]any{"input": map[string]any{"kind": "ingredient", "id": "c"}, "parts": "1"},
			},
			"target": map[string]any{"kind": "measured", "value": "400", "unit": "g"},
		}},
	}
	result := EvaluateRequest("resolve_formula", map[string]any{"recipe": recipe, "arguments": map[string]any{"formula_id": "mix"}})
	if result.Status != "ok" {
		t.Fatalf("resolve = %#v", result)
	}
	quantities := result.Result.(map[string]any)["quantities"].([]any)
	if len(quantities) != 2 || quantities[0].(map[string]any)["quantity"].(Quantity).Value != "100" || quantities[1].(map[string]any)["quantity"].(Quantity).Value != "200" {
		t.Fatalf("quantities = %#v", quantities)
	}
	evaluation := result.FormulaEvaluations.([]any)[0].(map[string]any)
	if evaluation["authored_total"].(Quantity).Value != "400" || evaluation["selected_total"].(Quantity).Value != "300" {
		t.Fatalf("formula evaluation = %#v", evaluation)
	}
}

func TestSelectedReadingOrderAndScheduleIgnoreInactiveEdges(t *testing.T) {
	for _, operation := range []string{"reading_order", "schedule"} {
		recipe := phase9Recipe(t)
		delete(recipe, "components")
		sequence := recipe["method"].(map[string]any)["sequence"].([]any)
		mix := sequence[0].(map[string]any)["sequence"].([]any)[0].(map[string]any)
		mix["uses"] = mix["uses"].([]any)[:3]
		result := EvaluateRequest(operation, map[string]any{
			"recipe":    recipe,
			"arguments": map[string]any{},
		})
		if result.Status != "ok" {
			t.Fatalf("%s = %#v", operation, result)
		}
		steps := result.Result.(map[string]any)["steps"].([]any)
		if len(steps) != 3 || steps[0].(map[string]any)["id"] != "mix" || steps[1].(map[string]any)["id"] != "cold-proof" || steps[2].(map[string]any)["id"] != "bake" {
			t.Fatalf("%s steps = %#v", operation, steps)
		}
	}
}

func TestBundleComponentScalingUsesExactYield(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "testdata", "phase9.schemami-bundle.json"))
	if err != nil {
		t.Fatal(err)
	}
	var bundle map[string]any
	if err := json.Unmarshal(raw, &bundle); err != nil {
		t.Fatal(err)
	}
	result := EvaluateRequest("scale", map[string]any{
		"bundle":    bundle,
		"arguments": map[string]any{"factor": "2"},
	})
	if result.Status != "ok" {
		t.Fatalf("scale = %#v", result)
	}
	instances := result.Result.(map[string]any)["component_instances"].([]any)
	if len(instances) != 1 {
		t.Fatalf("instances = %#v", instances)
	}
	quantities := instances[0].(map[string]any)["quantities"].([]any)
	flour := quantities[0].(map[string]any)["quantity"].(Quantity)
	water := quantities[1].(map[string]any)["quantity"].(Quantity)
	if flour.Value != "240" || water.Value != "160" {
		t.Fatalf("child quantities = %#v", quantities)
	}
	evaluation := result.Evaluation.(map[string]any)
	if _, present := evaluation["bundle_sha256"]; !present {
		t.Fatal("bundle operation omitted bundle_sha256")
	}
}

func TestBundleComponentScalingConvertsCompatibleUCUMYieldExactly(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "testdata", "phase9.schemami-bundle.json"))
	if err != nil {
		t.Fatal(err)
	}
	var bundle map[string]any
	if err := json.Unmarshal(raw, &bundle); err != nil {
		t.Fatal(err)
	}
	documents := bundle["documents"].([]any)
	root := documents[0].(map[string]any)["document"].(map[string]any)
	root["components"].([]any)[0].(map[string]any)["quantity"] = map[string]any{
		"kind": "measured", "value": "0.2", "unit": "kg",
	}
	digest := digestJCS(root)
	documents[0].(map[string]any)["sha256"] = digest
	bundle["root"].(map[string]any)["sha256"] = digest

	result := EvaluateRequest("scale", map[string]any{
		"bundle":    bundle,
		"arguments": map[string]any{"factor": "2"},
	})
	if result.Status != "ok" {
		t.Fatalf("scale = %#v", result)
	}
	quantities := result.Result.(map[string]any)["component_instances"].([]any)[0].(map[string]any)["quantities"].([]any)
	flour := quantities[0].(map[string]any)["quantity"].(Quantity)
	water := quantities[1].(map[string]any)["quantity"].(Quantity)
	if flour.Value != "240" || water.Value != "160" {
		t.Fatalf("child quantities = %#v", quantities)
	}
}

func TestBundleComponentScalingRefusesMissingBytesAndYield(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "testdata", "phase9.schemami-bundle.json"))
	if err != nil {
		t.Fatal(err)
	}
	var original map[string]any
	if err := json.Unmarshal(raw, &original); err != nil {
		t.Fatal(err)
	}

	missingBytes := cloneTestMap(t, original)
	missingBytes["documents"] = missingBytes["documents"].([]any)[:1]
	unresolved := EvaluateRequest("scale", map[string]any{"bundle": missingBytes, "arguments": map[string]any{"factor": "1"}})
	if unresolved.Status != "refused" || len(unresolved.Problems) != 1 || unresolved.Problems[0].Type != problemBase+"unresolved-reference" || unresolved.Problems[0].Pointer != "/bundle/documents" {
		t.Fatalf("missing bytes = %#v", unresolved)
	}

	missingYield := cloneTestMap(t, original)
	documents := missingYield["documents"].([]any)
	root := documents[0].(map[string]any)["document"].(map[string]any)
	child := documents[1].(map[string]any)["document"].(map[string]any)
	delete(child["outputs"].([]any)[0].(map[string]any), "yield")
	childDigest := digestJCS(child)
	documents[1].(map[string]any)["sha256"] = childDigest
	root["components"].([]any)[0].(map[string]any)["recipe"].(map[string]any)["sha256"] = childDigest
	rootDigest := digestJCS(root)
	documents[0].(map[string]any)["sha256"] = rootDigest
	missingYield["root"].(map[string]any)["sha256"] = rootDigest
	refused := EvaluateRequest("scale", map[string]any{"bundle": missingYield, "arguments": map[string]any{"factor": "1"}})
	if refused.Status != "refused" || len(refused.Problems) != 1 || refused.Problems[0].Type != problemBase+"missing-fact" || refused.Problems[0].Pointer != "/recipe/components/0/output" {
		t.Fatalf("missing yield = %#v", refused)
	}
}

func TestBundleComponentScalingPreservesSiblingAndNestedInstances(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "testdata", "phase9.schemami-bundle.json"))
	if err != nil {
		t.Fatal(err)
	}
	var original map[string]any
	if err := json.Unmarshal(raw, &original); err != nil {
		t.Fatal(err)
	}

	siblingBundle := cloneTestMap(t, original)
	siblingDocuments := siblingBundle["documents"].([]any)
	siblingRoot := siblingDocuments[0].(map[string]any)["document"].(map[string]any)
	components := siblingRoot["components"].([]any)
	sibling := cloneTestMap(t, components[0].(map[string]any))
	sibling["id"], sibling["name"] = "child_two", "Second component"
	sibling["quantity"] = map[string]any{"kind": "measured", "value": "300", "unit": "g"}
	siblingRoot["components"] = append(components, sibling)
	siblingRootDigest := digestJCS(siblingRoot)
	siblingDocuments[0].(map[string]any)["sha256"] = siblingRootDigest
	siblingBundle["root"].(map[string]any)["sha256"] = siblingRootDigest
	siblingResult := EvaluateRequest("scale", map[string]any{"bundle": siblingBundle, "arguments": map[string]any{"factor": "1"}})
	if siblingResult.Status != "ok" {
		t.Fatalf("sibling scale = %#v", siblingResult)
	}
	siblingInstances := siblingResult.Result.(map[string]any)["component_instances"].([]any)
	if len(siblingInstances) != 2 {
		t.Fatalf("sibling instances = %#v", siblingInstances)
	}
	secondPath := siblingInstances[1].(map[string]any)["component_path"].([]any)
	secondQuantities := siblingInstances[1].(map[string]any)["quantities"].([]any)
	if len(secondPath) != 1 || secondPath[0] != "child_two" || secondQuantities[0].(map[string]any)["quantity"].(Quantity).Value != "180" || secondQuantities[1].(map[string]any)["quantity"].(Quantity).Value != "120" {
		t.Fatalf("second sibling = %#v", siblingInstances[1])
	}

	nestedBundle := cloneTestMap(t, original)
	nestedDocuments := nestedBundle["documents"].([]any)
	nestedRoot := nestedDocuments[0].(map[string]any)["document"].(map[string]any)
	nestedChild := nestedDocuments[1].(map[string]any)["document"].(map[string]any)
	grandchild := map[string]any{
		"schemami": "1", "collection": "conformance", "id": "z-grandchild", "revision": float64(1), "content_language": "pt-PT", "title": "Grandchild",
		"ingredients": []any{map[string]any{"id": "salt", "name": "Salt", "quantity": map[string]any{"kind": "measured", "value": "25", "unit": "g"}}},
		"outputs":     []any{map[string]any{"id": "portion", "name": "Portion", "yield": map[string]any{"kind": "measured", "value": "25", "unit": "g"}}},
		"method": map[string]any{"sequence": []any{map[string]any{
			"kind": "step", "id": "prepare", "instruction": "Prepare.",
			"uses": []any{map[string]any{"kind": "ingredient", "id": "salt"}}, "produces": []any{map[string]any{"kind": "output", "id": "portion"}},
		}}},
	}
	grandchildDigest := digestJCS(grandchild)
	nestedChild["components"] = []any{map[string]any{
		"id": "nested", "name": "Nested", "recipe": map[string]any{"collection": "conformance", "id": "z-grandchild", "revision": float64(1), "sha256": grandchildDigest},
		"output": "portion", "quantity": map[string]any{"kind": "measured", "value": "50", "unit": "g"},
	}}
	childDigest := digestJCS(nestedChild)
	nestedDocuments[1].(map[string]any)["sha256"] = childDigest
	nestedRoot["components"].([]any)[0].(map[string]any)["recipe"].(map[string]any)["sha256"] = childDigest
	rootDigest := digestJCS(nestedRoot)
	nestedDocuments[0].(map[string]any)["sha256"] = rootDigest
	nestedBundle["root"].(map[string]any)["sha256"] = rootDigest
	nestedBundle["documents"] = append(nestedDocuments, map[string]any{"sha256": grandchildDigest, "document": grandchild})
	nestedResult := EvaluateRequest("scale", map[string]any{"bundle": nestedBundle, "arguments": map[string]any{"factor": "1"}})
	if nestedResult.Status != "ok" {
		t.Fatalf("nested scale = %#v", nestedResult)
	}
	nestedInstances := nestedResult.Result.(map[string]any)["component_instances"].([]any)
	if len(nestedInstances) != 2 {
		t.Fatalf("nested instances = %#v", nestedInstances)
	}
	nestedPath := nestedInstances[1].(map[string]any)["component_path"].([]any)
	nestedQuantities := nestedInstances[1].(map[string]any)["quantities"].([]any)
	if len(nestedPath) != 2 || nestedPath[0] != "child" || nestedPath[1] != "nested" || nestedQuantities[0].(map[string]any)["quantity"].(Quantity).Value != "100" {
		t.Fatalf("nested component = %#v", nestedInstances[1])
	}
}

func TestBundleComposesReadingOrderAndScheduleAtConsumer(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "testdata", "phase9.schemami-bundle.json"))
	if err != nil {
		t.Fatal(err)
	}
	var bundle map[string]any
	if err := json.Unmarshal(raw, &bundle); err != nil {
		t.Fatal(err)
	}
	for _, operation := range []string{"reading_order", "schedule"} {
		result := EvaluateRequest(operation, map[string]any{"bundle": bundle, "arguments": map[string]any{}})
		if result.Status != "ok" {
			t.Fatalf("%s = %#v", operation, result)
		}
		steps := result.Result.(map[string]any)["steps"].([]any)
		if len(steps) != 2 || steps[0].(map[string]any)["id"] != "prepare" || steps[1].(map[string]any)["id"] != "finish" {
			t.Fatalf("%s steps = %#v", operation, steps)
		}
		if operation == "schedule" {
			if steps[0].(map[string]any)["end"] != "PT5M" || steps[1].(map[string]any)["start"] != "PT5M" {
				t.Fatalf("schedule alignment = %#v", steps)
			}
		}
	}
}

func TestBundleResolveSelectionReturnsInstancePreorder(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "testdata", "phase9.schemami-bundle.json"))
	if err != nil {
		t.Fatal(err)
	}
	var bundle map[string]any
	if err := json.Unmarshal(raw, &bundle); err != nil {
		t.Fatal(err)
	}
	result := EvaluateRequest("resolve_selection", map[string]any{"bundle": bundle, "arguments": map[string]any{}})
	if result.Status != "ok" {
		t.Fatalf("resolve_selection = %#v", result)
	}
	instances := result.Result.(map[string]any)["active_instances"].([]any)
	if len(instances) != 2 {
		t.Fatalf("instances = %#v", instances)
	}
	childPath := instances[1].(map[string]any)["component_path"].([]any)
	if len(childPath) != 1 || childPath[0] != "child" {
		t.Fatalf("child path = %#v", childPath)
	}
}

func TestBundleNestedSelectionIsScopedByComponentInstancePath(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "testdata", "phase9.schemami-bundle.json"))
	if err != nil {
		t.Fatal(err)
	}
	var bundle map[string]any
	if err := json.Unmarshal(raw, &bundle); err != nil {
		t.Fatal(err)
	}
	documents := bundle["documents"].([]any)
	root := documents[0].(map[string]any)["document"].(map[string]any)
	child := documents[1].(map[string]any)["document"].(map[string]any)
	child["parameters"] = []any{map[string]any{
		"id": "mode", "kind": "choice", "name": "Mode",
		"options": []any{map[string]any{"id": "cold", "name": "Cold"}, map[string]any{"id": "ambient", "name": "Ambient"}},
	}}
	childDigest := digestJCS(child)
	documents[1].(map[string]any)["sha256"] = childDigest
	root["components"].([]any)[0].(map[string]any)["recipe"].(map[string]any)["sha256"] = childDigest
	rootDigest := digestJCS(root)
	documents[0].(map[string]any)["sha256"] = rootDigest
	bundle["root"].(map[string]any)["sha256"] = rootDigest

	result := EvaluateRequest("resolve_selection", map[string]any{
		"bundle": bundle,
		"arguments": map[string]any{"selections": []any{map[string]any{
			"component_path": []any{"child"}, "bindings": map[string]any{"mode": "ambient"},
		}}},
	})
	if result.Status != "ok" {
		t.Fatalf("resolve_selection = %#v", result)
	}
	selections := result.Evaluation.(map[string]any)["selections"].([]any)
	var childSelection map[string]any
	for _, candidate := range selections {
		selection := candidate.(map[string]any)
		path := selection["component_path"].([]any)
		if len(path) == 1 && path[0] == "child" {
			childSelection = selection
			break
		}
	}
	if childSelection == nil {
		t.Fatalf("selections = %#v", selections)
	}
	binding := childSelection["bindings"].([]any)[0].(map[string]any)
	if binding["parameter"] != "mode" || binding["value"] != "ambient" || binding["source"] != "argument" {
		t.Fatalf("binding = %#v", binding)
	}
}

func TestReachableGraphResourceLimitDiagnosticIsDeterministic(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "resources", "conformance", "validation.json"))
	if err != nil {
		t.Fatal(err)
	}
	var corpus struct {
		Vectors []struct {
			ID       string         `json:"id"`
			Document map[string]any `json:"document"`
		} `json:"vectors"`
	}
	if err := json.Unmarshal(raw, &corpus); err != nil {
		t.Fatal(err)
	}
	for _, vector := range corpus.Vectors {
		if vector.ID != "distinct-active-graphs-over-budget-refuse" {
			continue
		}
		problems := ValidateReachableGraphs(vector.Document)
		if len(problems) != 1 || problems[0].Type != problemBase+"resource-limit" || problems[0].Pointer != "" {
			t.Fatalf("problems = %#v", problems)
		}
		return
	}
	t.Fatal("resource-limit conformance vector not found")
}

func TestReachableGraphsPruneParametersWithoutActivationSites(t *testing.T) {
	parameters := make([]any, 64)
	for index := range parameters {
		parameters[index] = map[string]any{"id": fmt.Sprintf("toggle_%d", index), "kind": "toggle", "name": "Unused"}
	}
	recipe := map[string]any{
		"parameters":  parameters,
		"ingredients": []any{},
		"method":      map[string]any{"sequence": []any{}},
		"x-adversary": map[string]any{"kind": "toggle_is", "parameter": "toggle_0", "enabled": true},
	}
	if problems := ValidateReachableGraphs(recipe); len(problems) != 0 {
		t.Fatalf("unused parameters changed the reachable graph: %#v", problems)
	}
}

func TestReachableGraphsBoundEquivalentActivationRegions(t *testing.T) {
	parameters := make([]any, 14)
	conditions := make([]any, 14)
	for index := range parameters {
		id := fmt.Sprintf("toggle_%d", index)
		parameters[index] = map[string]any{"id": id, "kind": "toggle", "name": "Toggle"}
		conditions[index] = map[string]any{"kind": "any", "conditions": []any{
			map[string]any{"kind": "toggle_is", "parameter": id, "enabled": true},
			map[string]any{"kind": "toggle_is", "parameter": id, "enabled": false},
		}}
	}
	recipe := map[string]any{
		"parameters": parameters,
		"ingredients": []any{map[string]any{"id": "always", "name": "Always", "activation": map[string]any{
			"kind": "all", "conditions": conditions,
		}}},
		"method": map[string]any{"sequence": []any{}},
	}
	problems := ValidateReachableGraphs(recipe)
	if len(problems) != 0 {
		t.Fatalf("equivalent activation regions changed the reachable graph: %#v", problems)
	}
}
