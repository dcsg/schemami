# Schemami Swift SDK Phase 3 evidence

**Date:** 2026-08-11  
**Result:** passed

## Outcome

`SchemamiCalculus` now implements the six public v1 operations behind a closed
Swift request union:

| Operation | Verified behavior |
|---|---|
| `resolve_selection` | instance paths, authored defaults, explicit choice/toggle/measurement bindings, strict alternatives, active method/action/input reports, invalid/missing bindings, unresolved children |
| `resolve_formula` | ratio and percentage groups, exact authored/selected totals, conditional terms without redistribution |
| `scale` | positive factor XOR root formula target, exact derived rational, one application across root/components, fixed/range/open behavior, half-even public values |
| `convert_quantity` | pinned same-dimension and temperature conversion, regional ambiguity, unknown/dimension refusal, no density or prose inference |
| `reading_order` | deterministic declaration-tie topological order, active branches, component composition, explicit unplaced components |
| `schedule` | earliest-start projection from explicit dependencies/durations, component composition, explicit unscheduled components |

The implementation uses `BigInt` rational intermediates. It never uses binary
floating tolerance, a rounded intermediate, network lookup, density inference,
or prose parsing.

## Parity proof

Swift exactly matches:

- all 36 original shared calculus result/refusal vectors;
- all 24 structured canonical-envelope vectors after the parity audit; and
- the Go reference's additional sibling/nested component, missing component
  bytes/yield, exact component unit conversion, public API, and resource-limit
  cases.

The audit deliberately expanded the shared corpus after finding behavior that
the original 19 structured vectors did not cover: authored defaults, explicit
strict alternatives, measurement predicates, invalid choice/measurement
bindings, and unresolved standalone component references. Both Go and Swift
now consume those additional language-neutral vectors.

## Public boundary

- `OperationRequest` is a closed tagged union; there is no arbitrary public
  operation string.
- `OperationInput` distinguishes admitted recipe, admitted bundle, and
  standalone conversion contexts.
- `EvaluationResult` exposes the retained non-publishable envelope, closed
  status, stable pointer-addressed problems, result, and evaluation metadata.
- standalone conversion cannot invent recipe identity;
- invalid contexts and selected-component resource exhaustion refuse rather
  than trap.

## Verification

```sh
env CLANG_MODULE_CACHE_PATH=/tmp/schemami-swift-phase3-clang \
  SWIFTPM_MODULECACHE_OVERRIDE=/tmp/schemami-swift-phase3-swiftpm \
  swift test --package-path sdk/swift --filter SchemamiCalculusTests
```

```text
10 tests, 0 failures
60/60 shared operation vectors matched
```

```sh
GOCACHE=/tmp/schemami-go-phase3-cache \
  tools/with-toolchain.sh go -C tools/schemami test ./...
bash tools/schemami/check-swift-resources.sh
```

Both passed. The generated Swift resource manifest now pins 17 authority files.

No commit, tag, package publication, or Fornada mutation was made.

`PHASE 3 COMPLETE SWIFT RECIPE CALCULUS VERIFIED`
