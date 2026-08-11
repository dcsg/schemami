package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"sort"
	"strings"
)

type bundleDocument struct {
	key       string
	reference string
	document  map[string]any
}

func validateBundle(path string) error {
	if !strings.HasSuffix(path, ".schemami-bundle.json") {
		return fmt.Errorf("bundle file must use .schemami-bundle.json")
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	bundle, err := parseDocument(path, raw)
	if err != nil {
		return err
	}
	if marker, ok := bundle["schemami"].(string); !ok || marker != "1" {
		return fmt.Errorf("unsupported document marker")
	}
	schema, err := namedSchemaFor(path, "schemami-v1-bundle.schema.json")
	if err != nil {
		return err
	}
	if err := schema.Validate(bundle); err != nil {
		return err
	}
	if _, err := canonicalise(bundle); err != nil {
		return err
	}
	return validateBundleSemantics(bundle)
}

func validateBundleSemantics(bundle map[string]any) error {
	entries, _ := bundle["documents"].([]any)
	if len(entries) > 1024 {
		return fmt.Errorf("resource-limit: bundle exceeds 1024 embedded documents")
	}
	coreSchema, err := schemaFor("candidate.schemami.json")
	if err != nil {
		return err
	}
	documents := make([]bundleDocument, 0, len(entries))
	byReference := map[string]bundleDocument{}
	for index, candidate := range entries {
		entry := candidate.(map[string]any)
		document := entry["document"].(map[string]any)
		if err := validateDocumentData(document, coreSchema); err != nil {
			return fmt.Errorf("documents/%d/document: %w", index, err)
		}
		canonical, err := canonicalise(document)
		if err != nil {
			return fmt.Errorf("documents/%d/document: %w", index, err)
		}
		digest := sha256.Sum256([]byte(canonical))
		digestText := hex.EncodeToString(digest[:])
		declaredDigest, _ := entry["sha256"].(string)
		if digestText != declaredDigest {
			return fmt.Errorf("documents/%d/sha256 does not match the embedded document JCS digest", index)
		}
		key := recipeKey(document)
		reference := key + "\x00" + digestText
		if _, duplicate := byReference[reference]; duplicate {
			return fmt.Errorf("documents/%d duplicates exact document identity", index)
		}
		item := bundleDocument{key: key, reference: reference, document: document}
		documents = append(documents, item)
		byReference[reference] = item
	}

	root := bundle["root"].(map[string]any)
	rootReference := recipeReferenceKey(root)
	if len(documents) == 0 || documents[0].reference != rootReference {
		return fmt.Errorf("documents/0 must be the exact bundle root")
	}
	for index := 2; index < len(documents); index++ {
		if documents[index-1].reference >= documents[index].reference {
			return fmt.Errorf("documents/%d is not in canonical ASCII recipe-reference order", index)
		}
	}

	reachable := map[string]struct{}{}
	visiting := map[string]bool{}
	var visit func(bundleDocument) error
	visit = func(current bundleDocument) error {
		if visiting[current.reference] {
			return fmt.Errorf("component dependency graph contains a cycle")
		}
		if _, visited := reachable[current.reference]; visited {
			return nil
		}
		visiting[current.reference] = true
		reachable[current.reference] = struct{}{}
		components, _ := current.document["components"].([]any)
		for componentIndex, candidate := range components {
			component := candidate.(map[string]any)
			reference := recipeReferenceKey(component["recipe"].(map[string]any))
			child, present := byReference[reference]
			if !present {
				return fmt.Errorf("component %s/%d references document bytes absent from bundle", current.key, componentIndex)
			}
			if err := visit(child); err != nil {
				return err
			}
		}
		visiting[current.reference] = false
		return nil
	}
	if err := visit(documents[0]); err != nil {
		return err
	}
	if len(reachable) != len(documents) {
		extras := make([]string, 0)
		for _, document := range documents {
			if _, present := reachable[document.reference]; !present {
				extras = append(extras, document.reference)
			}
		}
		sort.Strings(extras)
		return fmt.Errorf("bundle contains unrelated document %q", extras[0])
	}
	return nil
}

func recipeKey(document map[string]any) string {
	revision, _ := positiveInteger(document["revision"])
	return fmt.Sprintf("%s\x00%s\x00%020d", document["collection"], document["id"], revision)
}

func recipeReferenceKey(reference map[string]any) string {
	revision, _ := positiveInteger(reference["revision"])
	return fmt.Sprintf("%s\x00%s\x00%020d\x00%s", reference["collection"], reference["id"], revision, reference["sha256"])
}
