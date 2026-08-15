package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
)

type resource struct {
	Source      string `json:"source"`
	Destination string `json:"destination"`
	SHA256      string `json:"sha256"`
}

var mappings = []struct {
	source      string
	destination string
}{
	{"schema/schemami-v1-core.schema.json", "schema/schemami-v1-core.schema.json"},
	{"schema/schemami-v1-bundle.schema.json", "schema/schemami-v1-bundle.schema.json"},
	{"conformance/schemami-v1/validation.json", "conformance/validation.json"},
	{"conformance/schemami-v1/calculus.json", "conformance/calculus.json"},
	{"conformance/schemami-v1/structured-calculus.json", "conformance/structured-calculus.json"},
	{"conformance/schemami-v1/diff.json", "conformance/diff.json"},
	{"conformance/schemami-v1/resource-budgets.json", "conformance/resource-budgets.json"},
	{"conformance/schemami-v1/canonicalization.json", "conformance/canonicalization.json"},
	{"conformance/schemami-v1/canonicalization/member-order-a.schemami.json", "conformance/fixtures/canonicalization/member-order-a.schemami.json"},
	{"conformance/schemami-v1/canonicalization/member-order-b.schemami.json", "conformance/fixtures/canonicalization/member-order-b.schemami.json"},
	{"conformance/schemami-v1/canonicalization/number-boundaries.schemami.json", "conformance/fixtures/canonicalization/number-boundaries.schemami.json"},
	{"conformance/schemami-v1/canonicalization/string-escapes.schemami.json", "conformance/fixtures/canonicalization/string-escapes.schemami.json"},
	{"conformance/schemami-v1/canonicalization/utf16-order.schemami.json", "conformance/fixtures/canonicalization/utf16-order.schemami.json"},
	{"tools/schemami/testdata/phase9-minimal.schemami.json", "conformance/fixtures/phase9-minimal.schemami.json"},
	{"tools/schemami/testdata/phase3-selection.schemami.json", "conformance/fixtures/phase3-selection.schemami.json"},
	{"tools/schemami/testdata/phase9-structured.schemami.json", "conformance/fixtures/phase9-structured.schemami.json"},
	{"tools/schemami/testdata/phase9-child.schemami.json", "conformance/fixtures/phase9-child.schemami.json"},
	{"tools/schemami/testdata/phase9-root.schemami.json", "conformance/fixtures/phase9-root.schemami.json"},
	{"tools/schemami/testdata/phase9.schemami-bundle.json", "conformance/fixtures/phase9.schemami-bundle.json"},
}

func main() {
	if len(os.Args) != 3 || (os.Args[1] != "sync" && os.Args[1] != "check") {
		fail("usage: swift-resources <sync|check> <repository-root>")
	}
	root, err := filepath.Abs(os.Args[2])
	if err != nil {
		fail(err.Error())
	}
	resourcesRoot := filepath.Join(root, "sdk", "swift", "Sources", "SchemamiCore", "Resources")
	manifestPath := filepath.Join(resourcesRoot, "manifest.json")
	var expected []resource
	for _, mapping := range mappings {
		sourcePath := filepath.Join(root, filepath.FromSlash(mapping.source))
		destinationPath := filepath.Join(resourcesRoot, filepath.FromSlash(mapping.destination))
		raw, err := os.ReadFile(sourcePath)
		if err != nil {
			fail(err.Error())
		}
		digest := sha256.Sum256(raw)
		expected = append(expected, resource{
			Source: mapping.source, Destination: mapping.destination, SHA256: hex.EncodeToString(digest[:]),
		})
		if os.Args[1] == "sync" {
			if err := os.MkdirAll(filepath.Dir(destinationPath), 0o755); err != nil {
				fail(err.Error())
			}
			if err := copyFile(destinationPath, raw); err != nil {
				fail(err.Error())
			}
		}
	}
	sort.Slice(expected, func(i, j int) bool { return expected[i].Destination < expected[j].Destination })
	if os.Args[1] == "sync" {
		encoded, err := json.MarshalIndent(map[string]any{"resources": expected}, "", "  ")
		if err != nil {
			fail(err.Error())
		}
		encoded = append(encoded, '\n')
		if err := os.WriteFile(manifestPath, encoded, 0o644); err != nil {
			fail(err.Error())
		}
	} else {
		raw, err := os.ReadFile(manifestPath)
		if err != nil {
			fail(err.Error())
		}
		var manifest struct {
			Resources []resource `json:"resources"`
		}
		if err := json.Unmarshal(raw, &manifest); err != nil {
			fail(err.Error())
		}
		if len(manifest.Resources) != len(expected) {
			fail("resource manifest length mismatch")
		}
		for index := range expected {
			if manifest.Resources[index] != expected[index] {
				fail(fmt.Sprintf("resource manifest mismatch at %d", index))
			}
			destination := filepath.Join(resourcesRoot, filepath.FromSlash(expected[index].Destination))
			raw, err := os.ReadFile(destination)
			if err != nil {
				fail(err.Error())
			}
			digest := sha256.Sum256(raw)
			if hex.EncodeToString(digest[:]) != expected[index].SHA256 {
				fail("generated resource drift: " + expected[index].Destination)
			}
		}
	}
	fmt.Printf("swift-resources: %s passed (%d resources)\n", os.Args[1], len(expected))
}

func copyFile(path string, raw []byte) error {
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()
	if _, err := io.WriteString(file, string(raw)); err != nil {
		return err
	}
	return file.Chmod(0o644)
}

func fail(message string) {
	fmt.Fprintln(os.Stderr, "swift-resources:", message)
	os.Exit(1)
}
