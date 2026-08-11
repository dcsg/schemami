# Fornada handoff — Schemami Swift SDK Phase 0 evaluation

**Prepared:** 2026-08-11  
**Schemami checkout:** `/Users/danielgomessm/MyProjects/personal/RecipesProtocol`  
**Protocol candidate commit:** `86909a5b77eef6726b2f40a422be4c58c762e520`  
**Fornada checkout:** `/Users/danielgomessm/MyProjects/personal/Calculador PAo/mobile/ios/Fornada`  
**Status:** pre-implementation compatibility and API review

## Important status boundary

There is not yet a production `sdk/swift/` package to integrate. This handoff
asks Fornada to evaluate and reproduce the Phase 0 dependency/API decision
before Schemami creates production SDK code.

The protocol candidate above is committed. The new Swift PRD, SPEC, plan, and
this handoff are currently an intentional uncommitted Schemami working-tree
overlay. Results are product feedback, not durable release evidence, until the
documents and future SDK receive an approved commit.

Do not change Fornada live persistence, remove its existing adapter, or present
the candidate dependencies as a released Schemami SDK.

## Read first

1. [Swift SDK PRD](../product/prds/PRD-009-schemami-swift-sdk-and-recipe-adjustment.md)
2. [Swift SDK SPEC](../product/specs/SPEC-009-schemami-swift-sdk-fast-lane/spec.md)
3. [Swift test strategy](../product/specs/SPEC-009-schemami-swift-sdk-fast-lane/test-strategy.md)
4. [Swift execution plan](../plans/PLAN-schemami-swift-sdk-fast-lane.md)
5. [Phase 0 dependency evidence](./schemami-swift-sdk-phase0-dependency-evidence.md)
6. Fornada's existing
   `/Users/danielgomessm/MyProjects/personal/Calculador PAo/docs/architecture/HANDOFF-schemami-sdk-ai-recipe-adjustment.md`

## Candidate decision under review

Schemami proposes:

- `SchemamiCore`, `SchemamiCalculus`, and `SchemamiDiff` Swift products;
- Swift Package Manager delivery, initially iOS 17 and macOS 14;
- `ajevans99/swift-json-schema` 0.13.1 at revision
  `f299eb1cce78b2dd736d9a390ec0779d28678416`;
- `attaswift/BigInt` 5.7.0 at revision
  `e07e00fa1fd435143a2dcf8b7eec9a7710b2fdfe`;
- a Schemami-owned strict duplicate-member guard before ordered JSON parsing;
- Schemami-owned semantic admission, exact rational wrapper, half-even
  quantization, RFC 8785 JCS, problems, and resource limits;
- no runtime Go/TypeScript process, provider call, network resolution, Fornada
  mapping, or application policy inside the SDK.

The tested JSON dependency intentionally accepts duplicate object members using
last-member-wins. Fornada must treat the proposed Schemami pre-parser guard as
mandatory, not optional hardening.

## Requested Fornada evaluation

### 1. Reproduce toolchain compatibility

Record:

```sh
cd '/Users/danielgomessm/MyProjects/personal/Calculador PAo/mobile/ios/Fornada'
swift --version
swift package dump-package
swift test --filter FornadaSchemamiAdapterTests
```

Confirm the current Swift-tools-5.10 root, iOS 17, and macOS 14 declarations.
Do not edit `Package.swift` merely to make the experiment pass.

In a disposable directory outside the Fornada and Schemami repositories,
reproduce a Swift-tools-6.1 dependency package using the exact two candidate
versions and import it from a Swift-tools-5.10 root. Record clean and incremental
resolve/build/test time plus disk use. The disposable experiment may be deleted;
do not commit it to Fornada.

### 2. Review API fit against actual Fornada code

Map the existing temporary types and services to the proposed SDK:

| Current Fornada responsibility | Proposed owner |
|---|---|
| `SchemamiV1Models` protocol subset | replace with `SchemamiCore` complete retained/typed model |
| narrow JSON/field validation | replace with parse + schema + semantic `AdmissionResult` |
| formula/order checks that are protocol rules | replace with `SchemamiCalculus`/admission |
| `FornadaSchemamiAdjustmentService` structural change list | replace protocol comparison with `SchemamiDiff`; keep Fornada review presentation |
| recipe-local ingredient/step bindings | remain Fornada-owned |
| export and legacy snapshot projection | remain Fornada-owned adapters |
| prompt construction and ChatGPT/Claude workflow | remain Fornada-owned acquisition/UI |
| overlay, timer policy, starter choices, bake state, heuristics | remain Fornada-owned |

For each mapping, report:

- direct fit;
- needs an additive SDK API;
- remains app-owned;
- current Fornada code is based on an obsolete pre-v1 shape and must migrate.

Do not ask the SDK to preserve temporary flattened `steps` or singular `formula`
aliases. The accepted v1 shapes are recursive `method.sequence` and plural
`formulas`.

### 3. Evaluate the minimal public API

Review this proposed surface:

```swift
SchemamiCore.parse(_:budgets:) -> ParseResult
SchemamiCore.admit(_:budgets:) -> AdmissionResult

AdmittedRecipe.canonicalJSON() -> Data
AdmittedRecipe.sha256() -> String

SchemamiCalculus.evaluate(_:input:budgets:) -> EvaluationResult

SchemamiDiff.compare(source:candidate:projection:) -> ComparisonResult
```

Answer with concrete Fornada call sites:

1. Can a valid candidate be retained even when Fornada projection refuses?
2. Can stable `Problem` identity plus RFC 6901 pointer replace current prose-only
   validation errors without leaking HTTP into the SDK?
3. Does `ProjectionCapabilities` belong as explicit input to `SchemamiDiff`, or
   should Fornada separately compare the diff against its mapping/projection?
4. Is any asynchronous API genuinely needed? Core resolution is offline.
5. Which public types must be `Sendable`, `Codable`, `Hashable`, or `Equatable`
   for actual Fornada use? Cite the call site rather than requesting blanket
   conformance.
6. Does the three-product split produce an import cycle or force Fornada to import
   Calculus/Diff where only Core is needed?

### 4. Exercise the adjustment boundary using current code

Do not implement the SDK. Use current Fornada tests/fixtures to identify what the
future SDK must support. At minimum inspect or replay:

- exact current system-bread export/projection;
- valid unfamiliar local ingredient retained but not projectable;
- changed hydration or yield;
- cold versus ambient fermentation as authored method/environment facts;
- explicit one-for-one ingredient alternative;
- a change that creates a complete new recipe with exact
  `lineage.derived_from`;
- session-only scaling that must not become a recipe;
- recursive section/action content that the temporary flattened model cannot
  currently represent;
- multiple formulas and component instances that the temporary subset cannot
  currently represent.

For every case, distinguish:

- Schemami admission;
- deterministic calculation support;
- deterministic diff support;
- Fornada projection support;
- Fornada application-policy decision.

## Required output

Create one durable Fornada report containing:

1. exact Schemami protocol commit and explicit note that the SDK documents were
   read from an uncommitted overlay;
2. exact Fornada commit and dirty-state summary;
3. exact commands and unedited pass/fail results;
4. dependency resolve/build/incremental timing and disk observations;
5. a current-type-to-proposed-SDK mapping table;
6. API feedback with cited Fornada files/call sites;
7. every finding classified as:
   - `accept`;
   - `sdk-api-gap`;
   - `dependency-risk`;
   - `fornada-projection-gap`;
   - `application-policy`;
   - `protocol-conflict`;
8. a final recommendation:
   - accept dependency/API strategy;
   - accept with non-blocking changes;
   - block, with exact reproducible evidence.

Recommended report path:

```text
/Users/danielgomessm/MyProjects/personal/Calculador PAo/docs/architecture/experiments/EXP-schemami-swift-sdk-phase0-evaluation.md
```

## Stop conditions

Stop and report instead of working around any of these:

- the exact dependencies cannot compile under Fornada's actual toolchain;
- the Swift-tools-5.10 root cannot consume the candidate package;
- JSON Schema validation disagrees with a clearly structural v1 vector;
- a valid unfamiliar document cannot be retained without projection;
- the proposed API requires Fornada mappings or baking intelligence in the SDK;
- correct integration would require live persistence migration during Phase 0;
- a provider/LLM becomes necessary for admission, calculation, diff, or identity;
- a protocol authority conflicts with the schema or shared vectors.

## Paste-ready task prompt

```text
Evaluate the proposed Schemami Swift SDK Phase 0 from the handoff at:

/Users/danielgomessm/MyProjects/personal/RecipesProtocol/docs/reports/schemami-swift-sdk-phase0-fornada-handoff-2026-08-11.md

Follow it exactly. This is a pre-implementation dependency and API evaluation,
not authorization to build the SDK, change live persistence, remove Fornada's
current adapter, or modify Schemami. Inspect both worktrees before acting and
preserve unrelated dirty work.

Reproduce the Swift-tools-5.10 consumer compatibility with the exact dependency
versions in a disposable directory, replay the current Fornada Schemami tests,
map real call sites to SchemamiCore/SchemamiCalculus/SchemamiDiff, and create the
requested durable experiment report with exact commands/results and classified
findings. Stop on the handoff's stop conditions; do not invent compatibility or
protocol behavior.
```

