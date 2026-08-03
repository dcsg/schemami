package main

// Mention resolution and its published TOTAL ORDER (SR-CORE-006).
//
// When several documents could answer one mention, the protocol says
// which one wins — and says it as a total order terminating in a
// tiebreak that cannot silently pick. CSS is the proof case for this
// shape: name the order, own no UI (research 09 F6).
//
//	1. an explicit PINNED reference
//	2. a matching document in the consumer's OWN collection
//	3. the class's CANONICAL link
//
// Within a tier, a QUALIFIED reference outranks an unqualified one. If
// candidates remain tied, resolution FAILS naming every candidate.
//
// The direction is deliberate: the user's own recipe outranks the
// steward's canonical pick. ld.so shipped this backwards — DT_RPATH
// above the user's LD_LIBRARY_PATH — and had to introduce DT_RUNPATH to
// correct it without breaking old binaries. Getting it right the first
// time is free; getting it wrong is permanent.
//
// The protocol specifies NO UI. It does specify what an EXPLANATION
// must contain — the candidate set, the winner, and the criterion that
// decided — so any surface can render "why this one" its own way.

import (
	"fmt"
	"sort"
	"strings"
)

// Tier is a precedence level in the resolution order. Lower wins.
type Tier int

const (
	TierPin       Tier = 1 // an explicit pinned reference
	TierOwn       Tier = 2 // a document in the consumer's own collection
	TierCanonical Tier = 3 // the class's curated canonical link
)

func (t Tier) String() string {
	switch t {
	case TierPin:
		return "explicit pin"
	case TierOwn:
		return "own collection"
	case TierCanonical:
		return "canonical link"
	}
	return "unknown"
}

// Candidate is one document that could answer a mention.
type Candidate struct {
	Tier       Tier
	Collection string
	ID         string
	Version    int
	// Qualified reports whether the reference naming this candidate
	// named its collection explicitly — the within-tier tiebreak.
	Qualified bool
}

func (c Candidate) String() string {
	s := c.ID
	if c.Collection != "" {
		s = c.Collection + "/" + c.ID
	}
	if c.Version > 0 {
		s = fmt.Sprintf("%s@%d", s, c.Version)
	}
	return fmt.Sprintf("%s (%s)", s, c.Tier)
}

// Resolution is the outcome, and carries everything an explanation
// needs: the full candidate set, the winner, and the deciding criterion.
type Resolution struct {
	Mention   string
	Candidates []Candidate
	Winner    *Candidate
	// Criterion names WHY the winner won, in words a surface can show.
	Criterion string
	// Err is set when the order could not pick — a genuine tie. The
	// tiebreak must never silently choose.
	Err error
}

// Explain renders the resolution as text. A surface may render it any
// way it likes; what the protocol fixes is the CONTENT, not the form.
func (r Resolution) Explain() string {
	var b strings.Builder
	fmt.Fprintf(&b, "mention %q: %d candidate(s)", r.Mention, len(r.Candidates))
	for _, c := range r.Candidates {
		fmt.Fprintf(&b, "\n  - %s", c)
	}
	if r.Winner != nil {
		fmt.Fprintf(&b, "\n  => %s wins (%s)", *r.Winner, r.Criterion)
	} else if r.Err != nil {
		fmt.Fprintf(&b, "\n  => unresolved: %v", r.Err)
	}
	return b.String()
}

// ResolveMention applies the total order. Candidates may arrive in any
// sequence; the order is a property of the rule, never of the input.
func ResolveMention(mention string, candidates []Candidate) Resolution {
	r := Resolution{Mention: mention, Candidates: append([]Candidate(nil), candidates...)}
	sort.SliceStable(r.Candidates, func(i, j int) bool {
		a, b := r.Candidates[i], r.Candidates[j]
		if a.Tier != b.Tier {
			return a.Tier < b.Tier
		}
		if a.Qualified != b.Qualified {
			return a.Qualified // within a tier, qualified outranks unqualified
		}
		return false
	})
	if len(r.Candidates) == 0 {
		r.Err = fmt.Errorf("no candidate answers mention %q", mention)
		return r
	}

	best := r.Candidates[0]
	var tied []Candidate
	for _, c := range r.Candidates {
		if c.Tier == best.Tier && c.Qualified == best.Qualified {
			tied = append(tied, c)
		}
	}
	if len(tied) > 1 {
		// The tiebreak cannot silently pick. Name every candidate.
		var names []string
		for _, c := range tied {
			names = append(names, c.String())
		}
		r.Err = fmt.Errorf(
			"mention %q is answered by %d candidates that the resolution order cannot separate: %s — qualify the reference to name the one you mean",
			mention, len(tied), strings.Join(names, ", "))
		return r
	}

	r.Winner = &best
	switch {
	case best.Tier == TierPin:
		r.Criterion = "an explicit pin outranks everything"
	case best.Tier == TierOwn && best.Qualified:
		r.Criterion = "a qualified reference into the consumer's own collection"
	case best.Tier == TierOwn:
		r.Criterion = "the consumer's own collection outranks the canonical link"
	case best.Tier == TierCanonical:
		r.Criterion = "no closer candidate; the class's canonical link applies"
	}
	return r
}
