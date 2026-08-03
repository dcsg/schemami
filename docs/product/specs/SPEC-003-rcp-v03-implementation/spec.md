---
type: spec
id: SPEC-003
title: RCP v0.3 implementation — the Calculus, its vectors, timeline, decode-compat, media
status: accepted
author: Daniel Gomes
implements: PRD-003
source_prd: PRD-003
source_brainstorm: null
source_prompt: null
created_at: 2026-08-03T01:35:00Z
references:
  adrs: [ADR-001, ADR-002]
  invariants: []
---

# SPEC-003: RCP v0.3 implementation

**Implements:** PRD-003 — RCP v0.3, "the protocol computes"
**Date:** 2026-08-03
**Author:** Daniel Gomes
**Sidecar:** [spec.yaml](./spec.yaml) — structured source of truth (SRs, ACs, DS/CMP design block, coverage)

---

## Summary

v0.3 discharges the two founding engineering obligations and feeds two
surfaces that already exist. The Recipe Calculus becomes a normative
artifact — `calculus/SPEC.md` defining every function's semantics plus
`calculus/vectors/` shipped with the protocol — with two independent
implementations: Go (the reference, replacing the throwaway clamp inside
rcplint) and TypeScript (inside the viewer package, entering through the
unchanged ADR-002 engine seam, giving the viewer its scale control and
schedule view without WASM). Decode-compatibility becomes a CI gate built
on v0.1-era decode structs — not the v0.1 schema, which is closed by
design and therefore the wrong artifact for a tolerance test. Media gets
conventions (`schema/MEDIA.md`), real personal assets, and viewer
rendering via drag-in object URLs so the zero-network guarantee survives.

## Context

PRD-003 deferred four decisions here; all four are resolved below as
design statements: Calculus packaging (DS-CALC-001), timeline vector
semantics (DS-CALC-003), media asset conventions (DS-TOOL-003), and the
frozen-reader shape (DS-PR-009). The spec's one structural insight beyond
the PRD: the "old reader" for decode-compat cannot be the v0.1 schema —
`unevaluatedProperties: false` makes it reject new fields deliberately
(that is the VALIDATOR's job); the decode-compat contract (#14) binds
DECODERS, so the fixture needs v0.1-era decode structs that must-ignore
unknowns. The vector mechanism scales up from its proven v0.2 precedent:
the reference implementation writes, the second implementation replays,
disagreements are fixed in the replayer, never in vectors.

## Existing Architecture

Normative: schema/ (core + 8 profiles + VERSIONING.md), registry/ (4
kinds, 108 entries), i18n/, schema/constraints/*.cue. Informative:
tools/rcplint (Go 1.26; validate/lint/facts/clamp/vectors subcommands;
clamp.go + clamp_test.go carry the refusal cases that become the parity
oracle), tools/viewer (Bun 1.3.14; RcpEngine v1 seam with capabilities;
L1 conformance replay; single-file hash-CSP dist). The L1 vector loop
(rcplint writes → bun test replays, capability-scoped) is the working
precedent this release generalizes.

## Proposed Design

Unifying constraints:

1. **Purity is law (SSP-005).** Calculus functions are pure: no IO, no
   clock, no randomness, no globals — determinism is what makes vectors
   meaningful. Both implementations enforce this structurally (Go: no
   imports beyond stdlib math/units table; TS: no imports at all).
2. **The seam does not move (SP-003).** RcpEngine stays version 1;
   `scale()` was reserved from day one and now gets defined; `schedule()`
   arrives as a new optional member gated by a new `timeline` capability —
   additive in exactly the decode-compat sense.
3. **Parity before deletion (SP-001).** The clamp is deleted only after
   its every test case passes through the Calculus unchanged.

### Requirements

### SR-CALC-001 — Implements FR-CALC-001

The Calculus MUST exist as a normative spec at `calculus/SPEC.md`
defining every exported function — scaling (uniform + pivot), basis
resolution (sum/where/include_components), guard-path selection,
fail-closed constraint enforcement (critical refuses with authored
reasons; warn advises), min_batch floors, fixed-quantity asymmetry,
duration re-estimation — each with domain, unit semantics and edge
behaviour (zero, ratio invariance). The normative surface (DS-PR-001)
gains `calculus/`. A Go reference implementation MUST live at
`tools/rcplint/calc` (pure package), rcplint's clamp subcommand MUST be
rewired through it, every existing clamp test case MUST pass verbatim
(outcomes + authored pt/en reasons), and `clamp.go` MUST then be deleted.

### SR-CALC-002 — Implements FR-CALC-002

Conformance vectors MUST ship at `calculus/vectors/` (normative data):
JSON records `{function, edge_classes[], input, expected}`, written by
the Go reference via an `rcplint calc-vectors` subcommand — never
hand-authored. A TypeScript implementation MUST live at
`tools/viewer/src/calc/` (inside the viewer package — zero new packages,
zero new dependencies; extraction later is mechanical because the code
is import-free) and replay the full set via `bun test`. The edge-class
enumeration MUST be machine-readable in `calculus/SPEC.md`, and a
coverage checker MUST fail if any class lacks vectors (AC-CALC-002-2:
mechanical, not intentional). Disagreements are fixed in the replaying
implementation; vectors are regenerated only when the SPEC changes.

### SR-CALC-003 — Implements FR-CALC-003

Ordering and timeline MUST be Calculus functions, vector-covered in both
implementations: (a) topological reading order over the step DAG +
component references (the v0.2 viewer's mise-en-place order becomes a
specified function); (b) parallel-track interleaving honouring `track`;
(c) the time-anchored schedule — offsets from t0 per DS-CALC-003:
`{item, start_offset: {min,target,max}, duration: {min,target,max}}`,
target propagating as scalar, min/max as conservative interval bounds.
Serve-time-anchored views are a presentation transform (total − offset),
not a second derivation. The when-vs-how split holds: referencing
documents contribute WHEN edges, referenced documents contribute HOW
internals.

### SR-TOOL-002 — Implements FR-TOOL-002

Media conventions MUST be documented at `schema/MEDIA.md` (normative):
relative URIs resolve from the document's location; private assets live
in `private/collection/media/` (gitignored — the standing privacy guard
already covers it); licence stays required; source-book media never
enters the repo, enforced by a repo-level media attestation check (no
binary media files outside an approved allowlist). The viewer MUST
render media by role — failure media visibly labelled as failure
reference — via drag-in: pasted documents have no filesystem context, so
assets are supplied by dropping the files themselves, rendered through
object URLs; the CSP `img-src` extends to `data: blob:` ONLY (network
egress stays impossible). Example placeholder URIs are marked absent in
render rather than silently skipped.

### SR-TOOL-003 — Implements FR-TOOL-003

The viewer MUST consume the TS Calculus through the seam: the engine
gains `capabilities.clamp` (defining the reserved `scale()`) and
`capabilities.timeline` (new optional `schedule()` member — additive,
version stays 1). The UI: a scale control rendered ONLY when `clamp` is
declared — scaling past a critical bound renders the authored pt/en
refusal; a schedule view rendered ONLY when `timeline` is declared,
showing derived start offsets. The mock-engine test MUST extend to prove
a capability-richer engine changes zero UI code (AC-TOOL-003-2), and the
UI MUST NOT import the Calculus directly — engine interface only
(SSP-004 discipline).

### SR-PR-004 — Implements FR-PR-004

Decode-compat MUST be a CI gate (DS-PR-009): the "frozen v0.1-era
reader" is a set of hand-written Go decode structs capturing exactly the
v0.1 field surface (from tag rcp-v0.1), decoding with default
unknown-field tolerance. Fixtures, both directions: (a) the frozen
reader decodes every current document (examples + the torta) with all
v0.1-era fields intact; (b) the current tooling decodes every
rcp-v0.1-tagged document (extracted from the tag into
`tools/rcplint/testdata/compat/v01/`). A deliberately breaking fixture —
a reader requiring a field absent from old documents — MUST make the
gate fail, run as an inverted test (the gate is proven able to fail
without ever being red in CI). Wired into `make accept`.

## Non-Goals

- The WASM engine — FEAT-TOOL-001's later phase; the seam is ready and
  this release proves capabilities light up without UI changes.
- Nutrition/cost derivations — FEAT-CALC-003 (needs registry data).
- Ferment/substitution/codegen/publishing — FEAT-PROF-004, FEAT-SUB-001,
  FEAT-CORE-004, FEAT-PUB-001, FEAT-REG-005 (later PRDs).
- A third Calculus implementation (Swift et al.) — the vectors make it
  possible; nothing here builds it.
- Editing/authoring media in the viewer — rendering only.

## Alternatives Considered

### Calculus as a separate package (packages/calc-ts) now
- **Pros:** Clean consumption story for future apps.
- **Cons:** A new package surface, workspace config, publish questions —
  all speculative; no second consumer exists.
- **Rejected because:** the code is import-free pure functions —
  extraction later is mechanical; a package without a second consumer is
  premature abstraction (OQ-1 resolution, DS-CALC-001).

### Frozen v0.1 SCHEMA as the old reader
- **Pros:** Zero new code; the tag already stores it.
- **Cons:** Conceptually wrong: the v0.1 schema is deliberately closed
  (unevaluatedProperties: false) — it REJECTS what a reader must
  TOLERATE. It tests the validator's strictness, not decode tolerance.
- **Rejected because:** #14 binds decoders; the fixture must be a
  decoder (OQ-4 resolution, DS-PR-009).

### Absolute wall-clock schedule anchors
- **Pros:** Reads naturally ("start at 14:30").
- **Cons:** Requires a clock — breaking Calculus purity and vector
  determinism; wall-clock is presentation, not derivation.
- **Rejected because:** offsets from t0 keep functions pure; anchoring
  is a render-side transform (OQ-2 resolution, DS-CALC-003).

### Media via embedded data URIs in documents
- **Pros:** Documents self-contained; viewer needs nothing.
- **Cons:** Bloats documents catastrophically; couples the system of
  record to asset bytes; kills diffability.
- **Rejected because:** references + conventions are the protocol's way
  (documents reference meaning); drag-in covers the pasted-document case
  (OQ-3 resolution, DS-TOOL-003).

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation | Rollback |
|---|---|---|---|---|
| Vector coverage gaps (the recorded riskiest assumption) | Two green implementations disagree in a kitchen | Medium | Machine-readable edge-class enumeration + mechanical coverage gate (AC-CALC-002-2); classes extend append-only | Add class + vectors; replayer fixes follow |
| Window arithmetic (min/target/max) semantics disputed later | Schedule bounds mislead | Medium | Conservative interval semantics DEFINED in calculus/SPEC.md with worked examples; warn-grade presentation in the viewer | Semantics change = SPEC change + vector regen, versioned |
| Clamp parity misses an untested behaviour | Silent safety semantics drift | Low | Parity is test-case-complete BEFORE deletion; refusal reasons string-compared | clamp.go restorable from tag rcp-v0.2 |
| Frozen structs drift from what v0.1 actually shipped | Compat gate tests fiction | Low | Structs generated by reading the tag's schema field list; comment pins the tag SHA | Regenerate from tag |
| CSP img-src blob:/data: opens an exfil channel | Privacy regression | Low | blob:/data: cannot reach the network; connect-src stays absent; forbidden-API greps unchanged | Drop img sources; media renders as labelled placeholders |

## Security Considerations

The Calculus is pure computation — no new attack surface beyond input
parsing already covered by L1. Viewer: CSP gains `img-src data: blob:`
only — neither scheme permits network egress; `connect-src` remains
absent; the forbidden-API greps and network-silence acceptance stay.
Dropped asset files stay in page memory as object URLs, revoked on
replacement. Media attestation check keeps book-derived binaries out of
the repo. Frozen decode structs parse untrusted YAML with the same
hardened loader rcplint already uses.

## Performance Approach

Standard patterns sufficient. Calculus functions are arithmetic over
small documents; vectors are hundreds of small JSON records. The TS
Calculus adds pure code only — bundle stays well under the 500 KB
budget; measured at build as before.

## Protections

- **SP-001..SP-004** (from PRD-003) — fail-closed parity; ADDITION-only;
  engine-seam stability; media boundary. Inherited verbatim.
- **SSP-005** (spec) — Calculus purity: no IO, no clock, no randomness,
  no globals, in both implementations; structurally checked (import
  allowlists), not just promised.

## Acceptance Criteria

All 12 PRD-003 ACs pass through verbatim in the sidecar (source: prd).
Spec-added (source: spec):

- **SAC-CALC-001** — Both replays green in one command: `make calculus`
  (Go vector suite + TS replay via bun test) exits 0.
- **SAC-CALC-002** — Coverage gate: the edge-class checker exits nonzero
  when any enumerated class lacks vectors (proven by an inverted test).
- **SAC-PR-002** — The compat gate runs inside `make accept` and its
  breaking-fixture inverted test proves it can fail.
- **SAC-TOOL-003** — Viewer CSP contains `img-src data: blob:` and no
  other new source; forbidden-API greps stay green; bundle < 500 KB.

## Testing Strategy

- **Calculus (Go):** table-driven unit tests per function; the vector
  suite as the outer loop; clamp-parity tests are the migrated clamp_test
  cases asserted against the Calculus (deleted only with clamp.go).
- **Calculus (TS):** vector replay (bun test) + purity check (no imports
  in src/calc); no separate unit re-derivation — the vectors ARE the
  spec's tests, that's the point.
- **Timeline:** torta (components + offsets) and a synthetic
  entremet-class fixture (multi-day, tracks) vectored in both.
- **Decode-compat:** both-direction fixtures in CI; the breaking case as
  an inverted test (expect failure, assert it happens).
- **Viewer:** render tests for scale control presence/absence by
  capability, refusal rendering (authored reasons verbatim), schedule
  view; extended mock-engine test ({l1, clamp, timeline}); manual
  paste+drag media check at acceptance (no browser harness, unchanged
  posture).

## Dependencies

- ADR-001 (Go, dependency budgets), ADR-002 (seam, Bun, vector
  precedent) — both extended, neither revisited.
- DECISIONS #3 (DAG as data), #11 (media boundary), #13 (Calculus), #14
  (decode-compat), #15 (fail-closed).
- tag rcp-v0.1 (frozen reader source), tag rcp-v0.2 (clamp parity
  source).
- No new runtime dependencies anywhere: Go stdlib only; TS Calculus is
  import-free; viewer keeps exactly 2.

## Open Questions

None blocking. PRD-003's four OQs are resolved by DS-CALC-001,
DS-CALC-003, DS-TOOL-003 and DS-PR-009. Deferred within v0.3: exact
vector record counts per class (plan-phase, minimums enforced by the
coverage gate, not guessed here).

---

*Generated by edikt:spec — 2026-08-03*
