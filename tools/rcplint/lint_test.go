package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// lintFixture runs the linter over one fixture file with the real registry.
func lintFixture(t *testing.T, name string) *Lint {
	t.Helper()
	reg, _, err := loadRegistry(root)
	if err != nil {
		t.Fatalf("registry: %v", err)
	}
	docs, err := LoadDocuments(filepath.Join("testdata/l2", name))
	if err != nil {
		t.Fatalf("%s: %v", name, err)
	}
	l := &Lint{}
	siblings := map[string]map[string]any{}
	for _, d := range docs {
		if m, ok := d.Value.(map[string]any); ok {
			siblings[d.ID] = m
		}
	}
	for _, d := range docs {
		lintDocument(d, reg, siblings, l)
	}
	lintComponentCycles(siblings, l)
	return l
}

// AC-8.3: every fixture fails for exactly its one target rule.
func TestL2FixturesOneRuleEach(t *testing.T) {
	cases := []struct {
		file, wantErr string
	}{
		{"unresolved-item.rcp.yaml", "missing registry entry"},
		{"bare-slug.rcp.yaml", "not kind-prefixed (DECISIONS #23)"},
		{"undeclared-basis.rcp.yaml", "references undeclared basis"},
		{"orphan-intermediate.rcp.yaml", "produced but never consumed"},
		{"disconnected-guard-path.rcp.yaml", "disconnected path (AC-VAL-002-3)"},
		{"step-cycle.rcp.yaml", "non-terminating (AC-VAL-002-3)"},
		{"too-many-options.rcp.yaml", "soft cap of 3"},
		{"component-cycle.rcp.yaml", "component reference cycle"},
		{"unversioned-pin.rcp.yaml", "declares no version"},
		{"profile-numeric-bound.rcp.yaml", "restates a numeric safety bound"},
		{"unknown-technique.rcp.yaml", "not in registry/vocab/techniques.yaml"},
	}
	for _, c := range cases {
		l := lintFixture(t, c.file)
		if len(l.Errors) == 0 {
			t.Errorf("%s: expected an error, got none", c.file)
			continue
		}
		for _, e := range l.Errors {
			if !strings.Contains(e, c.wantErr) {
				t.Errorf("%s: extra rule fired (one-rule-per-fixture violated): %s", c.file, e)
			}
		}
	}
}

// Warning-severity fixtures: exactly the warning, zero errors.
func TestL2WarningFixtures(t *testing.T) {
	for file, want := range map[string]string{
		"unused-ingredient.rcp.yaml": "listed but never used",
		"item-null-warning.rcp.yaml": "item: null — unresolved import",
	} {
		l := lintFixture(t, file)
		if len(l.Errors) != 0 {
			t.Errorf("%s: expected zero errors, got %v", file, l.Errors)
		}
		found := false
		for _, w := range l.Warnings {
			if strings.Contains(w, want) {
				found = true
			}
		}
		if !found {
			t.Errorf("%s: expected warning %q, got %v", file, want, l.Warnings)
		}
	}
}

// DS-PR-003 two-sided: L1 schema ACCEPTS item: null.
func TestItemNullSchemaValid(t *testing.T) {
	v := coreValidator(t)
	docs, _ := LoadDocuments("testdata/l2/item-null-warning.rcp.yaml")
	if err := v.Validate(docs[0].Value); err != nil {
		t.Errorf("item: null must be schema-valid (DS-PR-003): %v", err)
	}
}

// AC-8.4: cue vet fails on out-of-bound facts, and the salty-bread fixture
// produces a violating check via the real facts pipeline.
func TestCueLayer(t *testing.T) {
	cue, err := exec.LookPath("cue")
	if err != nil {
		home, _ := exec.LookPath("sh")
		_ = home
		cue = filepath.Join(testHome(t), "go/bin/cue")
	}
	if _, err := exec.Command(cue, "version").Output(); err != nil {
		t.Skipf("cue not available: %v", err)
	}
	// relation violation via crafted facts
	out, err := exec.Command(cue, "vet", filepath.Join(root, "schema/constraints/bounds.cue"), "testdata/cue/bad-facts.json").CombinedOutput()
	if err == nil {
		t.Error("bad-facts.json: cue vet passed — relation not enforced")
	}
	if !strings.Contains(string(out), "checks") {
		t.Errorf("cue vet error does not name the failing check: %s", out)
	}
	// profile bound via the real pipeline: facts on the salty bread
	factsOut, err := exec.Command("go", "run", ".", "facts", root, "testdata/cue/profile-violating-bound.rcp.yaml").Output()
	if err != nil {
		t.Fatalf("facts: %v", err)
	}
	if !strings.Contains(string(factsOut), "salt_ratio") || !strings.Contains(string(factsOut), "0.3") {
		t.Fatalf("facts did not export the violating salt_ratio: %s", factsOut)
	}
	tmp := t.TempDir() + "/facts.json"
	if err := writeFile(tmp, factsOut); err != nil {
		t.Fatal(err)
	}
	out, err = exec.Command(cue, "vet", filepath.Join(root, "schema/constraints/bounds.cue"), tmp).CombinedOutput()
	if err == nil {
		t.Error("salty bread: cue vet passed — profile bound not enforced (AC-PROF-001-2)")
	}
}

func testHome(t *testing.T) string {
	t.Helper()
	out, err := exec.Command("sh", "-c", "echo $HOME").Output()
	if err != nil {
		t.Fatal(err)
	}
	return strings.TrimSpace(string(out))
}

func writeFile(path string, b []byte) error {
	return osWriteFile(path, b)
}

func osWriteFile(path string, b []byte) error { return os.WriteFile(path, b, 0o644) }

// SAC-REG-001 consumed: the filename≠id fixture, staged into a temp
// registry layout, must trip the file-identity rule.
func TestFilenameIDMismatch(t *testing.T) {
	tmp := t.TempDir()
	if err := os.MkdirAll(filepath.Join(tmp, "registry/entries/ingredient"), 0o755); err != nil {
		t.Fatal(err)
	}
	src, err := os.ReadFile("testdata/registry/filename-id-mismatch.yaml")
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmp, "registry/entries/ingredient/filename-id-mismatch.yaml"), src, 0o644); err != nil {
		t.Fatal(err)
	}
	_, l, _ := loadRegistry(tmp)
	found := false
	for _, e := range l.Errors {
		if strings.Contains(e, "filename != id") && strings.Contains(e, "SAC-REG-001") {
			found = true
		}
	}
	if !found {
		t.Errorf("filename-id-mismatch not detected: %v", l.Errors)
	}
}
