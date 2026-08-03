package main

import (
	"path/filepath"
	"testing"
)

const root = "../.."

func coreValidator(t *testing.T) Validator {
	t.Helper()
	v, err := CompileSchema(filepath.Join(root, "schema/rcp-core-v1.schema.json"))
	if err != nil {
		t.Fatalf("compile core: %v", err)
	}
	return v
}

// AC-4.5: the l1 negative fixtures re-verified under the real validator.
func TestL1FixturesRejected(t *testing.T) {
	v := coreValidator(t)
	for _, f := range []string{"constraint-no-bounds", "ratio-without-of"} {
		docs, err := LoadDocuments(filepath.Join("testdata/l1", f+".rcp.yaml"))
		if err != nil {
			t.Fatalf("%s: %v", f, err)
		}
		if err := v.Validate(docs[0].Value); err == nil {
			t.Errorf("%s: negative fixture PASSED — core hardening missing", f)
		}
	}
}

// The corpus is collection-aware since v0.4 (SR-PACK-001): the count is
// asserted PER COLLECTION, so adding a collection can never silently
// change what the founding regression suite is expected to contain.
func TestExamplesPassCore(t *testing.T) {
	v := coreValidator(t)
	corpus, err := LoadCorpus(filepath.Join(root, "examples"))
	if err != nil {
		t.Fatalf("load corpus: %v", err)
	}
	if len(corpus.Errors) != 0 {
		t.Fatalf("corpus errors: %v", corpus.Errors)
	}
	counts := map[string]int{}
	for _, col := range corpus.Collections {
		for _, d := range col.Docs {
			counts[col.ID]++
			if err := v.Validate(d.Value); err != nil {
				t.Errorf("%s", FormatError(d.File, d.ID, err))
			}
		}
	}
	// The founding six are the regression suite (VERSIONING.md, the freeze).
	if counts["rcp-examples"] != 6 {
		t.Errorf("collection rcp-examples: expected the founding 6 documents, got %d", counts["rcp-examples"])
	}
	if len(corpus.Collections) < 2 {
		t.Errorf("expected at least 2 published collections, got %d", len(corpus.Collections))
	}
}

// AC-4.5: registry fixtures under the real validator.
func TestRegistryFixtures(t *testing.T) {
	schemas := map[string]string{
		"ingredient": "ingredient-class.schema.json",
		"primitive":  "step-primitive.schema.json",
		"equipment":  "equipment-profile.schema.json",
	}
	vs := map[string]Validator{}
	for k, f := range schemas {
		v, err := CompileSchema(filepath.Join(root, "registry/schemas", f))
		if err != nil {
			t.Fatalf("compile %s: %v", f, err)
		}
		vs[k] = v
	}
	docs, _ := LoadDocuments("testdata/registry/ingredient-missing-roles.yaml")
	if err := vs["ingredient"].Validate(docs[0].Value); err == nil {
		t.Error("ingredient-missing-roles: PASSED — roles requirement missing")
	}
	valid, _ := filepath.Glob("testdata/registry/valid/*.yaml")
	for _, p := range valid {
		docs, _ := LoadDocuments(p)
		prefix := ""
		if id, ok := docs[0].Value.(map[string]any)["id"].(string); ok {
			for k := range schemas {
				if len(id) > len(k) && id[:len(k)] == k {
					prefix = k
				}
			}
		}
		if err := vs[prefix].Validate(docs[0].Value); err != nil {
			t.Errorf("valid sample %s rejected: %v", filepath.Base(p), err)
		}
	}
}
