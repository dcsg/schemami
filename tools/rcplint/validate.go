package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// runValidate is Layer 1: every example document against core AND
// profile[kind] (DS-VAL-001 adjusted: no profile file => core-only with an
// explicit warning, never silent), plus every registry entry against its
// entry schema. Exit non-zero on any failure, naming file + JSON pointer.
func runValidate(root string) int {
	failures := 0
	core, err := CompileSchema(filepath.Join(root, "schema/rcp-core-v1.schema.json"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "compile core: %v\n", err)
		return 2
	}

	profiles := map[string]Validator{}
	maturity := map[string]string{}
	profGlob, _ := filepath.Glob(filepath.Join(root, "schema/profiles/*.schema.json"))
	for _, p := range profGlob {
		kind := strings.TrimSuffix(filepath.Base(p), ".schema.json")
		v, err := CompileSchema(p)
		if err != nil {
			fmt.Fprintf(os.Stderr, "compile profile %s: %v\n", kind, err)
			return 2
		}
		profiles[kind] = v
		maturity[kind] = readMaturity(p)
	}

	exGlob, _ := filepath.Glob(filepath.Join(root, "examples/*.rcp.yaml"))
	sort.Strings(exGlob)
	nDocs := 0
	for _, path := range exGlob {
		docs, err := LoadDocuments(path)
		if err != nil {
			fmt.Fprintf(os.Stderr, "load %s: %v\n", path, err)
			return 2
		}
		for _, d := range docs {
			nDocs++
			ok := true
			if err := core.Validate(d.Value); err != nil {
				fmt.Printf("FAIL %s\n", FormatError(relPath(root, d.File), d.ID, err))
				failures++
				ok = false
			}
			if pv, has := profiles[d.Kind]; has {
				if err := pv.Validate(d.Value); err != nil {
					fmt.Printf("FAIL profile[%s] %s\n", d.Kind, FormatError(relPath(root, d.File), d.ID, err))
					failures++
					ok = false
				} else if ok {
					fmt.Printf("OK   %s#%s (core ∧ %s, maturity: %s)\n", filepath.Base(d.File), d.ID, d.Kind, maturity[d.Kind])
				}
			} else if ok {
				fmt.Printf("OK   %s#%s (core-only — WARNING: no profile for kind %q, DS-VAL-001)\n", filepath.Base(d.File), d.ID, d.Kind)
			}
			validateComponents(d, profiles, maturity, root, &failures)
		}
	}
	fmt.Printf("examples: %d documents\n", nDocs)

	regFail := validateRegistry(root)
	failures += regFail

	if failures > 0 {
		fmt.Printf("\nVALIDATION FAILED: %d failure(s)\n", failures)
		return 1
	}
	fmt.Println("\nVALIDATION GREEN")
	return 0
}

// validateComponents applies profile schemas to inline components whose
// kind differs from the parent (the nata's embedded bread — profile
// selection per component, not per file).
func validateComponents(d Document, profiles map[string]Validator, maturity map[string]string, root string, failures *int) {
	m, ok := d.Value.(map[string]any)
	if !ok {
		return
	}
	comps, ok := m["components"].([]any)
	if !ok {
		return
	}
	for _, c := range comps {
		cm, ok := c.(map[string]any)
		if !ok {
			continue
		}
		kind, _ := cm["kind"].(string)
		id, _ := cm["id"].(string)
		if kind == "" {
			continue
		}
		if pv, has := profiles[kind]; has {
			if err := pv.Validate(c); err != nil {
				fmt.Printf("FAIL component profile[%s] %s\n", kind, FormatError(relPath(root, d.File), d.ID+"/"+id, err))
				*failures++
			} else {
				fmt.Printf("OK   %s#%s/%s (component, %s profile, maturity: %s)\n", filepath.Base(d.File), d.ID, id, kind, maturity[kind])
			}
		}
	}
}

func validateRegistry(root string) int {
	failures := 0
	schemas := map[string]Validator{}
	for prefix, file := range map[string]string{
		"ingredient": "ingredient-class.schema.json",
		"primitive":  "step-primitive.schema.json",
		"equipment":  "equipment-profile.schema.json",
	} {
		v, err := CompileSchema(filepath.Join(root, "registry/schemas", file))
		if err != nil {
			fmt.Fprintf(os.Stderr, "compile registry schema %s: %v\n", file, err)
			return 1
		}
		schemas[prefix] = v
	}
	n := 0
	for prefix := range schemas {
		glob, _ := filepath.Glob(filepath.Join(root, "registry/entries", prefix, "*.yaml"))
		sort.Strings(glob)
		for _, path := range glob {
			docs, err := LoadDocuments(path)
			if err != nil || len(docs) != 1 {
				fmt.Printf("FAIL registry %s: load error\n", relPath(root, path))
				failures++
				continue
			}
			n++
			if err := schemas[prefix].Validate(docs[0].Value); err != nil {
				fmt.Printf("FAIL registry %s\n", FormatError(relPath(root, path), docs[0].ID, err))
				failures++
			}
		}
	}
	fmt.Printf("registry: %d entries validated\n", n)
	return failures
}

func readMaturity(schemaPath string) string {
	raw, err := os.ReadFile(schemaPath)
	if err != nil {
		return "unknown"
	}
	s := string(raw)
	for _, m := range []string{"hardened", "draft"} {
		if strings.Contains(s, "\"x-rcp-maturity\": \""+m+"\"") {
			return m
		}
	}
	return "unknown"
}

func relPath(root, p string) string {
	if r, err := filepath.Rel(root, p); err == nil {
		return r
	}
	return p
}
