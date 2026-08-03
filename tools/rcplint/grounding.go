package main

import (
	"fmt"
	"path/filepath"
)

// auditGrounding enforces SR-REG-005 (AC-REG-004-1): every ingredient
// entry carries at least one cross_ref OR an explicit `grounding: no-match`
// (with the reason in grounding_note). This is a registry data obligation —
// a CI check on entries, never a document-validation failure. Grounding
// refs are static data: no network access in any validation path.
func auditGrounding(paths []string) []string {
	var failures []string
	for _, p := range paths {
		docs, err := LoadDocuments(p)
		if err != nil || len(docs) != 1 {
			failures = append(failures, fmt.Sprintf("%s: load error: %v", filepath.Base(p), err))
			continue
		}
		m, ok := docs[0].Value.(map[string]any)
		if !ok {
			failures = append(failures, fmt.Sprintf("%s: not a mapping", filepath.Base(p)))
			continue
		}
		if refs, ok := m["cross_refs"].([]any); ok && len(refs) > 0 {
			continue
		}
		if g, ok := m["grounding"].(string); ok && g == "no-match" {
			continue
		}
		failures = append(failures, fmt.Sprintf("%s: neither cross_refs nor grounding: no-match (AC-REG-004-1)", m["id"]))
	}
	return failures
}
