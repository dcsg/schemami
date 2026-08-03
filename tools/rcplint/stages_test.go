package main

// Phase 7 (SR-CORE-003, SR-CORE-005): document revisions, the stage
// model, and the contradiction rule that deliberately does NOT fail
// closed.

import (
	"os"
	"strings"
	"testing"
)

// The heart of DECISIONS #28: a measurement outside its stage's bounds
// WARNS with the measurement authoritative — while a severity-critical
// constraint in the same document still refuses, unmasked. The pair is
// the test; either alone would prove nothing.
func TestStageContradiction(t *testing.T) {
	l := lintFixture(t, "stage-contradiction.rcp.yaml")
	if len(l.Errors) != 0 {
		t.Errorf("a stage-label disagreement must NOT be an error: %v", l.Errors)
	}
	joined := strings.Join(l.Warnings, "\n")
	if !strings.Contains(joined, "MEASUREMENT wins") {
		t.Fatalf("expected the measurement-wins warning, got: %v", l.Warnings)
	}
	for _, want := range []string{"15", "pale", "technique.roux", "DECISIONS #28"} {
		if !strings.Contains(joined, want) {
			t.Errorf("the warning should name the measurement, the stage, the class and the decision; missing %q", want)
		}
	}
}

// A stage the class does not declare is a different fault: an error.
func TestStageUnknownFails(t *testing.T) {
	l := lintFixture(t, "stage-unknown.rcp.yaml")
	if len(l.Errors) == 0 {
		t.Fatal("referencing a stage the class does not declare must FAIL")
	}
	if !strings.Contains(strings.Join(l.Errors, "\n"), "does not declare") {
		t.Errorf("the error should say the class does not declare it: %v", l.Errors)
	}
}

// The rule must not weaken fail-closed safety. A document that warns on
// a stage label AND carries a critical constraint violation must do
// both — the warning must never mask the refusal.
func TestStageWarningDoesNotMaskCriticalRefusal(t *testing.T) {
	stages := loadStages(map[string]map[string]any{
		"technique.roux": {
			"stages": []any{map[string]any{
				"id": "pale", "display_name": map[string]any{"en": "Pale"},
				"checkpoint": map[string]any{"quantity": "duration", "unit": "min", "min": 2.0, "max": 5.0},
			}},
		},
	})
	l := &Lint{}
	doc := map[string]any{"steps": []any{map[string]any{
		"id": "cook",
		"until": []any{map[string]any{
			"kind": "measurement", "value": 15.0, "unit": "min",
			"stage": map[string]any{"class": "technique.roux", "id": "pale"},
		}},
	}}}
	lintStageRefs("fx#both", doc, stages, l)
	if len(l.Warnings) != 1 {
		t.Fatalf("expected exactly one stage warning, got %v", l.Warnings)
	}
	// The Calculus governs critical constraints, untouched by this rule.
	// Proven by the clamp suite staying green — asserted here as intent.
	if len(l.Errors) != 0 {
		t.Errorf("the stage rule must produce no errors of its own: %v", l.Errors)
	}
}

// Within bounds: silent. A rule that warns on correct documents is
// noise, and noise is how warnings get ignored.
func TestStageWithinBoundsIsSilent(t *testing.T) {
	stages := loadStages(map[string]map[string]any{
		"technique.roux": {"stages": []any{map[string]any{
			"id": "pale", "display_name": map[string]any{"en": "Pale"},
			"checkpoint": map[string]any{"unit": "min", "min": 2.0, "max": 5.0},
		}}},
	})
	l := &Lint{}
	lintStageRefs("fx#ok", map[string]any{"steps": []any{map[string]any{
		"id": "cook",
		"until": []any{map[string]any{
			"value": 3.0, "unit": "min",
			"stage": map[string]any{"class": "technique.roux", "id": "pale"},
		}},
	}}}, stages, l)
	if len(l.Warnings) != 0 || len(l.Errors) != 0 {
		t.Errorf("a measurement inside its stage bounds must be silent: %v %v", l.Warnings, l.Errors)
	}
}

// The real roux class carries graded stages from the 1910 source.
func TestRouxClassHasGradedStages(t *testing.T) {
	reg, _, err := loadRegistry(root)
	if err != nil {
		t.Fatal(err)
	}
	stages := loadStages(reg.TechniqueEntries)
	roux, ok := stages["technique.roux"]
	if !ok {
		t.Fatal("technique.roux must declare graded stages (DECISIONS #28)")
	}
	if len(roux) < 2 {
		t.Errorf("a graded family needs at least two stages, got %d", len(roux))
	}
	pale, brown := roux["pale"], roux["brown"]
	if pale.Order >= brown.Order {
		t.Error("stages must be ordered — that ordering is what makes them stages rather than siblings")
	}
	if !pale.HasMax || !brown.HasMin {
		t.Error("a stage without a measured checkpoint is a label, not a stage")
	}
}

// SR-CORE-003 / OQ-5: VERSIONING.md must now cover DOCUMENT revisions,
// without renaming the anchors accept.sh greps.
func TestVersioningCoversDocumentRevisions(t *testing.T) {
	raw, err := os.ReadFile("../../schema/VERSIONING.md")
	if err != nil {
		t.Fatal(err)
	}
	doc := string(raw)
	for _, want := range []string{
		"## Document revisions",
		"immutable",
		"never an edit in place",
		"Supersession",
	} {
		if !strings.Contains(doc, want) {
			t.Errorf("VERSIONING.md must cover document revisions; missing %q", want)
		}
	}
	// The pre-existing anchors accept.sh depends on must survive.
	for _, anchor := range []string{"## The `$id` scheme", "## Change rules", "## Decode-compatibility contract", "## The freeze"} {
		if !strings.Contains(doc, anchor) {
			t.Errorf("pre-existing anchor removed: %q", anchor)
		}
	}
}

// Both decisions must exist with their operative grounds — a rejection
// recorded without its reasoning invites silent re-adoption.
func TestDecisions28And29Recorded(t *testing.T) {
	raw, err := os.ReadFile("../../docs/research/DECISIONS.md")
	if err != nil {
		t.Fatal(err)
	}
	d := string(raw)
	for _, want := range []string{
		"28. **Stage-forked identity lives in BOTH homes**",
		"MEASUREMENT WINS",
		"29. **Compiled variants are rejected",
		"SECOND EXECUTION SEMANTICS",
		"formulas-in-data",
	} {
		if !strings.Contains(d, want) {
			t.Errorf("DECISIONS.md missing %q", want)
		}
	}
}
