package main

import "testing"

func clampRC(t *testing.T, scale float64, path, docID string) int {
	t.Helper()
	return runClamp(root, scale, path, docID)
}

// AC-9.1 class (contract corrected in P9): the refusal case is ASYMMETRIC
// scaling — gram-fixed salt while the substrate scales. Uniform scaling of
// the real chucrute is ratio-invariant and must be ACCEPTED (AC-9.2).
func TestClampBehaviours(t *testing.T) {
	cases := []struct {
		name  string
		scale float64
		path  string
		doc   string
		want  int
	}{
		{"fixed-salt upscale refused", 2.0, "testdata/clamp/fixed-salt-chucrute.rcp.yaml", "", 1},
		{"real chucrute uniform 0.6 accepted (ratio invariance)", 0.6, "../../examples/other-categories.rcp.yaml", "chucrute", 0},
		{"real chucrute uniform 1.5 accepted", 1.5, "../../examples/other-categories.rcp.yaml", "chucrute", 0},
		{"warn bound surfaced not refused", 0.5, "testdata/clamp/warn-bound.rcp.yaml", "", 0},
		{"missing quantity refused (uncertainty)", 2.0, "testdata/clamp/missing-quantity.rcp.yaml", "", 1},
		{"unresolvable basis refused (uncertainty)", 2.0, "testdata/clamp/unresolvable-basis.rcp.yaml", "", 1},
		{"min_batch floors maintenance draw", 0.05, "../../examples/alentejano.rcp.yaml", "", 1},
		{"ratio-first negroni no unit assumptions", 3.0, "../../examples/other-categories.rcp.yaml", "negroni", 0},
	}
	for _, c := range cases {
		if got := clampRC(t, c.scale, c.path, c.doc); got != c.want {
			t.Errorf("%s: rc=%d want %d", c.name, got, c.want)
		}
	}
}
