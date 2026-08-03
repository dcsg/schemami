package calc

import "fmt"

// fn: resolveBases (R-BASIS-1..4). A basis resolves to a gram total under
// a scale transformation, or reports unresolvable with a normative
// uncertainty string (calculus/SPEC.md, enforceConstraints Edges).

// BasisResult is one basis's resolution.
type BasisResult struct {
	Grams float64
	OK    bool
	Why   string // normative uncertainty string when !OK
}

// ResolveBases resolves every declared basis of the scope at factor k.
func ResolveBases(scope map[string]any, k float64) map[string]BasisResult {
	out := map[string]BasisResult{}
	bm, ok := scope["bases"].(map[string]any)
	if !ok {
		return out
	}
	for name := range bm {
		g, ok, why := basisGramTotal(scope, name, k)
		out[name] = BasisResult{Grams: g, OK: ok, Why: why}
	}
	return out
}

// basisDeclared reports whether the scope declares the named basis.
func basisDeclared(scope map[string]any, name string) bool {
	bm, ok := scope["bases"].(map[string]any)
	if !ok {
		return false
	}
	_, has := bm[name]
	return has
}

// basisGramTotal sums gram-valued matching ingredients under the scale
// transformation (fixed contributions do not scale — R-BASIS-3).
// include_components (R-BASIS-2): inline components decompose
// recursively; a component REFERENCE makes the basis unresolvable
// (refusing beats under-counting).
func basisGramTotal(scope map[string]any, name string, k float64) (float64, bool, string) {
	bm, ok := scope["bases"].(map[string]any)
	if !ok {
		return 0, false, fmt.Sprintf("basis %q unresolvable", name)
	}
	spec, ok := bm[name].(map[string]any)
	if !ok {
		return 0, false, fmt.Sprintf("basis %q unresolvable", name)
	}
	roles := roleFilter(spec)
	total, ok, why := sumScope(scope, roles, k)
	if !ok {
		return 0, false, why
	}
	if isTrue(spec["include_components"]) {
		if comps, ok := scope["components"].([]any); ok {
			for _, cv := range comps {
				cm, isMap := cv.(map[string]any)
				if !isMap {
					continue
				}
				if _, isRef := cm["ref"]; isRef {
					// R-BASIS-2: unavailable reference → unresolvable
					return 0, false, fmt.Sprintf("basis %q unresolvable", name)
				}
				sub, ok, why := sumComponentTree(cm, roles, k)
				if !ok {
					return 0, false, why
				}
				total += sub
			}
		}
	}
	return total, true, ""
}

func sumComponentTree(cm map[string]any, roles []string, k float64) (float64, bool, string) {
	factor := k
	if isTrue(cm["maintenance"]) {
		factor = 1 // drawn from, not multiplied (R-SCALE-2)
	}
	total, ok, why := sumScope(cm, roles, factor)
	if !ok {
		return 0, false, why
	}
	if comps, has := cm["components"].([]any); has {
		for _, cv := range comps {
			sub, isMap := cv.(map[string]any)
			if !isMap {
				continue
			}
			if _, isRef := sub["ref"]; isRef {
				return 0, false, "basis unresolvable"
			}
			s, ok, why := sumComponentTree(sub, roles, factor)
			if !ok {
				return 0, false, why
			}
			total += s
		}
	}
	return total, true, ""
}

func sumScope(m map[string]any, roles []string, k float64) (float64, bool, string) {
	total := 0.0
	if ings, ok := m["ingredients"].([]any); ok {
		for _, iv := range ings {
			im, ok := iv.(map[string]any)
			if !ok {
				continue
			}
			if !matchesRoles(im, roles) {
				continue
			}
			am, ok := im["amount"].(map[string]any)
			if !ok {
				return 0, false, "basis contribution missing amount"
			}
			u, _ := am["unit"].(string)
			v, hasV := toF(am["value"])
			if !hasV || u != "g" {
				// SPEC Units rule: mixed or non-mass contributions make the
				// basis UNRESOLVABLE — never a partial sum.
				id, _ := im["id"].(string)
				return 0, false, "basis contribution " + id + " not gram-valued"
			}
			factor := k
			if s, _ := am["scaling"].(string); s == "fixed" {
				factor = 1 // R-BASIS-3
			}
			total += v * factor
		}
	}
	return total, true, ""
}

func roleFilter(spec map[string]any) []string {
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
	return roles
}

func matchesRoles(im map[string]any, roles []string) bool {
	if len(roles) == 0 {
		return true // R-BASIS-1: empty filter matches all
	}
	for _, r := range roles {
		if hasRole(im, r) {
			return true
		}
	}
	return false
}

// resolvedRatio computes an ingredient's value as a fraction of the basis
// its constraints reference, AFTER the scale transformation. Normative
// uncertainty strings per calculus/SPEC.md (R-ENFORCE-1). Parity contract
// with the retired clamp: identical strings and semantics, EXCEPT
// R-BASIS-2 — decomposable include_components bases now resolve (approved
// semantic upgrade; project-side checkpoint notes).
func resolvedRatio(scope, im map[string]any, k float64) (float64, string, bool) {
	am, ok := im["amount"].(map[string]any)
	if !ok {
		return 0, "missing amount", false
	}
	if r, ok := toF(am["ratio"]); ok {
		if of, ok := am["of"].(string); ok {
			if !basisDeclared(scope, of) {
				return 0, fmt.Sprintf("basis %q unresolvable", of), false
			}
			return r, "", true // ratio invariance (R-MODEL-2)
		}
		return 0, "ratio without basis", false
	}
	if u, _ := am["unit"].(string); u == "g" {
		if v, ok := toF(am["value"]); ok {
			of := constraintBasis(im)
			if of == "" {
				return 0, "no basis named", false
			}
			total, okB, why := basisGramTotal(scope, of, k)
			if !okB {
				return 0, why, false
			}
			if total <= 0 {
				return 0, fmt.Sprintf("basis %q not gram-resolvable", of), false
			}
			amtScale := k
			if s, _ := am["scaling"].(string); s == "fixed" {
				amtScale = 1
			}
			return (v * amtScale) / total, "", true
		}
	}
	if _, ok := am["parts"]; ok {
		return 0, "parts-based (ratio-first): no gram semantics", false
	}
	return 0, "quantity form not resolvable", false
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
