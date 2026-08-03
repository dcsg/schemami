package calc

import "testing"

func torta() map[string]any {
	return map[string]any{
		"components": []any{
			map[string]any{"id": "ganache-cobertura", "steps": []any{
				map[string]any{"id": "g1", "duration": map[string]any{"target": "5m"}},
				map[string]any{"id": "g2", "after": []any{"g1"}, "duration": map[string]any{"target": "5m"}},
			}},
			map[string]any{"id": "calda-cafe", "steps": []any{
				map[string]any{"id": "c1", "duration": map[string]any{"target": "20m"}},
			}},
		},
		"steps": []any{
			map[string]any{"id": "s1", "duration": map[string]any{"target": "10m"}},
			map[string]any{"id": "s2", "after": []any{"s1"}, "duration": map[string]any{"target": "10m"}},
			map[string]any{"id": "s3", "after": []any{"s2"}, "duration": map[string]any{"min": "25m", "target": "30m", "max": "35m"}},
			map[string]any{"id": "s4", "after": []any{"s3"}, "duration": map[string]any{"target": "1h"}},
			map[string]any{"id": "s5", "after": []any{"s4"}, "uses": []any{"ganache-cobertura", "calda-cafe"}, "duration": map[string]any{"target": "15m"}},
		},
	}
}

// WE-ORDER-1 / AC-3.2 — mise-en-place order on the torta shape.
func TestWE_ORDER_1(t *testing.T) {
	got := ReadingOrder(torta())
	want := []string{"ganache-cobertura", "calda-cafe", "s1", "s2", "s3", "s4", "s5"}
	if len(got) != len(want) {
		t.Fatalf("order %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("order %v, want %v", got, want)
		}
	}
}

// WE-INTERLEAVE-1 — tracks A/B with a cross edge: a1, b1, then a2∥b2.
func TestWE_INTERLEAVE_1(t *testing.T) {
	doc := map[string]any{"steps": []any{
		map[string]any{"id": "a1", "track": "A"},
		map[string]any{"id": "a2", "track": "A", "after": []any{"a1", "b1"}},
		map[string]any{"id": "b1", "track": "B"},
		map[string]any{"id": "b2", "track": "B", "after": []any{"b1"}},
	}}
	got := Interleave(doc)
	ids := ""
	for _, ts := range got {
		ids += ts.ID + ","
	}
	// deterministic: a1 (track A first), b1, then a2 (A) before b2 (B)
	if ids != "a1,b1,a2,b2," {
		t.Errorf("interleave %s, want a1,b1,a2,b2,", ids)
	}
}

// WE-SCHED-1 — window propagation (verbatim from the SPEC).
func TestWE_SCHED_1(t *testing.T) {
	doc := map[string]any{"steps": []any{
		map[string]any{"id": "s1", "duration": map[string]any{"min": "10m", "target": "12m", "max": "15m"}},
		map[string]any{"id": "s2", "after": []any{"s1"}, "duration": map[string]any{"target": "30m"}},
	}}
	sched, _ := Schedule(doc, nil)
	var s2 ScheduleEntry
	for _, e := range sched {
		if e.Item == "s2" {
			s2 = e
		}
	}
	if !tol(s2.Start.Min, 600) || !tol(s2.Start.Target, 720) || !tol(s2.Start.Max, 900) {
		t.Errorf("s2.start = %+v, want {600 720 900}", s2.Start)
	}
	end := s2.Start.plus(s2.Duration)
	if !tol(end.Min, 2400) || !tol(end.Target, 2520) || !tol(end.Max, 2700) {
		t.Errorf("s2.end = %+v, want {2400 2520 2700}", end)
	}
}

// WE-SCHED-2 — prerequisite placement: calda start = s5.start − 20m;
// ganache = s5.start − 10m; both per R-SCHED-2 interval subtraction.
func TestWE_SCHED_2(t *testing.T) {
	sched, _ := Schedule(torta(), nil)
	byItem := map[string]ScheduleEntry{}
	for _, e := range sched {
		byItem[e.Item] = e // component summary entries come last, overwrite none (distinct ids)
	}
	s5 := byItem["s5"].Start
	// s1..s4 targets: 600+600+1800+3600 = 6600s
	if !tol(s5.Target, 6600) {
		t.Fatalf("s5.start.target = %v, want 6600", s5.Target)
	}
	calda := byItem["calda-cafe"]
	if !tol(calda.Start.Target, s5.Target-1200) {
		t.Errorf("calda start = %v, want s5-1200 = %v", calda.Start.Target, s5.Target-1200)
	}
	ganache := byItem["ganache-cobertura"]
	if !tol(ganache.Start.Target, s5.Target-600) {
		t.Errorf("ganache start = %v, want s5-600", ganache.Start.Target)
	}
	// conservative min: s5.start.min − total.max
	if !tol(calda.Start.Min, s5.Min-1200) {
		t.Errorf("calda start.min = %v, want %v (R-SCHED-2)", calda.Start.Min, s5.Min-1200)
	}
}

// R-SCHED-2 negative offsets — a component longer than everything before
// its consumer starts before t0.
func TestNegativeOffsets(t *testing.T) {
	doc := map[string]any{
		"components": []any{map[string]any{"id": "insert", "steps": []any{
			map[string]any{"id": "i1", "duration": map[string]any{"target": "2d"}},
		}}},
		"steps": []any{
			map[string]any{"id": "s1", "uses": []any{"insert"}, "duration": map[string]any{"target": "30m"}},
		},
	}
	sched, _ := Schedule(doc, nil)
	for _, e := range sched {
		if e.Item == "insert" {
			// consumer s1 starts after insert's terminal (uses edge): start = 2d.
			// placement = 2d − 2d = 0... consumer start comes from forward prop;
			// the JUST-IN-TIME placement equals consumer − total.
			if e.Start.Target > 0 {
				t.Errorf("insert placement %v, want ≤ 0 (before or at t0)", e.Start.Target)
			}
		}
	}
}

// parseDurationSeconds edges (N-4 grammar).
func TestDurationGrammar(t *testing.T) {
	cases := map[string]float64{"30m": 1800, "1h30m": 5400, "2d": 172800, "45s": 45, "1.5h": 5400, "1w": 604800}
	for in, want := range cases {
		got, ok := parseDurationSeconds(in)
		if !ok || !tol(got, want) {
			t.Errorf("parseDurationSeconds(%q) = %v,%v want %v", in, got, ok, want)
		}
	}
	for _, bad := range []string{"", "m", "10", "10x", "1h30"} {
		if _, ok := parseDurationSeconds(bad); ok {
			t.Errorf("parseDurationSeconds(%q) accepted", bad)
		}
	}
}

// R-SCHED-5: a referenced preparation with no supplied body is REFUSED,
// never placed at zero. A zero-window fallback would silently claim a
// multi-day ferment takes no time — the failure this rule prevents.
func TestScheduleRefUnresolvable(t *testing.T) {
	doc := map[string]any{
		"components": []any{map[string]any{"id": "prep", "ref": "prep-doc"}},
		"steps": []any{map[string]any{"id": "assemble", "uses": []any{"prep"},
			"duration": map[string]any{"target": "10m"}}},
	}
	entries, refusals := Schedule(doc, nil)
	if len(refusals) != 1 {
		t.Fatalf("expected one refusal, got %v", refusals)
	}
	if refusals[0] != `referenced preparation "prep-doc" unresolvable` {
		t.Errorf("refusal string is normative; got %q", refusals[0])
	}
	for _, e := range entries {
		if e.Item == "prep" {
			t.Error("an unresolvable reference must be placed NOWHERE, not at zero")
		}
	}

	// Supplied: placed by R-SCHED-2's conservative subtraction.
	body := map[string]any{"steps": []any{map[string]any{"id": "p1",
		"duration": map[string]any{"min": "30m", "target": "45m", "max": "1h"}}}}
	entries, refusals = Schedule(doc, map[string]map[string]any{"prep-doc": body})
	if len(refusals) != 0 {
		t.Fatalf("a supplied reference must not refuse: %v", refusals)
	}
	var placed bool
	for _, e := range entries {
		if e.Item == "prep" {
			placed = true
			// WE-SCHED-3's numbers.
			if e.Start.Min != -3600 || e.Start.Target != -2700 || e.Start.Max != -1800 {
				t.Errorf("placement = %+v, want {-3600,-2700,-1800} (WE-SCHED-3)", e.Start)
			}
		}
	}
	if !placed {
		t.Error("a supplied reference must be placed like an inline component")
	}
}
