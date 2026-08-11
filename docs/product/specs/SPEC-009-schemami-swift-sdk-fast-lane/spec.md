# SPEC-009: Schemami Swift SDK fast lane

**Status:** accepted  
**Source PRD:** PRD-009  
**Author:** Daniel Gomes  
**Created:** 2026-08-11  
**Sidecar:** [spec.yaml](./spec.yaml)

---

## 1. Scope

Deliver a production Swift Package in `sdk/swift/` with three library products:

- `SchemamiCore` — retained JSON value, complete v1 typed model/views, schema and
  semantic admission, problems, RFC 6901 pointers, JCS, and SHA-256.
- `SchemamiCalculus` — all six public Recipe Calculus operations.
- `SchemamiDiff` — deterministic comparison of two admitted complete recipes for
  review UIs.

The package targets the verified Fornada baseline: Swift tools compatible with
the local Swift 6.3.3 toolchain, iOS 17, and macOS 14. It must remain consumable
from Fornada's current Swift-tools-5.10 root package. Phase 0 proves this exact
consumer arrangement before the dependency choice is accepted.

Public Go and TypeScript SDK extraction is outside SPEC-009. The current Go and
TypeScript implementations remain reference oracles during development, never
runtime dependencies.

## 2. Authorities

In decreasing order of authority:

1. `schema/schemami-v1-core.schema.json` and
   `schema/schemami-v1-bundle.schema.json`.
2. Accepted ADR-014, ADR-015, and ADR-016.
3. `calculus/SPEC.md` and the Schemami v1 conformance corpus.
4. SPEC-007 where it defines stable v1 behavior.
5. Fornada dogfood as consumer evidence only.

If a Fornada temporary model or validator differs from these authorities, the
SDK follows the Schemami authority and Fornada adapts at its boundary.

## 3. Repository and package layout

```text
sdk/swift/
  Package.swift
  Package.resolved
  Sources/
    SchemamiCore/
    SchemamiCalculus/
    SchemamiDiff/
  Tests/
    SchemamiCoreTests/
    SchemamiCalculusTests/
    SchemamiDiffTests/
  Resources/
    schema/
    conformance/
```

Normative schema/vector bytes remain owned by their existing repository paths.
The Swift package receives a deterministic generated/copy manifest checked by
CI; it must not maintain hand-edited divergent copies.

## 4. Dependency decision gate

Speed does not justify accepting an unverified general-purpose validator. Phase
0 must run a disposable integration spike against the full Schemami schema and
fixtures before dependencies enter the package lock.

Candidate implementation strategy:

- JSON value and JSON Schema 2020-12 admission: evaluate
  `ajevans99/swift-json-schema` at an exact reviewed revision/version because it
  supplies ordered JSON and draft-2020-12 validation. Accept it only if the
  spike proves Schemami's `$ref`, recursion, `oneOf`, `anyOf`,
  `additionalProperties`, `patternProperties`, formats, and nested-error
  behavior, and proves strict duplicate-member/Unicode handling.
- Exact integers/rationals: evaluate `attaswift/BigInt` at an exact reviewed
  version. Schemami owns the normalized rational wrapper and half-even
  quantization behavior.
- SHA-256: use Apple CryptoKit on the accepted iOS/macOS baseline.
- RFC 8785 JCS: implement the narrow canonicalizer in `SchemamiCore` over the
  admitted retained JSON tree and prove it against RFC/Schemami vectors. Do not
  claim ordinary sorted-key JSON is JCS.
- YAML: not required for the Swift fast-lane release. A later additive package
  may provide YAML authoring import; canonical JSON admission is mandatory.

If the JSON Schema candidate fails any required keyword or strictness case, do
not patch around it invisibly. Record the failed evidence and choose either a
smaller vendored validator surface or a different reviewed dependency before
Phase 1.

## 5. Core data and admission API

The API names below pin responsibilities; idiomatic spelling may be refined in
Phase 0 without changing semantics.

```swift
public enum SchemamiCore {
    public static func parse(_ data: Data, budgets: ResourceBudgets = .protocolFloor)
      -> ParseResult

    public static func admit(_ parsed: ParsedDocument, budgets: ResourceBudgets = .protocolFloor)
      -> AdmissionResult
}

public struct AdmittedRecipe: Sendable {
    public let submittedJSON: Data
    public let value: SchemamiValue
    public let recipe: Recipe
    public func canonicalJSON() throws -> Data
    public func sha256() throws -> String
}

public struct AdmittedBundle: Sendable { /* retained value + typed bundle */ }

public enum ParseResult: Sendable {
    case parsed(ParsedDocument)
    case refused([Problem])
}

public enum AdmissionResult: Sendable {
    case recipe(AdmittedRecipe)
    case bundle(AdmittedBundle)
    case refused([Problem])
}
```

### 5.1 Retained value

`SchemamiValue` is a lossless admitted JSON tree, not `[String: Any]`. It must:

- distinguish JSON types without Foundation bridging ambiguity;
- reject duplicate object members and invalid Unicode/I-JSON inputs;
- preserve source array order;
- preserve every admitted `x-*` member;
- allow exact RFC 6901 navigation;
- retain or reproduce the canonical value independently of Swift Codable field
  coverage.

Typed v1 models provide safe access to every normative field and tagged union.
Unknown semantic fields are rejected by the schema except allowed `x-*`
extensions, which remain in each object's extension collection.

### 5.2 Admission stages

Admission executes in this order:

1. strict JSON/I-JSON parsing;
2. document-kind and suffix/marker recognition where file context is supplied;
3. JSON Schema 2020-12 validation;
4. typed model projection from the retained value;
5. semantic admission, including all distinct reachable active graphs;
6. canonical identity availability.

Failure at an earlier stage suppresses consequences that require a later stage.
Independent problems within a stage are returned, deduplicated, and sorted by
ASCII request pointer then problem identity.

## 6. Problems and resources

```swift
public struct Problem: Hashable, Sendable {
    public let type: String
    public let pointer: JSONPointer
    public let details: SchemamiValue?
}

public struct ResourceBudgets: Sendable {
    public let recursiveLevels: Int
    public let semanticOccurrences: Int
    public let bundleDocuments: Int
    public let selectedComponentInstances: Int
}
```

Defaults meet or exceed the protocol floor:

- 64 recursive levels;
- 10,000 evaluated semantic object/reference occurrences;
- 1,024 bundle documents;
- 1,024 selected component instances.

Exhaustion returns the existing `resource-limit` identity. It does not make an
otherwise-valid document permanently invalid and never traps, recurses without
a guard, or returns an implementation exception as the public result.

## 7. Recipe Calculus API

```swift
public enum SchemamiCalculus {
    public static func evaluate(
      _ request: OperationRequest,
      input: OperationInput,
      budgets: ResourceBudgets = .protocolFloor
    ) -> EvaluationResult
}
```

`OperationRequest` is a closed tagged union for:

- `resolve_selection`;
- `scale` with exactly one of `factor` or root `formula_target`;
- `resolve_formula`;
- `convert_quantity`;
- `reading_order`;
- `schedule`.

Every operation follows ADR-016 and shared vectors, including:

- instance-scoped selections using component-ID paths;
- exact rational intermediates and half-even public quantization;
- no redistribution when optional terms become inactive;
- compatible pinned UCUM conversion only;
- no density, mass/volume inference, network lookup, or prose parsing;
- evaluation identity and effective selections on recipe/bundle operations;
- component identity plus calculated quantities, never rewritten child recipes;
- `unscheduled_components` for active unconsumed components;
- preservation, but no v1 schedule interpretation, of `relative_timing`.

Successful results are evaluation metadata, not publishable recipe documents.

## 8. Deterministic comparison API

```swift
public enum SchemamiDiff {
    public static func compare(
      source: AdmittedRecipe,
      candidate: AdmittedRecipe
    ) -> ComparisonResult
}
```

The comparison is deterministic and pointer-addressed. It reports:

- recipe identity, revision, digest, and lineage changes;
- ingredients and alternatives added, removed, renamed, reordered, or changed;
- quantity authority, formulas, terms, bases, targets, and resolved-total changes;
- sections, steps, actions, instructions, dependencies, durations, completion,
  environment, activation, relative timing, and order changes;
- techniques and equipment changes with authored order;
- components, outputs, yields, and exact reference changes;

It must not infer ingredient equivalence, determine that a substitution is safe,
merge changes, mutate either recipe, or treat prose similarity as exact identity.
Comparison output is non-canonical evaluation metadata.

Application projection assessment is not a Diff input or output. An application
such as Fornada composes its mapping/projection limitations with the independent
protocol comparison using RFC 6901 pointers.

## 9. Fornada integration boundary

Fornada may replace its temporary `SchemamiV1Models` and narrow validator/diff
with SDK types and results. These remain in Fornada:

- export/projection mappings and overlay;
- prompt construction and provider UX;
- recipe entity, persistence, variants, and revision policy;
- baker's-percentage knowledge, fermentation models, timer defaults, schedule
  recommendations, and execution state;
- RFC 9457 HTTP or UI presentation of SDK problems.

An admitted candidate that Fornada cannot project must remain retainable and
readable. Projection refusal cannot be relabelled protocol invalidity.

## 10. Release and versioning

- Swift SDK versioning follows semantic versioning independently of Schemami
  wire versioning.
- The initial release declares support for Schemami wire v1 only.
- Package dependencies and generated resource manifests are locked.
- Release proof runs from a clean checkout without Fornada or network access
  after dependencies are resolved.
- Fornada pins an exact released SDK version or commit during dogfood.
- Public API additions may be minor releases; changed accepted behavior requires
  a protocol decision/vector first and may require an SDK major release.

## 11. Requirement mapping

| PRD requirement | SPEC requirements |
|---|---|
| FR-SWIFT-001 | SR-SWIFT-001, SR-SWIFT-002 |
| FR-SWIFT-002 | SR-SWIFT-003, SR-SWIFT-004 |
| FR-SWIFT-003 | SR-SWIFT-005 |
| FR-SWIFT-004 | SR-SWIFT-006 |
| FR-SWIFT-005 | SR-SWIFT-007 |
| FR-SWIFT-006 | SR-SWIFT-008 |
| FR-SWIFT-007 | SR-SWIFT-009 |
| FR-ADJ-001..004 | SR-ADJ-001, SR-ADJ-002 |

## 12. Deferred explicitly

- Public Go and TypeScript SDK packaging.
- YAML authoring import.
- Android/Kotlin SDK.
- Provider adapters or prompts.
- Automatic migrations of Fornada persistence.
- Culinary equivalence, substitutions, or biological prediction.
