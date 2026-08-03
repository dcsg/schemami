package main

// Stage references and the contradiction rule (DECISIONS #28).
//
// A recipe endpoint may reference a graded stage on a preparation
// class. The class owns what the stage MEANS; the recipe names which
// one it is cooking to. When the recipe's own measurement falls outside
// the class's bounds for that stage, the MEASUREMENT WINS and a warning
// names both — books name stages loosely, and an author who measured
// did so deliberately.
//
// This is deliberately NOT the fail-closed posture used elsewhere. A
// stage label is a naming disagreement, not a safety bound.
// Severity-critical constraints stay governed fail-closed by the
// Calculus and are untouched by this rule — a document may warn here
// and still refuse there, and the refusal must not be masked.

import "fmt"

// Stage is one graded outcome declared by a preparation class.
type Stage struct {
	ID       string
	Order    int
	Quantity string
	Unit     string
	Min      float64
	Max      float64
	HasMin   bool
	HasMax   bool
}

// StageIndex maps class id → stage id → stage.
type StageIndex map[string]map[string]Stage

// loadStages reads graded stages from the technique registry entries.
func loadStages(entries map[string]map[string]any) StageIndex {
	idx := StageIndex{}
	for classID, entry := range entries {
		raw, ok := entry["stages"].([]any)
		if !ok {
			continue
		}
		byID := map[string]Stage{}
		for _, sv := range raw {
			sm, ok := sv.(map[string]any)
			if !ok {
				continue
			}
			id, _ := sm["id"].(string)
			if id == "" {
				continue
			}
			st := Stage{ID: id}
			if o, ok := toFloat(sm["order"]); ok {
				st.Order = int(o)
			}
			if cp, ok := sm["checkpoint"].(map[string]any); ok {
				st.Quantity, _ = cp["quantity"].(string)
				st.Unit, _ = cp["unit"].(string)
				if v, ok := toFloat(cp["min"]); ok {
					st.Min, st.HasMin = v, true
				}
				if v, ok := toFloat(cp["max"]); ok {
					st.Max, st.HasMax = v, true
				}
			}
			byID[id] = st
		}
		if len(byID) > 0 {
			idx[classID] = byID
		}
	}
	return idx
}

// lintStageRefs checks every endpoint stage reference in one scope.
func lintStageRefs(loc string, m map[string]any, stages StageIndex, l *Lint) {
	steps, _ := m["steps"].([]any)
	for _, sv := range steps {
		sm, ok := sv.(map[string]any)
		if !ok {
			continue
		}
		stepID, _ := sm["id"].(string)
		untils, _ := sm["until"].([]any)
		for _, uv := range untils {
			um, ok := uv.(map[string]any)
			if !ok {
				continue
			}
			ref, ok := um["stage"].(map[string]any)
			if !ok {
				continue
			}
			class, _ := ref["class"].(string)
			stageID, _ := ref["id"].(string)
			byID, known := stages[class]
			if !known {
				l.errf("%s: step %q references stages on %q, which declares none", loc, stepID, class)
				continue
			}
			st, known := byID[stageID]
			if !known {
				l.errf("%s: step %q references stage %q, which %q does not declare", loc, stepID, stageID, class)
				continue
			}
			// The contradiction rule. Only compare when the endpoint
			// actually carries a measurement in the stage's quantity.
			value, hasValue := toFloat(um["value"])
			if !hasValue {
				continue
			}
			below := st.HasMin && value < st.Min
			above := st.HasMax && value > st.Max
			if below || above {
				l.warnf("%s: step %q measures %g %s but stage %q of %q is defined as %s — the MEASUREMENT wins and the document stands; the stage label disagrees (DECISIONS #28: a naming disagreement, not a safety bound)",
					loc, stepID, value, st.Unit, stageID, class, boundsText(st))
			}
		}
	}
}

func boundsText(s Stage) string {
	switch {
	case s.HasMin && s.HasMax:
		return fmt.Sprintf("%g–%g %s", s.Min, s.Max, s.Unit)
	case s.HasMin:
		return fmt.Sprintf("at least %g %s", s.Min, s.Unit)
	case s.HasMax:
		return fmt.Sprintf("at most %g %s", s.Max, s.Unit)
	}
	return "unbounded"
}
