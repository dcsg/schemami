package main

// clamp (CMP-SAFE-001; SR-SAFE-001; DS-SAFE-001) — the THROWAWAY
// fail-closed scaler guard. It is NOT the Recipe Calculus (FEAT-CALC-001)
// and is excluded from the normative protocol surface (SSP-001).
// Semantics: given an admitted document and a scale factor, recompute
// severity: critical constraints at resolved values; any violation — or
// ANY uncertainty (unresolvable basis, missing quantity) — refuses with
// the authored reason. warn-severity violations are surfaced, never block.
// Maintenance components are drawn from, not multiplied; min_batch floors.
// Ratio-first documents scale parts without assuming mass units.

import (
	"fmt"
	"strings"
)

type clampResult struct {
	refusals []string
	warnings []string
}

func runClamp(root string, scale float64, path, docID string) int {
	docs, err := LoadDocuments(path)
	if err != nil {
		fmt.Println("clamp: load:", err)
		return 2
	}
	var target *Document
	for i := range docs {
		if docID == "" || docs[i].ID == docID {
			target = &docs[i]
			break
		}
	}
	if target == nil {
		fmt.Printf("clamp: document %q not found in %s\n", docID, path)
		return 2
	}
	m, ok := target.Value.(map[string]any)
	if !ok {
		fmt.Println("clamp: not a mapping document")
		return 2
	}
	res := &clampResult{}
	clampScope(target.ID, m, scale, res)

	for _, w := range res.warnings {
		fmt.Println("WARN", w)
	}
	if len(res.refusals) > 0 {
		fmt.Println("REFUSED — scaling would violate safety bounds or cannot be verified:")
		for _, r := range res.refusals {
			fmt.Println("  ", r)
		}
		return 1
	}
	fmt.Printf("ACCEPTED — scale ×%g preserves all critical bounds (throwaway clamp, not the Recipe Calculus)\n", scale)
	return 0
}

func clampScope(loc string, m map[string]any, scale float64, res *clampResult) {
	// maintenance components: drawn from, not multiplied — but min_batch
	// still floors the DRAW implied by scaling the parent.
	if mb, ok := m["min_batch"].(map[string]any); ok {
		if isTrue(m["maintenance"]) {
			if v, okv := toF(mb["value"]); okv {
				// the draw scales with the parent; a scale that implies less
				// than min_batch worth of culture activity is refused —
				// conservatively: scaled min_batch below itself never happens,
				// so refuse when scale shrinks the batch below viability.
				if scale < 1 {
					implied := v * scale
					if implied < v {
						res.refusals = append(res.refusals,
							fmt.Sprintf("%s: maintenance culture min_batch %g g floors the draw — scale ×%g implies %g g (cannot build less than the minimum viable batch; DS-SAFE-001/min_batch)", loc, v, scale, implied))
					}
				}
			}
		}
	}
	ings, _ := m["ingredients"].([]any)
	for _, iv := range ings {
		im, ok := iv.(map[string]any)
		if !ok {
			continue
		}
		id, _ := im["id"].(string)
		cs, _ := im["constraints"].([]any)
		if len(cs) == 0 {
			continue
		}
		val, kind, resolvable := resolvedRatio(m, im, scale)
		for _, cv := range cs {
			cm, ok := cv.(map[string]any)
			if !ok {
				continue
			}
			sev, _ := cm["severity"].(string)
			reason := renderReason(cm["reason"])
			if !resolvable {
				if sev == "critical" {
					res.refusals = append(res.refusals,
						fmt.Sprintf("%s: ingredient %q critical constraint cannot be verified (%s) — uncertainty defaults to refusal (AC-SAFE-001-2). %s", loc, id, kind, reason))
				} else {
					res.warnings = append(res.warnings, fmt.Sprintf("%s: ingredient %q %s constraint unverifiable (%s)", loc, id, sev, kind))
				}
				continue
			}
			// ratio constraints are scale-invariant when amount is ratio-of-
			// basis; gram-vs-gram-basis ratios are also invariant. What breaks
			// bounds is asymmetric scaling — the throwaway clamp checks the
			// RESOLVED value after uniform scale (invariant) and flags any
			// authored bound already out of range, plus min_value/max_value
			// absolute bounds which DO move with scale.
			minR, hasMin := toF(cm["min_ratio"])
			maxR, hasMax := toF(cm["max_ratio"])
			if hasMin && val < minR {
				msg := fmt.Sprintf("%s: ingredient %q resolved ratio %.4f < min_ratio %.4f. %s", loc, id, val, minR, reason)
				if sev == "critical" {
					res.refusals = append(res.refusals, msg)
				} else {
					res.warnings = append(res.warnings, msg)
				}
			}
			if hasMax && val > maxR {
				msg := fmt.Sprintf("%s: ingredient %q resolved ratio %.4f > max_ratio %.4f. %s", loc, id, val, maxR, reason)
				if sev == "critical" {
					res.refusals = append(res.refusals, msg)
				} else {
					res.warnings = append(res.warnings, msg)
				}
			}
			if mv, has := toF(cm["min_value"]); has {
				if abs, k, okv := absoluteValue(im); okv && abs*scale < mv {
					msg := fmt.Sprintf("%s: ingredient %q scaled %s %.2f < min_value %.2f. %s", loc, id, k, abs*scale, mv, reason)
					if sev == "critical" {
						res.refusals = append(res.refusals, msg)
					} else {
						res.warnings = append(res.warnings, msg)
					}
				}
			}
			if xv, has := toF(cm["max_value"]); has {
				if abs, k, okv := absoluteValue(im); okv && abs*scale > xv {
					msg := fmt.Sprintf("%s: ingredient %q scaled %s %.2f > max_value %.2f. %s", loc, id, k, abs*scale, xv, reason)
					if sev == "critical" {
						res.refusals = append(res.refusals, msg)
					} else {
						res.warnings = append(res.warnings, msg)
					}
				}
			}
		}
	}
	if comps, ok := m["components"].([]any); ok {
		for _, cv := range comps {
			if cm, ok := cv.(map[string]any); ok {
				cid, _ := cm["id"].(string)
				if _, isRef := cm["ref"]; !isRef {
					clampScope(loc+"/"+cid, cm, scale, res)
				}
			}
		}
	}
}

// resolvedRatio computes an ingredient's value as a fraction of the basis
// its constraints reference, AFTER applying the scale transformation:
// quantities marked scaling: fixed do not scale; everything else does.
// Uniform scaling leaves ratio-of-basis amounts invariant (safe by
// construction); the asymmetry of fixed quantities is what breaks bounds.
func resolvedRatio(m, im map[string]any, scale float64) (float64, string, bool) {
	am, ok := im["amount"].(map[string]any)
	if !ok {
		return 0, "missing amount", false
	}
	// direct ratio-of-basis: scale-invariant under uniform scaling
	if r, ok := toF(am["ratio"]); ok {
		if of, ok := am["of"].(string); ok {
			if !basisDeclared(m, of) {
				return 0, fmt.Sprintf("basis %q unresolvable", of), false
			}
			return r, "", true
		}
		return 0, "ratio without basis", false
	}
	// gram amount vs gram-summable basis — scale-aware: this amount scales
	// unless marked scaling: fixed; the basis total scales with the recipe.
	if u, _ := am["unit"].(string); u == "g" {
		if v, ok := toF(am["value"]); ok {
			of := constraintBasis(im)
			if of == "" {
				return 0, "no basis named", false
			}
			total := basisGramTotal(m, of)
			if total <= 0 {
				return 0, fmt.Sprintf("basis %q not gram-resolvable", of), false
			}
			amtScale := scale
			if s, _ := am["scaling"].(string); s == "fixed" {
				amtScale = 1
			}
			return (v * amtScale) / (total * scale), "", true
		}
	}
	// parts / open quantities: no mass semantics — ratio-first documents
	// scale parts uniformly; ratio constraints on them are invariant, but
	// nothing here is gram-resolvable.
	if _, ok := am["parts"]; ok {
		return 0, "parts-based (ratio-first): no gram semantics", false
	}
	return 0, "quantity form not resolvable", false
}

func absoluteValue(im map[string]any) (float64, string, bool) {
	if am, ok := im["amount"].(map[string]any); ok {
		if v, ok := toF(am["value"]); ok {
			u, _ := am["unit"].(string)
			return v, u, true
		}
	}
	return 0, "", false
}

func constraintBasis(im map[string]any) string {
	if cs, ok := im["constraints"].([]any); ok {
		for _, cv := range cs {
			if cm, ok := cv.(map[string]any); ok {
				if of, ok := cm["of"].(string); ok {
					return of
				}
			}
		}
	}
	return ""
}

func basisDeclared(m map[string]any, name string) bool {
	if bm, ok := m["bases"].(map[string]any); ok {
		if _, has := bm[name]; has {
			return true
		}
	}
	return false
}

// basisGramTotal sums gram-valued ingredients matching the basis role
// filter. include_components decomposition is Calculus work — a basis that
// needs it reports non-resolvable rather than a wrong number.
func basisGramTotal(m map[string]any, name string) float64 {
	bm, ok := m["bases"].(map[string]any)
	if !ok {
		return 0
	}
	spec, ok := bm[name].(map[string]any)
	if !ok {
		return 0
	}
	if isTrue(spec["include_components"]) {
		return 0 // needs decomposition — refuse rather than under-count
	}
	var roles []string
	if wm, ok := spec["where"].(map[string]any); ok {
		if rs, ok := wm["roles"].([]any); ok {
			for _, rv := range rs {
				if r, ok := rv.(string); ok {
					roles = append(roles, r)
				}
			}
		}
	}
	total := 0.0
	if ings, ok := m["ingredients"].([]any); ok {
		for _, iv := range ings {
			im, ok := iv.(map[string]any)
			if !ok {
				continue
			}
			match := len(roles) == 0
			for _, r := range roles {
				if hasRole(im, r) {
					match = true
				}
			}
			if !match {
				continue
			}
			if am, ok := im["amount"].(map[string]any); ok {
				if u, _ := am["unit"].(string); u == "g" {
					if v, ok := toF(am["value"]); ok {
						total += v
					}
				}
			}
		}
	}
	return total
}

func renderReason(v any) string {
	rm, ok := v.(map[string]any)
	if !ok {
		return ""
	}
	var parts []string
	for _, lang := range []string{"pt", "en"} {
		if s, ok := rm[lang].(string); ok {
			parts = append(parts, lang+": "+s)
		}
	}
	return strings.Join(parts, " | ")
}

func isTrue(v any) bool { b, ok := v.(bool); return ok && b }
