package calc

// fn: enforceConstraints (R-ENFORCE-1..5) and fn: minBatchFloor
// (R-MINBATCH-1..3). Message formats are the parity contract with the
// retired clamp — preserved verbatim, authored reasons opaque
// (R-ENFORCE-4).

// EnforceConstraints checks one scope's ingredient constraints under a
// scale factor, appending refusals (critical) and warnings (warn) to f.
// It recurses into inline components (references are other documents'
// concerns). MinBatchFloor is applied per scope on the way.
func EnforceConstraints(loc string, scope map[string]any, k float64, f *Findings) {
	MinBatchFloor(loc, scope, k, f)
	ings, _ := scope["ingredients"].([]any)
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
		val, kind, resolvable := resolvedRatio(scope, im, k)
		for _, cv := range cs {
			cm, ok := cv.(map[string]any)
			if !ok {
				continue
			}
			sev, _ := cm["severity"].(string)
			reason := RenderReason(cm["reason"])
			if !resolvable {
				if sev == "critical" {
					// R-ENFORCE-1: fail-closed — uncertainty refuses.
					f.refuse("%s: ingredient %q critical constraint cannot be verified (%s) — uncertainty defaults to refusal (AC-SAFE-001-2). %s", loc, id, kind, reason)
				} else {
					f.warn("%s: ingredient %q %s constraint unverifiable (%s)", loc, id, sev, kind)
				}
				continue
			}
			if minR, has := toF(cm["min_ratio"]); has && val < minR {
				route(f, sev, "%s: ingredient %q resolved ratio %.4f < min_ratio %.4f. %s", loc, id, val, minR, reason)
			}
			if maxR, has := toF(cm["max_ratio"]); has && val > maxR {
				route(f, sev, "%s: ingredient %q resolved ratio %.4f > max_ratio %.4f. %s", loc, id, val, maxR, reason)
			}
			// R-ENFORCE-3: absolute bounds move with scale (fixed → ×1).
			if mv, has := toF(cm["min_value"]); has {
				if abs, unit, okv := absoluteValue(im); okv {
					scaled := abs * amountFactor(im, k)
					if scaled < mv {
						route(f, sev, "%s: ingredient %q scaled %s %.2f < min_value %.2f. %s", loc, id, unit, scaled, mv, reason)
					}
				}
			}
			if xv, has := toF(cm["max_value"]); has {
				if abs, unit, okv := absoluteValue(im); okv {
					scaled := abs * amountFactor(im, k)
					if scaled > xv {
						route(f, sev, "%s: ingredient %q scaled %s %.2f > max_value %.2f. %s", loc, id, unit, scaled, xv, reason)
					}
				}
			}
		}
	}
	if comps, ok := scope["components"].([]any); ok {
		for _, cv := range comps {
			if cm, ok := cv.(map[string]any); ok {
				if _, isRef := cm["ref"]; !isRef {
					cid, _ := cm["id"].(string)
					EnforceConstraints(loc+"/"+cid, cm, k, f)
				}
			}
		}
	}
}

// MinBatchFloor (R-MINBATCH-1..3): maintenance cultures are drawn from,
// not multiplied; k < 1 implies a draw below the minimum viable batch —
// refuse. Message format is the clamp parity contract.
func MinBatchFloor(loc string, scope map[string]any, k float64, f *Findings) {
	mb, ok := scope["min_batch"].(map[string]any)
	if !ok || !isTrue(scope["maintenance"]) {
		return
	}
	v, okv := toF(mb["value"])
	if !okv {
		return
	}
	if k < 1 {
		implied := v * k
		if implied < v {
			f.refuse("%s: maintenance culture min_batch %g g floors the draw — scale ×%g implies %g g (cannot build less than the minimum viable batch; DS-SAFE-001/min_batch)", loc, v, k, implied)
		}
	}
}

func route(f *Findings, sev, format string, a ...any) {
	if sev == "critical" {
		f.refuse(format, a...)
	} else {
		f.warn(format, a...)
	}
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

func amountFactor(im map[string]any, k float64) float64 {
	if am, ok := im["amount"].(map[string]any); ok {
		if s, _ := am["scaling"].(string); s == "fixed" {
			return 1
		}
	}
	return k
}
