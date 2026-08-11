# SPEC-009 test strategy

## Test authority

Swift replays the same committed Schemami v1 corpus used to prove the candidate
protocol. Expected outcomes are data, not values obtained by shelling out to the
Go or TypeScript implementations during normal tests.

## Suites

1. **Strict parsing** — duplicate members, invalid Unicode, malformed JSON,
   unsupported top-level types, and I-JSON boundaries.
2. **Schema admission** — every positive and nearest-invalid core/bundle fixture,
   recursive unions, formats, extension preservation, and concise pointer mapping.
3. **Semantic admission** — local references, resources, active graphs, threshold
   boundaries, equivalent-graph deduplication, dormant broken branches, component
   cycles, independent problems, and cascade suppression.
4. **Canonical identity** — RFC 8785 vectors, Schemami golden bytes, UTF-16 key
   ordering, escaping, SHA-256, and whitespace/key-order invariance.
5. **Exact arithmetic** — arbitrary-size rational intermediates, all six operations,
   half-even boundaries, repeating factors, UCUM conversion, and refusals.
6. **Components and scheduling** — nested selections, output/yield scaling,
   consumed composition, `not-consumed`, reading order, and cycle/resource limits.
7. **Diff** — every normative field family, array reorder, parent lineage,
   extension changes, deterministic order, and no changes; application projection
   assessment is tested by the consuming application, not the SDK.
8. **Package boundary** — no provider or Fornada imports; no network or subprocess
   use; public products compile independently.
9. **Consumer proof** — a small Fornada fixture imports the released package and
   retains a valid-but-unprojectable candidate.

## Dependency spike gate

Before accepting a JSON Schema library, replay the repository schema and fixtures
through it and inject failures for required unsupported behavior. The spike must
record:

- exact dependency revision/version and license;
- Swift tools/platform compatibility with Fornada;
- required keyword and `$ref` behavior;
- duplicate-member and Unicode behavior;
- deterministic error-to-problem mapping;
- transitive dependency and build-time cost;
- a rejection result if any critical behavior cannot be made explicit.

## Completion rule

No suite may compare floating-point values with tolerance. No test may pass only
because Go/TypeScript was available at runtime. A clean-package test plus Fornada
consumer compile is required before the Swift release is called production-ready.
