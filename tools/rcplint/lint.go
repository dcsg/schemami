package main

// Layer-2 semantic linter (CMP-VAL-002; SR-VAL-002; DS-VAL-004 adjusted).
// Enforces what JSON Schema cannot: reference resolution, DAG integrity per
// guard combination, cycles, orphan intermediates, unversioned pins, the
// kind-prefix convention (DECISIONS #23), safety single-sourcing, unused
// ingredients (warning), item:null unresolved imports (warning), registry
// filename=id (SAC-REG-001), and vocabulary membership.

import (
	"fmt"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

type Lint struct {
	Errors   []string
	Warnings []string
}

func (l *Lint) errf(f string, a ...any)  { l.Errors = append(l.Errors, fmt.Sprintf(f, a...)) }
func (l *Lint) warnf(f string, a ...any) { l.Warnings = append(l.Warnings, fmt.Sprintf(f, a...)) }

var prefixRe = regexp.MustCompile(`^(ingredient|primitive|equipment)\.[a-z0-9][a-z0-9.-]*$`)

type Registry struct {
	Ingredients map[string]bool
	Primitives  map[string]bool
	Equipment   map[string]bool
	Tests       map[string]bool
	Stages      map[string]bool
	Techniques  map[string]bool
	Roles       map[string]bool
}

func loadRegistry(root string) (*Registry, *Lint, error) {
	r := &Registry{Ingredients: map[string]bool{}, Primitives: map[string]bool{}, Equipment: map[string]bool{},
		Tests: map[string]bool{}, Stages: map[string]bool{}, Techniques: map[string]bool{}, Roles: map[string]bool{}}
	l := &Lint{}
	for kind, set := range map[string]map[string]bool{"ingredient": r.Ingredients, "primitive": r.Primitives, "equipment": r.Equipment} {
		glob, _ := filepath.Glob(filepath.Join(root, "registry/entries", kind, "*.yaml"))
		for _, p := range glob {
			docs, err := LoadDocuments(p)
			if err != nil || len(docs) != 1 {
				l.errf("registry %s: unreadable", relPath(root, p))
				continue
			}
			id := docs[0].ID
			// SAC-REG-001: file identity = entry identity
			if strings.TrimSuffix(filepath.Base(p), ".yaml") != id {
				l.errf("registry %s: filename != id %q (SAC-REG-001)", relPath(root, p), id)
			}
			if !prefixRe.MatchString(id) {
				l.errf("registry %s: id %q violates kind-prefix convention (DECISIONS #23)", relPath(root, p), id)
			}
			set[id] = true
		}
	}
	for file, set := range map[string]map[string]bool{"endpoint-tests.yaml": r.Tests, "temperature-stages.yaml": r.Stages} {
		docs, err := LoadDocuments(filepath.Join(root, "registry/vocab", file))
		if err == nil && len(docs) == 1 {
			m := docs[0].Value.(map[string]any)
			if ts, ok := m["tests"].([]any); ok {
				for _, t := range ts {
					set[fmt.Sprintf("%v", t)] = true
				}
			}
			if ss, ok := m["stages"].([]any); ok {
				for _, s := range ss {
					if sm, ok := s.(map[string]any); ok {
						set[fmt.Sprintf("%v", sm["id"])] = true
					}
				}
			}
		}
	}
	// Techniques are the fourth governed registry kind (DECISIONS #25;
	// PLAN-rcp-v02 Phase 3): membership comes from entries, the interim
	// vocab list is retired.
	techGlob, _ := filepath.Glob(filepath.Join(root, "registry/entries/technique/*.yaml"))
	for _, tp := range techGlob {
		if docs, err := LoadDocuments(tp); err == nil && len(docs) == 1 {
			if tm, ok := docs[0].Value.(map[string]any); ok {
				r.Techniques[fmt.Sprintf("%v", tm["id"])] = true
			}
		}
	}
	// core role enum — single source for registry role membership
	core, err := LoadDocuments(filepath.Join(root, "schema/rcp-core-v1.schema.json"))
	if err == nil && len(core) == 1 {
		if m, ok := core[0].Value.(map[string]any); ok {
			if defs, ok := m["$defs"].(map[string]any); ok {
				if role, ok := defs["role"].(map[string]any); ok {
					if enum, ok := role["enum"].([]any); ok {
						for _, v := range enum {
							r.Roles[fmt.Sprintf("%v", v)] = true
						}
					}
				}
			}
		}
	}
	return r, l, err
}

// lintDocument checks one recipe document (and its inline components).
func lintDocument(d Document, reg *Registry, siblings map[string]map[string]any, l *Lint) {
	m, ok := d.Value.(map[string]any)
	if !ok {
		return
	}
	loc := fmt.Sprintf("%s#%s", filepath.Base(d.File), d.ID)
	lintRecipeScope(loc, m, nil, reg, siblings, l)
}

func lintRecipeScope(loc string, m map[string]any, parentBases map[string]bool, reg *Registry, siblings map[string]map[string]any, l *Lint) {
	bases := map[string]bool{}
	for k := range parentBases {
		bases[k] = true
	}
	if bm, ok := m["bases"].(map[string]any); ok {
		for k := range bm {
			bases[k] = true
		}
	}
	// execution-mode dilution declares no basis; adds_ingredient introduces ids
	ingIDs := map[string]bool{}
	compIDs := map[string]bool{}
	produced := map[string]bool{}
	ings, _ := m["ingredients"].([]any)
	for _, iv := range ings {
		im, ok := iv.(map[string]any)
		if !ok {
			continue
		}
		if id, ok := im["id"].(string); ok {
			ingIDs[id] = true
		}
	}
	if ems, ok := m["execution_modes"].([]any); ok {
		for _, ev := range ems {
			if em, ok := ev.(map[string]any); ok {
				if tech, ok := em["technique"].(string); ok && !reg.Techniques[tech] {
					l.errf("%s: execution mode %q technique %q has no entry under registry/entries/technique/ (fourth registry kind, DECISIONS #25)", loc, em["id"], tech)
				}
				if ai, ok := em["adds_ingredient"].(map[string]any); ok {
					if id, ok := ai["id"].(string); ok {
						ingIDs[id] = true
					}
					lintIngredient(loc, ai, bases, reg, l)
				}
			}
		}
	}
	comps, _ := m["components"].([]any)
	for _, cv := range comps {
		cm, ok := cv.(map[string]any)
		if !ok {
			continue
		}
		id, _ := cm["id"].(string)
		compIDs[id] = true
		if ref, isRef := cm["ref"].(string); isRef {
			// unversioned pin: version pinned but target declares no version
			if _, pinned := cm["version"]; pinned {
				if target, known := siblings[ref]; known {
					if _, has := target["version"]; !has {
						l.errf("%s: component %q pins version against target %q which declares no version", loc, id, ref)
					}
				}
			}
		} else {
			lintRecipeScope(loc+"/"+id, cm, bases, reg, siblings, l)
		}
	}
	for _, iv := range ings {
		im, ok := iv.(map[string]any)
		if !ok {
			continue
		}
		lintIngredient(loc, im, bases, reg, l)
		if c, ok := im["component"].(string); ok && !compIDs[c] {
			l.errf("%s: ingredient %q references unknown component %q", loc, im["id"], c)
		}
	}
	lintSteps(loc, m, ingIDs, compIDs, produced, reg, bases, l)
	lintSubstitutions(loc, m, ingIDs, reg, bases, l)
	lintProfileSingleSourcing(loc, m, l)
	lintUnused(loc, m, ingIDs, compIDs, l)
	lintServing(loc, m, reg, l)
}

func lintIngredient(loc string, im map[string]any, bases map[string]bool, reg *Registry, l *Lint) {
	id, _ := im["id"].(string)
	switch item := im["item"].(type) {
	case nil:
		l.warnf("%s: ingredient %q has item: null — unresolved import (DS-PR-003); map it to a registry entry", loc, id)
	case string:
		if !prefixRe.MatchString(item) {
			l.errf("%s: ingredient %q item %q is not kind-prefixed (DECISIONS #23)", loc, id, item)
		} else if !reg.Ingredients[item] {
			l.errf("%s: ingredient %q references missing registry entry %q — entries are never minted outside governance", loc, id, item)
		}
	}
	checkBasisRefs(loc, id, im, bases, l)
	if cs, ok := im["constraints"].([]any); ok {
		for _, cv := range cs {
			if cm, ok := cv.(map[string]any); ok {
				if of, ok := cm["of"].(string); ok && !bases[of] {
					l.errf("%s: ingredient %q constraint `of: %s` references undeclared basis", loc, id, of)
				}
			}
		}
	}
}

func checkBasisRefs(loc, id string, m map[string]any, bases map[string]bool, l *Lint) {
	if am, ok := m["amount"].(map[string]any); ok {
		if of, ok := am["of"].(string); ok && !bases[of] {
			l.errf("%s: ingredient %q amount `of: %s` references undeclared basis", loc, id, of)
		}
	}
	if dm, ok := m["dilution"].(map[string]any); ok {
		if of, ok := dm["of"].(string); ok && !bases[of] {
			l.errf("%s: %q dilution `of: %s` references undeclared basis", loc, id, of)
		}
	}
}

// lintSteps: primitive refs, equipment refs, uses/after resolution, vocab
// membership, DAG integrity per guard combination.
func lintSteps(loc string, m map[string]any, ingIDs, compIDs, produced map[string]bool, reg *Registry, bases map[string]bool, l *Lint) {
	steps, _ := m["steps"].([]any)
	stepIDs := map[string]bool{}
	for _, sv := range steps {
		if sm, ok := sv.(map[string]any); ok {
			if id, ok := sm["id"].(string); ok {
				stepIDs[id] = true
			}
			if p, ok := sm["produces"].(string); ok {
				produced[p] = true
			}
		}
	}
	for _, sv := range steps {
		sm, ok := sv.(map[string]any)
		if !ok {
			continue
		}
		sid, _ := sm["id"].(string)
		if pm, ok := sm["primitive"].(map[string]any); ok {
			if pid, ok := pm["id"].(string); ok {
				if !prefixRe.MatchString(pid) {
					l.errf("%s: step %q primitive %q is not kind-prefixed (DECISIONS #23)", loc, sid, pid)
				} else if !reg.Primitives[pid] {
					l.errf("%s: step %q references missing primitive %q", loc, sid, pid)
				}
			}
		}
		if eq, ok := sm["equipment"].([]any); ok {
			for _, ev := range eq {
				if e, ok := ev.(string); ok {
					if !prefixRe.MatchString(e) {
						l.errf("%s: step %q equipment %q is not kind-prefixed (DECISIONS #23)", loc, sid, e)
					} else if !reg.Equipment[e] {
						l.errf("%s: step %q references missing equipment %q", loc, sid, e)
					}
				}
			}
		}
		if us, ok := sm["uses"].([]any); ok {
			for _, uv := range us {
				if u, ok := uv.(string); ok && !ingIDs[u] && !compIDs[u] && !produced[u] {
					l.errf("%s: step %q uses unknown %q (not an ingredient, component, or produced intermediate)", loc, sid, u)
				}
			}
		}
		if afters, ok := sm["after"].([]any); ok {
			for _, av := range afters {
				if a, ok := av.(string); ok && !stepIDs[a] && !compIDs[a] && !produced[a] {
					l.errf("%s: step %q after references unknown %q (not a step, component, or produced intermediate)", loc, sid, a)
				}
			}
		}
		if until, ok := sm["until"].([]any); ok {
			for _, uv := range until {
				if um, ok := uv.(map[string]any); ok {
					if tst, ok := um["test"].(string); ok && !reg.Tests[tst] {
						l.errf("%s: step %q endpoint test %q not in registry/vocab/endpoint-tests.yaml", loc, sid, tst)
					}
				}
			}
		}
		if tm, ok := sm["temperature"].(map[string]any); ok {
			if st, ok := tm["stage"].(string); ok && !reg.Stages[st] {
				l.errf("%s: step %q temperature stage %q not in registry/vocab/temperature-stages.yaml", loc, sid, st)
			}
		}
		if trs, ok := sm["triggers"].([]any); ok {
			for _, tv := range trs {
				if tmm, ok := tv.(map[string]any); ok {
					if act, ok := tmm["action"].(string); ok {
						if !prefixRe.MatchString(act) {
							l.errf("%s: step %q trigger action %q is not kind-prefixed (DECISIONS #23)", loc, sid, act)
						} else if !reg.Primitives[act] {
							l.errf("%s: step %q trigger action references missing primitive %q", loc, sid, act)
						}
					}
				}
			}
		}
	}
	lintDAG(loc, m, steps, stepIDs, compIDs, produced, l)
}

// lintDAG enumerates guard combinations (options × execution modes) and
// checks each active subgraph for unreachable dependencies and cycles.
func lintDAG(loc string, m map[string]any, steps []any, stepIDs, compIDs, produced map[string]bool, l *Lint) {
	var optIDs []string
	if opts, ok := m["options"].([]any); ok {
		for _, ov := range opts {
			if om, ok := ov.(map[string]any); ok {
				if id, ok := om["id"].(string); ok {
					optIDs = append(optIDs, id)
				}
			}
		}
	}
	if len(optIDs) > 3 {
		l.errf("%s: %d options exceed the soft cap of 3 (research 07 B5) — guard enumeration unbounded", loc, len(optIDs))
		return
	}
	var modes []string
	if ems, ok := m["execution_modes"].([]any); ok {
		for _, ev := range ems {
			if em, ok := ev.(map[string]any); ok {
				if id, ok := em["id"].(string); ok {
					modes = append(modes, id)
				}
			}
		}
	}
	if len(modes) == 0 {
		modes = []string{""}
	}
	for combo := 0; combo < 1<<len(optIDs); combo++ {
		optOn := map[string]bool{}
		for i, o := range optIDs {
			optOn[o] = combo&(1<<i) != 0
		}
		for _, mode := range modes {
			active := map[string]map[string]any{}
			for _, sv := range steps {
				sm, ok := sv.(map[string]any)
				if !ok {
					continue
				}
				if stepActive(sm, optOn, mode) {
					if id, ok := sm["id"].(string); ok {
						active[id] = sm
					}
				}
			}
			// active step depending on an inactive step = disconnected path
			for sid, sm := range active {
				if afters, ok := sm["after"].([]any); ok {
					for _, av := range afters {
						a, ok := av.(string)
						if !ok {
							continue
						}
						if stepIDs[a] && active[a] == nil {
							l.errf("%s: guard combination {options: %v, mode: %q}: step %q depends on inactive step %q — disconnected path (AC-VAL-002-3)", loc, optOn, mode, sid, a)
						}
					}
				}
			}
			// cycle detection over active steps
			state := map[string]int{}
			var visit func(string) bool
			visit = func(sid string) bool {
				if state[sid] == 1 {
					return false
				}
				if state[sid] == 2 {
					return true
				}
				state[sid] = 1
				if sm := active[sid]; sm != nil {
					if afters, ok := sm["after"].([]any); ok {
						for _, av := range afters {
							if a, ok := av.(string); ok && active[a] != nil {
								if !visit(a) {
									return false
								}
							}
						}
					}
				}
				state[sid] = 2
				return true
			}
			for sid := range active {
				if !visit(sid) {
					l.errf("%s: guard combination {options: %v, mode: %q}: step dependency cycle through %q — non-terminating (AC-VAL-002-3)", loc, optOn, mode, sid)
					break
				}
			}
		}
	}
}

func stepActive(sm map[string]any, optOn map[string]bool, mode string) bool {
	wm, ok := sm["when"].(map[string]any)
	if !ok {
		return true
	}
	if em, ok := wm["execution_mode"].(string); ok && mode != "" && em != mode {
		return false
	}
	if ov, has := wm["option"]; has {
		switch o := ov.(type) {
		case string:
			if !optOn[o] {
				return false
			}
		case map[string]any:
			for name, want := range o {
				if wb, ok := want.(bool); ok && optOn[name] != wb {
					return false
				}
			}
		}
	}
	return true
}

func lintSubstitutions(loc string, m map[string]any, ingIDs map[string]bool, reg *Registry, bases map[string]bool, l *Lint) {
	subs, _ := m["substitutions"].([]any)
	for _, sv := range subs {
		sm, ok := sv.(map[string]any)
		if !ok {
			continue
		}
		if w, ok := sm["with"].(string); ok && strings.Contains(w, ".") {
			if !prefixRe.MatchString(w) {
				l.errf("%s: substitution `with: %s` is not kind-prefixed (DECISIONS #23)", loc, w)
			} else if !reg.Ingredients[w] {
				l.errf("%s: substitution references missing registry entry %q", loc, w)
			}
		}
		if ras, ok := sm["requires_additions"].([]any); ok {
			for _, rv := range ras {
				if rm, ok := rv.(map[string]any); ok {
					lintIngredient(loc, rm, bases, reg, l)
				}
			}
		}
	}
}

// lintProfileSingleSourcing (AC-PR-002-2 / DS-PR-004): profile blocks
// reference safety by ingredient id, never restate numeric bounds.
var numericBoundKey = regexp.MustCompile(`(^|_)(min|max|ph|pct|gate)(_|$)|_(min|max|pct)$|^ph_|_ph$`)

func lintProfileSingleSourcing(loc string, m map[string]any, l *Lint) {
	pm, ok := m["profile"].(map[string]any)
	if !ok {
		return
	}
	var walk func(prefix string, v any)
	walk = func(prefix string, v any) {
		mm, ok := v.(map[string]any)
		if !ok {
			return
		}
		for k, val := range mm {
			switch val.(type) {
			case float64, int:
				if numericBoundKey.MatchString(k) {
					l.errf("%s: profile.%s%s restates a numeric safety bound — bounds live on ingredient constraints or endpoints only (single-sourcing, DS-PR-004)", loc, prefix, k)
				}
			default:
				walk(prefix+k+".", val)
			}
		}
	}
	walk("", pm)
	if refs, ok := pm["safety_refs"].([]any); ok {
		ing := map[string]bool{}
		if ings, ok := m["ingredients"].([]any); ok {
			for _, iv := range ings {
				if im, ok := iv.(map[string]any); ok {
					if id, ok := im["id"].(string); ok {
						ing[id] = true
					}
				}
			}
		}
		for _, rv := range refs {
			if r, ok := rv.(string); ok && !ing[r] {
				l.errf("%s: profile.safety_refs references unknown ingredient id %q", loc, r)
			}
		}
	}
}

// lintUnused (DS-VAL-004 adjusted): ingredient listed but consumed nowhere.
// Warning severity — authored recipes may stage ingredients for options.
func lintUnused(loc string, m map[string]any, ingIDs, compIDs map[string]bool, l *Lint) {
	// carried_over components (massa velha, kombucha starter) have no steps
	// by nature — the carry ingredient IS the component. Not an omission.
	if isTrue(m["carried_over"]) {
		return
	}
	used := map[string]bool{}
	var walk func(v any)
	walk = func(v any) {
		switch t := v.(type) {
		case map[string]any:
			if us, ok := t["uses"].([]any); ok {
				for _, uv := range us {
					if u, ok := uv.(string); ok {
						used[u] = true
					}
				}
			}
			if r, ok := t["replaces"].(string); ok {
				used[r] = true
			}
			for _, vv := range t {
				walk(vv)
			}
		case []any:
			for _, vv := range t {
				walk(vv)
			}
		}
	}
	walk(m)
	for id := range ingIDs {
		if !used[id] {
			l.warnf("%s: ingredient %q is listed but never used by any step or substitution", loc, id)
		}
	}
	// orphan intermediates: a component consumed by no ingredient row,
	// no step uses, and no ingredient carrying `component: <id>`.
	consumed := map[string]bool{}
	for u := range used {
		consumed[u] = true
	}
	if ings, ok := m["ingredients"].([]any); ok {
		for _, iv := range ings {
			if im, ok := iv.(map[string]any); ok {
				if c, ok := im["component"].(string); ok {
					consumed[c] = true
				}
			}
		}
	}
	for id := range compIDs {
		if !consumed[id] {
			l.errf("%s: component %q is produced but never consumed — orphan intermediate", loc, id)
		}
	}
}

func lintServing(loc string, m map[string]any, reg *Registry, l *Lint) {
	sv, ok := m["serving"].(map[string]any)
	if !ok {
		return
	}
	if g, ok := sv["garnish"].(map[string]any); ok {
		if item, ok := g["item"].(string); ok {
			if !prefixRe.MatchString(item) {
				l.errf("%s: serving.garnish.item %q is not kind-prefixed (DECISIONS #23)", loc, item)
			} else if !reg.Ingredients[item] {
				l.errf("%s: serving.garnish references missing entry %q", loc, item)
			}
		}
	}
}

// runLint drives L2 across examples + registry, plus componentRef cycles
// across documents in the same file set.
func runLint(root string) int {
	reg, l, err := loadRegistry(root)
	if err != nil {
		fmt.Println("lint: registry load error:", err)
		return 2
	}
	// role membership of registry entries against the core enum
	glob, _ := filepath.Glob(filepath.Join(root, "registry/entries/ingredient/*.yaml"))
	for _, p := range glob {
		docs, err := LoadDocuments(p)
		if err != nil || len(docs) != 1 {
			continue
		}
		if m, ok := docs[0].Value.(map[string]any); ok {
			if roles, ok := m["roles"].([]any); ok {
				for _, rv := range roles {
					if r, ok := rv.(string); ok && !reg.Roles[r] {
						l.errf("registry %s: role %q not in core role enum", relPath(root, p), r)
					}
				}
			}
		}
	}
	exGlob, _ := filepath.Glob(filepath.Join(root, "examples/*.rcp.yaml"))
	sort.Strings(exGlob)
	siblings := map[string]map[string]any{}
	var all []Document
	for _, path := range exGlob {
		docs, err := LoadDocuments(path)
		if err != nil {
			fmt.Println("lint: load error:", err)
			return 2
		}
		for _, d := range docs {
			all = append(all, d)
			if m, ok := d.Value.(map[string]any); ok {
				siblings[d.ID] = m
			}
		}
	}
	for _, d := range all {
		lintDocument(d, reg, siblings, l)
	}
	lintComponentCycles(siblings, l)
	for _, w := range l.Warnings {
		fmt.Println("WARN", w)
	}
	for _, e := range l.Errors {
		fmt.Println("LINT", e)
	}
	ingGlob, _ := filepath.Glob(filepath.Join(root, "registry/entries/ingredient/*.yaml"))
	for _, f := range auditGrounding(ingGlob) {
		l.errf("grounding audit: %s", f)
	}
	fmt.Printf("lint: %d error(s), %d warning(s)\n", len(l.Errors), len(l.Warnings))
	if len(l.Errors) > 0 {
		return 1
	}
	return 0
}

// lintComponentCycles rejects reference cycles across by-ref components.
func lintComponentCycles(siblings map[string]map[string]any, l *Lint) {
	edges := map[string][]string{}
	for id, m := range siblings {
		if comps, ok := m["components"].([]any); ok {
			for _, cv := range comps {
				if cm, ok := cv.(map[string]any); ok {
					if ref, ok := cm["ref"].(string); ok {
						edges[id] = append(edges[id], ref)
					}
				}
			}
		}
	}
	state := map[string]int{}
	var visit func(string, []string) bool
	visit = func(id string, path []string) bool {
		if state[id] == 1 {
			l.errf("component reference cycle: %s -> %s", strings.Join(path, " -> "), id)
			return false
		}
		if state[id] == 2 {
			return true
		}
		state[id] = 1
		for _, next := range edges[id] {
			if !visit(next, append(path, id)) {
				return false
			}
		}
		state[id] = 2
		return true
	}
	for id := range edges {
		visit(id, nil)
	}
}
