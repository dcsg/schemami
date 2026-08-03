package calc

// Verbatim table tests of calculus/SPEC.md's worked examples, named by
// their WE-ids (AC-2.3). A failing test here means the implementation
// diverged from the SPEC's own numbers.

import (
	"math"
	"strings"
	"testing"
)

func tol(a, b float64) bool {
	return math.Abs(a-b) <= 1e-9*math.Max(1, math.Max(math.Abs(a), math.Abs(b))) // N-2
}

func chucruteShaped(saltFixed bool) map[string]any {
	salt := map[string]any{"ratio": 0.02, "of": "veg"}
	if saltFixed {
		salt = map[string]any{"value": 20.0, "unit": "g", "scaling": "fixed"}
	}
	return map[string]any{
		"bases": map[string]any{"veg": map[string]any{"sum": "ingredients", "where": map[string]any{"roles": []any{"substrate"}}}},
		"ingredients": []any{
			map[string]any{"id": "cabbage", "amount": map[string]any{"value": 1000.0, "unit": "g"}, "roles": []any{"substrate"}},
			map[string]any{"id": "salt", "amount": salt, "roles": []any{"salt"},
				"constraints": []any{map[string]any{"min_ratio": 0.018, "of": "veg", "severity": "critical",
					"reason": map[string]any{"pt": "Sal abaixo de 1,8% não preserva.", "en": "Salt below 1.8% does not preserve."}}}},
		},
	}
}

// WE-SCALE-1 — uniform ×0.6: cabbage scales, ratio invariant, resolved 12 g.
func TestWE_SCALE_1(t *testing.T) {
	doc := chucruteShaped(false)
	scaled := Scale(doc, 0.6)
	cab := scaled["ingredients"].([]any)[0].(map[string]any)["amount"].(map[string]any)
	if v, _ := toF(cab["value"]); !tol(v, 600) {
		t.Errorf("cabbage = %v, want 600", v)
	}
	salt := scaled["ingredients"].([]any)[1].(map[string]any)["amount"].(map[string]any)
	if r, _ := toF(salt["ratio"]); !tol(r, 0.02) {
		t.Errorf("salt ratio = %v, want 0.02 (R-MODEL-2 invariance)", r)
	}
	g, ok, _ := basisGramTotal(doc, "veg", 0.6)
	if !ok || !tol(0.02*g, 12) {
		t.Errorf("resolved salt mass = %v g, want 12", 0.02*g)
	}
}

// WE-BASIS-1 — massa-folhada: flour 500 g; água 275 g; sal 10 g.
func TestWE_BASIS_1(t *testing.T) {
	doc := map[string]any{
		"bases": map[string]any{"flour": map[string]any{"sum": "ingredients", "where": map[string]any{"roles": []any{"flour"}}}},
		"ingredients": []any{
			map[string]any{"id": "farinha", "amount": map[string]any{"value": 500.0, "unit": "g"}, "roles": []any{"flour"}},
			map[string]any{"id": "agua", "amount": map[string]any{"ratio": 0.55, "of": "flour"}, "roles": []any{"hydration"}},
			map[string]any{"id": "sal", "amount": map[string]any{"ratio": 0.02, "of": "flour"}, "roles": []any{"salt"}},
		},
	}
	res := ResolveBases(doc, 1)["flour"]
	if !res.OK || !tol(res.Grams, 500) {
		t.Fatalf("flour basis = %+v, want 500 g", res)
	}
	if !tol(0.55*res.Grams, 275) || !tol(0.02*res.Grams, 10) {
		t.Errorf("resolved: agua %v, sal %v — want 275 / 10", 0.55*res.Grams, 0.02*res.Grams)
	}
}

// WE-GUARD-1 — autolise toggle: defaults → s1,s2,s4; false → s1,s3,s4.
func TestWE_GUARD_1(t *testing.T) {
	doc := map[string]any{
		"options": []any{map[string]any{"id": "autolise", "kind": "toggle", "default": true}},
		"steps": []any{
			map[string]any{"id": "s1"},
			map[string]any{"id": "s2", "when": map[string]any{"option": "autolise"}},
			map[string]any{"id": "s3", "when": map[string]any{"not": map[string]any{"option": "autolise"}}},
			map[string]any{"id": "s4"},
		},
	}
	ids := func(steps []map[string]any) string {
		var out []string
		for _, s := range steps {
			out = append(out, s["id"].(string))
		}
		return strings.Join(out, ",")
	}
	on, err := SelectGuardPath(doc, Selection{})
	if err != nil || ids(on) != "s1,s2,s4" {
		t.Errorf("defaults: %s (err %v), want s1,s2,s4", ids(on), err)
	}
	off, err := SelectGuardPath(doc, Selection{Options: map[string]any{"autolise": false}})
	if err != nil || ids(off) != "s1,s3,s4" {
		t.Errorf("off: %s (err %v), want s1,s3,s4", ids(off), err)
	}
	if _, err := SelectGuardPath(doc, Selection{Options: map[string]any{"nope": true}}); err == nil {
		t.Error("unknown option accepted — R-GUARD-2 wants unresolvable")
	}
}

// WE-ENFORCE-1 — fixed-salt ×2 refused with the authored reason; ×1 accepted.
func TestWE_ENFORCE_1(t *testing.T) {
	doc := chucruteShaped(true)
	f := &Findings{}
	EnforceConstraints("we-enforce", doc, 2.0, f)
	if len(f.Refusals) != 1 {
		t.Fatalf("refusals = %v, want exactly one", f.Refusals)
	}
	if !strings.Contains(f.Refusals[0], "0.0100 < min_ratio 0.0180") {
		t.Errorf("refusal lacks resolved math: %s", f.Refusals[0])
	}
	if !strings.Contains(f.Refusals[0], "Sal abaixo de 1,8%") || !strings.Contains(f.Refusals[0], "Salt below 1.8%") {
		t.Errorf("authored pt/en reason not passed through verbatim (R-ENFORCE-4): %s", f.Refusals[0])
	}
	f2 := &Findings{}
	EnforceConstraints("we-enforce", doc, 1.0, f2)
	if len(f2.Refusals) != 0 {
		t.Errorf("k=1 refused: %v (R-SCALE-4 identity)", f2.Refusals)
	}
}

// WE-MINBATCH-1 — ×0.05 refused; ×3 not.
func TestWE_MINBATCH_1(t *testing.T) {
	doc := map[string]any{"maintenance": true, "min_batch": map[string]any{"value": 100.0, "unit": "g"},
		"ingredients": []any{}}
	f := &Findings{}
	MinBatchFloor("massa-mae", doc, 0.05, f)
	if len(f.Refusals) != 1 || !strings.Contains(f.Refusals[0], "min_batch 100 g floors the draw") {
		t.Errorf("×0.05: %v", f.Refusals)
	}
	f2 := &Findings{}
	MinBatchFloor("massa-mae", doc, 3.0, f2)
	if len(f2.Refusals) != 0 {
		t.Errorf("×3 refused: %v (R-MINBATCH-2)", f2.Refusals)
	}
}

// WE-FIXED-1 — the transform trio.
func TestWE_FIXED_1(t *testing.T) {
	fixed := FixedQuantityTransform(map[string]any{"value": 20.0, "unit": "g", "scaling": "fixed"}, 2)
	if v, _ := toF(fixed["value"]); !tol(v, 20) {
		t.Errorf("fixed: %v, want 20", v)
	}
	scaled := FixedQuantityTransform(map[string]any{"value": 1000.0, "unit": "g"}, 2)
	if v, _ := toF(scaled["value"]); !tol(v, 2000) {
		t.Errorf("scalable: %v, want 2000", v)
	}
	ratio := FixedQuantityTransform(map[string]any{"ratio": 0.02, "of": "veg"}, 7)
	if r, _ := toF(ratio["ratio"]); !tol(r, 0.02) {
		t.Errorf("ratio: %v, want 0.02", r)
	}
}

// WE-DUR-1 — identity.
func TestWE_DUR_1(t *testing.T) {
	w := map[string]any{"min": "25m", "target": "30m", "max": "35m"}
	got := ReestimateDurations(w, 2)
	if got["target"] != "30m" || got["min"] != "25m" || got["max"] != "35m" {
		t.Errorf("not identity: %v (R-DUR-1)", got)
	}
}

// R-BASIS-2 — include_components decomposition (the approved upgrade):
// inline components decompose; a ref makes the basis unresolvable.
func TestR_BASIS_2(t *testing.T) {
	doc := map[string]any{
		"bases": map[string]any{"flour": map[string]any{"sum": "ingredients",
			"where": map[string]any{"roles": []any{"flour"}}, "include_components": true}},
		"ingredients": []any{map[string]any{"id": "t65", "amount": map[string]any{"value": 6000.0, "unit": "g"}, "roles": []any{"flour"}}},
		"components": []any{map[string]any{"id": "mv", "ingredients": []any{
			map[string]any{"id": "mv-flour", "amount": map[string]any{"value": 1500.0, "unit": "g"}, "roles": []any{"flour"}}}}},
	}
	g, ok, _ := basisGramTotal(doc, "flour", 1)
	if !ok || !tol(g, 7500) {
		t.Errorf("decomposed total = %v ok=%v, want 7500", g, ok)
	}
	doc["components"] = []any{map[string]any{"id": "ext", "ref": "some-recipe"}}
	if _, ok, _ := basisGramTotal(doc, "flour", 1); ok {
		t.Error("ref-containing basis resolved — R-BASIS-2 wants unresolvable")
	}
}
