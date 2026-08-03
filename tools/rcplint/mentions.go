package main

// The extraction rule, enforced (SR-REG-002).
//
// BINDING RULE: a sub-preparation whose method the source gives is
// lifted to an INLINE COMPONENT; one named without a method becomes a
// CLASS REFERENCE. Prose is never invented and never silently dropped.
//
// What the linter can actually check is the second half: a mention that
// anchors to NOTHING. Two detectors, both deliberately conservative —
// a warning nobody trusts is worse than no warning at all:
//
//	(a) step prose names a registry-known preparation or technique that
//	    nothing in the document anchors (no component, no class
//	    reference, no technique declaration)
//	(b) an authored pattern ("faça um X", "make a X") whose X the
//	    registry does not know — a gap in the vocabulary, surfaced
//	    rather than guessed at
//
// Neither invents a resolution. The protocol never guesses which roux a
// mention means; it tells you the mention has nowhere to go.

import (
	"fmt"
	"regexp"
	"strings"
)

// mentionPatterns are the authored forms that announce a sub-preparation.
// pt-PT and en, maintained by hand — the list is small on purpose, and
// growing it is a reviewed change, not an inference.
//
// Each requires the captured word to END its noun phrase: followed by
// punctuation, end of text, or a continuation word. Without that,
// "make a different preparation" reports "different" — an adjective —
// and a detector that reports adjectives gets muted within a week.
const phraseEnd = `(?:[\s]*[.,;:!?)]|\s+(?:and|then|with|for|to|in|using|e|depois|com|para|até)\b|$)`

var mentionPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)\bfa[çc]a\s+(?:um|uma)\s+([a-zà-ÿ][a-zà-ÿ-]{2,})` + phraseEnd),
	regexp.MustCompile(`(?i)\bprepare\s+(?:um|uma)\s+([a-zà-ÿ][a-zà-ÿ-]{2,})` + phraseEnd),
	regexp.MustCompile(`(?i)\bmake\s+(?:a|an)\s+([a-z][a-z-]{2,})` + phraseEnd),
	regexp.MustCompile(`(?i)\bprepare\s+(?:a|an)\s+([a-z][a-z-]{2,})` + phraseEnd),
}

// anchoredNames collects everything in a document a mention could
// legitimately point at: component ids and names, referenced ids,
// ingredient ids and their registry items, and declared techniques.
func anchoredNames(m map[string]any) map[string]bool {
	out := map[string]bool{}
	add := func(s string) {
		if s != "" {
			out[strings.ToLower(s)] = true
		}
	}
	for _, cv := range asAnyList(m["components"]) {
		cm, ok := cv.(map[string]any)
		if !ok {
			continue
		}
		if id, ok := cm["id"].(string); ok {
			add(id)
		}
		if ref, ok := cm["ref"].(string); ok {
			_, id := SplitRef(ref)
			add(id)
		}
		if nm, ok := cm["name"].(map[string]any); ok {
			for _, v := range nm {
				if s, ok := v.(string); ok {
					add(s)
				}
			}
		}
	}
	for _, iv := range asAnyList(m["ingredients"]) {
		im, ok := iv.(map[string]any)
		if !ok {
			continue
		}
		if id, ok := im["id"].(string); ok {
			add(id)
		}
		if item, ok := im["item"].(string); ok {
			add(item)
			add(lastSegment(item))
		}
	}
	for _, ev := range asAnyList(m["execution_modes"]) {
		em, ok := ev.(map[string]any)
		if !ok {
			continue
		}
		if tech, ok := em["technique"].(string); ok {
			add(tech)
			add(lastSegment(tech))
		}
	}
	return out
}

func asAnyList(v any) []any {
	l, _ := v.([]any)
	return l
}

func lastSegment(slug string) string {
	if i := strings.LastIndex(slug, "."); i >= 0 {
		return slug[i+1:]
	}
	return slug
}

// stepProse gathers the human text of a document's steps.
func stepProse(m map[string]any) []string {
	var out []string
	collect := func(v any) {
		switch t := v.(type) {
		case string:
			out = append(out, t)
		case map[string]any:
			for _, s := range t {
				if str, ok := s.(string); ok {
					out = append(out, str)
				}
			}
		}
	}
	for _, sv := range asAnyList(m["steps"]) {
		sm, ok := sv.(map[string]any)
		if !ok {
			continue
		}
		collect(sm["title"])
		collect(sm["body"])
		collect(sm["note"])
	}
	return out
}

// lintMentions applies both detectors to one document scope.
func lintMentions(loc string, m map[string]any, reg *Registry, l *Lint) {
	anchored := anchoredNames(m)
	prose := stepProse(m)

	// Only TEACHABLE preparations participate, and the registry already
	// says which those are: an entry carrying canonical_recipe is one
	// the steward has pointed at a method. That distinction is exactly
	// the noun/verb line — technique.roux is something you MAKE and has
	// a canonical method; technique.stir is something you DO and never
	// will. Using the curation signal means precision improves as
	// curation does, and it keeps the warning actionable: a mention
	// only dead-ends if there is somewhere it should have gone.
	known := map[string]string{}
	for id, entry := range reg.TechniqueEntries {
		if _, teachable := entry["canonical_recipe"]; !teachable {
			continue
		}
		name := lastSegment(id)
		if len(name) >= 4 {
			known[name] = id
		}
	}

	seen := map[string]bool{}
	for _, text := range prose {
		lower := strings.ToLower(text)

		// (a) a registry-known preparation named but anchored to nothing.
		for name, id := range known {
			if seen[name] || !containsWord(lower, name) || anchored[name] {
				continue
			}
			seen[name] = true
			l.warnf("%s: step prose names %q — %s carries a canonical method, but nothing in this document anchors the mention. Lift it to an inline component if this source gives its method, or reference the class if it does not (SR-REG-002)",
				loc, name, id)
		}

		// (b) an authored pattern whose subject the registry does not know.
		for _, re := range mentionPatterns {
			for _, mt := range re.FindAllStringSubmatch(text, -1) {
				subject := strings.ToLower(mt[1])
				if seen[subject] || anchored[subject] {
					continue
				}
				if _, isKnown := known[subject]; isKnown {
					continue // detector (a) already covers it
				}
				seen[subject] = true
				l.warnf("%s: step prose says %q but the registry has no entry for %q and nothing in this document anchors it — a sub-preparation the vocabulary cannot name yet (SR-REG-002)",
					loc, strings.TrimSpace(mt[0]), subject)
			}
		}
	}
}

// containsWord matches a whole word, so "roux" does not fire inside
// "rouxinol" — a detector that cries wolf gets muted.
func containsWord(haystack, word string) bool {
	idx := 0
	for {
		i := strings.Index(haystack[idx:], word)
		if i < 0 {
			return false
		}
		i += idx
		beforeOK := i == 0 || !isWordByte(haystack[i-1])
		end := i + len(word)
		afterOK := end >= len(haystack) || !isWordByte(haystack[end])
		if beforeOK && afterOK {
			return true
		}
		idx = i + 1
		if idx >= len(haystack) {
			return false
		}
	}
}

func isWordByte(b byte) bool {
	return b >= 'a' && b <= 'z' || b >= 'A' && b <= 'Z' || b >= '0' && b <= '9' || b >= 0x80
}

var _ = fmt.Sprintf
