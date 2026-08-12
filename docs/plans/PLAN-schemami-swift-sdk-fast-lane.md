# PLAN: Schemami Swift SDK fast lane

**Status:** release candidate approved
**PRD:** PRD-009  
**SPEC:** SPEC-009  
**Created:** 2026-08-11

## Outcome

Ship a production Swift Package containing `SchemamiCore`,
`SchemamiCalculus`, and `SchemamiDiff`, prove it independently against the
Schemami v1 corpus, and dogfood it through Fornada without waiting for public
Go or TypeScript SDK extraction.

## Working rules

- Preserve unrelated dirty work.
- Every behavior change starts as or adds a shared conformance vector.
- Swift never shells out to Go/TypeScript or needs a network at runtime.
- Fornada remains an external consumer and owns its mappings, prompt/UI,
  projection, persistence, and baking intelligence.
- Produce an evidence checkpoint after each phase. Stop for Daniel only when a
  dependency, public API, protocol behavior, or release mutation needs approval.
- No commit, push, tag, package publication, or Fornada mutation occurs without
  its explicit scope/authority.

## Phase 0 — Dependency and contract proof

**Classification:** testable discovery. **Depends on:** accepted PRD/SPEC scope.

1. Externalize a minimal representative schema/vector slice into a disposable
   Swift package.
2. Prove Fornada's Swift-tools-5.10 root can consume the SDK candidate with the
   installed toolchain on iOS 17/macOS 14 targets.
3. Test the candidate JSON Schema library against actual Schemami recursion,
   references, unions, pattern/additional properties, formats, duplicate JSON
   members, Unicode, and nested diagnostics.
4. Test the candidate arbitrary-precision integer dependency and license.
5. Record exact versions, transitive packages, build time, failures, and a
   recommendation. Do not add a production lock until Daniel approves the
   recommendation.
6. Freeze the minimal public result/problem/budget API used by the next phases.

**Checkpoint:** dependency evidence, recommended accepted/rejected packages, and
the proposed public API.  
**Completion:** `PHASE 0 COMPLETE SWIFT DEPENDENCIES AND API ACCEPTED`

**Result:** completed 2026-08-11. Daniel accepted the exact dependency strategy,
mandatory Schemami guards, three-product split, and result-oriented API. Fornada
confirmed compatibility and requested exact submitted-byte access plus separation
of application projection assessment from protocol Diff; both refinements are
accepted into Phase 1.

## Phase 1 — Strict retained JSON and complete v1 model

**Classification:** testable. **Depends on:** Phase 0.

1. Scaffold `sdk/swift/` and the three product targets.
2. Implement strict retained `SchemamiValue` parsing and RFC 6901 pointers.
3. Embed/generate the core and bundle schema resources deterministically.
4. Implement complete typed recipe/bundle models and tagged unions with `x-*`
   preservation.
5. Replay strict parsing, schema, recursive method, component, formula, evidence,
   source, lineage, and extension vectors.

**Checkpoint:** package build, model coverage inventory, round-trip evidence, and
remaining unsupported fields (expected: none).  
**Completion:** `PHASE 1 COMPLETE SWIFT LOSSLESS CORE VERIFIED`

**Result:** completed 2026-08-11. The actual package, strict retained parser,
complete document projections/tagged unions, generated resource manifest, 12-test
suite, and Swift-tools-5.10 consumer proof are recorded in the Phase 1 evidence
and model coverage inventory.

## Phase 2 — Semantic admission and canonical identity

**Classification:** testable. **Depends on:** Phase 1.

1. Port semantic admission from the accepted language-neutral contract, not from
   Fornada's narrow validator.
2. Implement distinct-reachable-active-graph analysis, threshold regions,
   deduplication, cycles, resource floors, stable problems, cascade suppression,
   and deterministic ordering.
3. Implement RFC 8785 canonicalization and SHA-256.
4. Replay semantic, problem, resource, and identity corpora.

**Checkpoint:** semantic/problem parity ledger, canonical golden bytes, digest
evidence, and resource-limit results.  
**Completion:** `PHASE 2 COMPLETE SWIFT ADMISSION AND IDENTITY VERIFIED`

**Result:** completed 2026-08-11. Public retained admission, exact active-graph
analysis, stable cross-language problems, bundle closure/digest checks, JCS,
SHA-256, and the Phase 2 evidence ledger are verified. Calculus remains Phase 3.

## Phase 3 — All six Recipe Calculus operations

**Classification:** testable. **Depends on:** Phase 2.

1. Implement exact rational/decimal primitives and half-even quantization.
2. Implement `resolve_selection`, `resolve_formula`, and `scale` including
   formula-target scaling.
3. Implement pinned UCUM `convert_quantity` without density or regional guesses.
4. Implement `reading_order` and composed `schedule`, including
   `unscheduled_components`.
5. Replay every result/refusal vector and run resource/security cases.

**Checkpoint:** operation-by-operation parity table and exact failing vector list
(expected: empty).  
**Completion:** `PHASE 3 COMPLETE SWIFT RECIPE CALCULUS VERIFIED`

**Result:** completed 2026-08-11. Swift matches all 60 shared operation vectors,
including the selection/measurement/alternative vectors added by the parity
audit, plus sibling/nested component, exact child-yield conversion,
missing-fact/reference, public API, and resource-limit cases. The exact failing
vector list is empty.

## Phase 4 — Deterministic SchemamiDiff

**Classification:** testable. **Depends on:** Phase 2; formula-total comparisons
also use Phase 3.

1. Freeze pointer-addressed change types and deterministic ordering.
2. Cover identity/lineage, ingredients/alternatives, quantities/formulas, recursive
   method, environment/completion/activation, resources, components/outputs, and
   extensions.
3. Keep application projection capabilities entirely outside Diff; consumers
   compose their separate limitations with protocol changes by pointer.
4. Prove no mutation, merge, culinary inference, or identity effect.

**Checkpoint:** before/after fixtures and full change-category coverage.  
**Completion:** `PHASE 4 COMPLETE SWIFT SCHEMAMI DIFF VERIFIED`

**Result:** completed 2026-08-11. The public protocol-only comparison reports
exact identity and deterministic added/removed/renamed/modified/reordered
changes with source/candidate RFC 6901 pointers across every required structural
field family. The complete 27-test package suite is green and application
projection remains outside the SDK.

## Phase 5 — Fornada dogfood

**Classification:** operational. **Depends on:** Phases 1–4.

1. Provide an exact local package revision to Fornada.
2. Replace temporary protocol parsing/admission/calculation/diff calls while
   keeping Fornada mapping, overlay, prompt, projection, UI, and persistence.
3. Replay current Fornada Schemami tests plus valid-unprojectable, cold/ambient
   fermentation, yield, hydration, substitution, and recursive method cases.
4. Classify findings as SDK defect, protocol defect, Fornada projection gap, or
   application policy.

**Checkpoint:** Fornada handoff report with exact revision and commands/results.  
**Completion:** `PHASE 5 COMPLETE FORNADA SWIFT SDK DOGFOOD REVIEWED`

**Result:** completed 2026-08-12. Fornada compiled against the hardened SDK and
passed all 11 focused dogfood cases plus all 29 Schemami-related acquisition,
adapter, and SDK tests. The replay exposed one diagnostic-parity issue, which
was corrected across Go, TypeScript, and Swift and pinned in the shared
resource-budget corpus. No Fornada source or persistence file was changed.

## Phase 6 — Package release proof

**Classification:** testable/release. **Depends on:** Phase 5.

1. Run the package and full corpus from a clean checkout with dependencies locked
   and networking disabled after resolution.
2. Generate API documentation, license inventory, changelog, and semantic-version
   release manifest.
3. Verify no Schemami normative behavior exists only in Swift code without a
   shared vector.
4. Present commit/tag/publication scope and request explicit Daniel approval.
5. After approval, publish/tag and pin the exact release in Fornada.

**Checkpoint:** release evidence ledger and proposed immutable release identity.  
**Completion:** `PHASE 6 COMPLETE SWIFT SDK RELEASED AND PINNED`

**Status:** release-candidate proof in progress. Daniel approved the
`v1.0.0-rc.0` candidate commit and Apache-2.0 package boundary. Tagging,
publication, and Fornada revision pinning remain intentionally unperformed.

## Later track — Go and TypeScript SDK parity

After the Swift fast lane is independently useful, create a separate accepted
PRD/SPEC to extract the Go CLI and TypeScript viewer engines into public SDKs.
They reuse the same corpus and may not retroactively redefine Swift or v1
behavior. This later work is not a Phase 0–6 dependency.
