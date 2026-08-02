package main

// Edge-case regression suite. Three sections:
//  1. Schema edges — pins the strictness boundary (what validates vs not),
//     including the root-only x- extension posture (VERSIONING.md).
//  2. Session bug-classes — one named test per bug this project actually
//     hit, so none can silently return.
//  3. Behavioural identities — invariants that must never drift.

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func validateYAML(t *testing.T, doc string) error {
	t.Helper()
	v := coreValidator(t)
	tmp := filepath.Join(t.TempDir(), "edge.rcp.yaml")
	if err := os.WriteFile(tmp, []byte(doc), 0o644); err != nil {
		t.Fatal(err)
	}
	docs, err := LoadDocuments(tmp)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	return v.Validate(docs[0].Value)
}

const edgeBase = `
rcp: 1
id: edge-probe
kind: component
name: { en: Edge probe }
ingredients:
  - { id: x, item: ingredient.water, amount: { value: 100, unit: g } }
`

// ── 1. Schema edges ─────────────────────────────────────────────────────

func TestSchemaEdges(t *testing.T) {
	cases := []struct {
		name   string
		doc    string
		accept bool
	}{
		{"valid control", edgeBase, true},
		{"x- extension at ROOT accepted (decode-compat contract)", edgeBase + `x-fornada-custom: { anything: true }` + "\n", true},
		{"typo field at root rejected (virtuous intolerance)", edgeBase + `ingredint_typo: []` + "\n", false},
		{"x- inside nested object rejected (root-only posture, VERSIONING.md)",
			strings.Replace(edgeBase, "unit: g } }", "unit: g }, x-note: 1 }", 1), false},
		{"negative gram amount rejected",
			strings.Replace(edgeBase, "value: 100", "value: -100", 1), false},
		{"zero gram amount rejected",
			strings.Replace(edgeBase, "value: 100", "value: 0", 1), false},
		{"negative ratio rejected",
			strings.Replace(edgeBase, "amount: { value: 100, unit: g }", "amount: { ratio: -0.5, of: b }", 1), false},
		{"uppercase slug id rejected",
			strings.Replace(edgeBase, "id: edge-probe", "id: Edge-Probe", 1), false},
		{"unknown kind rejected (closed enum)",
			strings.Replace(edgeBase, "kind: component", "kind: smoothie", 1), false},
		{"empty steps array ACCEPTED — equivalent to absent; restricting now would be a MODEL bump (VERSIONING.md), so the truth is pinned",
			edgeBase + "steps: []\n", true},
		{"neither ingredients nor components rejected",
			"rcp: 1\nid: p\nkind: component\nname: { en: p }\n", false},
	}
	for _, c := range cases {
		err := validateYAML(t, c.doc)
		if c.accept && err != nil {
			t.Errorf("%s: expected ACCEPT, got %v", c.name, err)
		}
		if !c.accept && err == nil {
			t.Errorf("%s: expected REJECT, validated clean", c.name)
		}
	}
}

// ── 2. Session bug-classes ──────────────────────────────────────────────

// Bug class: duplicate YAML keys silently swallowed by permissive loaders
// (the equipment.forno-lenha P2→P4 escape). The Go loader must reject.
func TestDuplicateYAMLKeysRejected(t *testing.T) {
	tmp := filepath.Join(t.TempDir(), "dup.yaml")
	os.WriteFile(tmp, []byte("id: a\nkind: x\nkind: y\n"), 0o644)
	if _, err := LoadDocuments(tmp); err == nil {
		t.Error("duplicate mapping keys loaded without error — the forno-lenha bug class is back")
	}
}

// Bug class: `uses` referencing a produced intermediate flagged as unknown
// (the massa-autolisada false positive).
func TestUsesResolvesProducedIntermediates(t *testing.T) {
	l := lintFixture(t, "uses-produced-ok.rcp.yaml")
	if len(l.Errors) != 0 {
		t.Errorf("produced-intermediate consumption flagged: %v", l.Errors)
	}
}

// Bug class: a step active in one execution mode depending on a step from
// another (the negroni-stir defect). The CORRECT guarded form must lint
// clean — this is the positive twin of disconnected-guard-path.
func TestCombinedGuardsCorrectFormClean(t *testing.T) {
	l := lintFixture(t, "guards-combined-ok.rcp.yaml")
	if len(l.Errors) != 0 {
		t.Errorf("correctly-guarded option×mode recipe flagged: %v", l.Errors)
	}
}

// ── 3. Behavioural identities ───────────────────────────────────────────

// Scale ×1.0 is the identity: nothing can be violated that wasn't already.
func TestClampIdentityScale(t *testing.T) {
	if rc := runClamp(root, 1.0, filepath.Join(root, "examples/other-categories.rcp.yaml"), "chucrute"); rc != 0 {
		t.Errorf("identity scale refused (rc=%d) — clamp must accept ×1.0 on a valid document", rc)
	}
}

// Multi-document files: every document is validated individually and the
// count is exact (silent doc-dropping is the failure mode).
func TestMultiDocCountExact(t *testing.T) {
	docs, err := LoadDocuments(filepath.Join(root, "examples/other-categories.rcp.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	if len(docs) != 5 {
		t.Errorf("other-categories must hold exactly 5 documents, got %d", len(docs))
	}
}
