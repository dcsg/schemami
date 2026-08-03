package main

// Phase 4 (SR-CORE-001, SR-VAL-003): lineage semantics, the hardened
// componentRef pin, and family validation.

import (
	"strings"
	"testing"
)

// The behaviour change must be proven as a PAIR (pre-flight qa #4).
// Before v0.4 the pin check verified only that the target declared SOME
// version; a stale pin passed silently. Hardening it could have
// collapsed the two paths into one — these two assertions together
// prove it did not.
func TestPinMismatchAndPresenceAreDistinctPaths(t *testing.T) {
	// (a) NEW: a pin naming a different revision than the target
	// declares now FAILS.
	mismatch := lintFixture(t, "componentref-pin-mismatch.rcp.yaml")
	if len(mismatch.Errors) == 0 {
		t.Fatal("a pin naming a revision the target does not declare must FAIL")
	}
	joined := strings.Join(mismatch.Errors, "\n")
	for _, want := range []string{"pins", "version 1", "declares version 2"} {
		if !strings.Contains(joined, want) {
			t.Errorf("the error should name both revisions; missing %q in: %s", want, joined)
		}
	}

	// (b) RETAINED: the pre-v0.4 rule still fires with its exact
	// original message. lint_test.go's table asserts the substring
	// "declares no version"; if the two paths had collapsed, this
	// fixture would now report a mismatch instead.
	presence := lintFixture(t, "unversioned-pin.rcp.yaml")
	if len(presence.Errors) == 0 {
		t.Fatal("the unversioned-target rule must still fire")
	}
	pj := strings.Join(presence.Errors, "\n")
	if !strings.Contains(pj, "declares no version") {
		t.Errorf("the original verdict changed — the two paths collapsed: %s", pj)
	}
	if strings.Contains(pj, "must name the revision it was written against") {
		t.Errorf("the unversioned-target case must NOT report a mismatch: %s", pj)
	}
}

// Blast radius: the corpus's one pinned reference (brownie → ganache,
// both at version 1) must not turn red under the hardening.
func TestHardenedPinLeavesCorpusGreen(t *testing.T) {
	reg, _, err := loadRegistry(root)
	if err != nil {
		t.Fatalf("registry: %v", err)
	}
	corpus, err := LoadCorpus(root + "/examples")
	if err != nil {
		t.Fatalf("corpus: %v", err)
	}
	l := &Lint{}
	idx := corpus.Index()
	for _, col := range corpus.Collections {
		for _, d := range col.Docs {
			lintDocument(d, reg, idx[col.ID], l)
		}
	}
	for _, e := range l.Errors {
		if strings.Contains(e, "pins") {
			t.Errorf("the hardened pin check reddened the shipped corpus: %s", e)
		}
	}
}

// Staleness is a WARNING, not an error: the variant is still valid and
// still renders — you are told to review it, not blocked.
func TestLineageStalePinWarns(t *testing.T) {
	l := lintFixture(t, "lineage-stale-pin.rcp.yaml")
	if len(l.Errors) != 0 {
		t.Errorf("a stale pin must not be an error: %v", l.Errors)
	}
	joined := strings.Join(l.Warnings, "\n")
	if !strings.Contains(joined, "may be stale") {
		t.Fatalf("expected a staleness warning, got: %v", l.Warnings)
	}
	for _, want := range []string{"version 1", "version 3", "DECISIONS #29"} {
		if !strings.Contains(joined, want) {
			t.Errorf("the warning should name both revisions and cite the decision; missing %q", want)
		}
	}
}

// A pin AHEAD of the target is a different fault from staleness: it
// names a revision that does not exist.
func TestLineagePinAheadFails(t *testing.T) {
	l := lintFixture(t, "lineage-pin-ahead.rcp.yaml")
	if len(l.Errors) == 0 {
		t.Fatal("a lineage pin ahead of its target must FAIL")
	}
	if strings.Contains(strings.Join(l.Warnings, "\n"), "may be stale") {
		t.Error("a pin ahead of the target is not staleness — it must not warn as such")
	}
}

// The edge case the pre-flight named: a stale pin and a hard mismatch
// on the SAME document. One warning, one error, and the error must not
// be masked by the warning.
func TestStaleAndMismatchOnOneDocument(t *testing.T) {
	docs := map[string]map[string]any{
		"parent": {"version": 3.0},
		"dep":    {"version": 2.0},
	}
	l := &Lint{}
	m := map[string]any{
		"lineage": map[string]any{
			"variant_of": map[string]any{"id": "parent", "version": 1.0},
		},
		"components": []any{
			map[string]any{"id": "d", "ref": "dep", "version": 1.0},
		},
	}
	lintLineage("fx#both", m, docs, l)
	lintRecipeScope("fx#both", m, nil, &Registry{}, docs, l)

	stale := 0
	for _, w := range l.Warnings {
		if strings.Contains(w, "may be stale") {
			stale++
		}
	}
	mismatch := 0
	for _, e := range l.Errors {
		if strings.Contains(e, "must name the revision it was written against") {
			mismatch++
		}
	}
	if stale != 1 {
		t.Errorf("expected exactly 1 staleness warning, got %d: %v", stale, l.Warnings)
	}
	if mismatch != 1 {
		t.Errorf("expected exactly 1 pin-mismatch error (unmasked by the warning), got %d: %v", mismatch, l.Errors)
	}
}

// Family validation: agreement within a collection, single-member
// warning, and silence across collections.
func TestFamilyValidation(t *testing.T) {
	docOf := func(id, family string) Document {
		return Document{File: id + ".rcp.yaml", ID: id, Value: map[string]any{
			"id": id, "lineage": map[string]any{"family": family},
		}}
	}

	// Two members: silent.
	l := &Lint{}
	lintFamilies("c1", []Document{docOf("a", "sauces"), docOf("b", "sauces")}, l)
	if len(l.Warnings) != 0 {
		t.Errorf("a family with two members must be silent, got: %v", l.Warnings)
	}

	// One member: warned — the usual cause is a typo'd slug.
	l2 := &Lint{}
	lintFamilies("c1", []Document{docOf("a", "sauces"), docOf("b", "saucez")}, l2)
	if len(l2.Warnings) != 2 {
		t.Fatalf("both single-member families must warn, got %d: %v", len(l2.Warnings), l2.Warnings)
	}
	joined := strings.Join(l2.Warnings, "\n")
	for _, want := range []string{"sauces", "saucez", "typo"} {
		if !strings.Contains(joined, want) {
			t.Errorf("the warning should name the family and suggest the cause; missing %q", want)
		}
	}

	// Across collections: nothing is said, because full membership is
	// not visible from inside one collection.
	l3 := &Lint{}
	lintFamilies("c1", []Document{docOf("a", "shared")}, l3)
	lintFamilies("c2", []Document{docOf("b", "shared")}, l3)
	if len(l3.Warnings) != 2 {
		t.Errorf("each collection judges only its own members, got: %v", l3.Warnings)
	}
}

func TestParseLineageRef(t *testing.T) {
	if r, ok := parseLineageRef("plain-slug"); !ok || r.ID != "plain-slug" || r.Pinned {
		t.Errorf("shorthand: %+v ok=%v", r, ok)
	}
	obj := map[string]any{"id": "x", "collection": "other", "version": 2.0}
	r, ok := parseLineageRef(obj)
	if !ok || r.ID != "x" || r.Collection != "other" || r.Version != 2 || !r.Pinned {
		t.Errorf("object form: %+v ok=%v", r, ok)
	}
	if _, ok := parseLineageRef(map[string]any{"version": 1.0}); ok {
		t.Error("a reference with no id must not parse")
	}
}
