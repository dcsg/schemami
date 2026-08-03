package main

// Calculus conformance-vector writer (calc-vectors subcommand).
// rcplint's calc package is the ORACLE: inputs are declared here
// (synthetic, or loaded from the HARD-CODED allowlist), expected values
// are COMPUTED by the reference implementation, never hand-authored.
// Records carry edge_classes and the SPEC rule ids (rules[]) they
// exercise. Output is deterministic: stable case order, sorted JSON keys
// (Go's json marshals maps key-sorted), byte-identical across runs.

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/dcsg/rcp/tools/rcplint/calc"
)

// calcVectorAllowlist mirrors the L1 exporter's posture (security
// pre-flight): document-derived inputs may come ONLY from these roots.
var calcVectorAllowlist = []string{"examples", "tools/rcplint/testdata"}

type calcVector struct {
	Function    string   `json:"function"`
	Name        string   `json:"name"`
	EdgeClasses []string `json:"edge_classes"`
	Rules       []string `json:"rules"`
	Input       any      `json:"input"`
	Expected    any      `json:"expected"`
}

func runCalcVectors(root, outDir string) int {
	loadAllowed := func(rel string) (map[string]any, bool) {
		if strings.Contains(rel, "private/") {
			fmt.Fprintf(os.Stderr, "calc-vectors: REFUSING private path %s\n", rel)
			return nil, false
		}
		allowed := false
		for _, dir := range calcVectorAllowlist {
			if strings.HasPrefix(rel, dir+"/") {
				allowed = true
			}
		}
		if !allowed {
			fmt.Fprintf(os.Stderr, "calc-vectors: path %s outside the allowlist\n", rel)
			return nil, false
		}
		docs, err := LoadDocuments(filepath.Join(root, rel))
		if err != nil || len(docs) == 0 {
			fmt.Fprintf(os.Stderr, "calc-vectors: load %s: %v\n", rel, err)
			return nil, false
		}
		m, ok := docs[0].Value.(map[string]any)
		return m, ok
	}

	chucruteFixed := map[string]any{
		"bases": map[string]any{"veg": map[string]any{"sum": "ingredients", "where": map[string]any{"roles": []any{"substrate"}}}},
		"ingredients": []any{
			map[string]any{"id": "cabbage", "amount": map[string]any{"value": 1000.0, "unit": "g"}, "roles": []any{"substrate"}},
			map[string]any{"id": "salt", "amount": map[string]any{"value": 20.0, "unit": "g", "scaling": "fixed"}, "roles": []any{"salt"},
				"constraints": []any{map[string]any{"min_ratio": 0.018, "of": "veg", "severity": "critical",
					"reason": map[string]any{"pt": "Sal abaixo de 1,8% não preserva.", "en": "Salt below 1.8% does not preserve."}}}},
		},
	}
	chucruteRatio := map[string]any{
		"bases": map[string]any{"veg": map[string]any{"sum": "ingredients", "where": map[string]any{"roles": []any{"substrate"}}}},
		"ingredients": []any{
			map[string]any{"id": "cabbage", "amount": map[string]any{"value": 1000.0, "unit": "g"}, "roles": []any{"substrate"}},
			map[string]any{"id": "salt", "amount": map[string]any{"ratio": 0.02, "of": "veg"}, "roles": []any{"salt"},
				"constraints": []any{map[string]any{"min_ratio": 0.018, "of": "veg", "severity": "critical",
					"reason": map[string]any{"pt": "Sal abaixo de 1,8% não preserva.", "en": "Salt below 1.8% does not preserve."}}}},
		},
	}
	mixedBasis := map[string]any{
		"bases": map[string]any{"liq": map[string]any{"sum": "ingredients", "where": map[string]any{"roles": []any{"hydration"}}}},
		"ingredients": []any{
			map[string]any{"id": "water", "amount": map[string]any{"value": 500.0, "unit": "g"}, "roles": []any{"hydration"}},
			map[string]any{"id": "milk", "amount": map[string]any{"value": 200.0, "unit": "ml"}, "roles": []any{"hydration"}},
		},
	}
	inclComponents := map[string]any{
		"bases": map[string]any{"flour": map[string]any{"sum": "ingredients", "where": map[string]any{"roles": []any{"flour"}}, "include_components": true}},
		"ingredients": []any{map[string]any{"id": "t65", "amount": map[string]any{"value": 6000.0, "unit": "g"}, "roles": []any{"flour"}}},
		"components": []any{map[string]any{"id": "mv", "maintenance": true, "ingredients": []any{
			map[string]any{"id": "mv-flour", "amount": map[string]any{"value": 1500.0, "unit": "g"}, "roles": []any{"flour"}}}}},
	}
	maintenanceDoc := map[string]any{
		"components": []any{map[string]any{"id": "culture", "maintenance": true,
			"min_batch": map[string]any{"value": 100.0, "unit": "g"}, "ingredients": []any{}}},
		"ingredients": []any{map[string]any{"id": "x", "amount": map[string]any{"value": 1.0, "unit": "g"}}},
	}
	guardDoc := map[string]any{
		"options": []any{
			map[string]any{"id": "autolise", "kind": "toggle", "default": true},
			map[string]any{"id": "oven", "kind": "choice", "choices": []any{"deck", "home"}, "default": "deck"},
		},
		"steps": []any{
			map[string]any{"id": "s1"},
			map[string]any{"id": "s2", "when": map[string]any{"option": "autolise"}},
			map[string]any{"id": "s3", "when": map[string]any{"not": map[string]any{"option": "autolise"}}},
			map[string]any{"id": "s4", "when": map[string]any{"option": "oven:home"}},
			map[string]any{"id": "s5"},
		},
	}
	schedDoc := map[string]any{"steps": []any{
		map[string]any{"id": "s1", "duration": map[string]any{"min": "10m", "target": "12m", "max": "15m"}},
		map[string]any{"id": "s2", "after": []any{"s1"}, "duration": map[string]any{"target": "30m"}},
	}}

	enforce := func(doc map[string]any, k float64) any {
		f := &calc.Findings{}
		calc.EnforceConstraints("vec", doc, k, f)
		return map[string]any{"refusals": emptyIfNil(f.Refusals), "warnings": emptyIfNil(f.Warnings)}
	}
	guardIDs := func(doc map[string]any, sel calc.Selection) any {
		steps, err := calc.SelectGuardPath(doc, sel)
		if err != nil {
			return map[string]any{"error": true}
		}
		var ids []string
		for _, s := range steps {
			ids = append(ids, s["id"].(string))
		}
		return map[string]any{"active": ids}
	}
	schedOut := func(doc map[string]any, resolved map[string]map[string]any) any {
		entries, refusals := calc.Schedule(doc, resolved)
		var out []map[string]any
		for _, e := range entries {
			out = append(out, map[string]any{
				"item":     e.Item,
				"start":    map[string]any{"min": e.Start.Min, "target": e.Start.Target, "max": e.Start.Max},
				"duration": map[string]any{"min": e.Duration.Min, "target": e.Duration.Target, "max": e.Duration.Max},
			})
		}
		return map[string]any{"entries": out, "refusals": emptyIfNil(refusals)}
	}

	var vectors []calcVector
	add := func(fn, name string, classes, rules []string, input, expected any) {
		vectors = append(vectors, calcVector{Function: fn, Name: name, EdgeClasses: classes, Rules: rules, Input: input, Expected: expected})
	}

	// fixedQuantityTransform
	add("fixedQuantityTransform", "fixed-holds", []string{"fixed-quantity-refusals"}, []string{"R-FIXED-1", "R-MODEL-1"},
		map[string]any{"amount": map[string]any{"value": 20.0, "unit": "g", "scaling": "fixed"}, "k": 2.0},
		calc.FixedQuantityTransform(map[string]any{"value": 20.0, "unit": "g", "scaling": "fixed"}, 2))
	add("fixedQuantityTransform", "scalable-scales", []string{"unit-boundaries"}, []string{"R-MODEL-1"},
		map[string]any{"amount": map[string]any{"value": 1000.0, "unit": "g"}, "k": 2.0},
		calc.FixedQuantityTransform(map[string]any{"value": 1000.0, "unit": "g"}, 2))
	add("fixedQuantityTransform", "ratio-invariant", []string{"ratio-invariance"}, []string{"R-MODEL-2"},
		map[string]any{"amount": map[string]any{"ratio": 0.02, "of": "veg"}, "k": 7.0},
		calc.FixedQuantityTransform(map[string]any{"ratio": 0.02, "of": "veg"}, 7))

	// scale
	add("scale", "uniform-chucrute-06", []string{"ratio-invariance", "unit-boundaries"}, []string{"R-SCALE-4", "R-MODEL-1", "R-MODEL-2"},
		map[string]any{"doc": chucruteRatio, "k": 0.6}, calc.Scale(chucruteRatio, 0.6))
	add("scale", "invalid-factor-zero", []string{"unit-boundaries"}, []string{"R-MODEL-5"},
		map[string]any{"doc": chucruteRatio, "k": 0.0}, calc.Scale(chucruteRatio, 0))

	// resolveBases
	add("resolveBases", "simple-role-sum", []string{"unit-boundaries"}, []string{"R-BASIS-1"},
		map[string]any{"doc": chucruteRatio, "k": 1.0}, calc.ResolveBases(chucruteRatio, 1))
	add("resolveBases", "mixed-units-unresolvable", []string{"unit-boundaries"}, []string{"R-BASIS-4"},
		map[string]any{"doc": mixedBasis, "k": 1.0}, calc.ResolveBases(mixedBasis, 1))
	add("resolveBases", "include-components-decomposes", []string{"unit-boundaries", "min-batch"}, []string{"R-BASIS-2", "R-SCALE-2"},
		map[string]any{"doc": inclComponents, "k": 2.0}, calc.ResolveBases(inclComponents, 2))

	// selectGuardPath
	add("selectGuardPath", "defaults", []string{"guard-combinations"}, []string{"R-GUARD-1"},
		map[string]any{"doc": guardDoc, "selection": map[string]any{}},
		guardIDs(guardDoc, calc.Selection{}))
	add("selectGuardPath", "toggle-off-choice-home", []string{"guard-combinations"}, []string{"R-GUARD-1"},
		map[string]any{"doc": guardDoc, "selection": map[string]any{"autolise": false, "oven": "home"}},
		guardIDs(guardDoc, calc.Selection{Options: map[string]any{"autolise": false, "oven": "home"}}))
	add("selectGuardPath", "unsatisfiable", []string{"guard-combinations"}, []string{"R-GUARD-2"},
		map[string]any{"doc": guardDoc, "selection": map[string]any{"nope": true}},
		guardIDs(guardDoc, calc.Selection{Options: map[string]any{"nope": true}}))

	// enforceConstraints
	add("enforceConstraints", "fixed-salt-upscale-refused", []string{"fixed-quantity-refusals"}, []string{"R-ENFORCE-1", "R-ENFORCE-2", "R-ENFORCE-4", "R-BASIS-3"},
		map[string]any{"doc": chucruteFixed, "k": 2.0}, enforce(chucruteFixed, 2))
	add("enforceConstraints", "identity-accepted", []string{"fixed-quantity-refusals"}, []string{"R-SCALE-4"},
		map[string]any{"doc": chucruteFixed, "k": 1.0}, enforce(chucruteFixed, 1))
	add("enforceConstraints", "ratio-invariant-accepted", []string{"ratio-invariance"}, []string{"R-MODEL-2", "R-ENFORCE-2"},
		map[string]any{"doc": chucruteRatio, "k": 0.6}, enforce(chucruteRatio, 0.6))

	// minBatchFloor
	add("minBatchFloor", "draw-below-floor", []string{"min-batch"}, []string{"R-MINBATCH-1", "R-MINBATCH-2"},
		map[string]any{"doc": maintenanceDoc, "k": 0.05}, enforce(maintenanceDoc, 0.05))
	add("minBatchFloor", "upscale-no-floor", []string{"min-batch"}, []string{"R-MINBATCH-2"},
		map[string]any{"doc": maintenanceDoc, "k": 3.0}, enforce(maintenanceDoc, 3))

	// reestimateDurations
	add("reestimateDurations", "identity", []string{"timeline-arithmetic"}, []string{"R-DUR-1"},
		map[string]any{"window": map[string]any{"min": "25m", "target": "30m", "max": "35m"}, "k": 2.0},
		calc.ReestimateDurations(map[string]any{"min": "25m", "target": "30m", "max": "35m"}, 2))

	// timeline from documents (allowlisted)
	if entremet, ok := loadAllowed("tools/rcplint/testdata/calc/entremet.rcp.yaml"); ok {
		add("readingOrder", "entremet", []string{"timeline-arithmetic"}, []string{"R-ORDER-1", "R-ORDER-2"},
			map[string]any{"source": "tools/rcplint/testdata/calc/entremet.rcp.yaml"}, calc.ReadingOrder(entremet))
		var lanes []map[string]string
		for _, ts := range calc.Interleave(entremet) {
			lanes = append(lanes, map[string]string{"id": ts.ID, "track": ts.Track})
		}
		add("interleave", "entremet-lanes", []string{"timeline-arithmetic"}, []string{"R-INTERLEAVE-1", "R-INTERLEAVE-3"},
			map[string]any{"source": "tools/rcplint/testdata/calc/entremet.rcp.yaml"}, lanes)
		add("schedule", "entremet-prerequisites", []string{"timeline-arithmetic"}, []string{"R-SCHED-1", "R-SCHED-2", "R-SCHED-4"},
			map[string]any{"source": "tools/rcplint/testdata/calc/entremet.rcp.yaml"}, schedOut(entremet, nil))
	} else {
		return 2
	}
	add("schedule", "window-propagation", []string{"timeline-arithmetic"}, []string{"R-SCHED-1"},
		map[string]any{"doc": schedDoc}, schedOut(schedDoc, nil))

	// R-SCHED-5: a referenced preparation is placed exactly as an inline
	// one — the numbers of WE-SCHED-3.
	refParent := map[string]any{
		"components": []any{map[string]any{"id": "prep", "ref": "prep-doc"}},
		"steps": []any{map[string]any{"id": "assemble", "uses": []any{"prep"},
			"duration": map[string]any{"target": "10m"}}},
	}
	refBody := map[string]any{"steps": []any{map[string]any{"id": "p1",
		"duration": map[string]any{"min": "30m", "target": "45m", "max": "1h"}}}}
	add("schedule", "referenced-placement-resolved", []string{"referenced-placement", "timeline-arithmetic"},
		[]string{"R-SCHED-5", "R-SCHED-2"},
		map[string]any{"doc": refParent, "resolved": map[string]any{"prep-doc": refBody}},
		schedOut(refParent, map[string]map[string]any{"prep-doc": refBody}))
	add("schedule", "referenced-placement-unresolvable", []string{"referenced-placement"},
		[]string{"R-SCHED-5"},
		map[string]any{"doc": refParent, "resolved": map[string]any{}},
		schedOut(refParent, nil))

	// write per-function files, stable order
	byFn := map[string][]calcVector{}
	for _, v := range vectors {
		byFn[v.Function] = append(byFn[v.Function], v)
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		fmt.Fprintln(os.Stderr, "calc-vectors:", err)
		return 2
	}
	var fns []string
	for fn := range byFn {
		fns = append(fns, fn)
	}
	sort.Strings(fns)
	n := 0
	for _, fn := range fns {
		out, err := json.MarshalIndent(byFn[fn], "", "  ")
		if err != nil {
			fmt.Fprintln(os.Stderr, "calc-vectors:", err)
			return 2
		}
		if strings.Contains(string(out), "private/") {
			fmt.Fprintln(os.Stderr, "calc-vectors: private content detected — refusing to write")
			return 2
		}
		if err := os.WriteFile(filepath.Join(outDir, fn+".json"), append(out, '\n'), 0o644); err != nil {
			fmt.Fprintln(os.Stderr, "calc-vectors:", err)
			return 2
		}
		n += len(byFn[fn])
	}
	fmt.Printf("calc-vectors: %d vectors across %d functions written to %s\n", n, len(fns), outDir)
	return 0
}

func emptyIfNil(ss []string) []string {
	if ss == nil {
		return []string{}
	}
	return ss
}
