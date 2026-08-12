package schemami

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestSharedValidationConformanceVectors(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("resources", "conformance", "validation.json"))
	if err != nil {
		t.Fatal(err)
	}
	var corpus struct {
		Vectors []struct {
			ID            string         `json:"id"`
			ExpectedValid bool           `json:"expected_valid"`
			Document      map[string]any `json:"document"`
		} `json:"vectors"`
	}
	if err := json.Unmarshal(raw, &corpus); err != nil {
		t.Fatal(err)
	}
	schema, err := schemaFor(filepath.Join("testdata", "basic.schemami.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	for _, vector := range corpus.Vectors {
		t.Run(vector.ID, func(t *testing.T) {
			err := validateDocumentData(vector.Document, schema)
			if (err == nil) != vector.ExpectedValid {
				t.Fatalf("valid = %v, want %v; error = %v", err == nil, vector.ExpectedValid, err)
			}
		})
	}
}

func TestSchemaDecimalAndDeferredFieldBoundaries(t *testing.T) {
	schema, err := schemaFor(filepath.Join("testdata", "phase9-minimal.schemami.json"))
	if err != nil {
		t.Fatal(err)
	}
	base := loadPhase9Document(t)
	delete(base, "components")
	sequence := base["method"].(map[string]any)["sequence"].([]any)
	mix := sequence[0].(map[string]any)["sequence"].([]any)[0].(map[string]any)
	mix["uses"] = mix["uses"].([]any)[:3]
	for _, decimal := range []string{"12.5000", "01", "1e2", "-0", "10000000000000000", "999999999999.99999"} {
		document := cloneDocument(t, base)
		document["ingredients"].([]any)[0].(map[string]any)["quantity"] = map[string]any{"kind": "measured", "value": decimal, "unit": "g"}
		if err := schema.Validate(document); err == nil {
			t.Fatalf("decimal %q unexpectedly admitted", decimal)
		}
	}
	for _, decimal := range []string{"0.75", "0.0001"} {
		document := cloneDocument(t, base)
		document["ingredients"].([]any)[0].(map[string]any)["quantity"] = map[string]any{"kind": "measured", "value": decimal, "unit": "g"}
		if err := schema.Validate(document); err != nil {
			t.Fatalf("decimal %q rejected: %v", decimal, err)
		}
	}
	document := cloneDocument(t, base)
	sequence = document["method"].(map[string]any)["sequence"].([]any)
	sequence[0].(map[string]any)["endpoint"] = map[string]any{"quantity": map[string]any{"kind": "measured", "value": "96", "unit": "Cel"}}
	if err := schema.Validate(document); err == nil {
		t.Fatal("deferred endpoint unexpectedly admitted")
	}
}

func TestParseAndCanonicalizationUseIJSONAndJCS(t *testing.T) {
	if err := rejectDuplicateJSONKeys([]byte(`{"schemami":"1","id":"a","id":"b"}`)); err == nil {
		t.Fatalf("duplicate-key error = %v", err)
	}
	document := map[string]any{"b": float64(1), "a": "<tag>", "supplementary": "😀"}
	canonical, err := canonicalise(document)
	if err != nil {
		t.Fatal(err)
	}
	if canonical != `{"a":"<tag>","b":1,"supplementary":"😀"}` {
		t.Fatalf("canonical = %s", canonical)
	}
	if _, err := canonicalise(map[string]any{"bad": string([]byte{0xed, 0xa0, 0x80})}); err == nil {
		t.Fatal("unpaired surrogate unexpectedly canonicalized")
	}
}
