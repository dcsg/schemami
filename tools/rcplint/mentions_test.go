package main

// Phase 10 (SR-REG-002): the extraction rule, enforced.

import (
	"strings"
	"testing"
)

func TestMentionUnanchoredWarns(t *testing.T) {
	l := lintFixture(t, "mention-unanchored.rcp.yaml")
	if len(l.Errors) != 0 {
		t.Errorf("an unanchored mention is a warning, not an error: %v", l.Errors)
	}
	joined := strings.Join(l.Warnings, "\n")
	if !strings.Contains(joined, `names "roux"`) {
		t.Fatalf("expected the unanchored-mention warning, got: %v", l.Warnings)
	}
	for _, want := range []string{"technique.roux", "canonical method", "SR-REG-002"} {
		if !strings.Contains(joined, want) {
			t.Errorf("the warning should name the class, say a method exists, and cite the rule; missing %q", want)
		}
	}
}

func TestMentionPattern(t *testing.T) {
	l := lintFixture(t, "mention-unknown-vocabulary.rcp.yaml")
	joined := strings.Join(l.Warnings, "\n")
	if !strings.Contains(joined, "beurremanie") {
		t.Fatalf("an authored 'make a X' with unknown X must warn: %v", l.Warnings)
	}
	if !strings.Contains(joined, "no entry") {
		t.Errorf("the warning should say the registry cannot name it: %s", joined)
	}
}

// The negative control matters more than the positives. A detector that
// fires on correct documents gets muted, and a muted detector is worse
// than none.
func TestMentionAnchoredIsSilent(t *testing.T) {
	l := lintFixture(t, "mention-anchored-ok.rcp.yaml")
	for _, w := range l.Warnings {
		if strings.Contains(w, "SR-REG-002") {
			t.Errorf("a properly anchored mention must be SILENT, got: %s", w)
		}
	}
}

// Precision: only TEACHABLE preparations participate. technique.stir
// exists but carries no canonical method — you never "make a stir", and
// warning about it would be noise.
func TestOnlyTeachablePreparationsDetected(t *testing.T) {
	reg, _, err := loadRegistry(root)
	if err != nil {
		t.Fatal(err)
	}
	l := &Lint{}
	doc := map[string]any{"steps": []any{map[string]any{
		"id": "s", "note": map[string]any{"en": "Stir until melted, then stir again."},
	}}}
	lintMentions("fx#verb", doc, reg, l)
	for _, w := range l.Warnings {
		if strings.Contains(w, `"stir"`) {
			t.Errorf("a technique with no canonical method must not be reported as a dead-end mention: %s", w)
		}
	}
	// And the teachable one still fires.
	l2 := &Lint{}
	lintMentions("fx#noun", map[string]any{"steps": []any{map[string]any{
		"id": "s", "note": map[string]any{"en": "Begin with a roux."},
	}}}, reg, l2)
	if len(l2.Warnings) == 0 {
		t.Error("a teachable preparation named with nothing anchoring it must warn")
	}
}

// The phrase-end requirement: "make a different preparation" reports
// nothing, because "different" is a modifier, not the head noun. A
// detector that reports adjectives gets muted within a week.
func TestMentionPatternSkipsModifiers(t *testing.T) {
	reg, _, _ := loadRegistry(root)
	l := &Lint{}
	lintMentions("fx#adj", map[string]any{"steps": []any{map[string]any{
		"id": "s", "note": map[string]any{"en": "Browning it would make a different preparation entirely."},
	}}}, reg, l)
	for _, w := range l.Warnings {
		if strings.Contains(w, "different") {
			t.Errorf("a modifier must not be reported as a sub-preparation: %s", w)
		}
	}
	// The head noun still fires when it ends the phrase.
	l2 := &Lint{}
	lintMentions("fx#head", map[string]any{"steps": []any{map[string]any{
		"id": "s", "note": map[string]any{"en": "First make a beurremanie and set it aside."},
	}}}, reg, l2)
	if len(l2.Warnings) == 0 {
		t.Error("a head noun followed by a continuation word must still fire")
	}
}

// Word-boundary matching: "roux" must not fire inside another word.
func TestMentionWordBoundary(t *testing.T) {
	if containsWord("o rouxinol canta", "roux") {
		t.Error("roux must not match inside rouxinol")
	}
	if !containsWord("faça um roux.", "roux") {
		t.Error("roux must match as a whole word")
	}
	if !containsWord("roux", "roux") {
		t.Error("a bare word must match")
	}
}
