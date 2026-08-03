package main

// Phase 5 (SR-CORE-002, SR-REG-003): the variant discriminator is
// machine-readable, every shipped axis is backed by something that
// exists, and the dropped diet axis cannot creep back.

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func coreSchema(t *testing.T) map[string]any {
	t.Helper()
	raw, err := os.ReadFile("../../schema/rcp-core-v1.schema.json")
	if err != nil {
		t.Fatal(err)
	}
	var s map[string]any
	if err := json.Unmarshal(raw, &s); err != nil {
		t.Fatal(err)
	}
	return s
}

func axisEnum(t *testing.T) []string {
	t.Helper()
	defs := coreSchema(t)["$defs"].(map[string]any)
	axis, ok := defs["variantAxis"].(map[string]any)
	if !ok {
		t.Fatal("$defs/variantAxis missing")
	}
	raw, _ := axis["enum"].([]any)
	var out []string
	for _, v := range raw {
		out = append(out, v.(string))
	}
	return out
}

// Two sibling variants must be distinguishable without reading prose.
func TestVariantDiscriminator(t *testing.T) {
	corpus, err := LoadCorpus(root + "/examples")
	if err != nil {
		t.Fatal(err)
	}
	seen := map[string]map[string]any{}
	for _, d := range corpus.Documents() {
		m, _ := d.Value.(map[string]any)
		lin, ok := m["lineage"].(map[string]any)
		if !ok {
			continue
		}
		if v, ok := lin["variant"].(map[string]any); ok {
			seen[d.ID] = v
		}
	}
	if len(seen) < 2 {
		t.Fatalf("expected at least two documents carrying a discriminator, got %d", len(seen))
	}
	// The white-sauce family differs on one axis, by value — readable
	// by a machine, with no prose involved.
	i, ok1 := seen["white-sauce-i"]
	ii, ok2 := seen["white-sauce-ii"]
	if !ok1 || !ok2 {
		t.Fatal("the white-sauce family must carry discriminators")
	}
	if i["axis"] != ii["axis"] {
		t.Errorf("siblings should share an axis: %v vs %v", i["axis"], ii["axis"])
	}
	if i["value"] == ii["value"] {
		t.Error("siblings must differ in value — otherwise the discriminator says nothing")
	}
	if i["order"] == nil || ii["order"] == nil {
		t.Error("a graded family should carry order, so a surface can sort it without parsing prose")
	}
}

// A document without a discriminator stays valid, and an unknown axis
// decodes into the catch-all rather than failing (decode-compat).
func TestAxisCatchAll(t *testing.T) {
	v, err := CompileSchema("../../schema/rcp-core-v1.schema.json")
	if err != nil {
		t.Fatal(err)
	}
	base := func(lineage map[string]any) map[string]any {
		m := map[string]any{
			"rcp": 1.0, "id": "x", "kind": "component", "name": "X",
			"ingredients": []any{map[string]any{"id": "a"}},
		}
		if lineage != nil {
			m["lineage"] = lineage
		}
		return m
	}
	if err := v.Validate(base(nil)); err != nil {
		t.Errorf("a document with no lineage must stay valid: %v", err)
	}
	if err := v.Validate(base(map[string]any{"family": "f"})); err != nil {
		t.Errorf("lineage without a discriminator must stay valid: %v", err)
	}
	if err := v.Validate(base(map[string]any{
		"variant": map[string]any{"axis": "other", "value": "anything at all"},
	})); err != nil {
		t.Errorf("the catch-all axis must accept an unlisted distinction: %v", err)
	}
	// An axis outside the enum is rejected at L1 — the catch-all is the
	// escape hatch, not an open vocabulary.
	if err := v.Validate(base(map[string]any{
		"variant": map[string]any{"axis": "invented-axis"},
	})); err == nil {
		t.Error("an axis outside the enum must be rejected; `other` is the sanctioned escape hatch")
	}
}

// SR-REG-003: no axis may ship resolving against nothing. Every value
// is backed by a live registry, a named external standard, or a
// spec-defined vocabulary AND exercised by a real document.
func TestAxisBacking(t *testing.T) {
	axes := axisEnum(t)
	if len(axes) == 0 {
		t.Fatal("no axes shipped")
	}
	corpus, err := LoadCorpus(root + "/examples")
	if err != nil {
		t.Fatal(err)
	}
	exercised := map[string]bool{}
	for _, d := range corpus.Documents() {
		m, _ := d.Value.(map[string]any)
		if lin, ok := m["lineage"].(map[string]any); ok {
			if v, ok := lin["variant"].(map[string]any); ok {
				if a, ok := v["axis"].(string); ok {
					exercised[a] = true
				}
			}
		}
	}
	for _, a := range axes {
		if a == "other" {
			continue // the catch-all needs no corpus evidence by definition
		}
		if !exercised[a] {
			t.Errorf("axis %q ships but no document exercises it — seed axes from evidence, not from a wishlist (SR-REG-003)", a)
		}
	}
}

// The dropped diet axis must never reappear. spec.yaml's revision
// history is append-only and still contains the entry that ADOPTED it,
// so a future reader could reintroduce it in good faith.
func TestNoDietAxis(t *testing.T) {
	for _, a := range axisEnum(t) {
		if strings.Contains(strings.ToLower(a), "diet") {
			t.Fatalf("axis %q reappeared. Diet was dropped from v0.4 with evidence "+
				"(research 10): schema.org is not a standards body and declined the role, "+
				"no authority defines Mediterranean/keto/paleo, and diet conflates three "+
				"claim kinds that behave differently under the Calculus. It needs its own "+
				"decision, not a quiet re-adoption.", a)
		}
	}
}

// The stage-vs-variant line must be stated where both are defined —
// the roux is exactly where authors will otherwise confuse them.
func TestStageVersusVariantLineStated(t *testing.T) {
	defs := coreSchema(t)["$defs"].(map[string]any)
	axis := defs["variantAxis"].(map[string]any)
	desc, _ := axis["description"].(string)
	for _, want := range []string{"stage", "measured checkpoint", "DIFFERENT INPUTS"} {
		if !strings.Contains(desc, want) {
			t.Errorf("the variant/stage distinction must be stated; missing %q", want)
		}
	}
}
