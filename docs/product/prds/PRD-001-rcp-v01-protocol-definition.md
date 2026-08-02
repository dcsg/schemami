# PRD-001: RCP v0.1 protocol definition

**Status:** draft
**Rigor:** solo
**Author:** Daniel Gomes
**Created:** 2026-08-02T16:28:22Z
**Sidecar:** [PRD-001-rcp-v01-protocol-definition.yaml](./PRD-001-rcp-v01-protocol-definition.yaml) — structured data, source of truth

**ID scheme** ([traceability guideline](../../guidelines/traceability.md)):
FR-1xx `protocol-core` · FR-2xx `registry` · FR-3xx `profiles` ·
FR-4xx `validator` · FR-5xx `safety-clamp`. Component and trace cascade to
SPEC, artifacts, plans, and sidecars.

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
| `rcp.ingester.personal-collector` (primary v1) | As a personal-collection ingester, I want any recipe I capture to encode fully — roles, basis, facets — with nothing silently lost, so that it can be scaled, classified, and cooked from later. | FR-101, FR-102, FR-2xx, FR-3xx |
| `rcp.cook.home-cook` | As a home cook mid-recipe on my phone, I want every valid recipe to render understandably on any surface — even one that only knows the core — so I can follow it without the surface knowing my recipe's category. | FR-101 (additive-profile guarantee), SP-001 |
| `rcp.dev.surface-engineer` | As an integrator building a surface, I want one validated format with an executable contract, so I never hand-write validation and my decode types never drift from the truth. | FR-102, FR-401, FR-402 |
| `rcp.registry.steward` | As the registry steward, I want vocabulary changes gated by process with stable append-only IDs, so published recipes keep resolving forever. | FR-201, FR-202 |
| `rcp.verifier.editorial` | As the safety boundary owner, I want safety-critical bounds to be data the machinery cannot silently violate, so a mis-extracted salt quantity is refused, never cooked. | FR-102, FR-501 |

## Goals

| Metric | Target | Counter-metric (must not move) |
|--------|--------|--------------------------------|
| **Encoding coverage** — share of attempted recipes (any category, from Daniel's real books) that encode fully in RCP with zero information loss and zero core-schema changes, classified via existing facets | **≥90%**, with **median time-to-correct ≤10 min** from capture to validated cook-ready document (set 2026-08-02) | **Zero silent safety-bound violations** — every violation refused with a reason — and the six-example regression suite never goes red (the DECISIONS #23 slug migration is a recorded, reviewed change, not a breach) |

Standing integrator guarantee: every valid document renders correctly (if
incompletely) from core alone — the additive-profile rule.

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
- SPEC prose — codified after v0.1 is exercised.
- Users, favorites, packs, publishing infrastructure (DECISIONS #19).

## Requirements

<!-- Source of truth: the .yaml sidecar. Mirror for human readability. -->

| ID | Component | Requirement | Trace |
|----|-----------|-------------|-------|
| FR-101 | protocol-core | Core schema frozen as v0.1: versioning conventions documented; decode-compatibility rules bind from the freeze; git-tagged | #14, #21, #22; 02:475-560 |
| FR-102 | protocol-core | Constraint/reference shape hardening: ≥1 bound required, item-null contradiction resolved, chucrute safety data single-sourced | #5; defect inventory |
| FR-201 | registry | Registry entry JSON Schemas for IngredientClass, StepPrimitive (ParamSpec), EquipmentProfile, honouring all governance directives incl. kind-prefixed slugs (#23) | #16, #23; guideline; 00 §registry |
| FR-202 | registry | Seed registry resolves every reference in the six examples; examples migrated to kind-prefixed slugs; no ID minting outside governance | #22 DoD, #23; inventory 2026-08-02 |
| FR-301 | profiles | Bread profile hardened (flour basis, maintenance cultures, safety bounds as data); Alentejano passes core ∧ bread | #18; research 03 |
| FR-302 | profiles | Pastry profile hardened (to_consistency, four temperature shapes, lamination/rest); nata + brownie pass core ∧ pastry | #18; research 04 |
| FR-303 | profiles | Draft profiles for ferment, preserve, drink, coffee, component/dish, each carrying a machine-readable maturity field; negroni + chucrute validate | #18 spec-all-7; OQ-4 resolution |
| FR-401 | validator | Layer-1 harness: JSON Schema 2020-12, core ∧ profile[kind], one command, CI-able; language decided in SPEC (OQ-2) | #8; 07:38-81 |
| FR-402 | validator | Layer-2 semantic linter: reference resolution, DAG per guard combination, cycles, CUE ratio bounds; catches the known example defects | #8 reaffirmed; 07:38-60 |
| FR-501 | safety-clamp | Minimal fail-closed safety clamp: refuses critical-bound violations under scaling, reason shown; throwaway by design | #15, #22; 03:248-253 |

## Acceptance Criteria

<!-- Source of truth: the .yaml sidecar. Given/When/Then; stable IDs flow to SPEC. -->

| ID | Given / When / Then |
|----|---------------------|
| AC-101-1 | Given the repo at the v0.1 tag, when a stranger reads schema/ + versioning docs, then version semantics and change rules are explicit without asking Daniel |
| AC-101-2 | Given a change adding a required field without default, when reviewed against freeze rules, then it is rejected citing the decode-compatibility contract |
| AC-102-1 | Given a constraint with zero bound fields, when validated against hardened core, then rejected |
| AC-102-2 | Given hardened chucrute, when inspected, then 2%/pH-4.0 lives in one authoritative location, referenced elsewhere |
| AC-201-1 | Given a registry entry missing a required field for its kind, when validated, then it is rejected with the field named |
| AC-201-2 | Given any bare (non-kind-prefixed) slug in an entry or reference, when linted, then rejected citing DECISIONS #23 |
| AC-202-1 | Given the six examples after slug migration, when Layer-2 resolution runs, then zero unresolved registry references remain |
| AC-202-2 | Given a recipe referencing an absent slug, when linted, then the failure names the missing entry — no silent pass, no minting |
| AC-202-3 | Given the six examples rewritten to kind-prefixed slugs, when the full harness runs, then all six validate green — a recorded, reviewed migration with zero information loss |
| AC-301-1 | Given alentejano.rcp.yaml, when validated, then it passes core ∧ bread |
| AC-301-2 | Given a bread document violating a declared bound, when validated, then rejection names the bound and its source |
| AC-302-1 | Given nata + brownie, when validated, then both pass core ∧ pastry, embedded bread component included |
| AC-303-1 | Given negroni + chucrute, when validated, then both pass their draft profiles, harness surfacing maturity: draft from the profile schema |
| AC-401-1 | Given a fresh clone, when the documented command runs, then all six examples validate, exit 0 |
| AC-401-2 | Given a breaking edit, when the runner executes, then non-zero exit naming file + JSON pointer |
| AC-402-1 | Given the unmodified examples, when the linter first runs, then it reports mm-feed undeclared basis, calda orphan, ganache unversioned pin |
| AC-402-2 | Given linter findings, when v0.1 completes, then every known defect is fixed or explicitly waived — none silently passes |
| AC-402-3 | Given a guard combination yielding a disconnected DAG, when linted, then rejection names the combination and unreachable steps |
| AC-501-1 | Given chucrute scaled below 2% salt-of-vegetable, when the clamp evaluates, then refusal with the authored pt/en reason |
| AC-501-2 | Given any critical violation from scaling, when the clamp evaluates, then no code path silently accepts — refusal is default |

## Solution References

- `schema/rcp-core-v1.schema.json` — the executable strawman being frozen
- `examples/*.rcp.yaml` — six validated documents, the regression suite
- `docs/research/00-PROPOSAL-rcp-v1.md` — rationale for every core construct
- `docs/research/03-…` / `04-…` — bread and pastry profile content sources
- `docs/research/07-brainstorm-deep-dives.md` — the two-layer validation stack
- `docs/guidelines/registry-governance.md` — 15 compiled registry directives
- `docs/guidelines/traceability.md` — component bands + trace cascade

## Protections

- **SP-001** — The 8 non-negotiable design decisions in CLAUDE.md hold for
  every v0.1 deliverable; reopening any requires an explicit DECISIONS.md
  entry. *(Candidate for promotion to Invariant Records.)*

## Open Questions

- **OQ-2** — Harness implementation language: a SPEC (*how*) decision. The
  protocol-level *whats* are already fixed and must not be re-litigated by
  the harness choice — JSON Schema 2020-12 dialect, CUE-flavoured
  declarative constraints (DECISIONS #8). The SPEC must keep implementation
  choices from leaking normative requirements into the protocol.

*Resolved 2026-08-02:* **OQ-1** → DECISIONS #23, kind-prefixed slugs
(`ingredient.*` / `primitive.*` / `equipment.*`; example migration tracked
by AC-202-3). **OQ-3** → targets set: ≥90% encoding coverage, ≤10 min
median time-to-correct. **OQ-4** → machine-readable maturity field in each
profile schema (FR-303).

## Evidence & Discovery

- Research track 01 (codebase inventory): five representations, three
  baker's-% implementations — first-hand internal evidence.
- Five bok expert reviews (product discovery, DDD, architecture, UX, ICP)
  attacked and confirmed the fundamentals; 23 confirmed decisions in
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
