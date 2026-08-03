package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Conformance-vector export (SAC-TOOL-002; DS-TOOL-002; PLAN-rcp-v02
// Phase 6). rcplint is the ORACLE: it writes the vectors, the viewer's
// engines replay them. Vectors are expectations referencing repo-relative
// sources (never embedding content); verdicts are layer-tagged so the same
// vector set serves the L1-only JS engine today (capability-scoped
// comparison) and the L1+L2+CUE WASM engine later. Conformance
// disagreements are fixed in the replaying engine, never by editing
// vectors.

// vectorAllowlist is HARD-CODED (security pre-flight): widening it is a
// reviewed change, and private/ can never be swept in by a glob edit.
var vectorAllowlist = []string{"examples", "tools/rcplint/testdata/l1"}

type VectorVerdict struct {
	Doc      string `json:"doc"`
	Layer    string `json:"layer"` // l1 | l2 | cue — future layers use the same field
	Valid    bool   `json:"valid"`
	Profile  string `json:"profile,omitempty"`  // profile kind composed, "" = core-only
	Maturity string `json:"maturity,omitempty"` // from x-rcp-maturity when a profile applied
}

type Vector struct {
	Source    string          `json:"source"` // repo-relative document path
	ParseOK   bool            `json:"parse_ok"`
	Expected  []VectorVerdict `json:"expected"`
}

func runVectors(root, outDir string) int {
	core, err := CompileSchema(filepath.Join(root, "schema/rcp-core-v1.schema.json"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "vectors: compile core: %v\n", err)
		return 2
	}
	profiles := map[string]Validator{}
	maturity := map[string]string{}
	profGlob, _ := filepath.Glob(filepath.Join(root, "schema/profiles/*.schema.json"))
	for _, p := range profGlob {
		kind := strings.TrimSuffix(filepath.Base(p), ".schema.json")
		v, err := CompileSchema(p)
		if err != nil {
			fmt.Fprintf(os.Stderr, "vectors: compile profile %s: %v\n", kind, err)
			return 2
		}
		profiles[kind] = v
		maturity[kind] = readMaturity(p)
	}

	var sources []string
	for _, dir := range vectorAllowlist {
		glob, _ := filepath.Glob(filepath.Join(root, dir, "*.rcp.yaml"))
		sources = append(sources, glob...)
	}
	sort.Strings(sources)

	if err := os.MkdirAll(outDir, 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "vectors: %v\n", err)
		return 2
	}
	n := 0
	for _, src := range sources {
		rel := relPath(root, src)
		if strings.Contains(rel, "private/") {
			fmt.Fprintf(os.Stderr, "vectors: REFUSING private path %s (privacy boundary)\n", rel)
			return 2
		}
		vec := Vector{Source: rel, ParseOK: true}
		docs, err := LoadDocuments(src)
		if err != nil {
			vec.ParseOK = false
		} else {
			for _, d := range docs {
				vv := VectorVerdict{Doc: d.ID, Layer: "l1", Valid: true}
				if err := core.Validate(d.Value); err != nil {
					vv.Valid = false
				}
				if pv, has := profiles[d.Kind]; has {
					vv.Profile = d.Kind
					vv.Maturity = maturity[d.Kind]
					if err := pv.Validate(d.Value); err != nil {
						vv.Valid = false
					}
				}
				vec.Expected = append(vec.Expected, vv)
			}
		}
		name := strings.ReplaceAll(strings.TrimSuffix(rel, ".rcp.yaml"), "/", "__") + ".json"
		out, _ := json.MarshalIndent(vec, "", "  ")
		if err := os.WriteFile(filepath.Join(outDir, name), append(out, '\n'), 0o644); err != nil {
			fmt.Fprintf(os.Stderr, "vectors: write %s: %v\n", name, err)
			return 2
		}
		n++
	}
	fmt.Printf("vectors: %d source files exported to %s\n", n, outDir)
	return 0
}
