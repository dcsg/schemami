package calc

// AC-CALC-001-2 made mechanical (AC-2.5): every exported FUNCTION of this
// package appears as a `## fn:` section in calculus/SPEC.md — no
// behaviour exists only in code. Exported types are carriers, not
// Calculus functions; RenderReason is a formatting helper covered by the
// opaque-reason rule (R-ENFORCE-4).

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

var specExempt = map[string]bool{"RenderReason": true}

func TestSpecCompleteness(t *testing.T) {
	spec, err := os.ReadFile(filepath.Join("..", "..", "..", "calculus", "SPEC.md"))
	if err != nil {
		t.Fatal(err)
	}
	files, _ := filepath.Glob("*.go")
	for _, f := range files {
		if strings.HasSuffix(f, "_test.go") {
			continue
		}
		src, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		fset := token.NewFileSet()
		astf, err := parser.ParseFile(fset, f, src, 0)
		if err != nil {
			t.Fatal(err)
		}
		for _, decl := range astf.Decls {
			fd, ok := decl.(*ast.FuncDecl)
			if !ok || fd.Recv != nil || !fd.Name.IsExported() || specExempt[fd.Name.Name] {
				continue
			}
			name := fd.Name.Name
			lower := strings.ToLower(name[:1]) + name[1:]
			if !strings.Contains(string(spec), "## fn: "+lower) {
				t.Errorf("exported func %s has no `## fn: %s` section in calculus/SPEC.md", name, lower)
			}
		}
	}
}
