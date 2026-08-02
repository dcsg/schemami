# RCP features

Source of truth: [features.yaml](./features.yaml). Top of the traceability
chain: **FEAT → FR (PRD) → SR/DS/CMP (SPEC) → plan → code.** Deferred and
external features carry no implementation ids until they graduate into a
PRD (`graduates_to:`), per the [traceability guideline](../guidelines/traceability.md).

## Shipping — v0.1 (PRD-001 / SPEC-001)

| ID | Feature | Realized by |
|----|---------|-------------|
| FEAT-CORE-001 | Frozen, versioned core schema | FR-PR-001 |
| FEAT-CORE-002 | Hardened constraint & safety encoding | FR-PR-002 |
| FEAT-REG-001 | Registry entry formats | FR-REG-001 |
| FEAT-REG-002 | Seed registry + slug migration | FR-REG-002 |
| FEAT-PROF-001 | Bread profile (hardened) | FR-PROF-001 |
| FEAT-PROF-002 | Pastry profile (hardened) | FR-PROF-002 |
| FEAT-PROF-003 | Draft profiles ×5 + maturity | FR-PROF-003 |
| FEAT-VAL-001 | Two-layer validation harness | FR-VAL-001, FR-VAL-002 |
| FEAT-SAFE-001 | Fail-closed safety clamp (throwaway) | FR-SAFE-001 |

## Deferred — v1

| ID | Feature | Trace |
|----|---------|-------|
| FEAT-CALC-001 | Recipe Calculus + conformance vectors | #13, #15 |
| FEAT-CORE-003 | Decode-compatibility CI fixtures | #14 |
| FEAT-CORE-004 | Codegen decode types (Swift/TS) | #8; 02:551-554 |
| FEAT-PROF-004 | Ferment profile hardened | #18 |
| FEAT-PROF-005 | Dish profile hardened | #18 |
| FEAT-SUB-001 | Global substitution catalog | #9, #17 |
| FEAT-PUB-001 | Verified publish-time resolution | #21; obligation 3 |

## Deferred — post-v1

| ID | Feature | Trace |
|----|---------|-------|
| FEAT-PROF-006 | Preserve/drink/coffee hardened | #18 |
| FEAT-SUB-002 | Pack/shelf projection format (gated: AT-2/AT-4) | #10, #19 |

## External — app-side, never in this repo

| ID | Feature | Trace |
|----|---------|-------|
| FEAT-APP-001 | Ingestion pipeline (v1-core product path; AT-3 dogfoods the protocol) | #11, #19, #21 |
| FEAT-APP-002 | Execution sessions + cook-along surfaces | #16, #19 |
| FEAT-APP-003 | Users, favorites, collections, publishing infra | #19 |
