# RCP features

Source of truth: [features.yaml](./features.yaml) (full descriptions,
personas, ICP mapping). Top of the traceability chain:
**FEAT → FR (PRD) → SR/DS/CMP (SPEC) → plan → code.** Deferred and external
features carry no implementation ids until they graduate into a PRD
(`graduates_to:`), per the [traceability guideline](../guidelines/traceability.md).
Version mapping: [ROADMAP.md](./ROADMAP.md). Personas are stable keys from [personas.md](../personas.md); ICP-1 =
infrastructure (validated), ICP-2 = expansion (hypothesis, gated AT-2/AT-4).

## Shipped — v0.1 (`rcp-v0.1` · PRD-001 shipped 2026-08-02)

**FEAT-CORE-001 — Frozen, versioned core schema** → FR-PR-001
One schema for any category (roles, basis, DAG, bounds), frozen with binding
decode-compatibility rules — the single validated target replacing five
divergent representations. *surface-engineer, personal-collector · ICP-1*

**FEAT-CORE-002 — Hardened constraint & safety encoding** → FR-PR-002
Safety quantities as bounded data with authored reasons, encoded once and
referenced — a safety rule can't degrade into a comment. *editorial-verifier,
production-scaler, personal-collector · ICP-1*

**FEAT-REG-001 — Registry entry formats** → FR-REG-001
Document formats for the three shared vocabularies (ingredient classes,
versioned primitives with ParamSpecs, equipment profiles); stable
kind-prefixed append-only IDs. *registry-steward, surface-engineer · ICP-1*

**FEAT-REG-002 — Seed registry + slug migration** → FR-REG-002
Every slug the six examples use becomes a governed entry; examples migrate
to the prefixed convention; extraction can map or flag, never mint.
*registry-steward, personal-collector · ICP-1*

**FEAT-PROF-001 — Bread profile (hardened)** → FR-PROF-001
Total-flour basis across component trees, maintenance cultures (massa-mãe),
safety bounds as data — the category with real users today. *home-cook,
personal-collector · ICP-1*

**FEAT-PROF-002 — Pastry profile (hardened)** → FR-PROF-002
to_consistency quantities, four temperature shapes, lamination/rest,
make-ahead — proves the core generalizes (the nata: a pastry containing a
bread). *personal-collector, home-cook · ICP-1*

**FEAT-PROF-003 — Draft profiles ×5 + maturity** → FR-PROF-003
Ferment/preserve/drink/coffee/dish as honestly-labelled drafts
(x-rcp-maturity) — keeps the core checked against all seven categories
without five hardening costs. *surface-engineer, personal-collector · ICP-1*

**FEAT-VAL-001 — Two-layer validation harness** → FR-VAL-001, FR-VAL-002
Shape validation (core ∧ profile) + semantic linter (references, DAGs,
cycles, CUE ratio bounds); one command, CI-able — integrators inherit a
contract instead of hand-writing validation. *surface-engineer,
registry-steward · ICP-1*

**FEAT-SAFE-001 — Fail-closed safety clamp (throwaway)** → FR-SAFE-001
Scale past a critical bound and be refused with the author's reason —
makes "zero silent quantity errors" testable before the real Calculus.
*editorial-verifier, production-scaler, personal-collector · ICP-1*

## Deferred — v1

**FEAT-CALC-001 — Recipe Calculus + conformance vectors** (#13, #15)
The one library of cook-time pure functions (scale, basis, guards, clamps,
re-estimation), specified once with vectors proving TS/Swift/Go equivalent.
*surface-engineer, home-cook, production-scaler · ICP-1*

**FEAT-CORE-003 — Decode-compatibility CI fixtures** (#14)
Bidirectional old-reader/new-doc fixtures in CI — "data outlives code" made
mechanical. *surface-engineer · ICP-1*

**FEAT-CORE-004 — Codegen decode types (Swift/TS)** (#8)
Generated types from the frozen schema; apps decode, never validate.
*surface-engineer · ICP-1*

**FEAT-PROF-004 — Ferment profile hardened** (#18)
Brine/pH gates, headspace, burping, backslop — where fail-closed earns its
keep. *home-cook, editorial-verifier · ICP-1*

**FEAT-PROF-005 — Dish profile hardened** (#18)
Endpoint doneness, equipment branches, pan-geometry scaling, plated
composition — makes "any recipe" credible daily. *home-cook,
personal-collector · both ICPs*

**FEAT-SUB-001 — Global substitution catalog** (#9, #17)
Curated typed op-lists with method deltas and fail-closed guards; serves
the diaspora availability problem. *diaspora-substituter, home-cook · both*

**FEAT-REG-003 — Technique vocabulary, captured and documented** (00 D2b;
06 substitution anchors; #10 derived facet) — techniques graduate from the
v0.1 interim vocab (seeded + L2-enforced, previously the only unvalidated
vocabulary) to a governed registry kind: documented gestures, media
teaches-links, primitive tagging, substitution anchoring.
*home-cook, surface-engineer, personal-collector · ICP-1*

**FEAT-I18N-001 — Translation layer over English bases** (#24) — all
machine-read vocabulary English-base; localized display generalizes the
display_name{pt,en} pattern; integrations bind to stable identifiers.
*surface-engineer, home-cook · ICP-1*

**FEAT-REG-004 — Ontology grounding & cross-language matching** — FooDON/
FDC/OFF cross-refs; extraction proposes canonical English classes; ledger
groups by proposal (the cebola/onion fix). *registry-steward,
personal-collector · ICP-1*

**FEAT-REG-005 — Derived search index (edges + facets)** (#7, #10, #21) —
rebuildable rcp_edges projection + prefix/role/facet queries: find
cinnamon in any form. *home-cook, personal-collector, surface-engineer ·
ICP-1*

**FEAT-CORE-005 — Dogfood field additions** — times, difficulty, storage,
source detail: the ADDITION-class fields five real pages asked for.
Target: v0.2. *personal-collector, home-cook · ICP-1*

**FEAT-PUB-001 — Verified publish-time resolution** (#21, obligation 3)
resolver_version + content hashes pinned in published documents — resolver
bugs become identifiable, not permanent. *editorial-verifier,
surface-engineer · ICP-1*

**FEAT-TOOL-001 — RCP playground (validate + render, jwt.io-style)** —
paste a document, see validation verdicts, a rendered recipe, and a
clamp-guarded scaling slider; candidate: rcplint compiled to WASM so the
browser runs the exact CI validator (one implementation, zero drift, no
server). Proposed by Daniel 2026-08-02; graduates via its own PRD.
*surface-engineer, personal-collector, home-cook · both ICPs*

## Deferred — post-v1

**FEAT-PROF-006 — Preserve, drink, coffee hardened** (#18) — sequenced by
what the dogfood demands first. *home-cook, personal-collector · ICP-2*

**FEAT-SUB-002 — Pack/shelf projection format** (#10, #19) — the curation
layer; gated on AT-2/AT-4 expansion evidence, fake-door first.
*contributor, home-cook · ICP-2*

## External — app-side, never in this repo

**FEAT-APP-001 — Ingestion pipeline** (#11, #19, #21) — photo → extraction
→ review/correct → private recipe; the primary v1 content path; AT-3
dogfoods the protocol through it. *personal-collector, editorial-verifier ·
ICP-1*

**FEAT-APP-002 — Execution sessions + cook-along** (#16, #19) — targets in
the recipe, readings in session docs, checkpoint re-estimation. *home-cook,
production-scaler · ICP-1*

**FEAT-APP-003 — Users, favorites, collections, publishing infra** (#19) —
platform concerns of whatever app implements RCP. *contributor,
editorial-verifier · ICP-2*
