package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRepairBudgetStaleDigestsReplacementAndEscapedRender(t *testing.T) {
	root, err := filepath.Abs(filepath.Join("..", "..", "..", ".."))
	if err != nil {
		t.Fatal(err)
	}
	contract := filepath.Join(root, "acquisition", "source-to-candidate", "1")
	previous := filepath.Join(root, "tools", "acquisition-harness", "cases", "phase2-refused", "candidate.schemami.json")
	report := filepath.Join(root, "tools", "acquisition-harness", "cases", "phase2-refused", "acquisition-report.json")
	temporary := t.TempDir()
	previousDigest, err := fileDigest(previous)
	if err != nil {
		t.Fatal(err)
	}
	refused := admission{
		Operation: "admit", Status: "refused", SubmittedSHA256: previousDigest,
		Problems: []problem{{Type: "https://schemami.dev/problems/invalid-document", Pointer: ""}},
	}
	refusedPath := filepath.Join(temporary, "admission.json")
	writeJSON(t, refusedPath, refused)
	repairPath := filepath.Join(temporary, "repair.json")
	if err := prepareRepair(contract, previous, refusedPath, 1, 3, repairPath); err != nil {
		t.Fatal(err)
	}
	if err := prepareRepair(contract, previous, refusedPath, 4, 3, filepath.Join(temporary, "over-budget.json")); err == nil || !strings.Contains(err.Error(), "budget exhausted") {
		t.Fatalf("attempt budget error = %v", err)
	}

	stale := refused
	stale.SubmittedSHA256 = strings.Repeat("0", 64)
	stalePath := filepath.Join(temporary, "stale-admission.json")
	writeJSON(t, stalePath, stale)
	if err := prepareRepair(contract, previous, stalePath, 1, 3, filepath.Join(temporary, "stale.json")); err == nil || !strings.Contains(err.Error(), "stale admission") {
		t.Fatalf("stale admission error = %v", err)
	}

	htmlPath := filepath.Join(temporary, "review.html")
	if err := renderReport(refusedPath, report, htmlPath); err != nil {
		t.Fatal(err)
	}
	html, err := os.ReadFile(htmlPath)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(html), "<script>") || !strings.Contains(string(html), "&lt;script&gt;") {
		t.Fatal("untrusted report message was not HTML-escaped")
	}

	replacement := filepath.Join(contract, "examples", "candidate.schemami.json")
	replacementReport := filepath.Join(contract, "examples", "acquisition-report.json")
	replacementDigest, err := fileDigest(replacement)
	if err != nil {
		t.Fatal(err)
	}
	accepted := admission{
		Operation: "admit", Status: "ok", SubmittedSHA256: replacementDigest,
		CanonicalSHA256: strings.Repeat("1", 64), Problems: []problem{},
	}
	acceptedPath := filepath.Join(temporary, "accepted.json")
	writeJSON(t, acceptedPath, accepted)
	if err := verifyReplacement(contract, repairPath, previous, replacement, replacementReport, acceptedPath); err != nil {
		t.Fatal(err)
	}

	var request repairRequest
	if err := readStrictJSON(repairPath, &request); err != nil {
		t.Fatal(err)
	}
	request.ManifestSHA256 = strings.Repeat("0", 64)
	staleRepairPath := filepath.Join(temporary, "stale-repair.json")
	writeJSON(t, staleRepairPath, request)
	if err := verifyReplacement(contract, staleRepairPath, previous, replacement, replacementReport, acceptedPath); err == nil || !strings.Contains(err.Error(), "stale repair contract") {
		t.Fatalf("stale repair error = %v", err)
	}
}

func writeJSON(t *testing.T, path string, value any) {
	t.Helper()
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, append(raw, '\n'), 0o600); err != nil {
		t.Fatal(err)
	}
}
