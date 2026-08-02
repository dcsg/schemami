# PRD-001: RCP v0.1 protocol definition

**Status:** draft
**Rigor:** solo
**Author:** Daniel Gomes
**Created:** 2026-08-02T16:28:22Z
**Sidecar:** [PRD-001-rcp-v01-protocol-definition.yaml](./PRD-001-rcp-v01-protocol-definition.yaml) — structured data, source of truth

---

## Problem

Two failure states persist without this release. First, the codebase side:
five independent recipe representations with no shared type and three
divergent baker's-percentage implementations drift across surfaces — every
new feature multiplies the maintenance (documented first-hand in research
track 01; the CONCLUSIONS verdict calls convergence "justified by internal
evidence alone"). Second, the consumer side: Daniel's actual recipes stay
trapped in physical books — unscalable, unsearchable, uncookable with any
machinery. Without a validated protocol and a working harness there is no
correct target to converge on and no safe way to bring book recipes in.

RCP v0.1 is the first *defined* release of the protocol (scope fixed by
DECISIONS #22): frozen core, registry formats + seed, bread and pastry
profiles hardened, five draft profiles, a two-layer validation harness, and
a minimal fail-closed safety clamp. Definition of done: **a stranger could
take this repo, validate a new bread or pastry recipe with every registry
reference resolving, and be refused with a reason when a safety bound is
violated — without asking Daniel anything.**

## Users

Canonical personas: [docs/personas.md](../../personas.md) (RCP-scoped;
stable keys). Daniel is product owner and an n=1 instance of the
consumer/ingester personas — no founder persona exists (corrections 2/3).

| Persona | Story | Served by |
|---|---|---|
| `rcp.ingester.personal-collector` (primary v1) | As a personal-collection ingester, I want any recipe I capture to encode fully — roles, basis, facets — with nothing silently lost, so that it can be scaled, classified, and cooked from later. | FR-001–FR-006 |
| `rcp.cook.home-cook` | As a home cook mid-recipe on my phone, I want every valid recipe to render understandably on any surface — even one that only knows the core — so I can follow it without the surface knowing my recipe's category. | FR-001 (additive-profile guarantee), SP-001 |
| `rcp.dev.surface-engineer` | As an integrator building a surface, I want one validated format with an executable contract, so I never hand-write validation and my decode types never drift from the truth. | FR-007, FR-008, FR-010 |
| `rcp.registry.steward` | As the registry steward, I want vocabulary changes gated by process with stable append-only IDs, so published recipes keep resolving forever. | FR-002, FR-003 |
| `rcp.verifier.editorial` | As the safety boundary owner, I want safety-critical bounds to be data the machinery cannot silently violate, so a mis-extracted salt quantity is refused, never cooked. | FR-009, FR-010 |

## Goals

| Metric | Target | Counter-metric (must not move) |
|--------|--------|--------------------------------|
| **Encoding coverage** — % of attempted recipes (any category, from Daniel's real books) that encode fully in RCP with zero information loss and zero core-schema changes, classified via existing facets. Standing integrator guarantee: every valid document renders correctly (if incompletely) from core alone. | Numeric target set at dogfood start (OQ-3) | **Zero silent safety-bound violations** — every violation refused with a reason — and the six-example regression suite never goes red |

North star (verbatim): *"flexibility to ingest any recipe and easily
classify it, and allow integrators to manage and create interfaces that
users can easily follow and understand the recipes."*

## Non-Goals

- Hardening the five draft profiles (ferment, preserve, drink, coffee,
  dish) — v1 hardens ferment + dish per DECISIONS #18.
- The Recipe Calculus and cross-stack conformance vectors (v1 obligation,
  DECISIONS #13) — the v0.1 clamp is explicitly throwaway.
- The global substitution catalog content (v1, DECISIONS #17).
- The ingestion pipeline itself — app-side, out of protocol scope
  (DECISIONS #19/#21); v0.1 only makes its target format real.
- SPEC-009 prose — codified after v0.1 is exercised.
- Users, favorites, packs, publishing infrastructure (DECISIONS #19).

## Requirements

<!-- Source of truth: the .yaml sidecar. Mirror for human readability. -->

| ID | Requirement | Trace |
|----|-------------|-------|
| FR-001 | Core schema frozen as v0.1: versioning conventions documented; decode-compatibility rules bind from the freeze; git-tagged | #14, #21, #22; 02:475-560 |
| FR-002 | Registry entry JSON Schemas for IngredientClass, StepPrimitive (ParamSpec), EquipmentProfile, honouring all registry-governance directives | #16; guideline; 00 §registry |
| FR-003 | Seed registry resolves every reference in the six examples (30 ingredient classes, 24 primitives, 6 equipment, endpoint tests, stage `thread`); no ID minting outside governance | #22 DoD; inventory 2026-08-02 |
| FR-004 | Bread profile hardened (flour basis, maintenance cultures, safety bounds as data); Alentejano passes core ∧ bread | #18; research 03 |
| FR-005 | Pastry profile hardened (to_consistency, four temperature shapes, lamination/rest); nata + brownie pass core ∧ pastry | #18; research 04 |
| FR-006 | Draft profiles for ferment, preserve, drink, coffee, component/dish; negroni + chucrute validate; draft status machine-visible | #18 spec-all-7 |
| FR-007 | Layer-1 harness: ajv 2020-12, core ∧ profile[kind], one command, CI-able | #8; 07:38-81 |
| FR-008 | Layer-2 semantic linter: reference resolution, DAG per guard combination, cycles, CUE ratio bounds; catches the known example defects | #8 reaffirmed; 07:38-60 |
| FR-009 | Minimal fail-closed safety clamp: refuses critical-bound violations under scaling, reason shown; throwaway by design | #15, #22; 03:248-253 |
| FR-010 | Constraint/reference shape hardening: ≥1 bound required, item-null contradiction resolved, chucrute safety data single-sourced | #5; defect inventory |

## Acceptance Criteria

<!-- Source of truth: the .yaml sidecar. Given/When/Then; stable IDs flow to SPEC. -->

| ID | Given / When / Then |
|----|---------------------|
| AC-001-1 | Given the repo at the v0.1 tag, when a stranger reads schema/ + versioning docs, then version semantics and change rules are explicit without asking Daniel |
| AC-001-2 | Given a change adding a required field without default, when reviewed against freeze rules, then it is rejected citing the decode-compatibility contract |
| AC-002-1 | Given a registry entry missing a required field for its kind, when validated, then it is rejected with the field named |
| AC-002-2 | Given the slug convention conflict (bare vs `ingredient.`-prefixed), when v0.1 freezes, then exactly one convention is decided, recorded, and linter-enforced |
| AC-003-1 | Given the six examples unmodified, when Layer-2 resolution runs, then zero unresolved registry references remain |
| AC-003-2 | Given a recipe referencing an absent slug, when linted, then the failure names the missing entry — no silent pass, no minting |
| AC-004-1 | Given alentejano.rcp.yaml, when validated, then it passes core ∧ bread |
| AC-004-2 | Given a bread document violating a declared bound, when validated, then rejection names the bound and its source |
| AC-005-1 | Given nata + brownie, when validated, then both pass core ∧ pastry, embedded bread component included |
| AC-006-1 | Given negroni + chucrute, when validated, then both pass their draft profiles with draft status machine-visible |
| AC-007-1 | Given a fresh clone, when the documented command runs, then all six examples validate, exit 0 |
| AC-007-2 | Given a breaking edit, when the runner executes, then non-zero exit naming file + JSON pointer |
| AC-008-1 | Given the unmodified examples, when the linter first runs, then it reports mm-feed undeclared basis, calda orphan, ganache unversioned pin |
| AC-008-2 | Given linter findings, when v0.1 completes, then every known defect is fixed or explicitly waived — none silently passes |
| AC-008-3 | Given a guard combination yielding a disconnected DAG, when linted, then rejection names the combination and unreachable steps |
| AC-009-1 | Given chucrute scaled below 2% salt-of-vegetable, when the clamp evaluates, then refusal with the authored pt/en reason |
| AC-009-2 | Given any critical violation from scaling, when the clamp evaluates, then no code path silently accepts — refusal is default |
| AC-010-1 | Given a constraint with zero bound fields, when validated against hardened core, then rejected |
| AC-010-2 | Given hardened chucrute, when inspected, then 2%/pH-4.0 lives in one authoritative location, referenced elsewhere |

## Solution References

- `schema/rcp-core-v1.schema.json` — the executable strawman being frozen
- `examples/*.rcp.yaml` — six validated documents, the regression suite
- `docs/research/00-PROPOSAL-rcp-v1.md` — rationale for every core construct
- `docs/research/03-…` / `04-…` — bread and pastry profile content sources
- `docs/research/07-brainstorm-deep-dives.md` — the two-layer validation stack
- `docs/guidelines/registry-governance.md` — 15 compiled registry directives

## Protections

- **SP-001** — The 8 non-negotiable design decisions in CLAUDE.md hold for
  every v0.1 deliverable; reopening any requires an explicit DECISIONS.md
  entry. *(Candidate for promotion to Invariant Records.)*

## Open Questions

- **OQ-1** — Registry slug convention: bare (`flour.wheat.t65`, as all six
  examples use) or kind-prefixed (`ingredient.flour.wheat.t65`, as the
  governance guideline prescribes)? Blocks seed-registry authoring (FR-003).
- **OQ-2** — Harness implementation language (TypeScript assumed for ajv;
  decided in SPEC).
- **OQ-3** — Encoding-coverage target % and time-to-correct threshold: set
  at dogfood start (AT-3, criteria before running).
- **OQ-4** — Mechanism for marking draft profiles non-conformance-guaranteed.

## Evidence & Discovery

- Research track 01 (codebase inventory): five representations, three
  baker's-% implementations — first-hand internal evidence.
- Five bok expert reviews (product discovery, DDD, architecture, UX, ICP)
  attacked and confirmed the fundamentals; 22 confirmed decisions in
  `docs/research/DECISIONS.md`.
- Consumer path: n=1 stated behaviour (DECISIONS #11) — Daniel ingests from
  his own cookbooks. Broader demand is explicit hypothesis, gated behind
  AT-2/AT-4; v0.1 does not depend on it.

---

**Sidecar:** [PRD-001-rcp-v01-protocol-definition.yaml](./PRD-001-rcp-v01-protocol-definition.yaml) — structured data for FRs, ACs, status, and revision history.

**Next steps:**
- Write the technical spec: `/edikt:sdlc:spec PRD-001`
- Ship requirements as they complete: `/edikt:sdlc:prd PRD-001 ship FR-NNN`
- Review PRD quality anytime: `/edikt:sdlc:prd-review PRD-001`

*This PRD follows the edit-in-place lifecycle model.*
