// Package diff compares admitted Schemami recipes without culinary inference.
package diff

import (
	"reflect"
	"sort"
	"strconv"
	"strings"

	schemami "github.com/dcsg/schemami/sdk/go"
)

type ChangeKind string

const (
	Removed   ChangeKind = "removed"
	Added     ChangeKind = "added"
	Renamed   ChangeKind = "renamed"
	Modified  ChangeKind = "modified"
	Reordered ChangeKind = "reordered"
)

type DocumentIdentity struct {
	Collection string `json:"collection"`
	ID         string `json:"id"`
	Revision   int    `json:"revision"`
	SHA256     string `json:"sha256"`
}
type Change struct {
	Kind             ChangeKind `json:"kind"`
	Pointer          string     `json:"pointer"`
	SourcePointer    string     `json:"source_pointer,omitempty"`
	CandidatePointer string     `json:"candidate_pointer,omitempty"`
	SourceValue      any        `json:"source_value,omitempty"`
	CandidateValue   any        `json:"candidate_value,omitempty"`
}
type Result struct {
	Source    DocumentIdentity `json:"source"`
	Candidate DocumentIdentity `json:"candidate"`
	Changes   []Change         `json:"changes"`
}

func Compare(source, candidate *schemami.AdmittedRecipe) Result {
	sourceValue, candidateValue := source.Value(), candidate.Value()
	changes := []Change{}
	compare(sourceValue, candidateValue, "", "", &changes)
	order := map[ChangeKind]int{Removed: 0, Added: 1, Renamed: 2, Modified: 3, Reordered: 4}
	sort.SliceStable(changes, func(i, j int) bool {
		if changes[i].Pointer != changes[j].Pointer {
			return changes[i].Pointer < changes[j].Pointer
		}
		if order[changes[i].Kind] != order[changes[j].Kind] {
			return order[changes[i].Kind] < order[changes[j].Kind]
		}
		return changes[i].SourcePointer < changes[j].SourcePointer
	})
	return Result{Source: identity(sourceValue, source.SHA256()), Candidate: identity(candidateValue, candidate.SHA256()), Changes: changes}
}

func compare(source, candidate any, sp, cp string, changes *[]Change) {
	if reflect.DeepEqual(source, candidate) {
		return
	}
	sm, sok := source.(map[string]any)
	cm, cok := candidate.(map[string]any)
	if sok && cok {
		keys := map[string]bool{}
		for k := range sm {
			keys[k] = true
		}
		for k := range cm {
			keys[k] = true
		}
		ordered := make([]string, 0, len(keys))
		for k := range keys {
			ordered = append(ordered, k)
		}
		sort.Strings(ordered)
		for _, k := range ordered {
			sv, hs := sm[k]
			cv, hc := cm[k]
			s := appendPointer(sp, k)
			c := appendPointer(cp, k)
			if !hs {
				*changes = append(*changes, makeChange(Added, "", c, nil, cv))
			} else if !hc {
				*changes = append(*changes, makeChange(Removed, s, "", sv, nil))
			} else {
				compare(sv, cv, s, c, changes)
			}
		}
		return
	}
	sa, sok := source.([]any)
	ca, cok := candidate.([]any)
	if sok && cok {
		if sourceIDs, sourceIndex, sourceOK := identified(sa); sourceOK {
			if candidateIDs, candidateIndex, candidateOK := identified(ca); candidateOK {
				compareIdentified(sa, ca, sourceIDs, candidateIDs, sourceIndex, candidateIndex, sp, cp, changes)
				return
			}
		}
		if sameSet(sa, ca) {
			*changes = append(*changes, makeChange(Reordered, sp, cp, sa, ca))
			return
		}
		common := len(sa)
		if len(ca) < common {
			common = len(ca)
		}
		for i := 0; i < common; i++ {
			compare(sa[i], ca[i], appendPointer(sp, strconv.Itoa(i)), appendPointer(cp, strconv.Itoa(i)), changes)
		}
		for i := common; i < len(sa); i++ {
			p := appendPointer(sp, strconv.Itoa(i))
			*changes = append(*changes, makeChange(Removed, p, "", sa[i], nil))
		}
		for i := common; i < len(ca); i++ {
			p := appendPointer(cp, strconv.Itoa(i))
			*changes = append(*changes, makeChange(Added, "", p, nil, ca[i]))
		}
		return
	}
	kind := Modified
	if lastToken(cp) == "name" {
		kind = Renamed
	}
	*changes = append(*changes, makeChange(kind, sp, cp, source, candidate))
}

func identified(values []any) ([]string, map[string]int, bool) {
	ids := make([]string, len(values))
	index := make(map[string]int, len(values))
	for position, value := range values {
		object, ok := value.(map[string]any)
		if !ok {
			return nil, nil, false
		}
		id, ok := object["id"].(string)
		if !ok || id == "" {
			return nil, nil, false
		}
		if _, duplicate := index[id]; duplicate {
			return nil, nil, false
		}
		ids[position] = id
		index[id] = position
	}
	return ids, index, true
}

func compareIdentified(source, candidate []any, sourceIDs, candidateIDs []string, sourceIndex, candidateIndex map[string]int, sp, cp string, changes *[]Change) {
	all := make(map[string]struct{}, len(sourceIDs)+len(candidateIDs))
	for _, id := range sourceIDs {
		all[id] = struct{}{}
	}
	for _, id := range candidateIDs {
		all[id] = struct{}{}
	}
	ids := make([]string, 0, len(all))
	for id := range all {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	for _, id := range ids {
		si, hasSource := sourceIndex[id]
		ci, hasCandidate := candidateIndex[id]
		switch {
		case !hasSource:
			p := appendPointer(cp, strconv.Itoa(ci))
			*changes = append(*changes, makeChange(Added, "", p, nil, candidate[ci]))
		case !hasCandidate:
			p := appendPointer(sp, strconv.Itoa(si))
			*changes = append(*changes, makeChange(Removed, p, "", source[si], nil))
		default:
			compare(source[si], candidate[ci], appendPointer(sp, strconv.Itoa(si)), appendPointer(cp, strconv.Itoa(ci)), changes)
		}
	}
	common := map[string]bool{}
	for id := range sourceIndex {
		if _, ok := candidateIndex[id]; ok {
			common[id] = true
		}
	}
	sourceOrder, candidateOrder := []any{}, []any{}
	for _, id := range sourceIDs {
		if common[id] {
			sourceOrder = append(sourceOrder, id)
		}
	}
	for _, id := range candidateIDs {
		if common[id] {
			candidateOrder = append(candidateOrder, id)
		}
	}
	if !reflect.DeepEqual(sourceOrder, candidateOrder) {
		*changes = append(*changes, makeChange(Reordered, sp, cp, sourceOrder, candidateOrder))
	}
}
func makeChange(kind ChangeKind, sp, cp string, sv, cv any) Change {
	p := cp
	if p == "" {
		p = sp
	}
	return Change{Kind: kind, Pointer: p, SourcePointer: sp, CandidatePointer: cp, SourceValue: sv, CandidateValue: cv}
}
func appendPointer(base, token string) string {
	token = strings.NewReplacer("~", "~0", "/", "~1").Replace(token)
	return base + "/" + token
}
func lastToken(pointer string) string {
	parts := strings.Split(pointer, "/")
	if len(parts) == 0 {
		return ""
	}
	return parts[len(parts)-1]
}
func sameSet(a, b []any) bool {
	if len(a) != len(b) || reflect.DeepEqual(a, b) {
		return false
	}
	used := make([]bool, len(b))
	for _, x := range a {
		found := -1
		for j, y := range b {
			if !used[j] && reflect.DeepEqual(x, y) {
				found = j
				break
			}
		}
		if found < 0 {
			return false
		}
		used[found] = true
	}
	return true
}
func identity(v map[string]any, digest string) DocumentIdentity {
	revision := 0
	if n, ok := v["revision"].(float64); ok {
		revision = int(n)
	}
	return DocumentIdentity{Collection: stringValue(v["collection"]), ID: stringValue(v["id"]), Revision: revision, SHA256: digest}
}
func stringValue(v any) string { s, _ := v.(string); return s }
