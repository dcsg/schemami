---
type: artifact
artifact_type: test-strategy
spec: SPEC-001
status: accepted
created_at: 2026-08-02T18:13:42Z
reviewed_by: qa
---

# Test Strategy — RCP v0.1 implementation

The system under test is the protocol's executable surface: schemas,
registry, and `rcplint`. The six example recipes are the standing positive
suite; every Layer-2 rule and clamp behaviour gets a dedicated negative
fixture (enumerated in [fixtures.yaml](./fixtures.yaml)). Everything runs
through one command (`make validate`) plus Go unit tests in `tools/rcplint`.

## Unit Tests (tools/rcplint)

| Component | What to test | Priority |
|---|---|---|
| L1 validator wrapper (DS-VAL-002) | core ∧ profile[kind] composition; error carries file + JSON pointer; format assertions enabled; maturity read from profile schema | high |
| Reference resolver (DS-VAL-004) | item/primitive/equipment/of/uses/after each resolve; missing → named failure (AC-REG-002-2); bare slug → rejected citing #23 (AC-REG-001-2) | high |
| DAG checker (DS-VAL-004) | connectivity + termination per guard combination; disconnected path names combination + unreachable steps (AC-VAL-002-3); cycle rejection | high |
| Orphan/pin reporters (DS-VAL-004) | produced-but-unconsumed intermediate reported (calda); version pin against unversioned target reported (ganache) | high |
| Clamp resolver (DS-SAFE-001) | resolved-value recomputation under scale; refusal carries authored pt/en reason (AC-SAFE-001-1); refusal on unresolvable basis/missing data (AC-SAFE-001-2) | high |
| Registry entry validation (SR-REG-001) | missing required field named (AC-REG-001-1); filename = id rule (SAC-REG-001) | medium |
| CUE step runner (DS-VAL-003) | `cue vet` invocation, exit-code propagation, constraint-failure surfacing | medium |

## Integration Tests

| Scenario | Components involved | Priority |
|---|---|---|
| `make validate` green on fresh clone (AC-VAL-001-1) | Makefile → rcplint L1+L2 → cue → all six examples + seed registry | high |
| First-run defect detection (AC-VAL-002-1) | linter vs the pre-fix examples: mm-feed, calda, ganache pin all reported | high |
| Slug migration round-trip (AC-REG-002-1, AC-REG-002-3) | migrated examples + seed registry → zero unresolved refs, all green | high |
| Safety single-sourcing inspection (AC-PR-002-2) | lint rule: profile safety blocks contain no numeric bounds, only ingredient-id references; chucrute's 2%/pH-4.0 verified single-sourced post-hardening | high |
| Broken-edit failure mode (AC-VAL-001-2) | mutated example → non-zero exit, file + JSON pointer named | high |
| Chucrute under-salt scale (AC-SAFE-001-1) | clamp on the real document at the real 2% bound | high |
| Bread/pastry profile pass (AC-PROF-001-1, AC-PROF-002-1) | alentejano, nata, brownie vs hardened profiles incl. embedded bread component | high |
| Draft-profile labelling (AC-PROF-003-1) | negroni + chucrute pass with visible maturity: draft | medium |
| Build hygiene (SAC-VAL-001/002) | go build + go vet clean; ≤3 direct deps | medium |

## Edge Cases

- Guard combinations: recipe with 2 options × equipment branch → all
  enumerated paths checked; soft cap (3 options) as lint rule.
- Maintenance components: massa-mãe (`maintenance: true`) drawn-from, not
  multiplied, under scale; `min_batch` floor respected by the clamp.
- Ratio-first recipes (negroni): no absolute quantities — basis resolution
  must not assume grams exist.
- `item: null` (post-hardening): unresolved import is a lint *warning*,
  never a schema error, and never resolves silently (DS-PR-003).
- Constraint with bounds but severity `warn` vs `critical`: only critical
  refuses; warn surfaces without blocking.
- Multi-document YAML (`other-categories.rcp.yaml`): five documents in one
  file all validated individually.
- The nata: `kind: bread` component inside `kind: pastry` parent — profile
  selection per component, not per file.

## Hard to Test

AC-PR-001-1 ("a stranger validates unaided") is approximated by the
fresh-clone CI run plus doc review — it never mechanically verifies.
AC-PR-001-2 (change rejected by policy) is a policy-review check against
VERSIONING.md, not a runnable test. Waivers (AC-VAL-002-2) are a process
check: each known defect ends fixed or recorded, verified at review time.

## Coverage Target

Every Layer-2 rule has ≥1 negative fixture that fails for exactly that
rule's reason (no overlapping causes; where two rules could both fire, the
fixture note states the precedence contract). Every PRD AC maps to at
least one unit or integration test above, except the process/judgment ACs
exempted in Hard to Test (AC-PR-001-1, AC-PR-001-2, AC-VAL-002-2). Go
coverage is a byproduct, not a target — fixture completeness is the
metric.
