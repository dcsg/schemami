package schemami

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func loadPhase9Document(t *testing.T) map[string]any {
	t.Helper()
	path := filepath.Join("testdata", "phase9-structured.schemami.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var document map[string]any
	if err := json.Unmarshal(raw, &document); err != nil {
		t.Fatal(err)
	}
	return document
}

func cloneDocument(t *testing.T, document map[string]any) map[string]any {
	t.Helper()
	raw, err := json.Marshal(document)
	if err != nil {
		t.Fatal(err)
	}
	var clone map[string]any
	if err := json.Unmarshal(raw, &clone); err != nil {
		t.Fatal(err)
	}
	return clone
}

func TestPhase9StructuredDocumentAndBundleValidate(t *testing.T) {
	for _, path := range []string{
		filepath.Join("testdata", "phase9-minimal.schemami.json"),
		filepath.Join("testdata", "phase9-structured.schemami.json"),
		filepath.Join("testdata", "phase9-child.schemami.json"),
		filepath.Join("testdata", "phase9-root.schemami.json"),
	} {
		raw, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		var document map[string]any
		if err := json.Unmarshal(raw, &document); err != nil {
			t.Fatal(err)
		}
		schema, err := schemaFor(path)
		if err != nil {
			t.Fatal(err)
		}
		if err := validateDocumentData(document, schema); err != nil {
			t.Fatalf("validate(%s): %v", path, err)
		}
	}
	raw, err := os.ReadFile(filepath.Join("testdata", "phase9.schemami-bundle.json"))
	if err != nil {
		t.Fatal(err)
	}
	var bundle map[string]any
	if err := json.Unmarshal(raw, &bundle); err != nil {
		t.Fatal(err)
	}
	if err := validateBundleSemantics(bundle); err != nil {
		t.Fatal(err)
	}
}

func TestPhase9SchemaRejectsFlattenedAliases(t *testing.T) {
	schema, err := schemaFor(filepath.Join("testdata", "phase9-structured.schemami.json"))
	if err != nil {
		t.Fatal(err)
	}
	for _, field := range []string{"steps", "formula"} {
		document := cloneDocument(t, loadPhase9Document(t))
		document[field] = []any{}
		if err := schema.Validate(document); err == nil {
			t.Fatalf("legacy root field %q unexpectedly admitted", field)
		}
	}
}

func TestPhase9SemanticReferenceAndAuthorityFailures(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(map[string]any)
		want   string
	}{
		{
			name: "duplicate recursive method id",
			mutate: func(document map[string]any) {
				sequence := document["method"].(map[string]any)["sequence"].([]any)
				sequence[3].(map[string]any)["id"] = "mix"
			},
			want: "duplicates method-node id",
		},
		{
			name: "action flow outside step authority",
			mutate: func(document map[string]any) {
				sequence := document["method"].(map[string]any)["sequence"].([]any)
				step := sequence[0].(map[string]any)["sequence"].([]any)[0].(map[string]any)
				step["actions"].([]any)[0].(map[string]any)["uses"] = []any{map[string]any{"kind": "ingredient", "id": "seeds"}}
			},
			want: "is not declared by its containing step",
		},
		{
			name: "wrong predicate parameter kind",
			mutate: func(document map[string]any) {
				document["ingredients"].([]any)[3].(map[string]any)["activation"] = map[string]any{
					"kind": "choice_is", "parameter": "include-seeds", "option": "yes",
				}
			},
			want: "requires a choice parameter",
		},
		{
			name: "component has two quantity authorities",
			mutate: func(document map[string]any) {
				document["components"].([]any)[0].(map[string]any)["quantity"] = map[string]any{"kind": "measured", "value": "200", "unit": "g"}
			},
			want: "must not also carry explicit quantity",
		},
		{
			name: "relative timing contradicts dependency",
			mutate: func(document map[string]any) {
				sequence := document["method"].(map[string]any)["sequence"].([]any)
				sequence[3].(map[string]any)["relative_timing"] = map[string]any{
					"anchor_step": "mix", "relation": "before", "offset": map[string]any{"kind": "elapsed", "duration": "PT1H"},
				}
			},
			want: "relative-timing-conflict",
		},
	}
	schema, err := schemaFor(filepath.Join("testdata", "phase9-structured.schemami.json"))
	if err != nil {
		t.Fatal(err)
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			document := cloneDocument(t, loadPhase9Document(t))
			test.mutate(document)
			if err := schema.Validate(document); err != nil {
				t.Fatalf("mutation should remain structurally valid: %v", err)
			}
			err := validateSemantics(document)
			if err == nil || !strings.Contains(err.Error(), test.want) {
				t.Fatalf("error = %v, want text %q", err, test.want)
			}
		})
	}
}

func TestBundleRejectsDigestMismatchAndExtraDocument(t *testing.T) {
	path := filepath.Join("testdata", "phase9.schemami-bundle.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var bundle map[string]any
	if err := json.Unmarshal(raw, &bundle); err != nil {
		t.Fatal(err)
	}

	digestMismatch := cloneDocument(t, bundle)
	digestMismatch["documents"].([]any)[1].(map[string]any)["sha256"] = strings.Repeat("0", 64)
	if err := validateBundleSemantics(digestMismatch); err == nil || !strings.Contains(err.Error(), "JCS digest") {
		t.Fatalf("digest mismatch error = %v", err)
	}

	extra := cloneDocument(t, bundle)
	documents := extra["documents"].([]any)
	documents = append(documents, cloneDocument(t, documents[1].(map[string]any)))
	extra["documents"] = documents
	if err := validateBundleSemantics(extra); err == nil || !strings.Contains(err.Error(), "duplicates exact") {
		t.Fatalf("extra document error = %v", err)
	}
}

func TestAdmissionRejectsAReachableDormantBrokenReference(t *testing.T) {
	document := cloneDocument(t, loadPhase9Document(t))
	sequence := document["method"].(map[string]any)["sequence"].([]any)
	ambient := sequence[1].(map[string]any)["sequence"].([]any)[0].(map[string]any)
	ambient["uses"] = []any{map[string]any{"kind": "ingredient", "id": "seeds"}}
	schema, err := schemaFor(filepath.Join("testdata", "phase9-structured.schemami.json"))
	if err != nil {
		t.Fatal(err)
	}
	if err := schema.Validate(document); err != nil {
		t.Fatalf("mutation should remain structurally valid: %v", err)
	}
	err = validateSemantics(document)
	if err == nil || !strings.Contains(err.Error(), "inactive-reference") {
		t.Fatalf("error = %v, want inactive-reference", err)
	}
}
