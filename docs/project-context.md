# RCP — Recipe Protocol — Project Context

## What This Is

RCP is a universal, machine-readable recipe protocol: one small core schema
plus per-category profiles able to encode bread, pastry, fermentation,
preserves, drinks, coffee and savoury cooking. A single renderer can rescale
quantities, substitute ingredients, and guide execution from it.

Status: research complete (6 tracks, 5 expert reviews), 22 decisions locked
in `docs/research/DECISIONS.md`, pre-implementation. v0.1 scope is decision
#22: frozen core + registry formats/seed + bread & pastry profiles +
validation harness + minimal fail-closed safety clamp. The protocol
(normative) is strictly separated from any implementation (informative) —
decision #21; users/favorites/packs/apps are out of scope — decision #19.

## Stack

JSON Schema 2020-12 (`schema/rcp-core-v1.schema.json`) + YAML-authored
example recipes (`examples/*.rcp.yaml`, six documents — the regression
suite) + Markdown research corpus. No build/test tooling yet: the validation
harness (ajv Layer 1 + semantic linter Layer 2, CUE-flavoured per decision
#8) is a v0.1 deliverable; its implementation language is chosen at SPEC
time.

## Architecture

Documents are the system of record. One core + additive per-category
profiles (`kind` selects the profile; profiles extend via allOf, never
remove core fields). Registry (ingredient classes, step primitives,
equipment profiles) is a formal bounded context from day one; Execution is
separate (targets in the recipe, readings in session documents). Safety-
critical quantities are bounded data enforced fail-closed. Reference
architecture (DDD context map) is informative only — see decision #21.

## Users

Canonical personas in `docs/personas.md` (RCP-scoped). Primary v1:
`rcp.ingester.personal-collector` — Daniel as product owner and n=1
dogfooder ingests recipes from his own cookbooks (photo → vision-LLM
extraction → review/correct → private recipe). No founder persona exists.
Imported book recipes are private/personal-use only; private-vs-published
is a first-class boundary.

---

*Initialized by edikt: 2026-08-02*


## Normative surface (updated 2026-08-03, SPEC-003)

Normative: `schema/` (core + profiles + VERSIONING.md + constraints),
`registry/`, `i18n/`, `calculus/` (SPEC.md + vectors — the Recipe
Calculus, engineering obligation #1). Informative: `tools/`, `Makefile`,
docs. The two-surface split is DS-PR-001; calculus/ joined in v0.3.
