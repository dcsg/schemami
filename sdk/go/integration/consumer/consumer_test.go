package consumer_test

import (
	"testing"

	schemami "github.com/dcsg/schemami/sdk/go"
	"github.com/dcsg/schemami/sdk/go/calculus"
)

func TestExternalModuleImportsCoreAndCalculus(t *testing.T) {
	raw := []byte(`{"schemami":"1","collection":"consumer","id":"minimal","revision":1,"content_language":"en-GB","title":"Minimal","ingredients":[],"method":{"sequence":[]}}`)
	parsed := schemami.Parse(raw, schemami.ProtocolFloor)
	if !parsed.OK() {
		t.Fatalf("parse refused: %#v", parsed.Problems)
	}
	admitted := schemami.Admit(parsed.Parsed, schemami.ProtocolFloor)
	if !admitted.OK() || admitted.Recipe == nil {
		t.Fatalf("admission refused: %#v", admitted.Problems)
	}
	result := schemami.Evaluate(schemami.OperationRequest{Operation: "convert_quantity", Arguments: map[string]any{"quantity": map[string]any{"kind": "measured", "value": "1", "unit": "kg"}, "target_unit": "g"}}, schemami.OperationInput{}, schemami.ProtocolFloor)
	if result.Status != "ok" {
		t.Fatalf("calculus refused: %#v", result)
	}
	if !calculus.KnownUnit("g") {
		t.Fatal("calculus subpackage unavailable")
	}
}
