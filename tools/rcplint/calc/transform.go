package calc

// fn: fixedQuantityTransform (R-FIXED-1..2; R-MODEL-1..5).
// The one shared asymmetry rule: scaling: fixed → factor 1, else k.
// Total over every quantity form: numeric transforms, ratio/parts/
// sensory pass through unchanged.
func FixedQuantityTransform(amount map[string]any, k float64) map[string]any {
	if amount == nil {
		return nil
	}
	out := make(map[string]any, len(amount))
	for key, v := range amount {
		out[key] = v
	}
	v, hasValue := toF(amount["value"])
	if !hasValue {
		return out // ratio, parts, to_consistency: unchanged (R-MODEL-2..4)
	}
	factor := k
	if s, _ := amount["scaling"].(string); s == "fixed" {
		factor = 1 // R-MODEL-1 / R-SCALE-1: the asymmetry
	}
	out["value"] = v * factor
	return out
}

// fn: scale (R-SCALE-1..4). Uniform mode: returns a deep-transformed copy
// of the scope. Maintenance components are drawn from, not multiplied
// (R-SCALE-2): their internals pass through untransformed. Component
// references pass through untouched (R-SCALE-3 — the referenced document
// scales in its own computation). k outside (0, ∞) → nil (R-MODEL-5:
// unresolvable, never a guess).
func Scale(scope map[string]any, k float64) map[string]any {
	if !(k > 0) || k != k || k > maxFinite {
		return nil
	}
	return scaleScope(scope, k)
}

const maxFinite = 1.7976931348623157e308

func scaleScope(m map[string]any, k float64) map[string]any {
	out := make(map[string]any, len(m))
	for key, v := range m {
		out[key] = v
	}
	if ings, ok := m["ingredients"].([]any); ok {
		newIngs := make([]any, len(ings))
		for i, iv := range ings {
			im, ok := iv.(map[string]any)
			if !ok {
				newIngs[i] = iv
				continue
			}
			ni := make(map[string]any, len(im))
			for key, v := range im {
				ni[key] = v
			}
			if am, ok := im["amount"].(map[string]any); ok {
				ni["amount"] = FixedQuantityTransform(am, k)
			}
			newIngs[i] = ni
		}
		out["ingredients"] = newIngs
	}
	if comps, ok := m["components"].([]any); ok {
		newComps := make([]any, len(comps))
		for i, cv := range comps {
			cm, ok := cv.(map[string]any)
			if !ok {
				newComps[i] = cv
				continue
			}
			if _, isRef := cm["ref"]; isRef {
				newComps[i] = cm // R-SCALE-3: references untouched here
				continue
			}
			if isTrue(cm["maintenance"]) {
				newComps[i] = cm // R-SCALE-2: drawn from, not multiplied
				continue
			}
			newComps[i] = scaleScope(cm, k)
		}
		out["components"] = newComps
	}
	return out
}

// fn: reestimateDurations (R-DUR-1..2). v1 posture: identity — cook time
// follows geometry and thermodynamics, not mass. Exists as the NAMED
// extension point so a future model changes the SPEC, not call sites.
func ReestimateDurations(window map[string]any, k float64) map[string]any {
	_ = k
	return window
}
