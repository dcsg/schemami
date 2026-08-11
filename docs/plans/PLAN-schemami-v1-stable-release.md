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
| 0. Initial exact-wire closure | completed historically; method boundary later superseded by ADR-014 | verified unpublished baseline contract |
| 1. Identity, schema graph, and clean cutover | completed historically — initial core/pack graph later superseded by the accepted embedded bundle | verified unpublished identity baseline |
| 2. Exact quantities and Recipe Calculus | completed — five-operation Go/TypeScript corpus and refusal gates verified | quantity algebra and UCUM conversion parity |
| 3. Local entities, evidence, and diagnostics | completed — registry-free rendering, evidence isolation, and diagnostic parity verified | registry-free capture and refusal boundary |
| 4. Tooling, viewer, packs, and repository rename | completed historically — initial pack runtime later replaced by the Phase 9 bundle runtime | verified unpublished runtime baseline |
| 5. Corrected baseline candidate proof | completed — `da8449f` passed repository and clean-clone proof; superseded before publication by ADR-014 | verified baseline, not stable release |
| 6. Structured-method product closure | completed — ADR-014 and aligned PRD/SPEC/plan boundary accepted | internally coherent requirements with implementation frozen |
| 7. Exact wire and field closure | completed — ADR-015 and simplified minimal-requiredness contract accepted | accepted JSON shapes, names, unions, standards, and collision vectors |
| 8. Active-graph and composition Calculus | completed — ADR-016 and exact operation/vector contract accepted | deterministic operations, composition, diagnostics, and resource floors |
| 9. Schema and cross-language implementation | completed — structured schema, embedded bundle, six operations, admission analysis, Go/TypeScript/viewer parity verified | `PHASE 9 COMPLETE STRUCTURED METHOD IMPLEMENTATION VERIFIED` |
| 10. Corpus and example migration | completed — canonical examples and permanent positive/adversarial cross-language vectors pass the full repository DAG | `PHASE 10 COMPLETE CORPUS AND EXAMPLES MIGRATED` |
| 11. Pão and Fornada dogfood | pending | two-adapter evidence against committed bytes |
| 12. Replacement release proof and publication | pending | clean-clone proof, immutable URLs, approval, tag, and publication |

## Binding decisions and protected scope

- PRD-007, SPEC-007, ADR-004 through ADR-014, and the accepted portions of the field register
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
Phase 1 initial Schemami schemas + identity inventory
        ↓
Phase 2 quantity/calculus contract
        ↓
Phase 3 local entities/evidence/diagnostics
        ↓
Phase 4 initial tools/viewer/package runtime/full active rename
        ↓
Phase 5 shared conformance + clean-clone release proof
        ↓
Phase 6 accepted method/variation/composition product contract
        ↓
Phase 7 exact wire and field closure
        ↓
Phase 8 active-graph/composition Calculus
        ↓
Phase 9 schema/runtime implementation
        ↓
Phase 10 corpus/example migration
        ↓
Phase 11 Pão + Fornada dogfood
        ↓
Phase 12 replacement proof + approved publication
```

## Phase 0 — Close the exact wire contract

**Classification:** operational. **Implementation authority:** none.

The recipe-local ID grammar, initial flattened step boundary, elapsed-duration shape, grouped formulas,
16-total-digit/four-fractional-digit public result shape, round-half-to-even, operation boundary,
evidence boundary, extension rule, and structured-readiness deferral are accepted in ADR-004 through
ADR-010. ADR-014 later superseded only the flattened method/readiness/closed-operation portions after
dogfood. This phase remains historical evidence for the unaffected wire; it is not current authority
for method, variation, completion, composition, or lineage. No permissive/free-form placeholder is
authorized.

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
Implement the baseline five accepted operations: `scale`, `resolve_formula`,
`convert_quantity`, `reading_order`, and `schedule`. Do not carry Model 1
constraints, minimum-batch, basis, clamp, or planning operations into v1 without
a later accepted Calculus contract. Add `convert_quantity` with the pinned UCUM
2.2 table, same-dimension/temperature arithmetic, resource bounds, and explicit
refusal.

This is the historical baseline implementation set. ADR-016 later adds
`resolve_selection` as the sixth operation for the replacement candidate.

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

Before rebuilding the candidate, incorporate the accepted Pão SPEC-013
dogfood corrections without changing the v1 marker: pairwise duration-window
ordering, non-recursive open guides, percentage basis exactly once at 100,
structured origin, ordered plural step techniques, non-empty supplied source
URIs, and standard-backed evidence fragment selectors. Replay the adversarial
inputs as inverted vectors in both runtimes. The replacement candidate commit,
schema digest, validation/Calculus conformance digests, and manifest supersede the unpublished
`884d584` candidate. Pão then updates its pin and dogfoods again; that replay is
adoption feedback, not a Schemami release prerequisite.

Verify every normative schema/vector/problem URL resolves immutably over HTTPS.
If hosting is not ready, the release remains a verified candidate and must not
be tagged as stable. Present the complete requirement-by-requirement evidence
ledger and request explicit approval before commit/tag/push/publication.

The committed `da8449f` candidate passed this proof for the corrected flattened
baseline, but it was never published and ADR-014 now supersedes its method
boundary. Preserve its evidence as a regression baseline; do not call it the
stable release.

**Completion:** `PHASE 5 COMPLETE CORRECTED BASELINE PROVEN NOT PUBLISHED`

## Phase 6 — Close structured-method product requirements

**Classification:** operational. **Depends on:** Phase 5 dogfood evidence.

Record ADR-014 and amend PRD-007, SPEC-007, field governance, test strategy,
and this plan. Distinguish explicitly authored recipe facts from application
baking intelligence and bake state. Freeze schema/runtime work. End with a
Daniel checkpoint containing only reviewed documentation changes and
governance results.

**Completion:** `PHASE 6 COMPLETE STRUCTURED METHOD PRODUCT CONTRACT ACCEPTED`

## Phase 7 — Close exact wire and field names

**Classification:** operational. **Depends on:** Phase 6.

Provide full JSON examples and nearest invalid neighbours for recursive
`sequence`, section/step/action nodes, typed inputs, closed predicates,
activation, completion, authored environment, strict substitution,
uses/produces, component output/yield references, bundles, and lineage. Audit
every new name against scope, type, standards, default, and collision rules.
The review artifact is
`docs/product/prds/artifacts/PRD-007/structured-method-wire-proposal.md` and
also covers the pre-publication singular-`formula` limitation exposed by
component composition.

ADR-015 records Daniel's approval of the complete shape and the simplified
requiredness rule. No compatibility aliases or free-form escape hatches are
allowed. The schema/runtime remains frozen until Phase 8 closes Calculus.

**Completion:** `PHASE 7 COMPLETE METHOD VARIATION COMPOSITION WIRE ACCEPTED`

## Phase 8 — Define active-graph and composition Calculus

**Classification:** operational plus test design. **Depends on:** Phase 7.

Specify deterministic selection validation, active-graph projection,
reading-order/schedule interaction, missing-selection diagnostics, strict
substitution invariants, component resolution/output/yield scaling, cycle and
resource-limit behavior, and identity/lineage effects. Pin operation tokens,
arguments, results, problem types, and RFC 6901 pointers before code changes.

ADR-016 and
`docs/product/prds/artifacts/PRD-007/active-graph-composition-calculus.md`
complete this phase. They add `resolve_selection`, closed instance-scoped
requests, exhaustive distinct reachable graphs, non-redistributing optional
formula terms, factor XOR root formula target, exact component instances,
composed schedule reporting, JCS evaluation identity, deterministic
multi-problem behavior, and minimum resource floors. Schema/runtime remains the
verified baseline until Phase 9.

**Completion:** `PHASE 8 COMPLETE ACTIVE GRAPH AND COMPOSITION CALCULUS ACCEPTED`

## Phase 9 — Implement schema and cross-language behavior

**Classification:** testable. **Depends on:** Phase 8.

Update the core/bundle schema, Go reference implementation, TypeScript/viewer,
semantic validation, canonicalization, and diagnostics from the accepted wire
and Calculus only. Preserve exact decimal, UCUM, local identity, evidence,
offline resolution, and clean-cutover behavior. Checkpoint schema admission,
each operation, each refusal class, and cross-language byte parity.

**Completion:** `PHASE 9 COMPLETE STRUCTURED METHOD IMPLEMENTATION VERIFIED`

## Phase 10 — Migrate corpora and examples

**Classification:** testable. **Depends on:** Phase 9.

Promote every accepted positive and adversarial case to the normative shared
corpora, including recursive structure, missing selections, invalid inactive
branches, strict substitutions, completion/environment facts, exact components,
cycles, bundles, and lineage. Migrate repository examples without inventing
facts absent from their sources. Regenerate derived artifacts deterministically.

**Completion:** `PHASE 10 COMPLETE CORPUS AND EXAMPLES MIGRATED`

## Phase 11 — Re-run Pão and Fornada dogfood

**Classification:** external adoption evidence. **Depends on:** Phase 10.

Ask each integrator to pin committed Schemami bytes. Pão replays complete
methods and formula objects; Fornada replays its adapter while keeping workflow
primitives, fermentation heuristics, timer policy, and bake state application-
owned. Verify explicitly authored techniques/environment facts survive and
valid unfamiliar content remains readable when app projection refuses. Any
protocol defect returns to Phase 7 or 8; app-domain gaps stay with the app.
The phase is the first cross-product interoperability success measure: both
adapters consume the same committed protocol bytes and agree on shared-vector
validity while retaining materially different application models. It does not
claim independent-owner adoption or ecosystem scale.

**Completion:** `PHASE 11 COMPLETE TWO ADAPTER DOGFOOD REVIEWED`

## Phase 12 — Prove and publish the replacement stable release

**Classification:** testable and externally mutating. **Depends on:** Phase 11.

Rebuild the candidate manifest, replay all gates from a clean clone, verify
immutable HTTPS bytes, and publish only after explicit Daniel approval. Commit,
push, tag, and Cloudflare/GitHub publication are separate authorized actions.
After stable publication, revise the AI conversion PRD and then documentation.

**Completion:** `PHASE 12 COMPLETE SCHEMAMI V1 STABLE RELEASE PUBLISHED`

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
