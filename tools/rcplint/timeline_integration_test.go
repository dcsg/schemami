package main

// Phase 3 integration (AC-3.2/3.3): the real torta and the entremet
// fixture through calc's timeline derivations, loaded via the document
// loader (calc itself stays pure — no yaml imports there).

import (
	"testing"

	"github.com/dcsg/rcp/tools/rcplint/calc"
)

func loadOne(t *testing.T, path string) map[string]any {
	t.Helper()
	docs, err := LoadDocuments(path)
	if err != nil {
		t.Fatalf("%s: %v", path, err)
	}
	m, ok := docs[0].Value.(map[string]any)
	if !ok {
		t.Fatalf("%s: not a mapping", path)
	}
	return m
}

// AC-3.2 — the torta example: mise-en-place order + prerequisite offsets.
func TestTortaTimeline(t *testing.T) {
	doc := loadOne(t, "../viewer/example.rcp.yaml")
	order := calc.ReadingOrder(doc)
	if len(order) < 7 || order[0] != "ganache-cobertura" || order[1] != "calda-cafe" {
		t.Fatalf("reading order: %v — components must precede the method", order)
	}
	sched := calc.Schedule(doc)
	byItem := map[string]calc.ScheduleEntry{}
	for _, e := range sched {
		byItem[e.Item] = e
	}
	s5, okS := byItem["s5"]
	calda, okC := byItem["calda-cafe"]
	if !okS || !okC {
		t.Fatalf("missing schedule entries: %v", sched)
	}
	// the real torta's calda steps are until-anchored (no durations), so
	// its just-in-time placement coincides with the consumer's start —
	// R-SCHED-1 point events. Strictly-before is exercised by the entremet.
	if calda.Start.Target > s5.Start.Target {
		t.Errorf("calda placed at %v, after its consumer s5 at %v", calda.Start.Target, s5.Start.Target)
	}
}

// AC-3.3 — entremet: multi-day, parallel tracks, negative offsets.
func TestEntremetTimeline(t *testing.T) {
	doc := loadOne(t, "testdata/calc/entremet.rcp.yaml")
	sched := calc.Schedule(doc)
	byItem := map[string]calc.ScheduleEntry{}
	for _, e := range sched {
		byItem[e.Item] = e
	}
	e2 := byItem["e2"] // assembly consumes both components
	insert := byItem["fruit-insert"]
	sponge := byItem["sponge-layer"]
	if insert.Item == "" || sponge.Item == "" {
		t.Fatalf("component placements missing: %v", sched)
	}
	// insert total ≈ 20m + 2d target — far exceeds e1's 30m lead: negative offset.
	if insert.Start.Target >= 0 {
		t.Errorf("fruit-insert placement %v s, want negative (starts days before t0)", insert.Start.Target)
	}
	// conservative bounds: min uses total.max (3d + 20m), max uses total.min.
	if !(insert.Start.Min < insert.Start.Target && insert.Start.Target < insert.Start.Max) {
		t.Errorf("insert window not conservative: %+v", insert.Start)
	}
	// sponge (30m + 12h target) also precedes assembly.
	if sponge.Start.Target >= e2.Start.Target {
		t.Errorf("sponge placed %v, not before assembly %v", sponge.Start.Target, e2.Start.Target)
	}
	// interleave: component lanes exist and appear before method completion.
	tracks := map[string]bool{}
	for _, ts := range calc.Interleave(doc) {
		tracks[ts.Track] = true
	}
	for _, want := range []string{"fruit-insert", "sponge-layer", "main"} {
		if !tracks[want] {
			t.Errorf("missing track lane %q in interleave", want)
		}
	}
	// e3 freeze then e4 glaze: end-to-end target spans multiple days.
	e4 := byItem["e4"]
	if e4.Start.Target < 12*3600 {
		t.Errorf("glaze starts at %v s — expected after the multi-day chain", e4.Start.Target)
	}
}
