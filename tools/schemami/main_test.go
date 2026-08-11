package main

import (
	"crypto/sha256"
	"encoding/hex"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestValidateAdmitsSchemamiFixture(t *testing.T) {
	path := filepath.Join("testdata", "basic.schemami.yaml")
	if err := validate(path); err != nil {
		t.Fatal(err)
	}
}

func TestValidateAdmitsUnknownRecipeLocalConceptsWithoutRegistry(t *testing.T) {
	path := filepath.Join("testdata", "local-entities.schemami.yaml")
	if err := validate(path); err != nil {
		t.Fatal(err)
	}
}

func TestFileSuffixesArePartOfTheWireIdentity(t *testing.T) {
	for _, path := range []string{"recipe.schemami.json", "recipe.schemami.yaml"} {
		if err := validateFileSuffix(path, false); err != nil {
			t.Fatalf("recipe suffix %q rejected: %v", path, err)
		}
	}
	for _, path := range []string{"recipe.schemami-pack.json", "recipe.schemami-pack.yaml"} {
		if err := validateFileSuffix(path, true); err != nil {
			t.Fatalf("pack suffix %q rejected: %v", path, err)
		}
	}
	if err := validateFileSuffix("recipe.rcp.yaml", false); err == nil {
		t.Fatal("legacy suffix unexpectedly accepted")
	}
}

func TestValidatePackAdmitsFixtureAndRejectsDuplicateLocks(t *testing.T) {
	path := filepath.Join("testdata", "pack.schemami-pack.yaml")
	if err := validatePack(path); err != nil {
		t.Fatal(err)
	}
	err := validatePackSemantics(map[string]any{
		"documents": []any{
			map[string]any{"id": "recipe"},
			map[string]any{"id": "recipe"},
		},
	})
	if err == nil || !strings.Contains(err.Error(), "duplicate document lock") {
		t.Fatalf("validatePackSemantics() error = %v, want duplicate lock error", err)
	}
	canonical, err := canonicaliseFile(filepath.Join("testdata", "basic.schemami.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	digest := sha256.Sum256([]byte(canonical))
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	pack, err := parseDocument(path, raw)
	if err != nil {
		t.Fatal(err)
	}
	lock := pack["documents"].([]any)[0].(map[string]any)["sha256"].(string)
	if got, want := hex.EncodeToString(digest[:]), lock; got != want {
		t.Fatalf("fixture lock digest = %s, want %s", got, want)
	}
}

func TestVerifyPackResolvesOnlyExplicitOfflineBytes(t *testing.T) {
	directory := "testdata"
	pack := filepath.Join(directory, "pack.schemami-pack.yaml")
	if err := verifyPack(pack, directory); err != nil {
		t.Fatal(err)
	}
}

func TestVerifyPackScopesSameDocumentIDByCollection(t *testing.T) {
	sourceDirectory := "testdata"
	temporary := t.TempDir()
	for _, name := range []string{"pack.schemami-pack.yaml", "basic.schemami.yaml"} {
		raw, err := os.ReadFile(filepath.Join(sourceDirectory, name))
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(temporary, name), raw, 0o600); err != nil {
			t.Fatal(err)
		}
	}
	raw, err := os.ReadFile(filepath.Join(sourceDirectory, "basic.schemami.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	other := strings.Replace(string(raw), "collection: paodeportugal", "collection: other-collection", 1)
	if err := os.WriteFile(filepath.Join(temporary, "other.schemami.yaml"), []byte(other), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := verifyPack(filepath.Join(temporary, "pack.schemami-pack.yaml"), temporary); err != nil {
		t.Fatal(err)
	}
}

func TestVerifyPackRejectsDigestMismatch(t *testing.T) {
	sourceDirectory := "testdata"
	temporary := t.TempDir()
	for _, name := range []string{"pack.schemami-pack.yaml", "basic.schemami.yaml"} {
		raw, err := os.ReadFile(filepath.Join(sourceDirectory, name))
		if err != nil {
			t.Fatal(err)
		}
		if name == "basic.schemami.yaml" {
			raw = []byte(strings.Replace(string(raw), "Pão de massa-mãe", "Pão alterado", 1))
		}
		if err := os.WriteFile(filepath.Join(temporary, name), raw, 0o600); err != nil {
			t.Fatal(err)
		}
	}
	err := verifyPack(filepath.Join(temporary, "pack.schemami-pack.yaml"), temporary)
	if err == nil || !strings.Contains(err.Error(), "digest does not match") {
		t.Fatalf("verifyPack() error = %v, want digest mismatch", err)
	}
}

func TestSchemaRejectsNonCanonicalDecimalShapes(t *testing.T) {
	schema, err := schemaFor(filepath.Join("testdata", "basic.schemami.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	for _, decimal := range []string{"12.5000", "01", "1e2", "-0", "10000000000000000", "999999999999.99999"} {
		doc := validDocument()
		ingredients := doc["ingredients"].([]any)
		ingredients[0].(map[string]any)["quantity"].(map[string]any)["value"] = decimal
		if err := schema.Validate(doc); err == nil {
			t.Fatalf("decimal %q unexpectedly admitted", decimal)
		}
	}
}

func TestSchemaAdmitsCanonicalPositiveDecimalsBelowOne(t *testing.T) {
	schema, err := schemaFor(filepath.Join("testdata", "basic.schemami.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	for _, decimal := range []string{"0.75", "0.0001"} {
		doc := validDocument()
		doc["ingredients"].([]any)[0].(map[string]any)["quantity"].(map[string]any)["value"] = decimal
		if err := schema.Validate(doc); err != nil {
			t.Fatalf("canonical decimal %q rejected: %v", decimal, err)
		}
	}
}

func TestSchemaRejectsDeferredReadinessEndpoint(t *testing.T) {
	schema, err := schemaFor(filepath.Join("testdata", "basic.schemami.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	doc := validDocument()
	doc["steps"].([]any)[0].(map[string]any)["endpoint"] = map[string]any{
		"quantity": map[string]any{"kind": "measured", "value": "96", "unit": "Cel"},
	}
	if err := schema.Validate(doc); err == nil {
		t.Fatal("deferred endpoint unexpectedly admitted")
	}
}

func TestSchemaRejectsMalformedQuantityShapes(t *testing.T) {
	schema, err := schemaFor(filepath.Join("testdata", "basic.schemami.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	tests := []any{
		map[string]any{"kind": "measured", "value": "1"},
		map[string]any{"kind": "range", "minimum": "1", "unit": "g"},
		map[string]any{"kind": "open"},
		map[string]any{"kind": "ratio", "parts": "1"},
		"100 g",
	}
	for _, quantity := range tests {
		doc := validDocument()
		doc["ingredients"].([]any)[0].(map[string]any)["quantity"] = quantity
		if err := schema.Validate(doc); err == nil {
			t.Fatalf("malformed quantity %#v unexpectedly admitted", quantity)
		}
	}
}

func TestValidateSemanticsRejectsBrokenLocalAndEvidenceReferences(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(map[string]any)
		want   string
	}{
		{
			name: "unknown ingredient use",
			mutate: func(doc map[string]any) {
				doc["steps"].([]any)[0].(map[string]any)["uses"] = []any{"missing"}
			},
			want: "undeclared id",
		},
		{
			name: "duplicate ingredient",
			mutate: func(doc map[string]any) {
				ingredients := doc["ingredients"].([]any)
				clone := map[string]any{"id": "starter", "name": "Outra massa-mãe"}
				doc["ingredients"] = append(ingredients, clone)
			},
			want: "duplicate ingredients id",
		},
		{
			name: "broken evidence pointer",
			mutate: func(doc map[string]any) {
				doc["evidence"].([]any)[0].(map[string]any)["pointer"] = "/ingredients/99/name"
			},
			want: "does not identify an existing array value",
		},
		{
			name: "unknown evidence source",
			mutate: func(doc map[string]any) {
				doc["evidence"].([]any)[0].(map[string]any)["source"] = "missing"
			},
			want: "undeclared source",
		},
		{
			name: "range out of order",
			mutate: func(doc map[string]any) {
				doc["ingredients"].([]any)[0].(map[string]any)["quantity"] = map[string]any{
					"kind": "range", "minimum": "500", "maximum": "450", "unit": "g",
				}
				doc["evidence"].([]any)[0].(map[string]any)["pointer"] = "/ingredients/0/quantity/minimum"
			},
			want: "minimum exceeds maximum",
		},
		{
			name: "unresolved unit spelling",
			mutate: func(doc map[string]any) {
				doc["ingredients"].([]any)[0].(map[string]any)["quantity"].(map[string]any)["unit"] = "cup"
			},
			want: "pinned UCUM 2.2 table",
		},
		{
			name: "step dependency cycle",
			mutate: func(doc map[string]any) {
				steps := doc["steps"].([]any)
				steps[0].(map[string]any)["after"] = []any{"finish"}
				doc["steps"] = append(steps, map[string]any{
					"id": "finish", "instruction": "Termine.", "after": []any{"mix"},
				})
			},
			want: "dependency graph contains a cycle",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			doc := validDocument()
			test.mutate(doc)
			if err := validateSemantics(doc); err == nil || !strings.Contains(err.Error(), test.want) {
				t.Fatalf("validateSemantics() error = %v, want substring %q", err, test.want)
			}
		})
	}
}

func TestParseDocumentRejectsDuplicateJSONKeys(t *testing.T) {
	_, err := parseDocument("recipe.schemami.json", []byte(`{"schemami":"1","schemami":"1"}`))
	if err == nil || !strings.Contains(err.Error(), "duplicate object member") {
		t.Fatalf("parseDocument() error = %v, want duplicate-member error", err)
	}
}

func TestCanonicalisationUsesIJSONAndJCS(t *testing.T) {
	yamlDocument, err := parseDocument("recipe.schemami.yaml", []byte("z: <&>\na: é\nrevision: 1\n"))
	if err != nil {
		t.Fatal(err)
	}
	jsonDocument, err := parseDocument("recipe.schemami.json", []byte(`{"revision":1,"a":"é","z":"<&>"}`))
	if err != nil {
		t.Fatal(err)
	}
	yamlCanonical, err := canonicalise(yamlDocument)
	if err != nil {
		t.Fatal(err)
	}
	jsonCanonical, err := canonicalise(jsonDocument)
	if err != nil {
		t.Fatal(err)
	}
	if yamlCanonical != jsonCanonical {
		t.Fatalf("canonical mismatch: YAML %s JSON %s", yamlCanonical, jsonCanonical)
	}
	if yamlCanonical != `{"a":"é","revision":1,"z":"<&>"}` {
		t.Fatalf("canonical bytes = %s", yamlCanonical)
	}
	if _, err := parseDocument("recipe.schemami.yaml", []byte("1: not-a-string-key\n")); err == nil {
		t.Fatal("non-string YAML key unexpectedly admitted")
	}
	if _, err := parseDocument("recipe.schemami.json", []byte(`{"x":"\ud800"}`)); err == nil || !strings.Contains(err.Error(), "lone high surrogate") {
		t.Fatalf("lone surrogate error = %v", err)
	}
	if _, err := canonicalise(map[string]any{"x": math.Inf(1)}); err == nil {
		t.Fatal("non-finite extension number unexpectedly admitted")
	}
}

func TestCanonicaliseFilePinsFixtureDigest(t *testing.T) {
	path := filepath.Join("testdata", "basic.schemami.yaml")
	canonical, err := canonicaliseFile(path)
	if err != nil {
		t.Fatal(err)
	}
	digest := sha256.Sum256([]byte(canonical))
	if got, want := hex.EncodeToString(digest[:]), "f0670a641fbb55823d24814dee65f4e235fb74aa264db4d9fc247d7250b9f395"; got != want {
		t.Fatalf("digest = %s, want %s", got, want)
	}
}

func TestValidateSemanticsRejectsMalformedContentLanguage(t *testing.T) {
	doc := validDocument()
	doc["content_language"] = "pt--PT"
	if err := validateSemantics(doc); err == nil || !strings.Contains(err.Error(), "BCP 47") {
		t.Fatalf("validateSemantics() error = %v, want BCP 47 error", err)
	}
}

func TestValidateSemanticsRejectsFormulaAndExplicitQuantityConflict(t *testing.T) {
	doc := validDocument()
	doc["formula"] = map[string]any{
		"kind": "ratio",
		"terms": []any{
			map[string]any{"ingredient": "starter", "parts": "1"},
			map[string]any{"ingredient": "flour", "parts": "1"},
		},
		"target": map[string]any{"kind": "measured", "value": "200", "unit": "g"},
	}
	doc["ingredients"] = append(doc["ingredients"].([]any), map[string]any{"id": "flour", "name": "Farinha"})
	if err := validateSemantics(doc); err == nil || !strings.Contains(err.Error(), "must not carry explicit quantity") {
		t.Fatalf("validateSemantics() error = %v, want quantity-authority conflict", err)
	}
}

func TestEvidencePointerSupportsRFC6901Escapes(t *testing.T) {
	doc := validDocument()
	doc["x-test"] = map[string]any{"a/b": map[string]any{"til~de": "value"}}
	doc["evidence"] = []any{map[string]any{
		"id": "escaped", "pointer": "/x-test/a~1b/til~0de", "raw_text": "value",
	}}
	if err := validateSemantics(doc); err != nil {
		t.Fatal(err)
	}
}

func validDocument() map[string]any {
	return map[string]any{
		"schemami":         "1",
		"collection":       "test",
		"id":               "recipe",
		"revision":         1,
		"content_language": "pt-PT",
		"title":            "Receita",
		"ingredients": []any{
			map[string]any{
				"id": "starter", "name": "Massa-mãe",
				"quantity": map[string]any{"kind": "measured", "value": "100", "unit": "g"},
			},
		},
		"steps":   []any{map[string]any{"id": "mix", "instruction": "Misture."}},
		"sources": []any{map[string]any{"id": "source", "uri": "https://example.org/source", "media_type": "text/plain"}},
		"evidence": []any{map[string]any{
			"id": "evidence", "source": "source", "pointer": "/ingredients/0/quantity/value", "confidence": "0.9",
		}},
	}
}
