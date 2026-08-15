package schemami

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestSharedCanonicalizationVectors(t *testing.T) {
	root := filepath.Join("resources", "conformance")
	raw, err := os.ReadFile(filepath.Join(root, "canonicalization.json"))
	if err != nil {
		t.Fatal(err)
	}
	var corpus struct {
		Vectors []struct {
			ID                string `json:"id"`
			Fixture           string `json:"fixture"`
			ExpectedCanonical string `json:"expected_canonical"`
			ExpectedSHA256    string `json:"expected_sha256"`
		} `json:"vectors"`
	}
	if err := json.Unmarshal(raw, &corpus); err != nil {
		t.Fatal(err)
	}
	if len(corpus.Vectors) != 5 {
		t.Fatalf("vector count = %d", len(corpus.Vectors))
	}
	for _, vector := range corpus.Vectors {
		t.Run(vector.ID, func(t *testing.T) {
			fixture, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(vector.Fixture)))
			if err != nil {
				t.Fatal(err)
			}
			parsed := Parse(fixture, ProtocolFloor)
			if !parsed.OK() {
				t.Fatalf("parse refused: %#v", parsed.Problems)
			}
			admitted := Admit(parsed.Parsed, ProtocolFloor)
			if !admitted.OK() || admitted.Recipe == nil {
				t.Fatalf("admission refused: %#v", admitted.Problems)
			}
			canonical := string(admitted.Recipe.CanonicalJSON())
			if canonical != vector.ExpectedCanonical {
				t.Fatalf("canonical = %s", canonical)
			}
			digest := sha256.Sum256([]byte(canonical))
			if got := hex.EncodeToString(digest[:]); got != vector.ExpectedSHA256 {
				t.Fatalf("digest = %s", got)
			}
		})
	}
}
