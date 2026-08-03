package calc

// SSP-005 made structural: the calc package imports NOTHING beyond the
// allowlist — no IO, no clock, no randomness (AC-2.3 purity half).

import (
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCalcPurity(t *testing.T) {
	allow := map[string]bool{"fmt": true, "strings": true, "math": true, "sort": true}
	testAllow := map[string]bool{"testing": true, "go/parser": true, "go/token": true, "go/ast": true,
		"os": true, "path/filepath": true, "regexp": true, "strconv": true}
	files, _ := filepath.Glob("*.go")
	for _, f := range files {
		src, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		fset := token.NewFileSet()
		ast, err := parser.ParseFile(fset, f, src, parser.ImportsOnly)
		if err != nil {
			t.Fatal(err)
		}
		isTest := strings.HasSuffix(f, "_test.go")
		for _, imp := range ast.Imports {
			path := strings.Trim(imp.Path.Value, `"`)
			if allow[path] || (isTest && testAllow[path]) {
				continue
			}
			t.Errorf("%s imports %q — outside the purity allowlist (SSP-005)", f, path)
		}
	}
}
