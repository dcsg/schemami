package compat

// The decode-compatibility contract (both directions, provably able to
// fail): the FROZEN v0.1 reader must decode every current document with
// its v0.1-era fields intact, and the frozen struct surface must remain
// a mechanical transcription of the pinned tag's schema — verified by
// diffing struct yaml tags against `git show <pin>:schema/...` property
// names, so the pin rots loudly, never silently.

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"sort"
	"strings"
	"testing"
)

const repoRoot = "../../.."

func decodeFile(t *testing.T, path string) []RecipeV01 {
	t.Helper()
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	docs, err := DecodeDocuments(raw)
	if err != nil {
		t.Fatalf("frozen reader failed on %s: %v", path, err)
	}
	if len(docs) == 0 {
		t.Fatalf("frozen reader produced no documents from %s", path)
	}
	return docs
}

// Direction 1: the frozen v0.1 reader decodes every CURRENT example —
// fields added after v0.1 must be tolerated (ignored), v0.1-era
// identity fields must survive.
func TestDecodeCompatFrozenReaderReadsCurrent(t *testing.T) {
	paths, err := filepath.Glob(filepath.Join(repoRoot, "examples", "*.rcp.yaml"))
	if err != nil || len(paths) == 0 {
		t.Fatalf("no current examples found: %v", err)
	}
	for _, p := range paths {
		for _, doc := range decodeFile(t, p) {
			if doc.ID == "" || doc.Kind == "" || doc.Name == nil {
				t.Errorf("%s: v0.1-era identity fields lost (id=%q kind=%q name=%v)", p, doc.ID, doc.Kind, doc.Name)
			}
			if doc.RCP == nil {
				t.Errorf("%s#%s: rcp version marker lost", p, doc.ID)
			}
			if len(doc.Ingredients) == 0 && len(doc.Components) == 0 {
				t.Errorf("%s#%s: neither ingredients nor components decoded", p, doc.ID)
			}
		}
	}
}

// The v0.1-era fixtures (extracted from the tag itself) also decode —
// the reader is not accidentally stricter than its own era.
func TestDecodeCompatFrozenReaderReadsV01Extracts(t *testing.T) {
	paths, err := filepath.Glob(filepath.Join(repoRoot, "tools/rcplint/testdata/compat/v01", "*.rcp.yaml"))
	if err != nil || len(paths) == 0 {
		t.Fatalf("no v0.1 extracts found: %v", err)
	}
	total := 0
	for _, p := range paths {
		docs := decodeFile(t, p)
		total += len(docs)
		for _, doc := range docs {
			if doc.ID == "" || doc.Kind == "" || doc.Name == nil {
				t.Errorf("%s: identity fields empty (id=%q kind=%q name=%v)", p, doc.ID, doc.Kind, doc.Name)
			}
		}
	}
	if total < 6 {
		t.Errorf("expected the six v0.1 example documents, decoded %d", total)
	}
}

// Inverted proof: a document from a hypothetical breaking future (the
// `kind` field renamed) MUST fail the identity check — demonstrating
// the gate can actually fail (SAC-PR-002).
func TestDecodeCompatBreakingFixtureFails(t *testing.T) {
	breaking := []byte("rcp: \"99.0\"\nid: broken\ntype: recipe # renamed from kind — a breaking change\nname: Broken\n")
	docs, err := DecodeDocuments(breaking)
	if err != nil {
		t.Fatalf("decode itself should tolerate unknowns: %v", err)
	}
	if docs[0].Kind != "" {
		t.Fatalf("breaking fixture unexpectedly satisfied the contract — the gate cannot fail")
	}
}

// Mechanical transcription check: struct yaml tags == the pinned tag's
// schema property names, per $defs entity. Requires git (dev/CI gate).
func TestDecodeCompatStructSurfaceMatchesPinnedSchema(t *testing.T) {
	out, err := exec.Command("git", "-C", repoRoot, "show", PinnedV01SHA+":schema/rcp-core-v1.schema.json").Output()
	if err != nil {
		t.Fatalf("git show %s: %v (pin rotted?)", PinnedV01SHA, err)
	}
	var schema struct {
		Defs map[string]struct {
			Properties map[string]json.RawMessage `json:"properties"`
		} `json:"$defs"`
	}
	if err := json.Unmarshal(out, &schema); err != nil {
		t.Fatalf("parse pinned schema: %v", err)
	}
	cases := []struct {
		def string
		typ reflect.Type
	}{
		{"recipe", reflect.TypeOf(RecipeV01{})},
		{"ingredient", reflect.TypeOf(IngredientV01{})},
		{"step", reflect.TypeOf(StepV01{})},
	}
	for _, c := range cases {
		var want []string
		for name := range schema.Defs[c.def].Properties {
			want = append(want, name)
		}
		var got []string
		for i := 0; i < c.typ.NumField(); i++ {
			tag := c.typ.Field(i).Tag.Get("yaml")
			got = append(got, strings.Split(tag, ",")[0])
		}
		sort.Strings(want)
		sort.Strings(got)
		if !reflect.DeepEqual(got, want) {
			t.Errorf("%s surface drifted from pinned schema\n got: %v\nwant: %v", c.def, got, want)
		}
	}
}

// SR-PACK-002 / AC-2.5: a document carrying a collection qualifier — a
// field that did not exist at v0.1 — must still decode through the
// FROZEN v0.1 reader with its v0.1-era fields intact. This is the
// decode-compat contract meeting the new identity work.
func TestDecodeCompatToleratesCollectionQualifier(t *testing.T) {
	withQualifier := []byte("rcp: 1\nid: broa-de-milho\ncollection: livro-do-avo\nkind: bread\nname:\n  pt: Broa de milho\ningredients:\n  - id: farinha\n    raw: farinha de milho\n")
	docs, err := DecodeDocuments(withQualifier)
	if err != nil {
		t.Fatalf("frozen v0.1 reader rejected a collection qualifier: %v", err)
	}
	d := docs[0]
	if d.ID != "broa-de-milho" || d.Kind != "bread" || d.Name == nil {
		t.Errorf("v0.1-era fields lost alongside the new qualifier: id=%q kind=%q name=%v", d.ID, d.Kind, d.Name)
	}
	if len(d.Ingredients) != 1 {
		t.Errorf("ingredients lost: %d", len(d.Ingredients))
	}
}
