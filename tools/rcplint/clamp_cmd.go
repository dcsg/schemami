package main

// clamp subcommand — CLI surface preserved verbatim from the retired
// throwaway clamp (SP-001 parity: accept.sh's refusal checks pass
// untouched), now routed through the Recipe Calculus reference
// implementation (calculus/SPEC.md; tools/rcplint/calc).

import (
	"fmt"

	"github.com/dcsg/rcp/tools/rcplint/calc"
)

// isTrue stays in the host package for lint.go (was in the retired clamp).
func isTrue(v any) bool { b, ok := v.(bool); return ok && b }

func runClamp(root string, scale float64, path, docID string) int {
	_ = root
	docs, err := LoadDocuments(path)
	if err != nil {
		fmt.Println("clamp: load:", err)
		return 2
	}
	var target *Document
	for i := range docs {
		if docID == "" || docs[i].ID == docID {
			target = &docs[i]
			break
		}
	}
	if target == nil {
		fmt.Printf("clamp: document %q not found in %s\n", docID, path)
		return 2
	}
	m, ok := target.Value.(map[string]any)
	if !ok {
		fmt.Println("clamp: not a mapping document")
		return 2
	}
	f := &calc.Findings{}
	calc.EnforceConstraints(target.ID, m, scale, f)

	for _, w := range f.Warnings {
		fmt.Println("WARN", w)
	}
	if len(f.Refusals) > 0 {
		fmt.Println("REFUSED — scaling would violate safety bounds or cannot be verified:")
		for _, r := range f.Refusals {
			fmt.Println("  ", r)
		}
		return 1
	}
	fmt.Printf("ACCEPTED — scale ×%g preserves all critical bounds (Recipe Calculus reference)\n", scale)
	return 0
}
