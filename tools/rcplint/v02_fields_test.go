package main

import (
	"path/filepath"
	"strings"
	"testing"
)

// Phase 1 (PLAN-rcp-v02): the four v0.2 ADDITION-class field groups.
// AC-1.2 positives validate; each negative fails for exactly its one reason.
func TestV02FieldAdditionsPositive(t *testing.T) {
	v := coreValidator(t)
	docs, err := LoadDocuments(filepath.Join("testdata/l1", "times-storage-source-ok.rcp.yaml"))
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if err := v.Validate(docs[0].Value); err != nil {
		t.Errorf("positive fixture rejected: %s", FormatError("times-storage-source-ok", docs[0].ID, err))
	}
}

func TestV02FieldAdditionsNegative(t *testing.T) {
	v := coreValidator(t)
	// One fixture per rule; the error must name the offending field so the
	// failure is for the fixture's single authored reason.
	cases := map[string]string{
		"difficulty-zero":   "difficulty",
		"difficulty-six":    "difficulty",
		"times-unknown-key": "times",
		"storage-bad-where": "storage",
	}
	for f, field := range cases {
		docs, err := LoadDocuments(filepath.Join("testdata/l1", f+".rcp.yaml"))
		if err != nil {
			t.Fatalf("%s: %v", f, err)
		}
		verr := v.Validate(docs[0].Value)
		if verr == nil {
			t.Errorf("%s: negative fixture PASSED — v0.2 field rule missing", f)
			continue
		}
		if !strings.Contains(verr.Error(), field) {
			t.Errorf("%s: failed, but not on %q: %v", f, field, verr)
		}
	}
}

// AC-1.3 / AC-PR-003-3: a pastry doc with storage passes core AND the
// hardened pastry profile — the new field is admitted additively.
func TestPastryAdmitsStorage(t *testing.T) {
	core := coreValidator(t)
	pastry, err := CompileSchema(filepath.Join(root, "schema/profiles/pastry.schema.json"))
	if err != nil {
		t.Fatalf("compile pastry: %v", err)
	}
	docs, err := LoadDocuments(filepath.Join("testdata/l1", "pastry-storage-ok.rcp.yaml"))
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if err := core.Validate(docs[0].Value); err != nil {
		t.Errorf("core rejected pastry-storage doc: %v", err)
	}
	if err := pastry.Validate(docs[0].Value); err != nil {
		t.Errorf("pastry profile rejected storage: %v", err)
	}
}

// Phase 5 (SR-I18N-001): identifiers are never localized — an accented
// taxonomy slug is rejected. Enforcement point is the core slug pattern
// (L1); this test pins it so it cannot silently loosen.
func TestAccentedTaxonomySlugRejected(t *testing.T) {
	v := coreValidator(t)
	docs, err := LoadDocuments(filepath.Join("testdata/l1", "accented-taxonomy-slug.rcp.yaml"))
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	verr := v.Validate(docs[0].Value)
	if verr == nil {
		t.Error("accented taxonomy slug PASSED — English-base identifier rule unenforced")
	} else if !strings.Contains(verr.Error(), "category") {
		t.Errorf("failed, but not on the taxonomy slug: %v", verr)
	}
}
