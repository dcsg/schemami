---
type: artifact
artifact_type: test-strategy
spec: SPEC-003
status: accepted
created_at: 2026-08-03T07:27:07Z
reviewed_by: qa
---

# Test Strategy — RCP v0.3 implementation

The system under test grows a third pillar: alongside the protocol
surface (schemas/registry/rcplint) and the viewer seam, v0.3 adds the
Calculus — where the vectors ARE the specification's tests, replayed by
two implementations. The standing principles hold: the frozen corpus is
the regression suite, private content never enters fixtures or vectors,
every gate that can fail must prove it can fail.

## Unit Tests (tools/rcplint, Go)

| Component | What to test | Priority |
|---|---|---|
| Calculus reference (CMP-CALC-002) | per-function table-driven tests against calculus/SPEC.md semantics; the migrated clamp-parity suite — identical outcomes and authored pt/en reasons — gates clamp.go deletion | high |
| Vector writer (CMP-CALC-002) | calc-vectors output shape; determinism (two runs byte-identical — purity's observable form); edge_classes tagging | high |
| Coverage gate (CMP-CALC-001) | fails naming any vectorless class; inverted test with a deliberately emptied class (SAC-CALC-002) | high |
| Timeline (CMP-CALC-002) | torta ordering + offsets; entremet multi-day/tracks; window arithmetic vs the SPEC's worked examples | high |
| Decode-compat (CMP-PR-004) | both directions over real corpora; breaking fixture inverted test (SAC-PR-002); frozen structs' tag-pin comment matches the tag | high |
| Purity (SSP-005) | import allowlist on the calc package | medium |

## Unit Tests (tools/viewer, bun test)

| Component | What to test | Priority |
|---|---|---|
| TS Calculus replay (CMP-CALC-003) | full vector set green — no separate re-derivation of expectations; disagreement = TS bug by default | high |
| Capability gating (CMP-TOOL-003) | scale control and schedule view exist iff clamp/timeline declared; refusal text verbatim from authored reasons | high |
| Extended mock engine | {l1, clamp, timeline} renders everything with zero UI changes — the no-rewrite proof, third generation | high |
| Media rendering (CMP-TOOL-003) | roles labelled (failure prominent); placeholder URIs marked absent; object-URL lifecycle (revoked on replacement) | medium |
| TS purity | src/calc has zero imports | medium |

## Integration

| Scenario | Components | Priority |
|---|---|---|
| `make calculus` green in one command (SAC-CALC-001) | Go vector suite + TS replay | high |
| `make accept` extended: compat gate + media attestation + existing sweep | all | high |
| `make validate` + `make conformance` unchanged and green throughout (SP-002) | corpus regression | high |
| Viewer CSP after rebuild: img-src exactly `data: blob:`, no connect-src, bundle < 500 KB (SAC-TOOL-003) | build | medium |

## Manual (recorded at acceptance)

- Drag a personal photo alongside a private document → renders by role
  (AC-TOOL-002-1; local only, pass/fail recorded).
- Scale the torta past a critical bound in the page → authored refusal
  reads correctly in pt and en.
- Schedule view sanity: the derived offsets match a human reading of the
  torta's method.

## Hard to test, and why — named limitations

- **Media rendering end-to-end** stays manual: no browser harness
  (unchanged v0.2 posture — the harness would outweigh the page); the
  drag-in path is DOM-event dependent. The render functions themselves
  are pure and tested; only the drop-to-object-URL glue is manual.
- **Window arithmetic "correctness"** is definitional, not empirical:
  the conservative interval semantics can only be tested against the
  SPEC's own worked examples — a semantics dispute is a SPEC change with
  vector regeneration, never a quiet test edit.
- **Frozen-reader fidelity** is as good as the hand-written structs'
  match to the tag; mitigated by the pinned tag SHA and a field-list
  comparison comment, but it is a transcription, and transcriptions rot
  only loudly (the gate fails) — accepted.
