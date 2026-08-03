package records

// Resolution records (SR-PUB-001/002) — engineering obligation 3.
//
// A resolved cross-document reference records WHICH candidate, FROM
// WHERE, and PROOF that the content is what it was. npm's lockfile
// splits exactly these three (version / resolved / integrity); this
// adds resolver_version, whose absence in npm is a known weakness —
// different npm versions build different trees from one manifest.
//
// What the hash claims, stated honestly: the corpus is YAML, so the
// preimage is the canonicalisation of the PARSED document, not of the
// file bytes. Aliases and merge keys collapse, and 1.0 / 1.00 / 1e0
// normalise. The claim is therefore "the same parsed document", NOT
// "the same bytes" — and published documents are lint-checked for
// aliases and merge keys so the parsed form is unambiguous.

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"strings"
)

// ResolverVersion identifies the implementation that wrote a record.
// A record written by an unknown resolver is refused: verification
// cannot assume another implementation canonicalises identically.
const ResolverVersion = "rcplint/1"

// KnownResolvers is the allowlist. Without one, "an unknown
// resolver_version is a failure" degrades to "any non-empty string
// passes" — the security review's exact objection.
var KnownResolvers = map[string]bool{ResolverVersion: true}

// Target names the resolved document.
type Target struct {
	Collection string `json:"collection"`
	ID         string `json:"id"`
	Version    int    `json:"version"`
}

func (t Target) String() string {
	return fmt.Sprintf("%s/%s@%d", t.Collection, t.ID, t.Version)
}

// Record is one verified resolution.
type Record struct {
	Target          Target `json:"target"`
	Source          string `json:"source"`
	ContentHash     string `json:"content_hash"`
	ResolverVersion string `json:"resolver_version"`
}

// HashDocument computes the content hash. The target is bound INTO the
// preimage, not merely stored beside it: without that, a record could
// be transplanted between collections — relabel a pack via its manifest
// and a shadowing document would verify against the original's record
// while outranking it in the resolution order.
func HashDocument(t Target, doc map[string]any) (string, error) {
	canon, err := Canonicalise(doc)
	if err != nil {
		return "", err
	}
	preimage, err := Canonicalise(map[string]any{
		"target": map[string]any{
			"collection": t.Collection,
			"id":         t.ID,
			"version":    float64(t.Version),
		},
		"document": canon,
	})
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256([]byte(preimage))
	return "sha256:" + hex.EncodeToString(sum[:]), nil
}

// NewRecord resolves one reference into a record. `source` MUST be a
// collection-root-relative locator: an absolute path would write the
// private corpus's structure into a committed file.
func NewRecord(t Target, source string, doc map[string]any) (Record, error) {
	if err := checkSource(source); err != nil {
		return Record{}, err
	}
	h, err := HashDocument(t, doc)
	if err != nil {
		return Record{}, err
	}
	return Record{Target: t, Source: source, ContentHash: h, ResolverVersion: ResolverVersion}, nil
}

// checkSource refuses locators that would leak or escape.
func checkSource(source string) error {
	switch {
	case source == "":
		return fmt.Errorf("record source locator is empty")
	case strings.HasPrefix(source, "/"):
		return fmt.Errorf("record source %q is absolute — locators are collection-root-relative so a record never discloses filesystem structure", source)
	case strings.Contains(source, "private/"):
		return fmt.Errorf("record source %q resolves under private/ — the private collection never enters a committed record", source)
	case strings.Contains(source, ".."):
		return fmt.Errorf("record source %q escapes the collection root", source)
	}
	return nil
}

// Verification is a frozen-mode outcome.
type Verification struct {
	Verified int
	Failures []string
}

// OK reports whether verification passed. A run that verified NOTHING
// is NOT a pass: the classic vacuous green, where an empty record set
// or a filter that matched nothing reads as success.
func (v Verification) OK() bool { return len(v.Failures) == 0 && v.Verified > 0 }

// VerifyFrozen checks records against the documents currently present.
// It writes NOTHING: any divergence is a failure, never a repair. This
// is the fail-closed posture the project applies everywhere else —
// npm's `ci` to reconcile's `install`.
//
// `present` maps a target's canonical string to the document body.
func VerifyFrozen(recs []Record, present map[string]map[string]any) Verification {
	var v Verification
	if len(recs) == 0 {
		v.Failures = append(v.Failures,
			"no resolution records: frozen verification cannot pass on an empty set — an absent record file is a failure, not a clean run")
		return v
	}

	// Duplicate records for one target: last-wins would let an attacker
	// append a matching record beside a mutated document.
	seen := map[string]int{}
	for _, r := range recs {
		seen[r.Target.String()]++
	}
	var dupes []string
	for k, n := range seen {
		if n > 1 {
			dupes = append(dupes, fmt.Sprintf("%s (%d records)", k, n))
		}
	}
	sort.Strings(dupes)
	for _, d := range dupes {
		v.Failures = append(v.Failures, fmt.Sprintf("duplicate resolution records for %s — one target, one record", d))
	}

	for _, r := range recs {
		key := r.Target.String()
		switch {
		case r.ResolverVersion == "":
			v.Failures = append(v.Failures, fmt.Sprintf("%s: record declares no resolver_version", key))
			continue
		case !KnownResolvers[r.ResolverVersion]:
			v.Failures = append(v.Failures, fmt.Sprintf("%s: unknown resolver_version %q — verification cannot assume another implementation canonicalises identically", key, r.ResolverVersion))
			continue
		case r.ContentHash == "":
			v.Failures = append(v.Failures, fmt.Sprintf("%s: record declares no content_hash", key))
			continue
		case !strings.HasPrefix(r.ContentHash, "sha256:"):
			v.Failures = append(v.Failures, fmt.Sprintf("%s: content_hash %q lacks the sha256: algorithm prefix", key, r.ContentHash))
			continue
		case len(r.ContentHash) != len("sha256:")+64:
			v.Failures = append(v.Failures, fmt.Sprintf("%s: content_hash %q is not a sha256 digest", key, r.ContentHash))
			continue
		}
		if err := checkSource(r.Source); err != nil {
			v.Failures = append(v.Failures, fmt.Sprintf("%s: %v", key, err))
			continue
		}
		doc, ok := present[key]
		if !ok {
			v.Failures = append(v.Failures, fmt.Sprintf("%s: record names a target that is no longer present", key))
			continue
		}
		want, err := HashDocument(r.Target, doc)
		if err != nil {
			v.Failures = append(v.Failures, fmt.Sprintf("%s: cannot hash the present document: %v", key, err))
			continue
		}
		if want != r.ContentHash {
			v.Failures = append(v.Failures, fmt.Sprintf(
				"%s: content changed since resolution\n    recorded: %s\n     present: %s", key, r.ContentHash, want))
			continue
		}
		v.Verified++
	}

	// Every present target must be covered. An uncovered reference is
	// how a mutated document slips past a record set that simply does
	// not mention it.
	var uncovered []string
	for key := range present {
		if seen[key] == 0 {
			uncovered = append(uncovered, key)
		}
	}
	sort.Strings(uncovered)
	for _, u := range uncovered {
		v.Failures = append(v.Failures, fmt.Sprintf("%s: present target has no resolution record", u))
	}
	return v
}
