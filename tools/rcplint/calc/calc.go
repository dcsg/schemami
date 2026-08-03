// Package calc is the Go REFERENCE implementation of the Recipe Calculus
// (calculus/SPEC.md — the normative source; this package is informative).
// Every exported function corresponds to a `## fn:` section of the SPEC;
// tests cite the SPEC's R-/WE- rule ids. Purity is law: stdlib only, no
// IO, no clock, no randomness (enforced by TestCalcPurity).
//
// Implements SR-CALC-001 (CMP-CALC-002); replaces the throwaway clamp
// with verbatim parity (SP-001) — see parity_test.go.
package calc

import "fmt"

// Findings carries enforcement outcomes: refusals (critical severity —
// fail-closed) and warnings (advisory). Message text is part of the
// parity contract with the retired clamp: formats are preserved verbatim.
type Findings struct {
	Refusals []string
	Warnings []string
}

func (f *Findings) refuse(format string, a ...any) {
	f.Refusals = append(f.Refusals, fmt.Sprintf(format, a...))
}

func (f *Findings) warn(format string, a ...any) {
	f.Warnings = append(f.Warnings, fmt.Sprintf(format, a...))
}

// --- small shared helpers (duplicated from the host tool by design: calc
// must stay importable without the rcplint main package; these are value
// coercions, not domain logic) ---

func toF(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	}
	return 0, false
}

func isTrue(v any) bool { b, ok := v.(bool); return ok && b }

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

// RenderReason formats an authored pt/en reason map for messages —
// authored reasons are OPAQUE strings passed through verbatim
// (R-ENFORCE-4); this only concatenates, never generates.
func RenderReason(v any) string {
	rm, ok := v.(map[string]any)
	if !ok {
		return ""
	}
	out := ""
	for _, lang := range []string{"pt", "en"} {
		if s, ok := rm[lang].(string); ok {
			if out != "" {
				out += " | "
			}
			out += lang + ": " + s
		}
	}
	return out
}
