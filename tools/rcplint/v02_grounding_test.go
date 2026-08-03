package main

import (
	"path/filepath"
	"strings"
	"testing"
)

// Phase 4 (SR-REG-005; DS-REG-005): every ingredient entry carries external
// grounding — cross_refs or an explicit no-match. Neither → audit failure
// naming the entry.
func TestGroundingAuditFixtures(t *testing.T) {
	bad := auditGrounding([]string{filepath.Join("testdata/registry", "ungrounded-entry.yaml")})
	if len(bad) != 1 || !strings.Contains(bad[0], "ingredient.test.ungrounded") {
		t.Errorf("ungrounded entry not failed by name: %v", bad)
	}
	ok := auditGrounding([]string{filepath.Join("testdata/registry", "no-match-entry.yaml")})
	if len(ok) != 0 {
		t.Errorf("no-match entry failed the audit — escape valve broken: %v", ok)
	}
}

// AC-REG-004-1 over the real registry: none silently ungrounded.
func TestRegistryFullyGrounded(t *testing.T) {
	glob, _ := filepath.Glob(filepath.Join(root, "registry/entries/ingredient/*.yaml"))
	if len(glob) < 60 {
		t.Fatalf("expected >=60 ingredient entries, got %d", len(glob))
	}
	if bad := auditGrounding(glob); len(bad) != 0 {
		t.Errorf("%d ungrounded entries:\n%s", len(bad), strings.Join(bad, "\n"))
	}
}
