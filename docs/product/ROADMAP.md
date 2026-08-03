# RCP roadmap — features mapped to versions

View over [features.yaml](./features.yaml) (source of truth: statuses,
`realized_by`, traces live there). A feature enters a version by
graduating into that version's PRD; nothing is implemented without ids
(traceability guideline). ✅ = shipped and tagged.

## v0.1 — ✅ shipped (`rcp-v0.1`, PRD-001, 2026-08-02)

| Feature | Realized by |
|---|---|
| FEAT-CORE-001 Frozen, versioned core schema | FR-PR-001 |
| FEAT-CORE-002 Hardened constraint & safety encoding | FR-PR-002 |
| FEAT-REG-001 Registry entry formats | FR-REG-001 |
| FEAT-REG-002 Seed registry + slug migration | FR-REG-002 |
| FEAT-PROF-001 Bread profile (hardened) | FR-PROF-001 |
| FEAT-PROF-002 Pastry profile (hardened) | FR-PROF-002 |
| FEAT-PROF-003 Draft profiles ×5 + maturity | FR-PROF-003 |
| FEAT-VAL-001 Two-layer validation harness | FR-VAL-001/002 |
| FEAT-SAFE-001 Fail-closed safety clamp | FR-SAFE-001 |

*Post-tag accretions (ADDITION-class, no version bump): acceptance sweep,
edge-regression suite, technique vocabulary seed + L2 enforcement, gap
ledger, CUE reason surfacing, English-base taxonomy migration (#24),
ontology-paths rule, 6 + N governed registry mints from the dogfood.*

## v0.2 — SHIPPED: "what the dogfood taught" (PRD-002 → SPEC-002 → PLAN-rcp-v02)

Small, additive, demanded by the five ingested recipes — all delivered, tag `rcp-v0.2`:

| Feature | Why now (shipped) |
|---|---|
| FEAT-CORE-005 Dogfood field additions (times, difficulty, storage, source) | every book page asked for them |
| FEAT-PROF-005 Dish profile hardened | two real dish documents exist and run core-only |
| FEAT-REG-003 Technique vocabulary hardened | bulhão-pato, refogar, flambé arrived with demand |
| FEAT-REG-004 Ontology grounding & cross-language matching | the cebola/onion blindness |
| FEAT-I18N-001 Translation layer over English bases | pairs with REG-004 |
| **FEAT-TOOL-001 RCP viewer — lightweight first cut** | paste/drop → validate + render, static page; the WASM clamp-slider playground follows later (jwt.io move) |

*(Delivered per PLAN-rcp-v02: 9 phases, 4-lens pre-flight, one mint checkpoint. The viewer shipped as the ADR-002 engine seam — JS engine + conformance vectors now, WASM behind the same interface later. Plus unplanned wins the run surfaced: severity-aware bounds pipeline, English-base equipment refactor with deprecate+alias, provenance.notes.)*

## v0.3 — SHIPPED: "the protocol computes" (PRD-003 → SPEC-003 → PLAN-rcp-v03)

The engineering obligations became executable — tag `rcp-v0.3`:

| Feature | What shipped |
|---|---|
| FEAT-CALC-001 Recipe Calculus + conformance vectors | `calculus/SPEC.md` (public-normative, 10 functions, rule/WE ids) + frozen `calculus/vectors/` (21 vectors, coverage-gated); Go reference is the oracle |
| FEAT-CALC-002 Derived ordering & timeline | readingOrder / interleave / two-stage schedule (negative offsets = "start the day before"), proven on the multi-day entremet |
| FEAT-CORE-003 Decode-compatibility CI fixtures | frozen v0.1 reader ⇄ current core, both directions, inverted breaking fixture, struct-vs-pinned-tag mechanical diff |
| FEAT-TOOL-002 Media surfaces | `schema/MEDIA.md`, smuggle-proof attestation (self-testing), file-input ingress with magic-byte triage, all four types rendered, DECISIONS #27 boundary proven with real content |

*(Second implementation: the TS Calculus in the viewer replays every frozen
vector — equivalence is tested, not asserted. The viewer now scales
(fail-closed, authored refusals) and renders kitchen-plan schedules
("2 dias antes / véspera / no dia"). FEAT-CORE-006 media temporal
fragments captured for PRD-004.)*

## v1 — the heavyweights (PRD-004+)

| Feature | Trace |
|---|---|
| FEAT-CORE-004 Codegen decode types (Swift/TS) | #8 |
| FEAT-PROF-004 Ferment profile hardened | #18 |
| FEAT-SUB-001 Global substitution catalog | #9, #17 |
| FEAT-REG-006 Implicit preparations: mention → method (roux problem; PRD-004 candidate) | #7, #11, Daniel 2026-08-03 |
| FEAT-CORE-006 Media temporal fragments (video `#t=` ranges for techniques/sub-recipes; composes with REG-006) | Daniel 2026-08-03 |
| FEAT-PUB-001 Verified publish-time resolution | #21, obligation 3 |
| FEAT-REG-005 Derived search index (edges + facets) | #7, #10 |

## Post-v1 — gated or later

| Feature | Gate |
|---|---|
| FEAT-PROF-006 Preserve/drink/coffee hardened | sequenced by dogfood demand |
| FEAT-SUB-002 Pack/shelf projection format | AT-2/AT-4 expansion evidence |

## External — app-side, never in this repo

FEAT-APP-001 ingestion pipeline · FEAT-APP-002 execution sessions ·
FEAT-APP-003 users/collections/publishing (DECISIONS #19/#21)
