package main

// Phase 2 (SR-PACK-001/002): collections are real, and a reference
// cannot misbind across them. These tests build synthetic corpora in
// t.TempDir() — the repo precedent for rules needing a whole root
// (see TestFilenameIDMismatch).

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// writeCorpus materializes {collection: {filename: yaml}} under a temp root.
func writeCorpus(t *testing.T, layout map[string]map[string]string) string {
	t.Helper()
	root := t.TempDir()
	for dir, files := range layout {
		full := filepath.Join(root, dir)
		if err := os.MkdirAll(full, 0o755); err != nil {
			t.Fatal(err)
		}
		for name, body := range files {
			if err := os.WriteFile(filepath.Join(full, name), []byte(body), 0o644); err != nil {
				t.Fatal(err)
			}
		}
	}
	return root
}

const docTemplate = `rcp: 1
id: %ID%
kind: bread
lang: pt-PT
name: { pt: %ID% }
ingredients:
  - id: farinha
    raw: farinha
    amount: { value: 500, unit: g }
    roles: [flour]
`

func doc(id string) string { return strings.ReplaceAll(docTemplate, "%ID%", id) }

func manifest(id string) string { return "rcp: 1\ncollection: " + id + "\n" }

// The headline rule: the SAME id in two collections is legal, and
// neither overwrites the other. Before v0.4 the flat siblings map made
// the second silently win.
func TestCollectionCollision(t *testing.T) {
	root := writeCorpus(t, map[string]map[string]string{
		"livro-do-avo": {"rcp-pack.yaml": manifest("livro-do-avo"), "pao.rcp.yaml": doc("pao-alentejano")},
		"casa":         {"rcp-pack.yaml": manifest("casa"), "pao.rcp.yaml": doc("pao-alentejano")},
	})
	c, err := LoadCorpus(root)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if len(c.Errors) != 0 {
		t.Errorf("a cross-collection id collision must NOT be an error, got: %v", c.Errors)
	}
	if len(c.Collections) != 2 {
		t.Fatalf("expected 2 collections, got %d", len(c.Collections))
	}
	idx := c.Index()
	for _, col := range []string{"livro-do-avo", "casa"} {
		if _, ok := idx.Resolve(col, "", "pao-alentejano"); !ok {
			t.Errorf("collection %q lost its pao-alentejano — one document overwrote the other", col)
		}
	}
	if len(c.Documents()) != 2 {
		t.Errorf("both documents must survive, got %d", len(c.Documents()))
	}
}

// An unqualified reference resolves in its OWN collection and never
// falls back to searching another one.
func TestUnqualifiedScope(t *testing.T) {
	root := writeCorpus(t, map[string]map[string]string{
		"a": {"rcp-pack.yaml": manifest("a"), "x.rcp.yaml": doc("shared-id")},
		"b": {"rcp-pack.yaml": manifest("b"), "y.rcp.yaml": doc("only-in-b")},
	})
	c, err := LoadCorpus(root)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	idx := c.Index()

	if _, ok := idx.Resolve("a", "", "shared-id"); !ok {
		t.Error("a document must resolve within its own collection")
	}
	// The crux: b has no `shared-id`. Resolution must FAIL rather than
	// reaching into collection a.
	if _, ok := idx.Resolve("b", "", "shared-id"); ok {
		t.Error("an unqualified reference MUST NOT fall back to another collection")
	}
	// Qualified, it resolves.
	if _, ok := idx.Resolve("b", "a", "shared-id"); !ok {
		t.Error("a qualified reference must resolve in the named collection")
	}
	// Qualified at an unknown collection fails, and is distinguishable.
	if _, ok := idx.Resolve("b", "nope", "shared-id"); ok {
		t.Error("a reference into an unknown collection must not resolve")
	}
	if idx.KnownCollection("nope") {
		t.Error("KnownCollection must report an absent collection as absent")
	}
	if !idx.KnownCollection("a") {
		t.Error("KnownCollection must report a loaded collection as known")
	}
}

func TestSplitRef(t *testing.T) {
	for _, tc := range []struct{ in, wantQ, wantID string }{
		{"ganache-chocolate", "", "ganache-chocolate"},
		{"livro-do-avo/ganache-chocolate", "livro-do-avo", "ganache-chocolate"},
		{"example.com/packs/base/roux", "example.com/packs/base", "roux"},
	} {
		q, id := SplitRef(tc.in)
		if q != tc.wantQ || id != tc.wantID {
			t.Errorf("SplitRef(%q) = (%q,%q), want (%q,%q)", tc.in, q, id, tc.wantQ, tc.wantID)
		}
	}
}

// Within ONE collection a duplicate id IS an error — today's flat map
// silently overwrote, which is the defect this phase fixes.
func TestIntraCollectionCollision(t *testing.T) {
	root := writeCorpus(t, map[string]map[string]string{
		"solo": {
			"rcp-pack.yaml": manifest("solo"),
			"one.rcp.yaml":  doc("same-id"),
			"two.rcp.yaml":  doc("same-id"),
		},
	})
	c, err := LoadCorpus(root)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if len(c.Errors) == 0 {
		t.Fatal("a duplicate id WITHIN one collection must be an error")
	}
	joined := strings.Join(c.Errors, "\n")
	for _, want := range []string{"same-id", "unique within a collection"} {
		if !strings.Contains(joined, want) {
			t.Errorf("error should mention %q, got: %s", want, joined)
		}
	}
}

// A corpus with no manifest anywhere stays one collection — the
// pre-v0.4 layout must keep working untouched.
func TestCorpusWithoutManifest(t *testing.T) {
	root := writeCorpus(t, map[string]map[string]string{
		".": {"a.rcp.yaml": doc("one"), "b.rcp.yaml": doc("two")},
	})
	c, err := LoadCorpus(root)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if len(c.Collections) != 1 {
		t.Fatalf("an unmanifested corpus is ONE collection, got %d", len(c.Collections))
	}
	if len(c.Documents()) != 2 {
		t.Errorf("expected 2 documents, got %d", len(c.Documents()))
	}
}

// SP-006 / SAC-PACK-001: the recipe id pattern must be byte-identical
// to its v0.1 form. Widening it would break v0.1-era readers and force
// a MODEL bump — this is a TEST, not a review habit.
func TestIdPatternFrozen(t *testing.T) {
	out, err := exec.Command("git", "-C", "../..", "show",
		"25f31f62260450ed961c67e39ff1c7efd9b53755:schema/rcp-core-v1.schema.json").Output()
	if err != nil {
		t.Fatalf("git show pinned schema: %v", err)
	}
	var pinned, current map[string]any
	if err := json.Unmarshal(out, &pinned); err != nil {
		t.Fatalf("parse pinned: %v", err)
	}
	raw, err := os.ReadFile("../../schema/rcp-core-v1.schema.json")
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, &current); err != nil {
		t.Fatalf("parse current: %v", err)
	}
	defOf := func(s map[string]any, name string) map[string]any {
		defs, _ := s["$defs"].(map[string]any)
		d, _ := defs[name].(map[string]any)
		return d
	}
	pinnedSlug, currentSlug := defOf(pinned, "slug"), defOf(current, "slug")
	if pinnedSlug["pattern"] != currentSlug["pattern"] {
		t.Errorf("$defs/slug pattern CHANGED — this forces a MODEL bump.\n pinned: %v\ncurrent: %v",
			pinnedSlug["pattern"], currentSlug["pattern"])
	}
	if pinnedSlug["type"] != currentSlug["type"] {
		t.Errorf("$defs/slug type changed: %v -> %v", pinnedSlug["type"], currentSlug["type"])
	}
	// recipe.id must still be exactly the slug ref.
	recipeID := func(s map[string]any) any {
		r := defOf(s, "recipe")
		props, _ := r["properties"].(map[string]any)
		id, _ := props["id"].(map[string]any)
		return id["$ref"]
	}
	if recipeID(pinned) != recipeID(current) {
		t.Errorf("recipe.id no longer refs the frozen slug: %v -> %v", recipeID(pinned), recipeID(current))
	}
	// The collection qualifier must live in its OWN value space.
	if defOf(current, "collectionId") == nil {
		t.Error("collectionId must be its own def — qualification never widens the recipe id pattern")
	}
}
