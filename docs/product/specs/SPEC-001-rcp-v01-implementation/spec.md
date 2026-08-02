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

The how-layer is **addressable** ([traceability guideline](../../../guidelines/traceability.md)):
every design decision below is a `DS-<CODE>-NNN` statement in the sidecar's
`design.statements`, individually adjustable, with `serves:` linking it to
the SRs it realizes. Plans, commits, and future adjustments cite these ids.

- **DS-PR-001** — Two-surface split (DECISIONS #21): normative =
  `schema/` + `registry/` + `schema/VERSIONING.md` + `schema/constraints/*.cue`;
  informative = `tools/` + `Makefile` + `.github/`. An independent
  implementer needs only the normative surface.
- **DS-VAL-001** — Validation composes as core ∧ profile[kind]: one
  document, two schema evaluations, both must pass.
- **DS-PROF-001** — Profiles extend via allOf into the `profile` block;
  every profile schema carries `x-rcp-maturity`; the harness prints
  maturity on every validation (draft passes are labelled, never silent).
- **DS-VAL-002** — The L1 validator (santhosh-tekuri/jsonschema v6) sits
  behind a small internal interface so it can be swapped without touching
  callers; format assertions explicitly enabled.
- **DS-VAL-004** — L2 check set: reference resolution (item / primitive /
  equipment / `of:` / `uses:` / `after:`), DAG completeness + termination
  per enumerated guard combination, cycle rejection, orphan-intermediate
  and unversioned-pin reporting.
- **DS-VAL-003** — CUE as a pipeline step: constraints authored in
  `schema/constraints/*.cue` (normative artifacts), evaluated via
  `cue vet`; embedding stays a documented option (ADR-001).
- **DS-VAL-005** — One entry point: `make validate` = L1 + L2 + CUE;
  the CI workflow runs the same target, dormant until a remote exists.
- **DS-PR-002/003/004** — Core hardening shapes: constraint anyOf-bound +
  `of` required with ratios; `item` becomes (slug | null) with null a lint
  warning, not a schema error; safety single-sourcing (constraints
  authoritative, profile blocks reference by id, endpoints stay process
  semantics).
- **DS-REG-001/002/003** — File identity = entry identity (one YAML per
  entry, filename = id); the kind-prefix regex enforced in both entry
  schemas and linter; migration via a recorded mapping table in one
  reviewed commit, harness green immediately after.
- **DS-SAFE-001** — `rcplint clamp --scale N <file>`: refuse with authored
  pt/en reasons, refusal default on uncertainty, excluded from the
  normative surface.

## Components

Buildable units, addressable as `CMP-<CODE>-NNN` (sidecar
`design.components`; status tracks proposed → built):

| ID | Path | Realizes | Serves |
|----|------|----------|--------|
| CMP-PR-001 | `schema/VERSIONING.md` + tag `rcp-v0.1` | versioning + freeze | SR-PR-001 |
| CMP-PR-002 | `schema/rcp-core-v1.schema.json` | DS-PR-002/003/004 | SR-PR-002 |
| CMP-REG-001 | `registry/schemas/*.schema.json` | DS-REG-002 | SR-REG-001 |
| CMP-REG-002 | `registry/entries/{ingredient,primitive,equipment}/<id>.yaml` | DS-REG-001 | SR-REG-002 |
| CMP-REG-003 | `examples/*.rcp.yaml` migration change-set | DS-REG-003 | SR-REG-003 |
| CMP-PROF-001 | `schema/profiles/bread.schema.json` | DS-PROF-001 | SR-PROF-001 |
| CMP-PROF-002 | `schema/profiles/pastry.schema.json` | DS-PROF-001 | SR-PROF-002 |
| CMP-PROF-003 | `schema/profiles/{ferment,preserve,drink,coffee,component}.schema.json` | DS-PROF-001 | SR-PROF-003 |
| CMP-VAL-001 | `tools/rcplint/` + `Makefile` + workflow | DS-VAL-001/002/005 | SR-VAL-001 |
| CMP-VAL-002 | `rcplint lint` + `schema/constraints/*.cue` | DS-VAL-003/004 | SR-VAL-002 |
| CMP-SAFE-001 | `rcplint clamp` subcommand | DS-SAFE-001 | SR-SAFE-001 |

**Addressing & adjustment protocol:** plan phases and commits cite these
ids ("Phase 2 builds CMP-REG-002 per DS-REG-001, implements SR-REG-002").
Adjusting a DS is an edit-in-place with a revision_history entry naming the
id and flips its status to `adjusted`; its `serves:` SRs (and their ACs)
must be re-checked. After the spec is accepted, DS/CMP ids freeze like all
others — corrections happen by deprecate-and-add.

## Non-Goals

Deferred scope carries stable ids in the
[feature ledger](../../FEATURES.md):

- The Recipe Calculus and conformance vectors (FEAT-CALC-001, v1; the
  clamp is throwaway).
- Hardening ferment/preserve/drink/coffee/dish profiles (FEAT-PROF-004/
  005 v1, FEAT-PROF-006 post-v1; DECISIONS #18).
- Substitution catalog content (FEAT-SUB-001, v1; DECISIONS #17).
- Any ingestion tooling, services, or persistence (FEAT-APP-001..003;
  app-side, #19/#21).
- Embedding CUE in-process (design option DS-VAL-003, not a feature).
- Codegen (quicktype → Swift/TS) — FEAT-CORE-004, v1, once the schema is
  frozen; decode-compatibility CI fixtures alongside (FEAT-CORE-003).

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
