# Schemami Swift SDK Phase 0 — dependency and API evidence

**Date:** 2026-08-11  
**Plan:** `PLAN-schemami-swift-sdk-fast-lane`, Phase 0  
**Decision:** accepted by Daniel

## Recommendation

Accept the following Swift fast-lane implementation strategy with the stated
guards:

1. Pin `ajevans99/swift-json-schema` **0.13.1** for its `OrderedJSON` and
   `JSONSchema` products.
2. Pin `attaswift/BigInt` **5.7.0** for arbitrary-precision integers; Schemami
   owns rational normalization and half-even quantization.
3. Add a Schemami-owned duplicate-member scanner before `OrderedJSON` parsing.
   The dependency intentionally uses last-member-wins behavior, which is not
   acceptable for Schemami admission.
4. Keep URI, BCP 47, RFC 6901, UCUM, cross-field, active-graph, and other
   Schemami semantic checks in `SchemamiCore`; do not mistake generic JSON
   Schema output for full admission.
5. Implement and vector-test RFC 8785 JCS in `SchemamiCore`; ordered or sorted
   JSON serialization alone is not canonical identity.
6. Import only `OrderedJSON` and `JSONSchema`; do not expose or use the package's
   builder/macro products.

This is the fastest dependency-backed route found that passed the real v1
schema surface. It is preferable to implementing JSON Schema 2020-12 from
scratch or calling the Go CLI from iOS.

## Exact resolved graph

| Package | Version | Revision | License | Use |
|---|---:|---|---|---|
| `ajevans99/swift-json-schema` | 0.13.1 | `f299eb1cce78b2dd736d9a390ec0779d28678416` | MIT | Ordered JSON value/parser and JSON Schema 2020-12 |
| `attaswift/BigInt` | 5.7.0 | `e07e00fa1fd435143a2dcf8b7eec9a7710b2fdfe` | MIT | Exact integer intermediates |
| `apple/swift-collections` | 1.6.0 | `a0cb0954ecb21e4e31b0070e6ed5674e8556685a` | Apache-2.0 | Transitive ordered collections |
| `swiftlang/swift-syntax` | 603.0.2 | `79e4b74a295b6eb74a8b585e3a39d29e70c1dbd1` | Apache-2.0 | Resolved transitively because the upstream package declares macro targets; Schemami does not import them |

Primary sources:

- <https://github.com/ajevans99/swift-json-schema>
- <https://github.com/attaswift/BigInt>
- <https://www.rfc-editor.org/rfc/rfc8785>
- <https://json-schema.org/draft/2020-12/json-schema-core.html>

## Verified environment

- Local compiler: Apple Swift 6.3.3.
- Disposable SDK manifest: Swift tools 6.1, iOS 17, macOS 14.
- Disposable consumer manifest: Swift tools 5.10, iOS 17, macOS 14, matching
  Fornada's current root-package declaration.
- The Swift-tools-5.10 consumer compiled and tested successfully while importing
  the Swift-tools-6.1 local SDK dependency.

This proves the current local/Fornada development arrangement. It does not claim
compatibility with an older Xcode/Swift compiler that has not been tested.

## Commands and results

### Dependency package

```sh
swift test --package-path /private/tmp/schemami-swift-sdk-spike
```

Result: passed after correction of a disposable test import. Final replay:

- 6 tests passed;
- exact 32-digit multiplication passed;
- actual Schemami recursive `$ref` and union schema loaded;
- every positive `conformance/schemami-v1/validation.json` vector passed JSON
  Schema admission;
- representative structural refusals failed as expected;
- duplicate-member last-wins behavior was reproduced and classified as requiring
  a Schemami pre-parser guard.

### Swift-tools-5.10 consumer

```sh
swift test --package-path /private/tmp/schemami-swift-sdk-consumer
```

Result: 1 consumer test passed on `arm64e-apple-macos14.0`.

### Observed build cost

- First dependency fetch/build: approximately 28 seconds.
- Fresh consumer fetch/build using local caches: approximately 22 seconds.
- Incremental schema replay builds: under 1.3 seconds in the spike.
- Spike `.build`: approximately 838 MiB.
- Consumer `.build`: approximately 947 MiB.
- The `swift-json-schema` checkout itself was approximately 271 MiB, largely
  because its repository/package declares additional macro/test surfaces.

These are development-cache observations, not installed app binary size.
Release binary size and clean CI cost remain Phase 1/6 measurements.

## Required behavior demonstrated

| Capability | Result |
|---|---|
| Swift 5.10 root consumes candidate dependency graph | pass under Swift 6.3.3 |
| iOS 17/macOS 14 package declarations | pass |
| Draft-2020-12 schema load | pass |
| Local recursive `$ref` | pass |
| `oneOf`/`anyOf` and recursive Schemami shapes | pass through real vectors |
| `additionalProperties` and pattern-based extensions | pass through real vectors |
| Actual positive Schemami schema corpus | pass |
| Representative structural invalid corpus | pass |
| Arbitrary-precision integer multiplication | pass |
| Strict duplicate-member rejection | **dependency does not provide it; Schemami guard required** |
| Full Schemami semantic admission | outside generic validator; SDK implementation required |
| RFC 8785 canonicalization | outside dependency; SDK implementation required |

## Why the percentage-basis probe changed classification

The `percentage-basis-not-one-hundred-refuses` vector passed generic JSON Schema
admission. Inspection verified that “basis exactly once at 100” is intentionally
a Schemami semantic rule, not a core-schema assertion. It remains mandatory in
Swift semantic admission; this is not a validator discrepancy.

## Minimal public API proposed for approval

```swift
SchemamiCore.parse(_:budgets:) -> ParseResult
SchemamiCore.admit(_:budgets:) -> AdmissionResult

AdmittedRecipe.canonicalJSON() -> Data
AdmittedRecipe.sha256() -> String

SchemamiCalculus.evaluate(_:input:budgets:) -> EvaluationResult

SchemamiDiff.compare(source:candidate:) -> ComparisonResult
```

Public outcomes are explicit value types. Stable `Problem` values carry a
problem identity and RFC 6901 pointer. Thrown errors are reserved for programmer
misuse or host failures that cannot be represented as protocol results.

`ParsedDocument` and admitted recipe/bundle values also expose the immutable
exact submitted JSON bytes separately from their retained value and canonical
bytes. This preserves what an integrator received without confusing submitted
identity with canonical identity.

Fornada's Phase 0 evaluation accepted the dependency/product strategy and
confirmed that application projection assessment must remain a separate
Fornada result. `SchemamiDiff` therefore reports protocol changes only and does
not accept application mappings or projection capabilities.

## Approval

Daniel approved together on 2026-08-11:

- the exact dependency strategy and guards above;
- the three Swift products (`SchemamiCore`, `SchemamiCalculus`,
  `SchemamiDiff`);
- the minimal result-oriented API boundary.

At the time of approval no production `sdk/swift/`, lock file, commit, or
Fornada change had been made.
