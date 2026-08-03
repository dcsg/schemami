package main

// Lineage rules (SR-CORE-001, SR-VAL-003).
//
// Drift is DETECTED, not compiled away (DECISIONS #29): a variant is a
// self-contained snapshot, so nothing propagates a parent's fix into
// it. What the protocol owes instead is that you FIND OUT — a pinned
// pointer whose target has moved is reported, naming both revisions.
//
// The pin shape is componentRef's, deliberately: the brownie→ganache
// defect already forced version pinning on the composition edge, and
// the derivation edge has the same failure mode.

import "fmt"

// LineageRef is a parsed lineage pointer. Version==0 means unpinned.
type LineageRef struct {
	ID         string
	Collection string
	Version    int
	Pinned     bool
}

// parseLineageRef accepts either the shorthand (a bare slug) or the
// object form {id, collection?, version?}.
func parseLineageRef(v any) (LineageRef, bool) {
	switch t := v.(type) {
	case string:
		if t == "" {
			return LineageRef{}, false
		}
		return LineageRef{ID: t}, true
	case map[string]any:
		id, _ := t["id"].(string)
		if id == "" {
			return LineageRef{}, false
		}
		r := LineageRef{ID: id}
		if c, ok := t["collection"].(string); ok {
			r.Collection = c
		}
		if ver, ok := toFloat(t["version"]); ok {
			r.Version = int(ver)
			r.Pinned = true
		}
		return r, true
	}
	return LineageRef{}, false
}

func toFloat(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case int:
		return float64(n), true
	}
	return 0, false
}

// declaredVersion reports a document's own revision, if it declares one.
func declaredVersion(doc map[string]any) (int, bool) {
	v, ok := toFloat(doc["version"])
	return int(v), ok
}

// lintLineage checks one document's lineage pointers against its own
// collection. Three distinct outcomes, deliberately separated:
//
//	pin MATCHES target      → silent
//	target is AHEAD of pin  → WARNING (drift: review the variant)
//	target is BEHIND pin    → ERROR (the pin names a revision that does
//	                          not exist — a mismatch, not staleness)
func lintLineage(loc string, m map[string]any, siblings map[string]map[string]any, l *Lint) {
	lin, ok := m["lineage"].(map[string]any)
	if !ok {
		return
	}
	for _, field := range []string{"forked_from", "variant_of"} {
		raw, present := lin[field]
		if !present {
			continue
		}
		ref, ok := parseLineageRef(raw)
		if !ok {
			l.errf("%s: lineage.%s is not a usable reference", loc, field)
			continue
		}
		if ref.Collection != "" {
			// Cross-collection lineage is resolved by the caller holding
			// the whole index; within one collection's pass it is out of
			// scope rather than missing.
			continue
		}
		target, known := siblings[ref.ID]
		if !known {
			l.errf("%s: lineage.%s references %q which does not resolve in this collection — a pointer into another collection MUST name it (SR-PACK-002)", loc, field, ref.ID)
			continue
		}
		if !ref.Pinned {
			continue
		}
		targetVer, declares := declaredVersion(target)
		if !declares {
			l.errf("%s: lineage.%s pins version %d against target %q which declares no version", loc, field, ref.Version, ref.ID)
			continue
		}
		switch {
		case targetVer > ref.Version:
			l.warnf("%s: lineage.%s pins %q at version %d but the target now declares version %d — this variant may be stale; review it against the parent (DECISIONS #29: drift is detected, never compiled away)",
				loc, field, ref.ID, ref.Version, targetVer)
		case targetVer < ref.Version:
			l.errf("%s: lineage.%s pins %q at version %d but the target declares version %d — the pin names a revision that does not exist",
				loc, field, ref.ID, ref.Version, targetVer)
		}
	}
}

// lintFamilies checks family grouping WITHIN one collection. Across
// collections the full membership is not visible, so nothing is said.
func lintFamilies(collectionID string, docs []Document, l *Lint) {
	members := map[string][]string{}
	for _, d := range docs {
		m, ok := d.Value.(map[string]any)
		if !ok {
			continue
		}
		lin, ok := m["lineage"].(map[string]any)
		if !ok {
			continue
		}
		if fam, ok := lin["family"].(string); ok && fam != "" {
			members[fam] = append(members[fam], d.ID)
		}
	}
	for fam, ids := range members {
		if len(ids) == 1 {
			l.warnf("collection %q: family %q has exactly one member (%s) — the usual cause is a typo in the family slug",
				collectionID, fam, ids[0])
		}
	}
}

// formatPinMismatch is the componentRef message, kept beside the
// lineage ones so the two edges read consistently.
func formatPinMismatch(loc, id, ref string, pinned, declared int) string {
	return fmt.Sprintf("%s: component %q pins %q at version %d but the target declares version %d — a pinned reference must name the revision it was written against",
		loc, id, ref, pinned, declared)
}
