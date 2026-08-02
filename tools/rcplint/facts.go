package main

// facts (DS-VAL-003 adjusted): export resolved-value checks for the CUE
// layer. Numeric bounds are READ from the profile schemas' x-rcp-bounds —
// never restated in .cue or here beyond pass-through. The CUE relation
// (schema/constraints/bounds.cue) is the enforcement; this exporter only
// resolves document values against declared bases.

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
)

type Check struct {
	Doc      string  `json:"doc"`
	Bound    string  `json:"bound"`
	Of       string  `json:"of,omitempty"`
	Value    float64 `json:"value"`
	Min      float64 `json:"min"`
	Max      float64 `json:"max"`
	Severity string  `json:"severity"`
	ReasonEN string  `json:"reason_en,omitempty"`
	ReasonPT string  `json:"reason_pt,omitempty"`
}

func runFacts(root string, paths []string) int {
	bounds := map[string]map[string]map[string]any{} // kind -> bound name -> spec
	profGlob, _ := filepath.Glob(filepath.Join(root, "schema/profiles/*.schema.json"))
	for _, p := range profGlob {
		kind := trimSuffix(filepath.Base(p), ".schema.json")
		raw, err := os.ReadFile(p)
		if err != nil {
			continue
		}
		var s map[string]any
		if json.Unmarshal(raw, &s) != nil {
			continue
		}
		if b, ok := s["x-rcp-bounds"].(map[string]any); ok {
			bounds[kind] = map[string]map[string]any{}
			for name, spec := range b {
				if sm, ok := spec.(map[string]any); ok {
					bounds[kind][name] = sm
				}
			}
		}
	}
	if len(paths) == 0 {
		paths, _ = filepath.Glob(filepath.Join(root, "examples/*.rcp.yaml"))
		sort.Strings(paths)
	}
	var checks []Check
	for _, path := range paths {
		docs, err := LoadDocuments(path)
		if err != nil {
			fmt.Fprintln(os.Stderr, "facts:", err)
			return 2
		}
		for _, d := range docs {
			collectChecks(d.ID, d.Value, bounds, &checks)
		}
	}
	// DS-PROF-002 (PLAN-rcp-v02 Phase 2): severity is enforcement routing,
	// not decoration. Only critical bounds enter the CUE-gated checks;
	// everything else is an advisory — surfaced, never rejecting a document.
	// Safety bounds stay fail-closed (DECISIONS #15) because they are
	// authored critical.
	gated := []Check{}
	advisories := []Check{}
	for _, c := range checks {
		if c.Severity == "critical" {
			gated = append(gated, c)
		} else {
			advisories = append(advisories, c)
		}
	}
	out, _ := json.MarshalIndent(map[string]any{"checks": gated, "advisories": advisories}, "", "  ")
	fmt.Println(string(out))
	return 0
}

func collectChecks(id string, v any, bounds map[string]map[string]map[string]any, checks *[]Check) {
	m, ok := v.(map[string]any)
	if !ok {
		return
	}
	kind, _ := m["kind"].(string)
	if kb, ok := bounds[kind]; ok {
		if kind == "bread" {
			// SCOPE (v0.1): only amounts already expressed as {ratio, of: flour}
			// are checked. Gram-to-basis resolution requires preferment
			// decomposition (research 03) — Recipe Calculus work
			// (FEAT-CALC-001), deliberately not faked here.
			for _, bn := range []struct{ name, role string }{{"salt_ratio", "salt"}, {"hydration_ratio", "hydration"}} {
				spec, has := kb[bn.name]
				if !has {
					continue
				}
				if val := roleRatioOfFlour(m, bn.role); val > 0 {
					*checks = append(*checks, mkCheck(id, bn.name, "flour", val, spec))
				}
			}
		}
		if kind == "pastry" {
			for _, sv := range stepList(m) {
				prim := primID(sv)
				if t, ok := sv["temperature"].(map[string]any); ok {
					if prim == "primitive.cook-custard" {
						if spec, has := kb["custard_temperature_c"]; has {
							if tv, ok := toF(t["target"]); ok {
								*checks = append(*checks, mkCheck(id, "custard_temperature_c", "", tv, spec))
							}
						}
					}
					if prim == "primitive.laminate" {
						if spec, has := kb["lamination_max_temperature_c"]; has {
							if tv, ok := toF(t["max"]); ok {
								*checks = append(*checks, mkCheck(id, "lamination_max_temperature_c", "", tv, spec))
							}
						}
					}
				}
			}
		}
	}
	if comps, ok := m["components"].([]any); ok {
		for _, cv := range comps {
			if cm, ok := cv.(map[string]any); ok {
				cid, _ := cm["id"].(string)
				collectChecks(id+"/"+cid, cm, bounds, checks)
			}
		}
	}
}

func mkCheck(doc, name, of string, val float64, spec map[string]any) Check {
	c := Check{Doc: doc, Bound: name, Of: of, Value: val, Min: -1.0e308, Max: 1.0e308, Severity: "warn"}
	if v, ok := toF(spec["min"]); ok {
		c.Min = v
	}
	if v, ok := toF(spec["max"]); ok {
		c.Max = v
	}
	if s, ok := spec["severity"].(string); ok {
		c.Severity = s
	}
	if r, ok := spec["reason"].(map[string]any); ok {
		c.ReasonEN, _ = r["en"].(string)
		c.ReasonPT, _ = r["pt"].(string)
	}
	return c
}

func stepList(m map[string]any) []map[string]any {
	var out []map[string]any
	if steps, ok := m["steps"].([]any); ok {
		for _, sv := range steps {
			if sm, ok := sv.(map[string]any); ok {
				out = append(out, sm)
			}
		}
	}
	return out
}

func primID(sm map[string]any) string {
	if pm, ok := sm["primitive"].(map[string]any); ok {
		if id, ok := pm["id"].(string); ok {
			return id
		}
	}
	return ""
}

func roleSumGrams(m map[string]any, role string) float64 {
	sum := 0.0
	each := func(mm map[string]any) {
		if !hasRole(mm, role) {
			return
		}
		if am, ok := mm["amount"].(map[string]any); ok {
			if u, _ := am["unit"].(string); u == "g" {
				if v, ok := toF(am["value"]); ok {
					sum += v
				}
			}
		}
	}
	if ings, ok := m["ingredients"].([]any); ok {
		for _, iv := range ings {
			if im, ok := iv.(map[string]any); ok {
				each(im)
			}
		}
	}
	return sum
}

// roleRatioOfFlour sums direct `{ratio: X, of: flour}` amounts for a role —
// already a fraction of the basis, no gram resolution needed.
func roleRatioOfFlour(m map[string]any, role string) float64 {
	sum := 0.0
	if ings, ok := m["ingredients"].([]any); ok {
		for _, iv := range ings {
			im, ok := iv.(map[string]any)
			if !ok || !hasRole(im, role) {
				continue
			}
			if am, ok := im["amount"].(map[string]any); ok {
				if of, _ := am["of"].(string); of == "flour" {
					if r, ok := toF(am["ratio"]); ok {
						sum += r
					}
				}
			}
		}
	}
	return sum
}

func hasRole(im map[string]any, role string) bool {
	if rs, ok := im["roles"].([]any); ok {
		for _, rv := range rs {
			if r, ok := rv.(string); ok && r == role {
				return true
			}
		}
	}
	return false
}

func toF(v any) (float64, bool) {
	switch t := v.(type) {
	case float64:
		return t, true
	case int:
		return float64(t), true
	}
	return 0, false
}

func trimSuffix(s, suf string) string {
	if len(s) >= len(suf) && s[len(s)-len(suf):] == suf {
		return s[:len(s)-len(suf)]
	}
	return s
}
