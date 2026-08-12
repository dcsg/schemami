package schemami

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/dcsg/schemami/sdk/go/calculus"
)

type admissionVectorCorpus struct {
	Vectors []struct {
		ID               string             `json:"id"`
		ExpectedValid    bool               `json:"expected_valid"`
		ExpectedProblems []calculus.Problem `json:"expected_problems"`
		Document         map[string]any     `json:"document"`
	} `json:"vectors"`
}

func TestSharedAdmissionVectorsPinStableProblems(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("resources", "conformance", "validation.json"))
	if err != nil {
		t.Fatal(err)
	}
	var corpus admissionVectorCorpus
	if err := json.Unmarshal(raw, &corpus); err != nil {
		t.Fatal(err)
	}
	schema, err := schemaFor("candidate.schemami.json")
	if err != nil {
		t.Fatal(err)
	}
	for _, vector := range corpus.Vectors {
		t.Run(vector.ID, func(t *testing.T) {
			problems := stableAdmissionProblems(vector.Document, schema.Validate(vector.Document))
			if vector.ExpectedValid {
				if len(problems) != 0 {
					t.Fatalf("unexpected problems: %#v", problems)
				}
				return
			}
			if fmt.Sprint(problems) != fmt.Sprint(vector.ExpectedProblems) {
				t.Fatalf("problems = %#v, want %#v", problems, vector.ExpectedProblems)
			}
		})
	}
}
