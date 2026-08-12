# SPEC-010 test strategy

## Required suites

1. Strict JSON and full recipe/bundle admission, including duplicate members,
   Unicode, logical resource floors, request-scoped analysis-state exhaustion,
   semantic blockers, and `x-*` retention.
2. RFC 8785 bytes and SHA-256 against every canonicalization vector.
3. Every legacy and structured Calculus result/refusal vector with exact JCS
   comparison.
4. Protocol-only Diff coverage across identity, lineage, ingredients,
   alternatives, formulas, recursive method, conditions, resources,
   components, outputs, evidence, sources, and extensions.
5. Disposable Go and TypeScript consumer imports.
6. Existing Go CLI and TypeScript viewer regression tests.
7. Swift regression suite as the third independent parity implementation.

## Failure policy

A mismatch is classified before changing code: protocol/vector defect, shared
SDK defect, language-specific implementation defect, or consumer integration
defect. No implementation-specific behavior becomes normative without first
changing the shared authority and adding a language-neutral vector.
