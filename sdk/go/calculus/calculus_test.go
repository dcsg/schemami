package calculus

import (
	"encoding/json"
	"math/big"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strings"
	"testing"
)

type vector struct {
	Name      string         `json:"name"`
	Operation string         `json:"operation"`
	Input     map[string]any `json:"input"`
	Expected  map[string]any `json:"expected"`
}

func TestSharedCalculusVectors(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "resources", "conformance", "calculus.json"))
	if err != nil {
		t.Fatal(err)
	}
	var vectors []vector
	if err := json.Unmarshal(raw, &vectors); err != nil {
		t.Fatal(err)
	}
	for _, testVector := range vectors {
		t.Run(testVector.Name, func(t *testing.T) {
			actual := runVector(t, testVector)
			encoded, err := json.Marshal(actual)
			if err != nil {
				t.Fatal(err)
			}
			var normalized map[string]any
			if err := json.Unmarshal(encoded, &normalized); err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(normalized, testVector.Expected) {
				t.Fatalf("result = %#v, want %#v", normalized, testVector.Expected)
			}
		})
	}
}

func TestSharedVectorEnvelopeInvariants(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "resources", "conformance", "calculus.json"))
	if err != nil {
		t.Fatal(err)
	}
	var vectors []vector
	if err := json.Unmarshal(raw, &vectors); err != nil {
		t.Fatal(err)
	}
	for _, testVector := range vectors {
		t.Run(testVector.Name, func(t *testing.T) {
			actual := normalizeEnvelope(t, runVector(t, testVector))
			assertEnvelopeInvariants(t, actual)
		})
	}
}

func normalizeEnvelope(t *testing.T, envelope Envelope) map[string]any {
	t.Helper()
	encoded, err := json.Marshal(envelope)
	if err != nil {
		t.Fatal(err)
	}
	var normalized map[string]any
	if err := json.Unmarshal(encoded, &normalized); err != nil {
		t.Fatal(err)
	}
	return normalized
}

func assertEnvelopeInvariants(t *testing.T, envelope map[string]any) {
	t.Helper()
	operation, _ := envelope["operation"].(string)
	knownOperations := map[string]bool{
		"scale": true, "resolve_formula": true, "convert_quantity": true,
		"reading_order": true, "schedule": true,
	}
	if !knownOperations[operation] {
		t.Fatalf("unknown operation %q", operation)
	}
	status, _ := envelope["status"].(string)
	switch status {
	case "ok":
		assertExactKeys(t, envelope, "operation", "result", "status")
		result, ok := envelope["result"].(map[string]any)
		if !ok {
			t.Fatal("ok envelope result is not an object")
		}
		switch operation {
		case "convert_quantity":
			assertExactKeys(t, result, "quantity")
		case "scale", "resolve_formula":
			assertExactKeys(t, result, "quantities")
		case "reading_order", "schedule":
			assertExactKeys(t, result, "steps")
		}
	case "refused":
		assertExactKeys(t, envelope, "operation", "problems", "status")
		problems, ok := envelope["problems"].([]any)
		if !ok || len(problems) == 0 {
			t.Fatal("refused envelope must contain problems")
		}
		for _, value := range problems {
			problem, ok := value.(map[string]any)
			if !ok {
				t.Fatal("problem is not an object")
			}
			if _, hasPointer := problem["pointer"]; hasPointer {
				assertExactKeys(t, problem, "pointer", "type")
				pointer, ok := problem["pointer"].(string)
				if !ok || !validJSONPointer(pointer) {
					t.Fatalf("invalid problem pointer %#v", problem["pointer"])
				}
			} else {
				assertExactKeys(t, problem, "type")
			}
			problemType, _ := problem["type"].(string)
			if !strings.HasPrefix(problemType, problemBase) || len(problemType) == len(problemBase) {
				t.Fatalf("unstable problem type %q", problemType)
			}
		}
	case "not_applicable":
		assertExactKeys(t, envelope, "operation", "status")
	default:
		t.Fatalf("unknown status %q", status)
	}
}

func assertExactKeys(t *testing.T, object map[string]any, expected ...string) {
	t.Helper()
	actual := make([]string, 0, len(object))
	for key := range object {
		actual = append(actual, key)
	}
	sort.Strings(actual)
	sort.Strings(expected)
	if !reflect.DeepEqual(actual, expected) {
		t.Fatalf("object keys = %v, want %v", actual, expected)
	}
}

func validJSONPointer(pointer string) bool {
	if pointer == "" {
		return true
	}
	if !strings.HasPrefix(pointer, "/") {
		return false
	}
	for _, token := range strings.Split(pointer[1:], "/") {
		for index := 0; index < len(token); index++ {
			if token[index] != '~' {
				continue
			}
			if index+1 == len(token) || (token[index+1] != '0' && token[index+1] != '1') {
				return false
			}
			index++
		}
	}
	return true
}

func runVector(t *testing.T, testVector vector) Envelope {
	t.Helper()
	switch testVector.Operation {
	case "convert_quantity":
		quantity := decode[Quantity](t, testVector.Input["quantity"])
		target, _ := testVector.Input["target_unit"].(string)
		pointer, _ := testVector.Input["pointer"].(string)
		return ConvertQuantity(quantity, target, pointer)
	case "resolve_formula":
		formula := decode[Formula](t, testVector.Input["formula"])
		pointer, _ := testVector.Input["pointer"].(string)
		return ResolveFormula(formula, pointer)
	case "scale":
		recipe := decode[Recipe](t, testVector.Input["recipe"])
		factor, _ := testVector.Input["factor"].(string)
		return Scale(recipe, factor)
	case "reading_order":
		return ReadingOrder(decode[[]Step](t, testVector.Input["steps"]))
	case "schedule":
		return Schedule(decode[[]Step](t, testVector.Input["steps"]))
	default:
		t.Fatalf("unsupported vector operation %q", testVector.Operation)
		return Envelope{}
	}
}

func decode[T any](t *testing.T, value any) T {
	t.Helper()
	encoded, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	var decoded T
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatal(err)
	}
	return decoded
}

func TestDurationOutputCanonicalisation(t *testing.T) {
	tests := map[string]string{
		"0":      "PT0S",
		"60":     "PT1M",
		"3661":   "PT1H1M1S",
		"86400":  "P1D",
		"604800": "P1W",
		"691200": "P8D",
	}
	for raw, expected := range tests {
		seconds, ok := newBigInt(raw)
		if !ok {
			t.Fatal(raw)
		}
		if actual := formatElapsed(seconds); actual != expected {
			t.Errorf("formatElapsed(%s) = %s, want %s", raw, actual, expected)
		}
	}
}

func newBigInt(raw string) (*big.Int, bool) {
	return new(big.Int).SetString(raw, 10)
}
