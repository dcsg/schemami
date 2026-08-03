package main

// Phase 6 (SR-REG-001, SR-CORE-006): the canonical link schema and the
// published total resolution order.

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCanonicalLinkSchema(t *testing.T) {
	for _, kind := range []string{"technique", "ingredient-class"} {
		path := filepath.Join(root, "registry/schemas", kind+".schema.json")
		v, err := CompileSchema(path)
		if err != nil {
			t.Fatalf("compile %s: %v", kind, err)
		}
		raw, _ := os.ReadFile(path)
		var s map[string]any
		json.Unmarshal(raw, &s)
		req, _ := s["required"].([]any)
		for _, r := range req {
			if r == "canonical_recipe" {
				t.Errorf("%s: canonical_recipe must never be required — it is curation, not essence", kind)
			}
		}
		// Shapes taken from real entries, not invented: technique uses
		// kind "technique" with a string definition; ingredient-class
		// uses kind "ingredient-class", requires roles, and its
		// display_name requires pt.
		var base map[string]any
		if kind == "ingredient-class" {
			base = map[string]any{
				"id": "ingredient.x", "kind": "ingredient-class",
				"display_name": map[string]any{"pt": "X", "en": "X"},
				"definition":   "a test class",
				"roles":        []any{"flour"},
			}
		} else {
			base = map[string]any{
				"id": "technique.x", "kind": "technique",
				"display_name": map[string]any{"pt": "X", "en": "X"},
				"definition":   "a test technique",
			}
		}
		// Without the link: valid.
		if err := v.Validate(base); err != nil {
			t.Errorf("%s: an entry without canonical_recipe must stay valid: %v", kind, err)
		}
		// With the link: valid, in all three shapes.
		for _, link := range []map[string]any{
			{"id": "white-sauce-i"},
			{"id": "white-sauce-i", "version": 1.0},
			{"id": "white-sauce-i", "collection": "boston-1910", "version": 1.0},
		} {
			withLink := map[string]any{}
			for k, val := range base {
				withLink[k] = val
			}
			withLink["canonical_recipe"] = link
			if err := v.Validate(withLink); err != nil {
				t.Errorf("%s: canonical_recipe %v rejected: %v", kind, link, err)
			}
		}
		// A link with no id is meaningless.
		bad := map[string]any{}
		for k, val := range base {
			bad[k] = val
		}
		bad["canonical_recipe"] = map[string]any{"version": 1.0}
		if err := v.Validate(bad); err == nil {
			t.Errorf("%s: canonical_recipe without an id must be rejected", kind)
		}
	}
}

// The order, across the full matrix. Candidates are fed in DELIBERATELY
// WRONG sequence each time: the order is a property of the rule, never
// of the input.
func TestResolutionOrder(t *testing.T) {
	pin := Candidate{Tier: TierPin, ID: "pinned", Version: 2}
	own := Candidate{Tier: TierOwn, Collection: "mine", ID: "mine-roux"}
	canon := Candidate{Tier: TierCanonical, Collection: "boston-1910", ID: "white-sauce-i"}

	cases := []struct {
		name     string
		in       []Candidate
		wantID   string
		wantWord string
	}{
		{"all three", []Candidate{canon, own, pin}, "pinned", "pin outranks everything"},
		{"own vs canonical", []Candidate{canon, own}, "mine-roux", "own collection outranks the canonical link"},
		{"canonical alone", []Candidate{canon}, "white-sauce-i", "canonical link applies"},
		{"pin vs canonical", []Candidate{canon, pin}, "pinned", "pin outranks everything"},
	}
	for _, c := range cases {
		r := ResolveMention("roux", c.in)
		if r.Err != nil {
			t.Errorf("%s: unexpected failure: %v", c.name, r.Err)
			continue
		}
		if r.Winner.ID != c.wantID {
			t.Errorf("%s: winner = %q, want %q", c.name, r.Winner.ID, c.wantID)
		}
		if !strings.Contains(r.Criterion, c.wantWord) {
			t.Errorf("%s: criterion %q should mention %q", c.name, r.Criterion, c.wantWord)
		}
	}
}

// The user above the author. ld.so shipped this backwards and needed a
// second field to correct it; this test pins the direction so it cannot
// be quietly reversed.
func TestUserOutranksAuthor(t *testing.T) {
	r := ResolveMention("roux", []Candidate{
		{Tier: TierCanonical, Collection: "curated", ID: "steward-roux"},
		{Tier: TierOwn, Collection: "mine", ID: "my-roux"},
	})
	if r.Err != nil || r.Winner.ID != "my-roux" {
		t.Fatalf("the consumer's own recipe must outrank the curated canonical: %+v", r)
	}
}

// Within a tier, a qualified reference outranks an unqualified one.
func TestQualifiedWinsWithinTier(t *testing.T) {
	r := ResolveMention("roux", []Candidate{
		{Tier: TierOwn, ID: "roux", Qualified: false},
		{Tier: TierOwn, Collection: "named", ID: "roux", Qualified: true},
	})
	if r.Err != nil {
		t.Fatalf("a qualified/unqualified pair is separable, not a tie: %v", r.Err)
	}
	if !r.Winner.Qualified {
		t.Error("the qualified reference must win within a tier")
	}
}

// The tiebreak must never silently pick. A genuine tie FAILS naming
// every candidate.
func TestResolutionTieFails(t *testing.T) {
	r := ResolveMention("roux", []Candidate{
		{Tier: TierOwn, Collection: "a", ID: "roux"},
		{Tier: TierOwn, Collection: "b", ID: "roux"},
	})
	if r.Err == nil {
		t.Fatal("a genuine tie must FAIL — the order must never silently pick")
	}
	if r.Winner != nil {
		t.Error("a failed resolution must name no winner")
	}
	for _, want := range []string{"a/roux", "b/roux", "qualify the reference"} {
		if !strings.Contains(r.Err.Error(), want) {
			t.Errorf("the failure must name every candidate and say how to fix it; missing %q in: %v", want, r.Err)
		}
	}
}

func TestNoCandidatesFails(t *testing.T) {
	r := ResolveMention("roux", nil)
	if r.Err == nil || r.Winner != nil {
		t.Error("a mention nothing answers must fail, not resolve to nothing")
	}
}

// SR-CORE-006: the protocol fixes what an explanation CONTAINS — the
// candidate set, the winner, and the deciding criterion — while
// specifying no UI.
func TestResolutionExplanation(t *testing.T) {
	r := ResolveMention("roux", []Candidate{
		{Tier: TierCanonical, Collection: "boston-1910", ID: "white-sauce-i", Version: 1},
		{Tier: TierOwn, Collection: "mine", ID: "my-roux"},
	})
	e := r.Explain()
	for _, want := range []string{
		"roux",                    // the mention
		"boston-1910/white-sauce-i", // every candidate, losers included
		"mine/my-roux",
		"wins",                    // the winner
		"own collection",          // the deciding criterion
	} {
		if !strings.Contains(e, want) {
			t.Errorf("explanation missing %q:\n%s", want, e)
		}
	}
	// A failed resolution explains itself too.
	tie := ResolveMention("roux", []Candidate{
		{Tier: TierOwn, Collection: "a", ID: "roux"},
		{Tier: TierOwn, Collection: "b", ID: "roux"},
	})
	if !strings.Contains(tie.Explain(), "unresolved") {
		t.Errorf("a tie must explain itself as unresolved:\n%s", tie.Explain())
	}
}

// Input order must not affect the outcome.
func TestOrderIndependentOfInputSequence(t *testing.T) {
	a := Candidate{Tier: TierPin, ID: "p"}
	b := Candidate{Tier: TierOwn, ID: "o"}
	c := Candidate{Tier: TierCanonical, ID: "c"}
	perms := [][]Candidate{{a, b, c}, {c, b, a}, {b, c, a}, {c, a, b}}
	for _, p := range perms {
		r := ResolveMention("m", p)
		if r.Err != nil || r.Winner.ID != "p" {
			t.Errorf("input order changed the outcome for %v: %+v", p, r)
		}
	}
}
