---
type: spec
id: SPEC-001
title: RCP v0.1 implementation
status: draft
author: Daniel Gomes
implements: PRD-001
source_prd: PRD-001
source_brainstorm: null
source_prompt: null
created_at: 2026-08-02T17:23:44Z
references:
  adrs: [ADR-001]
  invariants: []
---

# SPEC-001: RCP v0.1 implementation

**Implements:** PRD-001 (RCP v0.1 protocol definition, accepted)
**Date:** 2026-08-02
**Author:** Daniel Gomes
**Sidecar:** [spec.yaml](./spec.yaml) — SRs, ACs, coverage; source of truth

---

## Summary

This spec turns PRD-001's ten requirements into a concrete build: harden and
freeze the core schema as protocol v0.1; give the registry its three entry
formats and seed it with everything the six examples reference (kind-prefixed
per DECISIONS #23, migrating the examples); write the bread and pastry
profiles hardened plus five drafts; and build `rcplint`, a Go tool providing
Layer-1 shape validation (JSON Schema 2020-12), the Layer-2 semantic linter
(with CUE constraints via the `cue` CLI), and the throwaway fail-closed
safety clamp. One command — `make validate` — exercises all of it, in CI via
a dormant GitHub workflow.

## Context

The protocol's research phase produced an executable strawman schema and six
validated examples but zero committed tooling: the ajv pipeline that caught
8 real bugs lived only on the originating research branch, so CLAUDE.md's
"re-validate examples" rule is currently unexecutable. Three defects are
known to be latent in the examples (an undeclared basis, an orphan
component, an unversioned pin) precisely because no linter exists to catch
them. The harness language was PRD-001's one open question (OQ-2); its four
recorded decision inputs — no backend to align with, agent-authored code,
CUE coupling, and the high bar against Node — resolve to **Go** in ADR-001.

## Existing Architecture

`schema/rcp-core-v1.schema.json` (764 lines, 2020-12) is the core, with a
`profile` extension point selected by the closed `kind` enum and an additive
allOf contract stated in its description. `examples/` holds 2 files / 6
recipe documents — the regression suite. `docs/guidelines/` carries compiled
directives for registry governance and traceability. There is no build,
test, or CI infrastructure; this spec introduces the first.

## Proposed Design

Two cleanly separated surfaces, per DECISIONS #21:

**Normative (the protocol):** `schema/` (core + `schema/profiles/`),
`registry/` (entry schemas + seed entries), `schema/VERSIONING.md`, and the
`.cue` constraint files. An independent implementer needs nothing else.

**Informative (tooling):** `tools/rcplint/` (Go), `Makefile`,
`.github/workflows/validate.yml`. Protected by SSP-001: nothing in `tools/`
may become a normative requirement.

Validation composes as: **Layer 1** — document validates against
core ∧ profile[kind] (profiles extend via allOf; draft profiles carry
`x-rcp-maturity: draft`, surfaced in output). **Layer 2** — `rcplint lint`:
reference resolution (registry, bases, uses, after), DAG
connectivity/termination per guard combination, cycle rejection,
orphan-intermediate and unversioned-pin reporting; then declarative
ratio-bound/field-relation checks authored in CUE, evaluated via `cue vet`
as a pipeline step (embedding CUE stays a documented option — ADR-001).
**Clamp** — `rcplint clamp --scale N file`: recompute `severity: critical`
constraints at the scaled resolved values; refuse with the authored pt/en
reason; refuse on uncertainty.

## Components

| Component | Path | SRs |
|---|---|---|
| Versioning doc + freeze tag | `schema/VERSIONING.md`, tag `rcp-v0.1` | SR-PR-001 |
| Core hardening | `schema/rcp-core-v1.schema.json` (constraint anyOf-bound + `of` with ratios; nullable `item`; safety single-sourcing) | SR-PR-002 |
| Registry entry schemas | `registry/schemas/{ingredient-class,step-primitive,equipment-profile}.schema.json` | SR-REG-001 |
| Seed registry | `registry/entries/{ingredient,primitive,equipment}/<id>.yaml` — one file per entry, filename = id | SR-REG-002 |
| Example slug migration | `examples/*.rcp.yaml` rewritten in place, one reviewed commit | SR-REG-003 |
| Bread profile (hardened) | `schema/profiles/bread.schema.json` | SR-PROF-001 |
| Pastry profile (hardened) | `schema/profiles/pastry.schema.json` | SR-PROF-002 |
| Draft profiles ×5 | `schema/profiles/{ferment,preserve,drink,coffee,component}.schema.json` | SR-PROF-003 |
| Harness L1 + CI | `tools/rcplint/` (Go, santhosh-tekuri/jsonschema v6), `Makefile`, `.github/workflows/validate.yml` | SR-VAL-001 |
| Linter L2 + CUE | `tools/rcplint` lint subcommand + `schema/constraints/*.cue` | SR-VAL-002 |
| Safety clamp | `rcplint clamp` subcommand (throwaway) | SR-SAFE-001 |

## Non-Goals

- The Recipe Calculus and conformance vectors (v1; the clamp is throwaway).
- Hardening ferment/preserve/drink/coffee/dish profiles (v1 hardens
  ferment + dish per DECISIONS #18).
- Substitution catalog content (v1, DECISIONS #17).
- Any ingestion tooling, services, or persistence (app-side, #19/#21).
- Embedding CUE in-process (documented option only).
- Codegen (quicktype → Swift/TS) — post-v0.1, once the schema is frozen.

## Alternatives Considered

### Harness in TypeScript/Node (ajv)
- **Pros:** ajv is the historical reference 2020-12 validator; same
  ecosystem as future TS consumers.
- **Cons:** npm dependency sprawl and supply-chain record fail the
  ecosystem-health criterion; interpreter + node_modules in CI; CUE only
  via CLI anyway.
- **Rejected because:** PRD-001 OQ-2 input (d) sets a very-strong-reasons
  bar for Node; ajv's edge is no longer unique (Go has santhosh-tekuri v6
  and Google's 2026 Go package), so the bar is not met. Full analysis in
  ADR-001.

### Harness in Python / Rust
- **Pros:** Python — simplest code, canonical `jsonschema` lib; Rust —
  fastest, minimal supply-chain risk.
- **Cons:** Python — interpreter + venv management in CI, moderate dep
  tree; Rust — heaviest toolchain for a repo-internal tool.
- **Rejected because:** Go matches their strengths (single binary, small
  dep surface) while adding CUE nativeness and Daniel's daily Go review
  fluency. ADR-001.

### Consolidated per-kind registry files
- **Pros:** 3 files instead of ~60; easier to eyeball.
- **Cons:** merge conflicts as entries grow; append-only discipline and
  PR-per-entry review (registry-governance) get harder; file identity ≠
  entry identity.
- **Rejected because:** one-file-per-entry makes the governance directives
  mechanically checkable (SAC-REG-001) and additions atomic.

### CUE embedded in the Go linter
- **Pros:** in-process evaluation, one binary, richer errors.
- **Cons:** couples the linter build to CUE's Go API surface; the CLI step
  keeps constraint files language-neutral artifacts of the protocol.
- **Rejected for v0.1:** CLI step first; embedding stays open (ADR-001) —
  revisit if error-reporting quality across the CLI boundary proves poor.

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation | Rollback |
|---|---|---|---|---|
| Solo-capacity: scope stalls before value (PRD's top risk) | v0.1 unfinished | medium | Build order = freeze → registry+migration → bread → L1 → L2 → pastry → drafts → clamp; every stage leaves the repo green and useful | Ship the completed prefix; defer rest to v0.2 |
| Slug migration corrupts an example | regression suite red | low | Migration is mechanical (mapping table), single commit, harness green required (AC-REG-002-3); git revert available | `git revert` the migration commit |
| Guard-combination DAG check explodes combinatorially | linter slow/wrong | low | Options are capped (soft cap 3/recipe per research 07); enumerate ≤2³ paths | Cap enforced as lint rule |
| santhosh-tekuri v6 gaps on 2020-12 edge features | false pass/fail | low | Examples + negative fixtures pin behaviour; format assertions enabled explicitly | Swap validator behind the same interface (Google's Go pkg as fallback) |
| Safety triple-encoding refactor changes chucrute semantics | safety regression | low | AC-PR-002-2 + AC-SAFE-001-1 test the exact numbers before/after | Revert schema change, keep constraint form |

## Security Considerations

No services, no auth, no user input beyond repo files. The safety-relevant
surface is correctness of the clamp (fail-closed, AC-SAFE-001-2) and the
linter's refusal to let bare/unknown registry references pass (no minting).
CI workflow uses read-only defaults; no secrets.

## Performance Approach

Standard patterns sufficient: six documents, ~60 registry entries;
everything runs in milliseconds. No caching, no optimization work.

## Acceptance Criteria

Source of truth: [spec.yaml](./spec.yaml). 20 PRD ACs pass through verbatim
(source: prd, IDs unchanged) + 3 spec-added:

- **SAC-VAL-001** — `go build ./... && go vet ./...` clean. Verify: command.
- **SAC-VAL-002** — dependency budget: ≤3 direct deps in `go.mod` (the
  ecosystem-health criterion made mechanical). Verify: command.
- **SAC-REG-001** — registry filename = entry id, for every entry. Verify:
  linter rule + review.

## Testing Strategy

The six examples are the positive suite (`make validate` green). Negative
fixtures under `tools/rcplint/testdata/`: one per Layer-2 rule (unresolved
ref, bare slug, disconnected guard path, cycle, orphan intermediate,
unversioned pin, zero-bound constraint) and per safety clamp case (chucrute
under-salt scale). The three known defects serve as the linter's first
real-world regression test (AC-VAL-002-1): the linter must find them before
they are fixed/waived. Hard to test: "a stranger validates unaided"
(AC-PR-001-1) — approximated by fresh-clone CI run + doc review.

## Dependencies

- ADR-001 (harness language: Go) — created with this spec.
- Registry-governance and traceability guidelines (compiled directives).
- DECISIONS #5, #8, #14–#18, #21–#23.
- External: Go toolchain, `cue` CLI, github.com/santhosh-tekuri/jsonschema/v6,
  a YAML parser (goccy/go-yaml or gopkg.in/yaml.v3) — within SAC-VAL-002's
  budget.

## Open Questions

- NEEDS CLARIFICATION (implementation-time, non-blocking): where the
  endpoint-test vocabulary (`float`, `poke`, `nappe`…) and temperature
  stages (`thread`…) live — registry entries or documented core enums.
  SR-REG-002 requires the choice be made and recorded during
  implementation; both satisfy the ACs.

## Protections

- **SP-001** (PRD): the 8 non-negotiables hold; reopening requires a
  DECISIONS entry.
- **SSP-001** (spec): nothing in `tools/` becomes normative; the protocol
  stays implementable from `schema/` + `registry/` + docs alone; the clamp
  is never presented as the Recipe Calculus.
- **SSP-002** (spec): profiles extend additively — never remove/redefine
  core fields; core-only consumers always render.

---

*Generated by edikt:spec — 2026-08-02*
