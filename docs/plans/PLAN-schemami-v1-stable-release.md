---
type: plan
id: PLAN-schemami-v1-stable-release
implements: SPEC-007
status: active
---

# Plan: Schemami v1 stable protocol release

## Overview

Deliver the stable Schemami v1 protocol before AI conversion or documentation
work. The plan is strictly serial because schema identity, exact quantities,
and cross-language behavior are one published compatibility boundary. Every
phase ends at a mandatory Daniel checkpoint with changed paths, exact command
results, inverted/refusal evidence, remaining risks, and next-phase scope.

No checkpoint implies a commit, tag, push, schema-host deployment, release, or
Pão de Portugal repository change. Those actions require their own explicit
approval and, for a release, all final gates.

## Status

| Phase | Status | Checkpoint |
|---|---|---|
| 0. Exact-wire closure | completed — ADR-004 through ADR-010 accepted | accepted SPEC-007 with no open wire choices |
| 1. Identity, schema graph, and clean cutover | completed — core/pack graph, canonical wire, and baseline inventory verified | Schemami-only core/pack schema graph |
| 2. Exact quantities and Recipe Calculus | completed — five-operation Go/TypeScript corpus and refusal gates verified | quantity algebra and UCUM conversion parity |
| 3. Local entities, evidence, and diagnostics | completed — registry-free rendering, evidence isolation, and diagnostic parity verified | registry-free capture and refusal boundary |
| 4. Tooling, viewer, packs, and repository rename | completed — full local DAG and isolated bootstrap proof verified | end-to-end Schemami-only runtime |
| 5. Conformance and release proof | in progress — local 14-artifact contract and 120-file candidate scope verified; candidate commit and HTTPS publication pending | clean-clone stable release evidence |

## Binding decisions and protected scope

- PRD-007, SPEC-007, ADR-004 through ADR-012, and the accepted field register
  bind implementation.
- Schemami v1 is a clean cutover. Do not ship a dual reader, compatibility
  alias, public migration tool, or deprecation window.
- Preserve unrelated/user-owned dirty work. Phase-owned edits must be reviewed
  against the initial dirty-path inventory; no bulk rename may overwrite a
  historical record or unrelated work.
- The protocol does not host recipes, translations, inference, or a mandatory
  catalog. Pão de Portugal remains an external future integrator and its
  checkout is not modified or used as a gate.
- JSON is canonical; YAML is a parse-equivalent authoring/import form. Quantity
  scalars and public results are canonical decimal strings with at most 16 total
  digits and four fractional digits; results never depend on floating tolerance
  or UI rounding.
- A green current RCP test is regression evidence only. It does not prove the
  new Schemami behavior until the test/fixture itself exercises the new wire.
- AI bridge and documentation-site PRDs remain after this release and cannot
  absorb work from these phases.

## Artifact flow

```text
Phase 0 accepted wire
        ↓
Phase 1 Schemami schemas + identity inventory
        ↓
Phase 2 quantity/calculus contract
        ↓
Phase 3 local entities/evidence/diagnostics
        ↓
Phase 4 tools/viewer/packs/full active rename
        ↓
Phase 5 shared conformance + clean-clone release proof
```

## Phase 0 — Close the exact wire contract

**Classification:** operational. **Implementation authority:** none.

The recipe-local ID grammar, minimum step/action boundary, elapsed-duration shape, grouped formulas,
16-total-digit/four-fractional-digit public result shape, round-half-to-even, operation boundary,
evidence boundary, extension rule, and structured-readiness deferral are accepted in ADR-004 through
ADR-010. The field register is the required implementation inventory. `endpoint` is not a v1 member;
completion conditions remain source-language step instructions. No permissive/free-form placeholder
is authorized.

Schema and runtime implementation may proceed only from accepted members. No implementation may infer
readiness semantics from Model 1 prose or fields.

**Completion:** `PHASE 0 COMPLETE SCHEMAMI V1 WIRE ACCEPTED`

## Phase 1 — Replace identity and publish the schema graph

**Classification:** testable. **Depends on:** Phase 0.

Create Schemami v1 core and pack schemas at the accepted `schemami.dev`
identifiers. Schemami v1 has no `kind`/`profile` wire, so no old category
profile may be renamed into the new graph. Replace `rcp: 1` with `schemami: "1"`, require
`content_language`, enforce string-only source prose, implement owner extension
rules, and change active filenames/suffixes/package identities. Remove the
normative central registry surface rather than renaming it into a new burden.

The accepted cutover inventory supplies the RCP baseline before replacement.
Phase 4 completes per-path removal/classification. Historical documents remain
historical; one negative fixture carries the legacy marker. Add schema identity,
language, extension, I-JSON, JSON/YAML parity, and JCS vectors.

**Completion:** `PHASE 1 COMPLETE SCHEMAMI SCHEMA GRAPH AND IDENTITY CUTOVER`

## Phase 2 — Implement exact quantities and conversion

**Classification:** testable. **Depends on:** Phase 1.

Implement the accepted `quantity` tagged union and canonical decimal parser.
Implement exactly the five accepted operations: `scale`, `resolve_formula`,
`convert_quantity`, `reading_order`, and `schedule`. Do not carry Model 1
constraints, minimum-batch, basis, clamp, or planning operations into v1 without
a later accepted Calculus contract. Add `convert_quantity` with the pinned UCUM
2.2 table, same-dimension/temperature arithmetic, resource bounds, and explicit
refusal.

Go and TypeScript replay one normative corpus for every quantity/formula kind, decimal
edge, scaling case, conversion, and refusal. Existing binary64/tolerance vectors
cannot be mechanically relabelled; each must be re-authored against the exact
contract and traced to a rule.

**Completion:** `PHASE 2 COMPLETE EXACT QUANTITIES AND UCUM CALCULUS VERIFIED`

## Phase 3 — Implement recipe-local semantics and honest partial capture

**Classification:** testable. **Depends on:** Phase 2.

Implement required ingredient `id`/`name`, recipe-local technique/equipment and
the accepted step-action boundary. Remove `item`, `proposed_class`, generic
terms, registry admission, and catalog-derived validity. Implement `sources`
and RFC 6901-targeted `evidence`; raw/confidence/source values never become
logic input.

Replace prose/localised error maps with operation result envelopes and stable
problem-type URIs. Add vectors proving unknown local concepts remain valid and
readable, duplicate/broken local references fail precisely, missing facts
refuse only dependent operations, and conflicting evidence cannot affect a
structured calculation.

**Completion:** `PHASE 3 COMPLETE LOCAL ENTITIES EVIDENCE AND REFUSALS VERIFIED`

## Phase 4 — Complete tools, packs, viewer, and active repository rename

**Classification:** testable. **Depends on:** Phase 3.

Update the Go module/CLI, TypeScript packages, viewer engine/rendering, pack and
resolution records, generated embedded artifacts, examples, historical-profile/CUE
bounds, Make/CI entry points, bootstrap manifests, and active product/status
documentation to Schemami. Remove central-registry runtime/loading/validation
paths and regenerate derived data from accepted Schemami sources.

The viewer must render source-language names, local techniques/equipment,
measured/range/open quantities, grouped ratios/percentages, and integrator-owned display units
without parsing evidence. Pack resolution remains explicit and offline; it does
not contain a vocabulary snapshot or perform global/network search.

Reconcile the cutover inventory: every active legacy occurrence is removed,
and every retained occurrence is classified historical or negative-fixture.

**Completion:** `PHASE 4 COMPLETE SCHEMAMI END TO END RUNTIME VERIFIED`

### Phase 4 checkpoint evidence — 2026-08-11

- `make ci` passed the pinned toolchain, Go, schema/example validation,
  conformance, offline pack, viewer/build, and clean-cutover stages.
- Go tests passed for the Schemami CLI, semantics, canonicalization, offline
  pack resolution, and Calculus.
- The viewer replayed 44 tests with 252 assertions across exact Calculus,
  registry-free local entities, rendering, scaling, escaping, and explicit
  predecessor refusal; the generated single-file artifact was byte-stable.
- `tools/bootstrap-test.sh` passed one isolated installation followed by a
  network-disabled second run without changing lock or cache bytes.
- `edikt gov compile --check --json` returned `status: ok` with no stale,
  bootstrap, lossless, or phase errors.
- The in-app browser security policy rejected direct `file:` navigation, so no
  visual-browser claim is included; browser behavior is covered by the active
  TypeScript engine/render tests and Phase 5 may add a permitted hosted check.

## Phase 5 — Prove and prepare the stable release

**Classification:** testable. **Depends on:** Phase 4.

Run the complete schema, semantic, Calculus, Go, TypeScript, viewer, pack,
canonicalization, governance, generated-artifact, privacy, and cutover gates.
Create the versioned `schemami-v1.0.0` release manifest and reproduce it from a
clean clone of the candidate commit with the pinned toolchain and no dirty
overlay or Pão checkout.

Verify every normative schema/vector/problem URL resolves immutably over HTTPS.
If hosting is not ready, the release remains a verified candidate and must not
be tagged as stable. Present the complete requirement-by-requirement evidence
ledger and request explicit approval before commit/tag/push/publication.

**Completion:** `PHASE 5 COMPLETE SCHEMAMI V1 STABLE RELEASE PROVEN`

## Risks and stop conditions

| Risk | Mitigation | Stop condition |
|---|---|---|
| Unresolved public wire semantics | Phase 0 one-at-a-time decisions | do not implement schema |
| Dirty work overwritten by broad rename | inventory + phase-owned path review | unexpected diff outside owned set |
| Registry assumptions survive indirectly | local-entity negative/admission vectors | unknown term blocks document |
| Float/tolerance or divergent rounding survives | shared decimal/tie corpus and forbidden-call audit | any tolerance or mismatched canonical result |
| Evidence becomes executable | conflicting-raw inverted vector | result changes from evidence only |
| Historical RCP material falsely relabelled | classified cutover ledger | unclassified occurrence |
| Published URLs mutable or unavailable | immutable HTTPS gate | no stable tag |
| Pão becomes release dependency | no-checkout/egress guard | gate reads Pão repository |

AI conversion, documentation/manual implementation, recipe hosting,
translation storage, density/mass-volume conversion, a global registry, and Pão
application implementation remain outside this plan.
