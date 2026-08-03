package main

// Direction 2 of the decode-compatibility contract (DS-PR-009): the
// CURRENT loader and CURRENT core schema must accept every v0.1-era
// document (extracted from the pinned tag into testdata/compat/v01/).
// A failure here means the core grew a new required field without a
// default — the exact breaking change the contract forbids.

import (
	"path/filepath"
	"testing"
)

func TestDecodeCompatCurrentAcceptsV01(t *testing.T) {
	core, err := CompileSchema("../../schema/rcp-core-v1.schema.json")
	if err != nil {
		t.Fatalf("compile current core: %v", err)
	}
	paths, err := filepath.Glob("testdata/compat/v01/*.rcp.yaml")
	if err != nil || len(paths) == 0 {
		t.Fatalf("no v0.1 extracts found: %v", err)
	}
	total := 0
	for _, p := range paths {
		docs, err := LoadDocuments(p)
		if err != nil {
			t.Fatalf("current loader failed on v0.1 document %s: %v", p, err)
		}
		for _, d := range docs {
			total++
			if d.ID == "" || d.Kind == "" {
				t.Errorf("%s: document identity lost (id=%q kind=%q)", p, d.ID, d.Kind)
			}
			if err := core.Validate(d.Value); err != nil {
				t.Errorf("current core rejects v0.1 document %s#%s — new required field without a default? %v", p, d.ID, err)
			}
		}
	}
	if total < 6 {
		t.Errorf("expected the six v0.1 example documents, got %d", total)
	}
}
