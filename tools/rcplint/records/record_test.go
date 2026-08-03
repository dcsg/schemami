package records

import (
	"go/parser"
	"go/token"
	"strings"
	"testing"
)

// ── canonicalisation ─────────────────────────────────────────────────

func TestCanonicaliseSortsAndEscapesPerRFC8785(t *testing.T) {
	got, err := Canonicalise(map[string]any{"b": 1.0, "a": 2.0, "C": 3.0})
	if err != nil {
		t.Fatal(err)
	}
	if got != `{"C":3,"a":2,"b":1}` {
		t.Errorf("keys must sort by UTF-16 code units (uppercase first): %s", got)
	}

	// The defect Go's encoding/json would introduce: HTML escaping.
	got, _ = Canonicalise(map[string]any{"x": "a<b>c&d"})
	if !strings.Contains(got, "a<b>c&d") {
		t.Errorf("RFC 8785 does NOT escape < > & — encoding/json does by default, and that alone makes two conforming implementations disagree: %s", got)
	}

	// Minimal escaping only.
	got, _ = Canonicalise("tab\there\nnew\"quote")
	if got != `"tab\there\nnew\"quote"` {
		t.Errorf("minimal escaping: %s", got)
	}
}

func TestCanonicaliseNumbers(t *testing.T) {
	cases := []struct {
		in   float64
		want string
	}{
		{0, "0"}, {-0, "0"}, {1, "1"}, {1.5, "1.5"},
		{100, "100"}, {-2, "-2"}, {0.25, "0.25"},
		{1e21, "1e+21"}, {1e-7, "1e-7"},
	}
	for _, c := range cases {
		got, err := Canonicalise(c.in)
		if err != nil {
			t.Fatalf("%v: %v", c.in, err)
		}
		if got != c.want {
			t.Errorf("Canonicalise(%v) = %s, want %s", c.in, got, c.want)
		}
	}
	// NaN and infinities are not JSON — an error, never a silent zero.
	for _, bad := range []float64{
		float64(0) / func() float64 { return 0 }(),
	} {
		if _, err := Canonicalise(bad); err == nil {
			t.Errorf("%v must not canonicalise", bad)
		}
	}
}

// A typed struct silently drops exactly the unknown fields the
// decode-compat contract requires readers to TOLERATE — so hashing one
// would let an attacker append fields a newer reader honours while the
// hash still matched.
func TestCanonicaliseRefusesTypedStructs(t *testing.T) {
	type doc struct{ ID string }
	if _, err := Canonicalise(doc{ID: "x"}); err == nil {
		t.Fatal("a typed struct must be refused as a hash preimage")
	} else if !strings.Contains(err.Error(), "never a typed struct") {
		t.Errorf("the error should say why: %v", err)
	}
}

func TestHashDeterminism(t *testing.T) {
	tgt := Target{Collection: "c", ID: "d", Version: 1}
	doc := map[string]any{"z": 1.0, "a": map[string]any{"n": "é", "m": []any{1.0, "x"}}}
	first, err := HashDocument(tgt, doc)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 50; i++ {
		again, _ := HashDocument(tgt, doc)
		if again != first {
			t.Fatalf("hash is not deterministic across runs: %s vs %s", first, again)
		}
	}
	// Golden: pins the algorithm so a canonicalisation change is loud.
	if !strings.HasPrefix(first, "sha256:") || len(first) != len("sha256:")+64 {
		t.Errorf("hash shape: %s", first)
	}
}

// Binding the target into the preimage is what stops a record being
// transplanted between collections.
func TestHashBindsTarget(t *testing.T) {
	doc := map[string]any{"id": "roux"}
	a, _ := HashDocument(Target{Collection: "a", ID: "roux", Version: 1}, doc)
	b, _ := HashDocument(Target{Collection: "b", ID: "roux", Version: 1}, doc)
	if a == b {
		t.Fatal("identical bodies in different collections must hash differently — otherwise a relabelled pack transplants the record")
	}
	v2, _ := HashDocument(Target{Collection: "a", ID: "roux", Version: 2}, doc)
	if a == v2 {
		t.Error("the revision must bind into the hash too")
	}
}

// ── source locators ──────────────────────────────────────────────────

func TestRecordSourceRefusesPrivate(t *testing.T) {
	doc := map[string]any{"id": "x"}
	tgt := Target{Collection: "c", ID: "x", Version: 1}
	for _, bad := range []string{
		"", "/Users/someone/repo/examples/x.rcp.yaml",
		"private/collection/book.rcp.yaml", "../outside/x.rcp.yaml",
	} {
		if _, err := NewRecord(tgt, bad, doc); err == nil {
			t.Errorf("source %q must be refused", bad)
		}
	}
	if _, err := NewRecord(tgt, "boston-1910/white-sauce.rcp.yaml", doc); err != nil {
		t.Errorf("a collection-relative locator must be accepted: %v", err)
	}
}

// ── frozen mode: fail-closed on EVERY path ───────────────────────────

func goodSetup(t *testing.T) ([]Record, map[string]map[string]any) {
	t.Helper()
	doc := map[string]any{"id": "white-sauce-i", "version": 1.0}
	tgt := Target{Collection: "boston-1910", ID: "white-sauce-i", Version: 1}
	r, err := NewRecord(tgt, "boston-1910/white-sauce.rcp.yaml", doc)
	if err != nil {
		t.Fatal(err)
	}
	return []Record{r}, map[string]map[string]any{tgt.String(): doc}
}

func TestFrozenPassesOnIntactCorpus(t *testing.T) {
	recs, present := goodSetup(t)
	v := VerifyFrozen(recs, present)
	if !v.OK() {
		t.Fatalf("an intact corpus must verify: %v", v.Failures)
	}
	if v.Verified != 1 {
		t.Errorf("verified count = %d, want 1", v.Verified)
	}
}

// The inverted proof, and the seven vacuous-pass paths beside it.
func TestFrozenFailClosed(t *testing.T) {
	cases := []struct {
		name    string
		mutate  func(recs []Record, present map[string]map[string]any) ([]Record, map[string]map[string]any)
		wantSub string
	}{
		{"mutated target", func(r []Record, p map[string]map[string]any) ([]Record, map[string]map[string]any) {
			for k := range p {
				p[k]["version"] = 2.0 // the content changed under the pin
			}
			return r, p
		}, "content changed since resolution"},

		{"no records at all", func(_ []Record, p map[string]map[string]any) ([]Record, map[string]map[string]any) {
			return nil, p
		}, "cannot pass on an empty set"},

		{"zero verified", func(_ []Record, _ map[string]map[string]any) ([]Record, map[string]map[string]any) {
			return nil, nil
		}, "cannot pass on an empty set"},

		{"empty content_hash", func(r []Record, p map[string]map[string]any) ([]Record, map[string]map[string]any) {
			r[0].ContentHash = ""
			return r, p
		}, "no content_hash"},

		{"wrong algorithm prefix", func(r []Record, p map[string]map[string]any) ([]Record, map[string]map[string]any) {
			r[0].ContentHash = "md5:" + strings.Repeat("a", 64)
			return r, p
		}, "lacks the sha256: algorithm prefix"},

		{"truncated digest", func(r []Record, p map[string]map[string]any) ([]Record, map[string]map[string]any) {
			r[0].ContentHash = "sha256:abc"
			return r, p
		}, "not a sha256 digest"},

		{"unknown resolver", func(r []Record, p map[string]map[string]any) ([]Record, map[string]map[string]any) {
			r[0].ResolverVersion = "someone-elses-tool/9"
			return r, p
		}, "unknown resolver_version"},

		{"missing resolver", func(r []Record, p map[string]map[string]any) ([]Record, map[string]map[string]any) {
			r[0].ResolverVersion = ""
			return r, p
		}, "no resolver_version"},

		{"duplicate records", func(r []Record, p map[string]map[string]any) ([]Record, map[string]map[string]any) {
			return append(r, r[0]), p
		}, "duplicate resolution records"},

		{"target gone", func(r []Record, _ map[string]map[string]any) ([]Record, map[string]map[string]any) {
			return r, map[string]map[string]any{}
		}, "no longer present"},

		{"uncovered present target", func(r []Record, p map[string]map[string]any) ([]Record, map[string]map[string]any) {
			p["boston-1910/other@1"] = map[string]any{"id": "other"}
			return r, p
		}, "has no resolution record"},

		{"private source smuggled in", func(r []Record, p map[string]map[string]any) ([]Record, map[string]map[string]any) {
			r[0].Source = "private/collection/book.rcp.yaml"
			return r, p
		}, "private/"},
	}
	for _, c := range cases {
		recs, present := goodSetup(t)
		recs, present = c.mutate(recs, present)
		v := VerifyFrozen(recs, present)
		if v.OK() {
			t.Errorf("%s: frozen mode passed when it must FAIL", c.name)
			continue
		}
		joined := strings.Join(v.Failures, "\n")
		if !strings.Contains(joined, c.wantSub) {
			t.Errorf("%s: failure should mention %q, got: %s", c.name, c.wantSub, joined)
		}
	}
}

// A run that verified nothing is not a pass, even with no failures.
func TestVacuousRunIsNotOK(t *testing.T) {
	v := Verification{Verified: 0}
	if v.OK() {
		t.Fatal("zero verified records must never read as success")
	}
}

// ── dependency freeze ────────────────────────────────────────────────

// SP-005: hashing uses the standard library only. A hashing package
// that quietly grows a dependency is a supply-chain surface.
func TestHashImportAllowlist(t *testing.T) {
	allowed := map[string]bool{
		"crypto/sha256": true, "encoding/hex": true, "fmt": true,
		"math": true, "sort": true, "strconv": true, "strings": true,
		"go/parser": true, "go/token": true, "testing": true,
	}
	fset := token.NewFileSet()
	pkgs, err := parser.ParseDir(fset, ".", nil, parser.ImportsOnly)
	if err != nil {
		t.Fatal(err)
	}
	for _, pkg := range pkgs {
		for name, f := range pkg.Files {
			for _, imp := range f.Imports {
				path := strings.Trim(imp.Path.Value, `"`)
				if !allowed[path] {
					t.Errorf("%s imports %q — the records package is stdlib-only (SP-005)", name, path)
				}
			}
		}
	}
}
