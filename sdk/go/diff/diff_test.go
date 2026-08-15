package diff_test

import (
	"encoding/json"
	"os"
	"reflect"
	"testing"

	schemami "github.com/dcsg/schemami/sdk/go"
	"github.com/dcsg/schemami/sdk/go/diff"
)

type conformanceChange struct {
	Kind             diff.ChangeKind `json:"kind"`
	Pointer          string          `json:"pointer"`
	SourcePointer    string          `json:"source_pointer,omitempty"`
	CandidatePointer string          `json:"candidate_pointer,omitempty"`
}

func admit(t *testing.T, raw []byte) *schemami.AdmittedRecipe {
	t.Helper()
	parsed := schemami.Parse(raw, schemami.ProtocolFloor)
	if !parsed.OK() {
		t.Fatalf("parse: %#v", parsed.Problems)
	}
	result := schemami.Admit(parsed.Parsed, schemami.ProtocolFloor)
	if !result.OK() || result.Recipe == nil {
		t.Fatalf("admit: %#v", result.Problems)
	}
	return result.Recipe
}

func TestCompareReportsRenameWithoutMutation(t *testing.T) {
	raw, err := os.ReadFile("../testdata/phase9-minimal.schemami.json")
	if err != nil {
		t.Fatal(err)
	}
	source := admit(t, raw)
	value := source.Value()
	value["title"] = "Candidate title"
	updated, err := schemami.CanonicalJSON(value)
	if err != nil {
		t.Fatal(err)
	}
	candidate := admit(t, updated)
	result := diff.Compare(source, candidate)
	if len(result.Changes) != 1 || result.Changes[0].Kind != diff.Modified || result.Changes[0].Pointer != "/title" {
		t.Fatalf("unexpected diff: %#v", result.Changes)
	}
	if source.Value()["title"] == "Candidate title" {
		t.Fatal("diff mutated source")
	}
}

func TestCompareTracksIdentifiedArrayReorderWithoutFalseModifications(t *testing.T) {
	sourceRaw := []byte(`{"schemami":"1","collection":"test","id":"order","revision":1,"content_language":"pt-PT","title":"Order","ingredients":[{"id":"a","name":"A"},{"id":"b","name":"B"}],"method":{"sequence":[]}}`)
	candidateRaw := []byte(`{"schemami":"1","collection":"test","id":"order","revision":2,"content_language":"pt-PT","title":"Order","ingredients":[{"id":"b","name":"B"},{"id":"a","name":"A"}],"method":{"sequence":[]}}`)
	result := diff.Compare(admit(t, sourceRaw), admit(t, candidateRaw))
	found := false
	for _, change := range result.Changes {
		if change.Kind == diff.Reordered && change.Pointer == "/ingredients" {
			found = true
		}
	}
	if !found {
		t.Fatalf("ingredient reorder missing: %#v", result.Changes)
	}
	for _, change := range result.Changes {
		if change.Pointer == "/ingredients/0/id" || change.Pointer == "/ingredients/1/id" {
			t.Fatalf("identity-following diff produced positional false positive: %#v", result.Changes)
		}
	}
}

func TestSharedDiffConformanceCorpus(t *testing.T) {
	raw, err := os.ReadFile("../resources/conformance/diff.json")
	if err != nil {
		t.Fatal(err)
	}
	var corpus struct {
		Vectors []struct {
			ID        string              `json:"id"`
			Source    json.RawMessage     `json:"source"`
			Candidate json.RawMessage     `json:"candidate"`
			Expected  []conformanceChange `json:"expected_changes"`
		} `json:"vectors"`
	}
	if err := json.Unmarshal(raw, &corpus); err != nil {
		t.Fatal(err)
	}
	for _, vector := range corpus.Vectors {
		t.Run(vector.ID, func(t *testing.T) {
			result := diff.Compare(admit(t, vector.Source), admit(t, vector.Candidate))
			actual := make([]conformanceChange, len(result.Changes))
			for index, change := range result.Changes {
				actual[index] = conformanceChange{
					Kind: change.Kind, Pointer: change.Pointer,
					SourcePointer: change.SourcePointer, CandidatePointer: change.CandidatePointer,
				}
			}
			if !reflect.DeepEqual(actual, vector.Expected) {
				t.Fatalf("changes = %#v, want %#v", actual, vector.Expected)
			}
		})
	}
}
