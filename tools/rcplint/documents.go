package main

import (
	"fmt"
	"os"
	"strings"

	yaml "gopkg.in/yaml.v3"
)

// Document is one YAML document plus its provenance (file + index) so
// errors can name their source precisely.
type Document struct {
	File  string
	Index int
	ID    string
	Kind  string
	Value any
}

// LoadDocuments reads a (possibly multi-document) YAML file into
// JSON-compatible values. Multi-doc files are split and validated
// individually (AC-4.6).
func LoadDocuments(path string) ([]Document, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	dec := yaml.NewDecoder(strings.NewReader(string(raw)))
	var docs []Document
	for i := 0; ; i++ {
		var v any
		if err := dec.Decode(&v); err != nil {
			if err.Error() == "EOF" {
				break
			}
			return nil, fmt.Errorf("%s: doc %d: %w", path, i, err)
		}
		if v == nil {
			continue
		}
		jv := toJSON(v)
		d := Document{File: path, Index: i, Value: jv}
		if m, ok := jv.(map[string]any); ok {
			if id, ok := m["id"].(string); ok {
				d.ID = id
			}
			if k, ok := m["kind"].(string); ok {
				d.Kind = k
			}
		}
		docs = append(docs, d)
	}
	return docs, nil
}

// toJSON normalizes yaml.v3 output into JSON-compatible shapes
// (map[string]any keys, no map[any]any).
func toJSON(v any) any {
	switch t := v.(type) {
	case map[string]any:
		m := make(map[string]any, len(t))
		for k, val := range t {
			m[k] = toJSON(val)
		}
		return m
	case map[any]any:
		m := make(map[string]any, len(t))
		for k, val := range t {
			m[fmt.Sprintf("%v", k)] = toJSON(val)
		}
		return m
	case []any:
		s := make([]any, len(t))
		for i, val := range t {
			s[i] = toJSON(val)
		}
		return s
	default:
		return v
	}
}
