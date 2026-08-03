# PRD-003: RCP v0.3 — the protocol computes

**Status:** accepted
**Rigor:** solo
**Author:** Daniel Gomes
**Created:** 2026-08-03T01:10:00Z
**Sidecar:** [PRD-003-rcp-v03-protocol-computes.yaml](./PRD-003-rcp-v03-protocol-computes.yaml) — structured data, source of truth

**ID scheme** ([traceability guideline](../../guidelines/traceability.md)):
component codes with globally-unique numbering continuing from PRD-002;
new code `CALC` declared for this PRD. Every FR trace leads with the FEAT
id it graduates.

---

## Problem

The protocol still computes nothing. Cook-time math — scaling, basis
resolution, guard-path selection, constraint enforcement — lives in a
clamp whose own acceptance criteria call it throwaway, so every consumer
(the viewer today, any app tomorrow) must reimplement it: the
five-divergent-implementations disease waiting to return at the math
layer, where a disagreement is not a rendering glitch but a wrong salt
quantity. Recipes render but cannot schedule — the DAG and durations are
data with no derivation (v0.2's viewer review made the demand concrete:
when to start the ganache is computable and uncomputed). The
ADDITION-only discipline is proven by regression, not by contract — no CI
artifact fails when compatibility breaks. And documents reference media
that does not exist: a model richer than anything rendered.

v0.3 makes the protocol compute: the Calculus specified once with
cross-stack conformance vectors (engineering obligation #1), ordering and
schedule derived from the DAG, decode-compatibility mechanical
(obligation #2), and the media model finally fed and rendered.

## Users

Same canonical personas ([docs/personas.md](../../personas.md)).

| Persona | Story | Served by |
|---|---|---|
| `rcp.cook.home-cook` | As a cook, I want to scale a recipe and be refused with a reason when it would be unsafe — and see when to start each part. | FR-CALC-001, FR-CALC-003, FR-TOOL-003 |
| `rcp.cook.production-scaler` | As a scaler, I want the same math everywhere: what the viewer computes is what any app computes. | FR-CALC-001, FR-CALC-002 |
| `rcp.dev.surface-engineer` | As an integrator, I want a specified library with vectors proving my implementation equivalent — not a reference to reverse-engineer. | FR-CALC-002, FR-PR-004 |
| `rcp.ingester.personal-collector` | As a collector, I want my own photos of my bakes attached to my recipes and visible. | FR-TOOL-002 |

## Goals

| Metric | Target | Counter-metric (must not move) |
|--------|--------|--------------------------------|
| **Cross-stack equivalence** — Calculus conformance vectors green in two independent implementations (Go reference + TS through the engine seam) covering scaling, basis resolution, guards, fail-closed clamps, and timeline derivation | Both implementations replay the full vector set green in CI | **No MODEL bump**; corpus + private collection stay green; the viewer stays a fast self-contained single file |

## Non-Goals

- The WASM engine (L2+CUE in-browser) — still the later FEAT-TOOL-001
  phase; v0.3's viewer gains scale + schedule through the TS Calculus
  behind the same seam.
- FEAT-PROF-004 (ferment), FEAT-SUB-001 (substitution catalog),
  FEAT-CORE-004 (codegen), FEAT-REG-005, FEAT-PUB-001 — remaining v1
  table, later PRDs.
- Reproducing any source-book media — the private-use ingestion right
  does not extend to media, ever (DECISIONS #11; enforced here as SP-004).
- Nutrition/cost derivations — FEAT-CALC-003, deferred: needs per-entry
  registry data before the math means anything.

## Requirements

<!-- Source of truth: the .yaml sidecar. Mirror for human readability. -->

| ID | Component | Requirement | Trace |
|----|-----------|-------------|-------|
| FR-CALC-001 | recipe-calculus | The Recipe Calculus specified once (normative spec: every function's domain, units, edge semantics) with a Go reference implementation replacing the throwaway clamp; every existing refusal case reproduces verbatim | FEAT-CALC-001; #13/#15; eng. obligation #1 |
| FR-CALC-002 | recipe-calculus | Cross-stack conformance vectors: reference implementation writes them, a second independent implementation (TypeScript, behind the engine seam) replays them green in CI; coverage disciplines the enumerated edge classes | FEAT-CALC-001; v0.2 L1-vector precedent |
| FR-CALC-003 | recipe-calculus | Ordering & timeline derivations as Calculus functions: topological reading order, parallel-track interleaving, time-anchored schedule (DAG + durations → start offsets); vector-covered in both implementations | FEAT-CALC-002; #3; research 04:61-80; Daniel 2026-08-03 |
| FR-TOOL-002 | tool | Media surfaces: asset conventions documented, real personal assets exist and render in the viewer by role (failure photos labelled as such); source-book media never enters the repo | FEAT-TOOL-002; core $defs/media (v0.1) |
| FR-TOOL-003 | tool | The viewer consumes the TS Calculus through the engine seam: scale control gated on the clamp capability (refusals shown with authored pt/en reasons) and a derived schedule view — zero engine-interface changes | FEAT-TOOL-001 playground phase (partial) + FEAT-CALC-002; ADR-002 |
| FR-PR-004 | protocol-core | Decode-compatibility CI fixtures, bidirectional: a frozen v0.1-era reader tolerates v0.3 documents; the current reader decodes v0.1 documents; the gate provably CAN fail | FEAT-CORE-003; #14; eng. obligation #2 |

## Acceptance Criteria

<!-- Source of truth: the .yaml sidecar. -->

| ID | Given / When / Then |
|----|---------------------|
| AC-CALC-001-1 | Given every v0.2 refusal case in the acceptance sweep, when re-run through the Calculus, then accept/refuse outcomes and authored reasons are identical — and the throwaway clamp is deleted |
| AC-CALC-001-2 | Given the Calculus spec, when reviewed, then every exported function has domain, unit and edge semantics defined (zero, min_batch floors, ratio invariance, fixed-scaling asymmetry) — no behaviour exists only in code |
| AC-CALC-002-1 | Given the full Calculus vector set, when both implementations replay it in CI, then both are green — equivalence is mechanical, not claimed |
| AC-CALC-002-2 | Given the enumerated edge classes (unit boundaries, guard combinations, fixed-quantity refusals, min_batch, ratio invariance, timeline arithmetic), when coverage is checked, then every class has vectors — checked mechanically, not by intention |
| AC-CALC-003-1 | Given the torta example, when ordering derivation runs, then the mise-en-place order and an interleaved schedule with start offsets emerge — pinned by vectors in both implementations |
| AC-CALC-003-2 | Given an entremet-class fixture (multi-day, parallel tracks), when the schedule derives, then component start times respect the DAG and duration windows — vectors, both implementations |
| AC-TOOL-002-1 | Given the documented asset conventions, when a private document references a personal photo, then the viewer renders it locally; example placeholder URIs are resolved or explicitly marked absent |
| AC-TOOL-002-2 | Given media roles, when rendered, then failure media is visibly labelled as failure reference; and no repo asset originates from a source book (reviewed attestation) |
| AC-TOOL-003-1 | Given an engine declaring the clamp capability, when the user scales past a critical bound, then the authored pt/en refusal renders; without the capability the control does not exist |
| AC-TOOL-003-2 | Given the schedule view on the torta, when rendered, then it shows derived start offsets; the mock-engine test proves a capability-richer engine changes zero UI code |
| AC-PR-004-1 | Given the frozen v0.1-era reader, when it decodes every v0.3 document, then unknown fields are tolerated per VERSIONING.md; and the current reader decodes all v0.1-tagged documents — both directions in CI |
| AC-PR-004-2 | Given a deliberately breaking fixture (new required field without default), when the compat gate runs, then it FAILS — the gate is proven able to fail |

## Solution References

- [ROADMAP.md](../ROADMAP.md) v1 table — the adopted cut
- [features.yaml](../features.yaml) — four graduating features
- `tools/rcplint/clamp.go` + `clamp_test.go` — the throwaway being replaced; its refusal cases are the parity oracle
- `tools/viewer/conformance/` — the vector mechanism's proven precedent (L1, v0.2)
- [ADR-002](../../architecture/decisions/ADR-002-viewer-engine-seam-bun.md) — the seam the TS Calculus enters through
- `docs/research/CONCLUSIONS.md` §7 — the founding obligations this PRD discharges

## Protections

- **SP-001** — Fail-closed parity: the clamp→Calculus replacement changes
  no refusal outcome and no authored reason; safety semantics survive
  verbatim (DECISIONS #15).
- **SP-002** — ADDITION-only continues: every document valid at rcp-v0.2
  remains valid throughout v0.3.
- **SP-003** — Engine-seam stability: `RcpEngine` version 1 is unchanged;
  new powers arrive only as additive capabilities (ADR-002's no-rewrite
  guarantee keeps holding).
- **SP-004** — Media boundary: licence field stays required; personal
  assets only; source-book media never enters the repo in any form.

## Open Questions

- **OQ-1** — TS Calculus packaging: inside tools/viewer (zero new
  surface) vs a separate package both viewer and future apps consume —
  and its interplay with the 2-dep budget. SPEC decides.
- **OQ-2** — Timeline vector format: offsets from t0 vs absolute
  wall-clock anchors; granularity of duration-window arithmetic
  (min/target/max propagation). SPEC decides.
- **OQ-3** — Media asset conventions: co-located per-document assets vs
  a collection-level directory; how the single-file viewer references
  local assets under its CSP. SPEC decides.
- **OQ-4** — The frozen v0.1-era reader: pinned schema snapshot from the
  tag vs a generated minimal decoder. SPEC decides.

## Evidence & Discovery

Direct: the clamp's own AC labels it throwaway; the L1 conformance-vector
mechanism shipped in v0.2 and held (the JS engine agreed with rcplint on
first replay — the mechanism this PRD scales up is proven); Daniel's
2026-08-03 viewer review produced the ordering/timeline demand and the
when-vs-how ownership split (FEAT-CALC-002); example documents reference
media assets that do not exist. Hypothesis, honestly labelled: how much
value media rendering returns for a collection of five — taken at
conventions-plus-rendering cost only. Riskiest assumption (recorded):
conformance vectors buy real equivalence, not false confidence — vector
COVERAGE is the risk; mitigated by AC-CALC-002-2's mechanical
edge-class coverage check rather than good intentions.

---

**Sidecar:** [PRD-003-rcp-v03-protocol-computes.yaml](./PRD-003-rcp-v03-protocol-computes.yaml)

**Next steps:**
- Review the draft, flip status to accepted when ready
- Write the technical spec: `/edikt:sdlc:spec PRD-003`
- Re-score anytime: `/edikt:sdlc:prd-review PRD-003`

*This PRD follows the edit-in-place lifecycle model.*
