---
type: plan
id: PLAN-rcp-v01
model: claude-sonnet-4-6
implements: SPEC-001
phases:
  - id: 1
  - id: 2
  - id: 3
  - id: 4
  - id: 5
  - id: 6
  - id: 7
  - id: 8
    model: claude-opus-4-6
  - id: 9
  - id: 10
---

# Plan: RCP v0.1 build

## Overview
**Task:** Implement SPEC-001 (RCP v0.1): hardened frozen core, registry formats + seed, slug migration, 2 hardened + 5 draft profiles, two-layer Go harness (rcplint) with CUE, throwaway safety clamp, versioning doc + rcp-v0.1 tag.
**Total Phases:** 10
**Estimated Cost:** ~$1.60
**Created:** 2026-08-02
**Execution mode:** autonomous run-through (Daniel's choice); evaluator gates each phase.

## Progress

| Phase | Status | Attempt | Updated |
|-------|--------|---------|---------|
| 1     | in-progress | 1/5 | 2026-08-02 |
| 2     | pending | 0/5 | - |
| 3     | pending | 0/5 | - |
| 4     | pending | 0/5 | - |
| 5     | pending | 0/5 | - |
| 6     | pending | 0/5 | - |
| 7     | pending | 0/5 | - |
| 8     | pending | 0/5 | - |
| 9     | pending | 0/5 | - |
| 10    | pending | 0/5 | - |

**IMPORTANT:** Update this table as phases complete. This table is the persistent state that survives context compaction.

## Standing rules (apply to EVERY phase)

- **Defect freeze** (pre-flight findings #5/#8): the three known example defects — alentejano's `of: mm-feed` undeclared basis, nata's unconsumed `calda`, brownie's `version: 1` against unversioned ganache — MUST NOT be fixed before Phase 8's pre-fix lint report is committed. Slug migration (P5) rewrites slugs only.
- **Two-surface split** (SSP-001): normative = schema/, registry/, schema/VERSIONING.md, schema/constraints/*.cue; informative = tools/, Makefile, .github/. Never swap sides.
- Commit small per phase; message says why; cite CMP/DS/SR/AC ids; `git -c commit.gpgsign=false commit` (SSH signing hangs in-session).
- docs/research/ is append-only; never rewrite.
- Examples are the regression suite: every phase ends with its validation check green.

## Model Assignment
| Phase | Task | Model | Reasoning | Est. Cost |
|-------|------|-------|-----------|-----------|
| 1 | Core hardening | sonnet | schema surgery + fixtures | $0.08 |
| 2 | Registry schemas | sonnet | 3 new schemas, governance rules | $0.08 |
| 3 | Seed registry | sonnet | census fidelity matters | $0.08 |
| 4 | L1 harness + CI | sonnet | Go module, validator wiring | $0.08 |
| 5 | Slug migration | sonnet | mechanical + self-checks | $0.08 |
| 6 | Hardened profiles | sonnet | bounds-as-data design | $0.08 |
| 7 | Draft profiles | sonnet | 5 schemas from known fields | $0.08 |
| 8 | L2 linter + CUE + triage | opus | graph algorithms, CUE, triage | $0.80 |
| 9 | Safety clamp | sonnet | reuses P8 resolution | $0.08 |
| 10 | Versioning + tag | sonnet | policy prose + closeout | $0.08 |

## Execution Strategy
| Phase | Depends On | Parallel With |
|-------|-----------|---------------|
| 1     | None      | 2             |
| 2     | None      | 1             |
| 3     | 1, 2      | -             |
| 4     | 1, 3      | -             |
| 5     | 4         | -             |
| 6     | 5         | -             |
| 7     | 5         | 6             |
| 8     | 6, 7      | -             |
| 9     | 8         | -             |
| 10    | 9         | -             |

Waves: W1: 1,2 · W2: 3 · W3: 4 · W4: 5 · W5: 6,7 · W6: 8 · W7: 9 · W8: 10.

## Artifact Flow

| Producing Phase | Artifact | Consuming Phase(s) |
|-----------------|----------|---------------------|
| 1 | hardened `schema/rcp-core-v1.schema.json`, `tools/rcplint/testdata/l1/*`, `tools/rcplint/scripts/check.py` | 4, 6, 8 |
| 2 | `registry/schemas/*.schema.json`, `tools/rcplint/testdata/registry/*` | 3, 4, 8 |
| 3 | `registry/entries/**/*.yaml` | 4, 5, 8 |
| 4 | `tools/rcplint/` (L1), `Makefile`, `.github/workflows/validate.yml` | 5–10 |
| 5 | migrated `examples/*.rcp.yaml` + `docs/plans/rcp-v01-slug-mapping.md` | 6–10 |
| 6 | `schema/profiles/{bread,pastry}.schema.json` | 8 |
| 7 | `schema/profiles/{ferment,preserve,drink,coffee,component}.schema.json` | 8 |
| 8 | `rcplint lint`, `schema/constraints/*.cue`, `testdata/l2/* testdata/cue/*`, defect fixes/waivers | 9, 10 |
| 9 | `rcplint clamp`, `testdata/clamp/*` | 10 |
| 10 | `schema/VERSIONING.md`, tag `rcp-v0.1` | — |

## Known Risks
- CUE not installed at plan time — Phase 8 installs `cue` via `go install cuelang.org/go/cmd/cue@latest` (kept out of go.mod; not counted in SAC-VAL-002's dep budget).
- python `jsonschema` (P1–P3 stopgap checks) may diverge from santhosh-tekuri v6 on 2020-12 edges; P4 re-verifies all earlier fixtures under the Go harness (pre-flight #2/#4).
- P8 (opus, triage decisions) is the highest-variance phase; maxIterations 5.

---

## Phase 1: Core schema hardening

**Objective:** Harden `schema/rcp-core-v1.schema.json` per DS-PR-002/003/004 and single-source chucrute's safety data. (CMP-PR-002; SR-PR-002; FEAT-CORE-002)
**Model:** `sonnet` · **Max Iterations:** 5 · **Completion Promise:** `PHASE 1 COMPLETE` · **Evaluate:** true · **Dependencies:** None
**Context Needed:**
- `schema/rcp-core-v1.schema.json` — the file being hardened
- `examples/other-categories.rcp.yaml` — chucrute document (safety refactor target)
- `docs/product/specs/SPEC-001-rcp-v01-implementation/spec.yaml` — DS-PR-002/003/004, SR-PR-002
- `docs/product/specs/SPEC-001-rcp-v01-implementation/fixtures.yaml` — l1 fixture definitions

**Acceptance Criteria:**
- [ ] AC-1.1 Hardened schema passes 2020-12 metaschema validation
- [ ] AC-1.2 Committed check script (python jsonschema, FormatChecker on) rejects `testdata/l1/constraint-no-bounds.rcp.yaml` and `ratio-without-of.rcp.yaml`
- [ ] AC-1.3 Same script validates all six example documents against hardened core
- [ ] AC-1.4 Chucrute's profile block carries no numeric safety bounds — grep clean; bounds live only on the salt ingredient constraint
- [ ] AC-1.5 Defect freeze holds: `mm-feed` present; calda unconsumed; ganache unversioned

**Prompt:**
```
Implement CMP-PR-002 (SR-PR-002; DS-PR-002/003/004):
1. $defs.constraint: add anyOf requiring ≥1 of min_ratio/max_ratio/min_value/max_value;
   add dependent requirement: `of` required when min_ratio or max_ratio present.
2. $defs.ingredient.item: type becomes union (slug | null); update description —
   null marks unresolved import (lint warning later, never schema error); raw survives.
3. Chucrute single-sourcing: profile.safety_gate must reference the constraint-carrying
   ingredient by id (e.g. safety_refs: [sal]) and hold NO numbers; the pH endpoint stays
   (process target). Update the schema's ferment-profile expectations only via prose/
   description — profile schema itself lands in P7.
4. Author testdata/l1 fixtures (constraint-no-bounds, ratio-without-of) + commit
   tools/rcplint/scripts/check.py (python, jsonschema, FormatChecker enabled) validating
   schema metaschema + fixtures rejected + six examples green.
DO NOT touch mm-feed / calda / ganache-version defects (standing rule).
Commit citing CMP-PR-002. When complete, output: PHASE 1 COMPLETE
```

---

## Phase 2: Registry entry schemas

**Objective:** Create the three registry entry JSON Schemas + registry negative fixtures. (CMP-REG-001; SR-REG-001; FEAT-REG-001)
**Model:** `sonnet` · **Max Iterations:** 5 · **Completion Promise:** `PHASE 2 COMPLETE` · **Evaluate:** true · **Dependencies:** None (parallel with 1)
**Context Needed:**
- `docs/guidelines/registry-governance.md` — the 15 directives (required fields, ID rules)
- `docs/product/specs/SPEC-001-rcp-v01-implementation/spec.yaml` — SR-REG-001 field lists
- `docs/research/00-PROPOSAL-rcp-v1.md` §registry — equipment profile shape, ParamSpec

**Acceptance Criteria:**
- [ ] AC-2.1 `registry/schemas/{ingredient-class,step-primitive,equipment-profile}.schema.json` exist, metaschema-valid
- [ ] AC-2.2 Check script rejects `ingredient-missing-roles.yaml` naming the field; accepts a valid sample entry
- [ ] AC-2.3 All three schemas enforce `^(ingredient|primitive|equipment)\.` id pattern
- [ ] AC-2.4 `filename-id-mismatch` fixture authored (consumed by P8 lint rule)

**Prompt:**
```
Implement CMP-REG-001 (SR-REG-001). ingredient-class: required id/kind/display_name{pt,en}/
definition/roles[]; optional density, allergens (EU FIC 14 closed enum), aliases,
cross-refs (foodon/fdcId/off/gtin). step-primitive: required id/v≥1/display_name/
definition/param_spec; description records "new capability = new id". equipment-profile:
required id/kind/display_name/definition/parameters. All ids match
^(ingredient|primitive|equipment)\.[a-z0-9][a-z0-9.-]*$ (DECISIONS #23). Author
testdata/registry fixtures (ingredient-missing-roles, filename-id-mismatch, one valid
sample per kind) and extend scripts/check.py to cover them.
Commit citing CMP-REG-001. When complete, output: PHASE 2 COMPLETE
```

---

## Phase 3: Seed registry

**Objective:** One governed entry file per census id (30 ingredient / 24 primitive / 6 equipment + endpoint-test & stage vocabulary decision). (CMP-REG-002 part; SR-REG-002; FEAT-REG-002)
**Model:** `sonnet` · **Max Iterations:** 5 · **Completion Promise:** `PHASE 3 COMPLETE` · **Evaluate:** true · **Dependencies:** 1, 2
**Context Needed:**
- The census (examples inventory 2026-08-02) — enumerated in the phase prompt appendix of spec.yaml SR-REG-002 and recoverable by scanning `examples/*.rcp.yaml`
- `registry/schemas/*.schema.json` — from P2
- `docs/guidelines/registry-governance.md` — naming + required fields

**Acceptance Criteria:**
- [ ] AC-3.1 Every census id has `registry/entries/<kind>/<id>.yaml` with matching id field (filename = id)
- [ ] AC-3.2 All entries validate against their P2 schema (check script)
- [ ] AC-3.3 Bidirectional census cross-check committed: no orphan entries, no missing entries (vs post-migration prefixed ids)

**Prompt:**
```
Implement seed registry (SR-REG-002). Derive the census by scanning examples/ for every
item, primitive.id, equipment slug, trigger action (burp), endpoint test, temperature
stage. Create kind-prefixed entries (ingredient.flour.wheat.t65 etc.) — one YAML per
entry under registry/entries/{ingredient,primitive,equipment}/, filename = id, honoring
required fields (roles from the role enum for ingredients; pt/en display names, pt-PT
terms exact: massa velha ≠ isco). DECIDE and RECORD (in the commit + a NOTE in
registry/entries/README.md) where endpoint tests and temperature stages live —
recommendation: primitive-adjacent vocabulary entries under registry/entries/primitive/
as test.* / stage.* ids OR documented core enums; pick one, record why (closes the
SPEC's NEEDS CLARIFICATION). Extend check.py with the bidirectional cross-check.
Commit citing CMP-REG-002. When complete, output: PHASE 3 COMPLETE
```

---

## Phase 4: L1 harness + CI

**Objective:** Go module `tools/rcplint` with L1 validate subcommand, Makefile, dormant CI; consumes P1–P3 fixtures under the real validator. (CMP-VAL-001; SR-VAL-001; DS-VAL-001 (adjusted)/002/005; FEAT-VAL-001)
**Model:** `sonnet` · **Max Iterations:** 5 · **Completion Promise:** `PHASE 4 COMPLETE` · **Evaluate:** true · **Dependencies:** 1, 3
**Context Needed:**
- `docs/product/specs/SPEC-001-rcp-v01-implementation/spec.yaml` — SR-VAL-001, SAC-VAL-001/002, DS-VAL-001 adjusted (missing-profile = core-only + warning, permanent)
- `tools/rcplint/testdata/` + `scripts/check.py` — fixtures to re-verify in Go
- `docs/architecture/decisions/ADR-001-harness-language-go.md` — validator choice, dep budget

**Acceptance Criteria:**
- [ ] AC-4.1 `make validate` exits 0 (pre-migration examples core-only + no-profile warnings + registry entries validated)
- [ ] AC-4.2 Broken-example negative run: non-zero exit naming file + JSON pointer
- [ ] AC-4.3 `go build ./... && go vet ./...` clean
- [ ] AC-4.4 ≤3 direct deps in go.mod
- [ ] AC-4.5 l1 + registry fixtures re-verified under Go harness; fixtures.yaml records flipped aspirational→characterized with verified_by
- [ ] AC-4.6 Output shows 6 documents (multi-doc YAML validated individually)

**Prompt:**
```
Implement CMP-VAL-001. Go module tools/rcplint (go 1.26): `rcplint validate` loads
schema/rcp-core-v1.schema.json via github.com/santhosh-tekuri/jsonschema/v6 (format
assertions ON) behind a small Validator interface (DS-VAL-002); validates every YAML
document in examples/ (multi-doc files split; YAML→JSON via one YAML lib — stay ≤3
direct deps, SAC-VAL-002); composition core ∧ profile[kind] with DS-VAL-001-adjusted
semantics: no profile file → core-only + explicit "no profile for kind X" warning;
profile maturity printed when present. Also validates registry/entries/** against
registry/schemas. Errors: file + JSON pointer, non-zero exit. Makefile target
`validate`; .github/workflows/validate.yml runs it on push/PR. Port the check.py fixture
assertions into Go tests (testdata/l1, testdata/registry); on pass, flip those
fixtures.yaml records to characterized + verified_by. Commit citing CMP-VAL-001.
When complete, output: PHASE 4 COMPLETE
```

---

## Phase 5: Slug migration

**Objective:** Migrate all six examples to kind-prefixed slugs, with committed self-checks; harness green immediately after. (CMP-REG-003; SR-REG-003; DECISIONS #23; FEAT-REG-002)
**Model:** `sonnet` · **Max Iterations:** 5 · **Completion Promise:** `PHASE 5 COMPLETE` · **Evaluate:** true · **Dependencies:** 4
**Context Needed:**
- `examples/*.rcp.yaml` — migration targets
- `registry/entries/**` — the ids to migrate onto
- P1's chucrute safety_refs field — new slug-bearing field the mapping MUST enumerate (pre-flight #6)

**Acceptance Criteria:**
- [ ] AC-5.1 Zero bare slugs remain in examples/ (committed regex scan exits 0)
- [ ] AC-5.2 Bidirectional set-match example-refs ↔ registry entries exits 0
- [ ] AC-5.3 Committed structural-diff summary: only slug strings changed
- [ ] AC-5.4 `make validate` exits 0
- [ ] AC-5.5 Defect freeze holds (mm-feed/calda/ganache, prefixed forms)

**Prompt:**
```
Implement CMP-REG-003 (DS-REG-003). Author the old→new mapping table
(docs/plans/rcp-v01-slug-mapping.md) AFTER enumerating every slug-bearing field in the
current examples: ingredients[].item, primitive.id, step.equipment[],
executionMode.equipment, substitutions (with/replaces/requires_additions), overrides,
serving.garnish.item, profile safety_refs (P1's new field), endpoint tests + stages if
P3 made them registry entries. Apply mechanically in ONE commit whose message embeds the
mapping. Self-checks committed as a script: bare-slug regex scan, bidirectional
set-match, structural diff (yaml-aware: only string values changed). make validate green
after. mm-feed migrates to its prefixed spelling but stays UNDECLARED (defect freeze).
Commit citing CMP-REG-003 + AC-REG-002-3. When complete, output: PHASE 5 COMPLETE
```

---

## Phase 6: Hardened profiles (bread + pastry)

**Objective:** `schema/profiles/bread.schema.json` + `pastry.schema.json`, hardened, bounds as data. (CMP-PROF-001/002; SR-PROF-001/002; FEAT-PROF-001/002)
**Model:** `sonnet` · **Max Iterations:** 5 · **Completion Promise:** `PHASE 6 COMPLETE` · **Evaluate:** true · **Dependencies:** 5
**Context Needed:**
- `docs/research/03-bread-fermentation-domain.md` — basis rules, safety table, maintenance
- `docs/research/04-pastry-savoury-domain.md` — to_consistency, temperature shapes
- `docs/product/specs/SPEC-001-rcp-v01-implementation/spec.yaml` — SR-PROF-001/002; DS-VAL-003 adjusted (bounds live in profile schemas ONLY)

**Acceptance Criteria:**
- [ ] AC-6.1 Both schemas exist, metaschema-valid, `x-rcp-maturity: hardened`
- [ ] AC-6.2 Harness: alentejano passes core∧bread; nata + brownie pass core∧pastry incl. embedded bread component
- [ ] AC-6.3 Numeric bounds as data in profile schemas with authored reasons; no numbers in any .cue
- [ ] AC-6.4 `make validate` exits 0
- [ ] AC-6.5 Defect freeze holds

**Prompt:**
```
Implement CMP-PROF-001/002. Each profile: allOf-extends core (add/tighten, never
remove/redefine — SSP-002), x-rcp-maturity: hardened, and an x-rcp-bounds data block
holding the profile's numeric bounds WITH authored pt/en reasons (DS-VAL-003 adjusted:
these numbers appear NOWHERE else). Bread: flour-basis conventions (total-flour pivot,
include_components), maintenance-culture field rules (maintenance/min_batch/feed_ratio/
carried_over), salt ratio range + hydration sanity range from research 03. Pastry:
to_consistency handling, four temperature shapes, lamination/rest structures,
make-ahead/serve-within. Harness composition must now engage profiles for kinds
bread/pastry (component kind selection per document, incl. nata's embedded bread).
Enforcement of the numeric bounds themselves is P8's CUE work — this phase only encodes
them as data. Commit citing CMP-PROF-001/002. When complete, output: PHASE 6 COMPLETE
```

---

## Phase 7: Draft profiles ×5

**Objective:** ferment/preserve/drink/coffee/component draft schemas with maturity labels. (CMP-PROF-003; SR-PROF-003; FEAT-PROF-003)
**Model:** `sonnet` · **Max Iterations:** 3 · **Completion Promise:** `PHASE 7 COMPLETE` · **Evaluate:** true · **Dependencies:** 5 (parallel with 6)
**Context Needed:**
- `examples/other-categories.rcp.yaml` — observed profile blocks (negroni, chucrute, nata)
- `docs/research/05-drinks-domain.md`, `03-…` — field sources

**Acceptance Criteria:**
- [ ] AC-7.1 Five draft schemas exist, `x-rcp-maturity: draft`
- [ ] AC-7.2 Harness output shows `maturity: draft` for negroni + chucrute passes
- [ ] AC-7.3 `make validate` exits 0

**Prompt:**
```
Implement CMP-PROF-003. Five draft profile schemas from observed fields: ferment
(ferment_type, safety_refs — P1's referencing shape, vessel_headspace), drink
(abv_disclosure, dilution_model, batch_shelf_life), preserve/coffee/component (minimal
observed/researched fields; permissive additionalProperties — drafts). All
x-rcp-maturity: draft; harness prints maturity per validation. Commit citing
CMP-PROF-003. When complete, output: PHASE 7 COMPLETE
```

---

## Phase 8: L2 linter + CUE + defect triage

**Objective:** The semantic linter (DS-VAL-004 adjusted), CUE pipeline (DS-VAL-003 adjusted), evidence-protocol defect triage, first full-green. (CMP-VAL-002; SR-VAL-002; FEAT-VAL-001)
**Model:** `opus` · **Max Iterations:** 5 · **Completion Promise:** `PHASE 8 COMPLETE` · **Evaluate:** true · **Dependencies:** 6, 7
**Context Needed:**
- `docs/product/specs/SPEC-001-rcp-v01-implementation/spec.yaml` — DS-VAL-003/004 (both adjusted), SR-VAL-002
- `docs/product/specs/SPEC-001-rcp-v01-implementation/fixtures.yaml` — l2/cue fixture contracts
- `schema/profiles/*.schema.json` — bounds data the CUE layer reads

**Acceptance Criteria:**
- [ ] AC-8.1 Pre-fix lint report committed naming all 3 defects (file+pointer); example hashes match end-of-P7; fixes strictly after report commit
- [ ] AC-8.2 Each defect fixed or waived in a committed decision note; lint exits 0 after
- [ ] AC-8.3 Every testdata/l2 fixture fails for exactly its one rule (Go test asserts rule id)
- [ ] AC-8.4 `cue vet` wired into make validate; cue fixtures fail correctly; profile-bound violation names bound + authored source (AC-PROF-001-2)
- [ ] AC-8.5 disconnected-guard-path + step-cycle rejected naming combination/cycle (AC-VAL-002-3)
- [ ] AC-8.6 bare-slug rejected citing DECISIONS #23 (AC-REG-001-2)
- [ ] AC-8.7 Safety-single-sourcing lint rule + its new negative fixture (profile block containing a number) fails (AC-PR-002-2)
- [ ] AC-8.8 unused-ingredient reported (DS-VAL-004 adjusted)
- [ ] AC-8.9 Full `make validate` (L1+L2+CUE) exits 0 — first full green

**Prompt:**
```
Implement CMP-VAL-002. Install cue: go install cuelang.org/go/cmd/cue@latest (not in
go.mod). rcplint lint: resolution (item/primitive/equipment/of/uses/after vs registry +
declared bases + document structure), kind-prefix regex rule citing DECISIONS #23,
DAG completeness+termination per enumerated guard combination (cap: warn >3 options),
component cycle rejection, orphan-intermediate reporting, unversioned-pin reporting,
unused-ingredient reporting, safety-single-sourcing rule (profile blocks: no numeric
bounds — add its negative fixture), filename=id registry rule (SAC-REG-001, consumes
P2's fixture). CUE step: schema/constraints/*.cue with relation logic that READS bounds
from profile schemas' x-rcp-bounds (numbers never restated); wire cue vet into make
validate. EVIDENCE PROTOCOL (AC-8.1): run lint on unmodified examples FIRST, commit the
report (file+pointer for mm-feed/calda/ganache + sha256 of example files), THEN triage:
mm-feed → declare the basis in massa-mae component (fix); calda → wire syrup consumption
in nata assembly (fix); ganache pin → add version: 1 to ganache document (fix) — or
waive with recorded rationale if a fix breaks information-preservation; each disposition
in a committed decision note (docs/plans/rcp-v01-defect-triage.md). Author all remaining
l2 + cue fixtures per fixtures.yaml contracts; Go tests assert one-rule-per-fixture.
Flip verified fixture records to characterized. Commit(s) citing CMP-VAL-002.
When complete, output: PHASE 8 COMPLETE
```

---

## Phase 9: Safety clamp

**Objective:** `rcplint clamp` — throwaway fail-closed scaler guard. (CMP-SAFE-001; SR-SAFE-001; FEAT-SAFE-001)
**Model:** `sonnet` · **Max Iterations:** 5 · **Completion Promise:** `PHASE 9 COMPLETE` · **Evaluate:** true · **Dependencies:** 8
**Context Needed:**
- P8's resolution machinery (basis resolution in rcplint)
- `docs/product/specs/SPEC-001-rcp-v01-implementation/fixtures.yaml` — clamp-cases scenario

**Acceptance Criteria:**
- [ ] AC-9.1 `rcplint clamp --scale 0.6` on chucrute refuses with authored pt AND en reason
- [ ] AC-9.2 `--scale 1.5` accepted
- [ ] AC-9.3 warn-bound case: accepted WITH warning surfaced
- [ ] AC-9.4 alentejano `--scale 0.05`: refused/floored citing min_batch/maintenance
- [ ] AC-9.5 missing-quantity + unresolvable-basis cases refused (uncertainty default)
- [ ] AC-9.6 negroni (ratio-first) clamp run completes without unit assumptions; behavior documented
- [ ] AC-9.7 Clamp fixture records flipped to characterized

**Prompt:**
```
Implement CMP-SAFE-001 (DS-SAFE-001). rcplint clamp --scale N <file>[#docid]: resolve
severity: critical constraints at scaled values via P8's basis resolution; violation →
refuse, print authored reason (pt+en); warn severity → accept + surface; maintenance
components drawn-from not multiplied; min_batch floors; ANY uncertainty (unresolvable
basis, missing quantity) → refuse. Ratio-first documents (negroni): scale parts without
assuming mass units; document the behavior in the subcommand help. Author testdata/clamp
inputs (warn-bound, missing-quantity) + Go tests per fixtures.yaml clamp-cases (identity
rule: undeclared-basis file shared with l2 stays identical). Clamp is throwaway: state
it in help text; never presented as the Recipe Calculus (SSP-001). Commit citing
CMP-SAFE-001. When complete, output: PHASE 9 COMPLETE
```

---

## Phase 10: Versioning, tag, closeout

**Objective:** VERSIONING.md, annotated `rcp-v0.1` tag on green HEAD, artifact/status closeout. (CMP-PR-001; SR-PR-001; FEAT-CORE-001)
**Model:** `sonnet` · **Max Iterations:** 3 · **Completion Promise:** `PHASE 10 COMPLETE` · **Evaluate:** true · **Dependencies:** 9
**Context Needed:**
- `docs/research/02-format-standards-research.md` §475-560 — SchemaVer prescriptions
- DECISIONS #14, #21, #22 — the binding rules

**Acceptance Criteria:**
- [ ] AC-10.1 `schema/VERSIONING.md` covers $id scheme, `rcp` field semantics, SchemaVer rules, decode-compat policy
- [ ] AC-10.2 Annotated tag `rcp-v0.1` exists on a commit where `make validate` exits 0
- [ ] AC-10.3 Fresh-worktree `make validate` exits 0
- [ ] AC-10.4 Spec artifacts + relevant statuses flipped to implemented
- [ ] AC-10.5 Progress table: phases 1–9 done

**Prompt:**
```
Implement CMP-PR-001 (SR-PR-001). Write schema/VERSIONING.md: $id URL scheme
(https://paodeportugal.pt/schema/rcp/{MODEL}/...), rcp field = protocol MODEL (const per
major), SchemaVer-flavoured rules (MODEL bump when old docs stop validating;
additive-only within MODEL; no new required field without default; unknown-field
tolerance + x- preservation — DECISIONS #14 as binding change policy from this tag
forward). Verify full green, fresh-worktree check, then annotated tag rcp-v0.1 with a
message citing the DoD. Closeout: artifact headers → implemented; update plan progress;
update FEATURES ledger realized statuses only if PRD ship is run (leave to Daniel).
When complete, output: PHASE 10 COMPLETE
```
