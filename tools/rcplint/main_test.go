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

func TestExamplesPassCore(t *testing.T) {
	v := coreValidator(t)
	paths, _ := filepath.Glob(filepath.Join(root, "examples/*.rcp.yaml"))
	n := 0
	for _, p := range paths {
		docs, err := LoadDocuments(p)
		if err != nil {
			t.Fatalf("%s: %v", p, err)
		}
		for _, d := range docs {
			n++
			if err := v.Validate(d.Value); err != nil {
				t.Errorf("%s", FormatError(p, d.ID, err))
			}
		}
	}
	if n != 6 {
		t.Errorf("expected 6 documents, got %d", n)
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
