package main

import (
	"path/filepath"
	"strings"
	"testing"
)

// Phase 3 (PLAN-rcp-v02; DECISIONS #25; SR-REG-004): techniques are the
// fourth governed registry kind.
func TestTechniqueEntriesValidate(t *testing.T) {
	v, err := CompileSchema(filepath.Join(root, "registry/schemas/technique.schema.json"))
	if err != nil {
		t.Fatalf("compile technique schema: %v", err)
	}
	glob, _ := filepath.Glob(filepath.Join(root, "registry/entries/technique/*.yaml"))
	if len(glob) < 13 {
		t.Fatalf("expected >=13 technique entries (approved batch 2026-08-02), got %d", len(glob))
	}
	for _, p := range glob {
		docs, err := LoadDocuments(p)
		if err != nil || len(docs) != 1 {
			t.Errorf("%s: load error: %v", p, err)
			continue
		}
		if err := v.Validate(docs[0].Value); err != nil {
			t.Errorf("%s", FormatError(filepath.Base(p), docs[0].ID, err))
		}
		m := docs[0].Value.(map[string]any)
		id, _ := m["id"].(string)
		if want := strings.TrimSuffix(filepath.Base(p), ".yaml"); id != want {
			t.Errorf("%s: filename != id (%q)", p, id)
		}
	}
}

// The approved minimum seed (fixtures.yaml + checkpoint 2026-08-02).
func TestTechniqueSeedPresent(t *testing.T) {
	for _, id := range []string{
		"technique.stir", "technique.none", "technique.saute",
		"technique.saute.refogado", "technique.bulhao-pato",
		"technique.sear", "technique.simmer", "technique.flambe",
		"technique.blend", "technique.strain", "technique.steam",
		"technique.soak", "technique.pipe",
	} {
		p := filepath.Join(root, "registry/entries/technique", id+".yaml")
		if _, err := LoadDocuments(p); err != nil {
			t.Errorf("approved seed entry missing: %s", id)
		}
	}
}

// AC-REG-003-2: unknown technique reference rejected naming the entry;
// the interim vocab file is gone (SAC-REG-002).
func TestUnknownTechniqueRejected(t *testing.T) {
	l := lintFixture(t, "unknown-technique.rcp.yaml")
	found := false
	for _, e := range l.Errors {
		if strings.Contains(e, "technique.does.not.exist") {
			found = true
		}
	}
	if !found {
		t.Errorf("unknown technique not rejected by name; errors: %v", l.Errors)
	}
}

func TestVocabFileRetired(t *testing.T) {
	if _, err := LoadDocuments(filepath.Join(root, "registry/vocab/techniques.yaml")); err == nil {
		t.Error("registry/vocab/techniques.yaml still exists — migration incomplete (SAC-REG-002)")
	}
}

// The negroni's execution modes migrated to full technique ids and resolve.
func TestExampleTechniqueRefsResolve(t *testing.T) {
	reg, _, err := loadRegistry(root)
	if err != nil {
		t.Fatalf("registry: %v", err)
	}
	for _, id := range []string{"technique.stir", "technique.none"} {
		if !reg.Techniques[id] {
			t.Errorf("registry does not know %s", id)
		}
	}
}
