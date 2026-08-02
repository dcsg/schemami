package main

import (
	"encoding/json"
	"fmt"
	"os"

	jsonschema "github.com/santhosh-tekuri/jsonschema/v6"
)

// Validator is the small internal interface DS-VAL-002 requires so the
// underlying JSON Schema engine can be swapped without touching callers.
type Validator interface {
	Validate(doc any) error
}

type schemaValidator struct{ sch *jsonschema.Schema }

func (s *schemaValidator) Validate(doc any) error { return s.sch.Validate(doc) }

// CompileSchema compiles a 2020-12 schema file with format assertions
// enabled (DS-VAL-002).
func CompileSchema(path string) (Validator, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		return nil, fmt.Errorf("%s: %w", path, err)
	}
	c := jsonschema.NewCompiler()
	c.DefaultDraft(jsonschema.Draft2020)
	c.AssertFormat()
	if err := c.AddResource(path, v); err != nil {
		return nil, err
	}
	sch, err := c.Compile(path)
	if err != nil {
		return nil, err
	}
	return &schemaValidator{sch}, nil
}

// FormatError renders a validation error as file + JSON pointer (AC-4.2),
// using the spec-defined basic output format (no localization machinery).
func FormatError(file, docID string, err error) string {
	if ve, ok := err.(*jsonschema.ValidationError); ok {
		out := ve.BasicOutput()
		for _, u := range out.Errors {
			if u.Error != nil && u.InstanceLocation != "" {
				return fmt.Sprintf("%s#%s: %s: %s", file, docID, u.InstanceLocation, u.Error.String())
			}
		}
		if len(out.Errors) > 0 && out.Errors[0].Error != nil {
			return fmt.Sprintf("%s#%s: /: %s", file, docID, out.Errors[0].Error.String())
		}
	}
	return fmt.Sprintf("%s#%s: %v", file, docID, err)
}
