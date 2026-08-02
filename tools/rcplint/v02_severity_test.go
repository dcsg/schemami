package main

import (
	"encoding/json"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// Phase 2 (PLAN-rcp-v02, DS-PROF-002): the severity field becomes real.
// warn-severity bound violations are ADVISORY (surfaced, never gating);
// only critical severities enter the CUE-gated checks. Safety bounds stay
// fail-closed (DECISIONS #15) because they are authored critical.
func TestFactsRoutesSeverities(t *testing.T) {
	out, err := exec.Command("go", "run", ".", "facts", root, "testdata/cue/profile-violating-bound.rcp.yaml").Output()
	if err != nil {
		t.Fatalf("facts: %v", err)
	}
	var facts struct {
		Checks     []Check `json:"checks"`
		Advisories []Check `json:"advisories"`
	}
	if err := json.Unmarshal(out, &facts); err != nil {
		t.Fatalf("facts output: %v", err)
	}
	foundAdvisory := false
	for _, a := range facts.Advisories {
		if a.Bound == "salt_ratio" {
			foundAdvisory = true
			if a.Severity != "warn" {
				t.Errorf("salt_ratio advisory severity = %q, want warn", a.Severity)
			}
		}
	}
	if !foundAdvisory {
		t.Error("warn-severity salt_ratio not routed to advisories")
	}
	for _, c := range facts.Checks {
		if c.Severity != "critical" {
			t.Errorf("non-critical check %q leaked into the CUE gate (severity %q)", c.Bound, c.Severity)
		}
	}
}

// The warn violation must NOT fail cue vet; a critical one still must
// (bad-facts.json coverage in TestCueLayer keeps the relation itself pinned).
func TestWarnViolationIsAdvisoryNotGate(t *testing.T) {
	cue := cueBinary(t)
	factsOut, err := exec.Command("go", "run", ".", "facts", root, "testdata/cue/profile-violating-bound.rcp.yaml").Output()
	if err != nil {
		t.Fatalf("facts: %v", err)
	}
	tmp := t.TempDir() + "/facts.json"
	if err := writeFile(tmp, factsOut); err != nil {
		t.Fatal(err)
	}
	if out, err := exec.Command(cue, "vet", filepath.Join(root, "schema/constraints/bounds.cue"), tmp).CombinedOutput(); err != nil {
		t.Errorf("warn-severity violation failed cue vet — advisory routing missing: %s", out)
	}
}

// Phase 2: dish profile exists at hardened maturity; the synthetic dish doc
// composes core AND dish (AC-2.2); zero bounds, rationale authored (AC-2.1).
func TestDishProfileHardened(t *testing.T) {
	core := coreValidator(t)
	dishPath := filepath.Join(root, "schema/profiles/dish.schema.json")
	dish, err := CompileSchema(dishPath)
	if err != nil {
		t.Fatalf("compile dish: %v", err)
	}
	if m := readMaturity(dishPath); m != "hardened" {
		t.Errorf("dish maturity = %q, want hardened", m)
	}
	docs, err := LoadDocuments(filepath.Join("testdata/l1", "dish-minimal-ok.rcp.yaml"))
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if err := core.Validate(docs[0].Value); err != nil {
		t.Errorf("core rejected dish-minimal-ok: %v", err)
	}
	if err := dish.Validate(docs[0].Value); err != nil {
		t.Errorf("dish profile rejected dish-minimal-ok: %v", err)
	}
}

// Hardened means closed to what n=2 observed: neither real dish document
// carries a profile block, so any profile-block field must be rejected.
func TestDishProfileBlockClosed(t *testing.T) {
	dish, err := CompileSchema(filepath.Join(root, "schema/profiles/dish.schema.json"))
	if err != nil {
		t.Fatalf("compile dish: %v", err)
	}
	doc := map[string]any{
		"rcp": 1, "id": "fx-dish-profile-field", "kind": "dish",
		"name":    map[string]any{"en": "Dish with speculative profile field"},
		"profile": map[string]any{"spice_level": 3},
	}
	if err := dish.Validate(doc); err == nil {
		t.Error("dish profile accepted an unobserved profile-block field — not closed to n=2 evidence")
	}
}

func cueBinary(t *testing.T) string {
	t.Helper()
	cue, err := exec.LookPath("cue")
	if err != nil {
		cue = filepath.Join(testHome(t), "go/bin/cue")
	}
	if _, err := exec.Command(cue, "version").Output(); err != nil {
		t.Skipf("cue not available: %v", err)
	}
	return cue
}

var _ = strings.TrimSpace // placate import until TestCueLayer refactor lands
