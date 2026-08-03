package main

// Phase 1 (SR-PACK-003): the manifest format and the authority rule.
// Fixtures live in testdata/pack/, deliberately OUTSIDE every corpus
// glob — a must-fail document must never red `make validate` (repo
// precedent: testdata/l1, testdata/l2).

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestPackManifest(t *testing.T) {
	m, found, err := LoadPackManifest("testdata/pack/ok")
	if err != nil || !found {
		t.Fatalf("valid manifest not loaded: found=%v err=%v", found, err)
	}
	if m.Collection != "livro-do-avo" {
		t.Errorf("collection = %q, want livro-do-avo", m.Collection)
	}

	// A manifest declaring no identifier is an error, not an empty id.
	if _, _, err := LoadPackManifest("testdata/pack/bad-no-id"); err == nil {
		t.Error("manifest without a collection identifier must error")
	} else if !strings.Contains(err.Error(), "no collection identifier") {
		t.Errorf("error should name the missing identifier, got: %v", err)
	}

	// No manifest is not an error — a lone document may self-declare.
	if _, found, err := LoadPackManifest("testdata/l2"); err != nil || found {
		t.Errorf("absent manifest: found=%v err=%v, want found=false err=nil", found, err)
	}
}

func TestPackManifestSchema(t *testing.T) {
	v, err := CompileSchema("../../schema/rcp-pack-v1.schema.json")
	if err != nil {
		t.Fatalf("compile pack schema: %v", err)
	}
	m, _, err := LoadPackManifest("testdata/pack/ok")
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if err := v.Validate(m.Value); err != nil {
		t.Errorf("valid manifest rejected by its own schema: %v", err)
	}
	// A manifest with only rcp + collection is the minimum shape.
	if err := v.Validate(map[string]any{"rcp": 1.0, "collection": "x"}); err != nil {
		t.Errorf("minimal manifest rejected: %v", err)
	}
	// Missing collection must be rejected at L1 too.
	if err := v.Validate(map[string]any{"rcp": 1.0}); err == nil {
		t.Error("manifest without collection must fail schema validation")
	}
}

func TestPackManifestConflict(t *testing.T) {
	dir := "testdata/pack/conflict"
	man, found, err := LoadPackManifest(dir)
	if err != nil || !found {
		t.Fatalf("manifest: found=%v err=%v", found, err)
	}
	docs, err := LoadDocuments(filepath.Join(dir, "broa.rcp.yaml"))
	if err != nil || len(docs) == 0 {
		t.Fatalf("load document: %v", err)
	}
	d := docs[0]
	if got := DocumentCollection(d); got != "outra-coleccao" {
		t.Fatalf("fixture should self-declare a DIFFERENT collection, got %q", got)
	}

	collection, conflict := ResolveCollection(man, true, d)
	if collection != man.Collection {
		t.Errorf("the manifest must win: got %q, want %q", collection, man.Collection)
	}
	if conflict == "" {
		t.Fatal("a disagreeing self-declaration must be REPORTED, not silently resolved")
	}
	for _, want := range []string{"outra-coleccao", "livro-do-avo", "manifest wins"} {
		if !strings.Contains(conflict, want) {
			t.Errorf("conflict report should mention %q, got: %s", want, conflict)
		}
	}
}

func TestPackManifestNoConflictWhenAgreeing(t *testing.T) {
	man := PackManifest{Dir: "testdata/pack/ok", Collection: "livro-do-avo"}
	agreeing := Document{File: "x.rcp.yaml", ID: "x", Value: map[string]any{"collection": "livro-do-avo"}}
	if c, conflict := ResolveCollection(man, true, agreeing); c != "livro-do-avo" || conflict != "" {
		t.Errorf("agreement must be silent: collection=%q conflict=%q", c, conflict)
	}
	silent := Document{File: "y.rcp.yaml", ID: "y", Value: map[string]any{}}
	if c, conflict := ResolveCollection(man, true, silent); c != "livro-do-avo" || conflict != "" {
		t.Errorf("a document declaring nothing inherits the manifest: collection=%q conflict=%q", c, conflict)
	}
	// Lone document, no manifest: its self-declaration stands.
	lone := Document{File: "z.rcp.yaml", ID: "z", Value: map[string]any{"collection": "solo"}}
	if c, _ := ResolveCollection(PackManifest{}, false, lone); c != "solo" {
		t.Errorf("lone traveller keeps its self-declaration, got %q", c)
	}
}

// SP-006 / the decode-compat surface: the manifest must NOT have leaked
// into the recipe core as a kind value or a new required field.
func TestPackIsNotARecipeKind(t *testing.T) {
	core, err := CompileSchema("../../schema/rcp-core-v1.schema.json")
	if err != nil {
		t.Fatalf("compile core: %v", err)
	}
	// A manifest is not a recipe document: core must reject it.
	m, _, err := LoadPackManifest("testdata/pack/ok")
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if err := core.Validate(m.Value); err == nil {
		t.Error("the core schema must not accept a pack manifest — pack is a separate format")
	}
	// And a document carrying `collection` stays valid (optional field).
	docs, err := LoadDocuments("testdata/pack/conflict/broa.rcp.yaml")
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if err := core.Validate(docs[0].Value); err != nil {
		t.Errorf("optional collection field must not break core validation: %v", err)
	}
}
