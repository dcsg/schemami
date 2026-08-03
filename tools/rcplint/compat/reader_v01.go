// Package compat freezes the rcp-v0.1 decode surface (DS-PR-009).
//
// The structs below are a HAND TRANSCRIPTION of the schema shipped at
// tag rcp-v0.1 (commit pinned in PinnedV01SHA) — exactly its property
// surface, nothing newer. They must never gain fields: their job is to
// prove that documents authored under any later core still decode for
// a v0.1-era snapshot consumer (unknown-field tolerance is yaml.v3's
// default and part of the contract). TestDecodeCompatStructSurface-
// MatchesPinnedSchema mechanically diffs these fields against
// `git show <pin>` so a silent edit here fails loudly.
package compat

import (
	"fmt"
	"strings"

	yaml "gopkg.in/yaml.v3"
)

// PinnedV01SHA is the commit the rcp-v0.1 tag pointed to when this
// package was written. The transcription check reads the schema at
// exactly this SHA — never at the moving tag.
const PinnedV01SHA = "25f31f62260450ed961c67e39ff1c7efd9b53755"

// RecipeV01 is the v0.1 recipe surface ($defs/recipe at the pin).
type RecipeV01 struct {
	RCP            any             `yaml:"rcp"`
	ID             string          `yaml:"id"`
	Kind           string          `yaml:"kind"`
	Name           any             `yaml:"name"`
	Version        any             `yaml:"version"`
	Lang           string          `yaml:"lang"`
	Description    any             `yaml:"description"`
	Profile        any             `yaml:"profile"`
	Taxonomy       any             `yaml:"taxonomy"`
	Tags           []string        `yaml:"tags"`
	Origin         any             `yaml:"origin"`
	Licence        any             `yaml:"licence"`
	Provenance     any             `yaml:"provenance"`
	Lineage        any             `yaml:"lineage"`
	Import         any             `yaml:"import"`
	Serving        any             `yaml:"serving"`
	Bases          map[string]any  `yaml:"bases"`
	Ingredients    []IngredientV01 `yaml:"ingredients"`
	Components     []yaml.Node     `yaml:"components"`
	Steps          []StepV01       `yaml:"steps"`
	Options        []any           `yaml:"options"`
	ExecutionModes []any           `yaml:"execution_modes"`
	Equipment      []any           `yaml:"equipment"`
	Substitutions  []any           `yaml:"substitutions"`
	Scaling        any             `yaml:"scaling"`
	Maintenance    any             `yaml:"maintenance"`
	MinBatch       any             `yaml:"min_batch"`
	FeedRatio      any             `yaml:"feed_ratio"`
	CarriedOver    any             `yaml:"carried_over"`
	Derived        any             `yaml:"derived"`
}

// IngredientV01 is the v0.1 ingredient row ($defs/ingredient at the pin).
type IngredientV01 struct {
	ID           string   `yaml:"id"`
	Item         any      `yaml:"item"`
	Raw          any      `yaml:"raw"`
	Roles        []string `yaml:"roles"`
	Amount       any      `yaml:"amount"`
	Prep         any      `yaml:"prep"`
	Optional     any      `yaml:"optional"`
	Component    any      `yaml:"component"`
	Constraints  []any    `yaml:"constraints"`
	RemovedAfter any      `yaml:"removed_after"`
	Note         any      `yaml:"note"`
}

// StepV01 is the v0.1 step ($defs/step at the pin).
type StepV01 struct {
	ID          string `yaml:"id"`
	Primitive   any    `yaml:"primitive"`
	Title       any    `yaml:"title"`
	Body        any    `yaml:"body"`
	Section     any    `yaml:"section"`
	Track       string `yaml:"track"`
	After       []any  `yaml:"after"`
	Uses        []any  `yaml:"uses"`
	Produces    string `yaml:"produces"`
	Duration    any    `yaml:"duration"`
	Rest        any    `yaml:"rest"`
	Until       any    `yaml:"until"`
	Cues        []any  `yaml:"cues"`
	Temperature any    `yaml:"temperature"`
	Params      any    `yaml:"params"`
	Equipment   []any  `yaml:"equipment"`
	Constraints []any  `yaml:"constraints"`
	Triggers    []any  `yaml:"triggers"`
	Repeat      any    `yaml:"repeat"`
	Scaling     any    `yaml:"scaling"`
	ScalesWith  any    `yaml:"scales_with"`
	When        any    `yaml:"when"`
	Media       []any  `yaml:"media"`
	Source      any    `yaml:"source"`
	Note        any    `yaml:"note"`
}

// DecodeDocuments reads a (possibly multi-document) YAML stream through
// the frozen surface. Unknown fields are tolerated by decoder default —
// that tolerance IS the compatibility contract, so no KnownFields(true).
func DecodeDocuments(raw []byte) ([]RecipeV01, error) {
	dec := yaml.NewDecoder(strings.NewReader(string(raw)))
	var docs []RecipeV01
	for i := 0; ; i++ {
		var r RecipeV01
		if err := dec.Decode(&r); err != nil {
			if err.Error() == "EOF" {
				break
			}
			return nil, fmt.Errorf("v0.1 reader: doc %d: %w", i, err)
		}
		docs = append(docs, r)
	}
	return docs, nil
}
