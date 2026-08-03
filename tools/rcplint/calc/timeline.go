package calc

// fn: readingOrder (R-ORDER-1..3), fn: interleave (R-INTERLEAVE-1..3),
// fn: schedule (R-SCHED-1..4) — the timeline derivations. Offsets from
// t0, never wall-clock; durations compute in float64 seconds (N-4).

import (
	"sort"
	"strings"
)

// Window is a duration/offset window in seconds (min ≤ target ≤ max by
// admission; missing bounds inherit target — R-SCHED-1).
type Window struct {
	Min, Target, Max float64
}

func pointWindow(v float64) Window { return Window{v, v, v} }

func (w Window) plus(o Window) Window {
	return Window{w.Min + o.Min, w.Target + o.Target, w.Max + o.Max}
}

// minusConservative implements R-SCHED-2's interval subtraction:
// min = a.Min − b.Max; target = a.Target − b.Target; max = a.Max − b.Min.
func (w Window) minusConservative(b Window) Window {
	return Window{w.Min - b.Max, w.Target - b.Target, w.Max - b.Min}
}

func windowMax(a, b Window) Window {
	m := a
	if b.Min > m.Min {
		m.Min = b.Min
	}
	if b.Target > m.Target {
		m.Target = b.Target
	}
	if b.Max > m.Max {
		m.Max = b.Max
	}
	return m
}

// parseDurationSeconds parses the protocol's compound duration grammar
// ("1h30m", "45s", "2d", decimals allowed) into seconds. Returns ok=false
// on anything outside the grammar (unresolvable, never a guess).
func parseDurationSeconds(s string) (float64, bool) {
	if s == "" {
		return 0, false
	}
	units := map[byte]float64{'s': 1, 'm': 60, 'h': 3600, 'd': 86400, 'w': 604800}
	total := 0.0
	num := ""
	seen := false
	for i := 0; i < len(s); i++ {
		c := s[i]
		if (c >= '0' && c <= '9') || c == '.' {
			num += string(c)
			continue
		}
		mult, ok := units[c]
		if !ok || num == "" {
			return 0, false
		}
		v, ok := parseFloat(num)
		if !ok {
			return 0, false
		}
		total += v * mult
		num = ""
		seen = true
	}
	if num != "" || !seen {
		return 0, false
	}
	return total, true
}

func parseFloat(s string) (float64, bool) {
	// minimal pure float parser: digits with optional single dot
	intPart, fracPart := s, ""
	if i := strings.IndexByte(s, '.'); i >= 0 {
		intPart, fracPart = s[:i], s[i+1:]
		if strings.IndexByte(fracPart, '.') >= 0 {
			return 0, false
		}
	}
	v := 0.0
	for i := 0; i < len(intPart); i++ {
		c := intPart[i]
		if c < '0' || c > '9' {
			return 0, false
		}
		v = v*10 + float64(c-'0')
	}
	scale := 0.1
	for i := 0; i < len(fracPart); i++ {
		c := fracPart[i]
		if c < '0' || c > '9' {
			return 0, false
		}
		v += float64(c-'0') * scale
		scale /= 10
	}
	return v, true
}

// durationWindow reads a step's duration map into a Window (R-SCHED-1:
// missing min/max inherit target; a step with no duration is a point
// event {0,0,0}).
func durationWindow(m map[string]any) Window {
	dm, ok := m["duration"].(map[string]any)
	if !ok {
		return Window{}
	}
	get := func(key string) (float64, bool) {
		if s, ok := dm[key].(string); ok {
			return parseDurationSeconds(s)
		}
		return 0, false
	}
	target, hasT := get("target")
	minV, hasMin := get("min")
	maxV, hasMax := get("max")
	if !hasT {
		// duration grammar requires target or min; use min as target anchor
		if hasMin {
			target = minV
		} else {
			return Window{}
		}
	}
	if !hasMin {
		minV = target
	}
	if !hasMax {
		maxV = target
	}
	return Window{minV, target, maxV}
}

// ReadingOrder (R-ORDER-1..3): component ids in dependency-then-
// declaration order, followed by the parent's step ids. Component
// references contribute their id as a placeholder (R-ORDER-3).
func ReadingOrder(scope map[string]any) []string {
	var out []string
	comps, _ := scope["components"].([]any)
	ids, deps := componentGraph(comps)
	for _, id := range topoStable(ids, deps) {
		out = append(out, id)
	}
	if steps, ok := scope["steps"].([]any); ok {
		for _, sv := range steps {
			if sm, ok := sv.(map[string]any); ok {
				if id, ok := sm["id"].(string); ok {
					out = append(out, id)
				}
			}
		}
	}
	return out
}

func componentGraph(comps []any) ([]string, map[string][]string) {
	var ids []string
	outputs := map[string]string{} // component id -> id (self as output anchor)
	for _, cv := range comps {
		if cm, ok := cv.(map[string]any); ok {
			if id, ok := cm["id"].(string); ok {
				ids = append(ids, id)
				outputs[id] = id
			}
		}
	}
	deps := map[string][]string{}
	for _, cv := range comps {
		cm, ok := cv.(map[string]any)
		if !ok {
			continue
		}
		id, _ := cm["id"].(string)
		for _, uses := range scopeUses(cm) {
			if _, isComp := outputs[uses]; isComp && uses != id {
				deps[id] = append(deps[id], uses) // R-ORDER-2 dependency order
			}
		}
	}
	return ids, deps
}

func scopeUses(m map[string]any) []string {
	var out []string
	if steps, ok := m["steps"].([]any); ok {
		for _, sv := range steps {
			if sm, ok := sv.(map[string]any); ok {
				if us, ok := sm["uses"].([]any); ok {
					for _, uv := range us {
						if u, ok := uv.(string); ok {
							out = append(out, u)
						}
					}
				}
			}
		}
	}
	return out
}

func topoStable(ids []string, deps map[string][]string) []string {
	pos := map[string]int{}
	for i, id := range ids {
		pos[id] = i
	}
	visited := map[string]int{} // 0 unseen, 1 visiting, 2 done
	var out []string
	var visit func(id string)
	visit = func(id string) {
		if visited[id] != 0 {
			return
		}
		visited[id] = 1
		ds := append([]string{}, deps[id]...)
		sort.Slice(ds, func(a, b int) bool { return pos[ds[a]] < pos[ds[b]] })
		for _, d := range ds {
			visit(d)
		}
		visited[id] = 2
		out = append(out, id)
	}
	for _, id := range ids {
		visit(id)
	}
	return out
}

// TrackedStep is one interleaved step with its lane.
type TrackedStep struct {
	ID    string
	Track string
}

// Interleave (R-INTERLEAVE-1..3): topological order of all active steps
// across the parent and inline components, respecting `after` and
// produced-intermediate/component anchoring; deterministic tie-break by
// (track declaration order, then step declaration order). Steps without
// a track inherit their scope's implicit track (component id, or "main").
func Interleave(scope map[string]any) []TrackedStep {
	nodes, deps, trackOf, declOrder, trackOrder := stepGraph(scope)
	// Kahn's with deterministic tie-break (R-INTERLEAVE-3)
	indeg := map[string]int{}
	for _, n := range nodes {
		indeg[n] = 0
	}
	for n, ds := range deps {
		indeg[n] = len(uniq(ds))
	}
	var out []TrackedStep
	done := map[string]bool{}
	for len(out) < len(nodes) {
		best := ""
		for _, n := range nodes {
			if done[n] || indeg[n] > 0 {
				continue
			}
			if best == "" {
				best = n
				continue
			}
			tb, to := trackOrder[trackOf[best]], trackOrder[trackOf[n]]
			if to < tb || (to == tb && declOrder[n] < declOrder[best]) {
				best = n
			}
		}
		if best == "" {
			break // cycle — cannot occur in admitted documents (R-SCHED-3)
		}
		done[best] = true
		out = append(out, TrackedStep{ID: best, Track: trackOf[best]})
		for n, ds := range deps {
			for _, d := range uniq(ds) {
				if d == best && !done[n] {
					indeg[n]--
				}
			}
		}
	}
	return out
}

func uniq(ss []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, s := range ss {
		if !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	return out
}

// stepGraph flattens parent + inline component steps into one graph.
// Component steps chain internally; a parent step consuming a component
// (uses: [component-id]) depends on that component's terminal steps.
func stepGraph(scope map[string]any) (nodes []string, deps map[string][]string, trackOf map[string]string, declOrder map[string]int, trackOrder map[string]int) {
	deps = map[string][]string{}
	trackOf = map[string]string{}
	declOrder = map[string]int{}
	trackOrder = map[string]int{}
	produced := map[string]string{} // intermediate -> producing step
	compTerminals := map[string][]string{}
	decl := 0
	nextTrack := 0
	track := func(name string) string {
		if _, seen := trackOrder[name]; !seen {
			trackOrder[name] = nextTrack
			nextTrack++
		}
		return name
	}
	addSteps := func(m map[string]any, lane string) {
		steps, _ := m["steps"].([]any)
		for _, sv := range steps {
			sm, ok := sv.(map[string]any)
			if !ok {
				continue
			}
			id, _ := sm["id"].(string)
			nodes = append(nodes, id)
			declOrder[id] = decl
			decl++
			lane2 := lane
			if tr, ok := sm["track"].(string); ok {
				lane2 = tr
			}
			trackOf[id] = track(lane2)
			if p, ok := sm["produces"].(string); ok {
				produced[p] = id
			}
			if afters, ok := sm["after"].([]any); ok {
				for _, av := range afters {
					if a, ok := av.(string); ok {
						deps[id] = append(deps[id], a)
					}
				}
			}
		}
	}
	// components first (mise-en-place lanes), then parent
	if comps, ok := scope["components"].([]any); ok {
		for _, cv := range comps {
			cm, ok := cv.(map[string]any)
			if !ok {
				continue
			}
			if _, isRef := cm["ref"]; isRef {
				continue
			}
			cid, _ := cm["id"].(string)
			addSteps(cm, cid)
			var terms []string
			consumed := map[string]bool{}
			if ss, ok := cm["steps"].([]any); ok {
				for _, sv := range ss {
					if sm, ok := sv.(map[string]any); ok {
						if afters, ok := sm["after"].([]any); ok {
							for _, av := range afters {
								if a, ok := av.(string); ok {
									consumed[a] = true
								}
							}
						}
					}
				}
				for _, sv := range ss {
					if sm, ok := sv.(map[string]any); ok {
						if id, ok := sm["id"].(string); ok && !consumed[id] {
							terms = append(terms, id)
						}
					}
				}
			}
			compTerminals[cid] = terms
		}
	}
	addSteps(scope, "main")
	// uses edges: produced intermediates + component consumption
	resolveUses := func(m map[string]any) {
		steps, _ := m["steps"].([]any)
		for _, sv := range steps {
			sm, ok := sv.(map[string]any)
			if !ok {
				continue
			}
			id, _ := sm["id"].(string)
			if us, ok := sm["uses"].([]any); ok {
				for _, uv := range us {
					u, ok := uv.(string)
					if !ok {
						continue
					}
					if prod, has := produced[u]; has && prod != id {
						deps[id] = append(deps[id], prod)
					}
					if terms, has := compTerminals[u]; has {
						deps[id] = append(deps[id], terms...)
					}
				}
			}
		}
	}
	if comps, ok := scope["components"].([]any); ok {
		for _, cv := range comps {
			if cm, ok := cv.(map[string]any); ok {
				if _, isRef := cm["ref"]; !isRef {
					resolveUses(cm)
				}
			}
		}
	}
	resolveUses(scope)
	return nodes, deps, trackOf, declOrder, trackOrder
}

// ScheduleEntry is one item's placement: offsets from t0 (R-SCHED-1..2).
type ScheduleEntry struct {
	Item     string
	Start    Window
	Duration Window
}

// Schedule (R-SCHED-1..4): the parent method propagates from ITS t0 over
// parent-scope dependencies only (WE-SCHED-2: "s5's start computed from
// s1–s4"); each inline component is scheduled internally from its own
// zero, then SHIFTED to its prerequisite placement — start = consumer
// start − component total, by conservative interval subtraction — which
// is how offsets go negative ("start the day before"). Guard selection:
// defaults.
func Schedule(scope map[string]any) []ScheduleEntry {
	// Stage 1: the parent method alone, from its own t0.
	parentStarts, parentDur := scopeSchedule(scope)
	var out []ScheduleEntry
	if steps, ok := scope["steps"].([]any); ok {
		for _, sv := range steps {
			if sm, ok := sv.(map[string]any); ok {
				if id, ok := sm["id"].(string); ok {
					out = append(out, ScheduleEntry{Item: id, Start: parentStarts[id], Duration: parentDur[id]})
				}
			}
		}
	}
	// Stage 2: each inline component internally, then shifted to its
	// prerequisite placement (R-SCHED-2) — negative offsets welcome.
	if comps, ok := scope["components"].([]any); ok {
		for _, cv := range comps {
			cm, ok := cv.(map[string]any)
			if !ok {
				continue
			}
			if _, isRef := cm["ref"]; isRef {
				continue
			}
			cid, _ := cm["id"].(string)
			innerStarts, innerDur := scopeSchedule(cm)
			total := Window{}
			for id, s := range innerStarts {
				total = windowMax(total, s.plus(innerDur[id]))
			}
			consumer := earliestConsumer(scope, cid, parentStarts)
			if consumer == "" {
				continue
			}
			placement := parentStarts[consumer].minusConservative(total)
			out = append(out, ScheduleEntry{Item: cid, Start: placement, Duration: total})
			if ss, ok := cm["steps"].([]any); ok {
				for _, sv := range ss {
					if sm, ok := sv.(map[string]any); ok {
						if id, ok := sm["id"].(string); ok {
							out = append(out, ScheduleEntry{
								Item:     id,
								Start:    placement.plus(innerStarts[id]),
								Duration: innerDur[id],
							})
						}
					}
				}
			}
		}
	}
	return out
}

// scopeSchedule propagates start windows over ONE scope's steps (after +
// same-scope produced-intermediate edges), from that scope's own t0.
func scopeSchedule(m map[string]any) (map[string]Window, map[string]Window) {
	starts := map[string]Window{}
	dur := map[string]Window{}
	produced := map[string]string{}
	var order []string
	deps := map[string][]string{}
	if steps, ok := m["steps"].([]any); ok {
		for _, sv := range steps {
			sm, ok := sv.(map[string]any)
			if !ok {
				continue
			}
			id, _ := sm["id"].(string)
			order = append(order, id)
			dur[id] = durationWindow(sm)
			if p, ok := sm["produces"].(string); ok {
				produced[p] = id
			}
			if afters, ok := sm["after"].([]any); ok {
				for _, av := range afters {
					if a, ok := av.(string); ok {
						deps[id] = append(deps[id], a)
					}
				}
			}
		}
		for _, sv := range steps {
			sm, ok := sv.(map[string]any)
			if !ok {
				continue
			}
			id, _ := sm["id"].(string)
			if us, ok := sm["uses"].([]any); ok {
				for _, uv := range us {
					if u, ok := uv.(string); ok {
						if prod, has := produced[u]; has && prod != id {
							deps[id] = append(deps[id], prod)
						}
					}
				}
			}
		}
	}
	for _, id := range order {
		starts[id] = Window{} // presence matters: a t0 step IS scheduled
	}
	// declaration order is a valid topological order for admitted
	// documents in the common case; iterate to fixpoint for safety.
	for pass := 0; pass < len(order)+1; pass++ {
		changed := false
		for _, id := range order {
			s := Window{}
			for _, d := range uniq(deps[id]) {
				s = windowMax(s, starts[d].plus(dur[d]))
			}
			if s != starts[id] {
				starts[id] = s
				changed = true
			}
		}
		if !changed {
			break
		}
	}
	return starts, dur
}

func earliestConsumer(scope map[string]any, cid string, start map[string]Window) string {
	best := ""
	if steps, ok := scope["steps"].([]any); ok {
		for _, sv := range steps {
			sm, ok := sv.(map[string]any)
			if !ok {
				continue
			}
			if us, ok := sm["uses"].([]any); ok {
				for _, uv := range us {
					if u, ok := uv.(string); ok && u == cid {
						id, _ := sm["id"].(string)
						if best == "" || start[id].Target < start[best].Target {
							best = id
						}
					}
				}
			}
		}
	}
	return best
}
