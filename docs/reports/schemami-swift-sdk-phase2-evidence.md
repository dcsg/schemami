# Schemami Swift SDK Phase 2 evidence

**Date:** 2026-08-11  
**Result:** passed  
**Package:** `sdk/swift/`

## Delivered

- public `SchemamiCore.admit(_:budgets:)` with explicit recipe, bundle, and
  refused outcomes;
- admitted values retain exact submitted JSON bytes, the lossless ordered value,
  and the complete typed model;
- RFC 8785 canonical JSON and SHA-256 available only after full admission;
- semantic validation for language/origin, local collections/references,
  alternatives, formulas, recursive method/actions/completion, activations,
  durations, UCUM identities, sources/evidence/selectors, and exact ranges;
- exhaustive distinct-reachable-active-graph analysis with exact threshold
  boundary regions, graph deduplication, dependency/timing cycles, producer
  invariants, dormant-branch checks, and deterministic resource refusal;
- exact `BigInt`-backed rational comparisons and compatible-unit conversion in
  admission; no binary floating-point threshold decisions;
- bundle embedded-document admission, canonical digest verification, exact root,
  canonical order, dependency closure, and component-cycle refusal;
- stable problems deduplicated and sorted by RFC 6901 pointer then problem URI.

The public admitted object also exposes the exact source bytes requested by
Fornada. Application projection assessment remains outside `SchemamiCore` and
outside future `SchemamiDiff`.

## Shared parity authority

`conformance/schemami-v1/validation.json` now contains 27 vectors:

- 7 admitted recipes;
- 20 refused schema/semantic recipes;
- exact stable problem type and pointer for every refusal;
- an explicit two-independent-problem ordering case.

Its SHA-256 is:

```text
907d8e7b5d98bc9ed621c5d0353eef1fa7b4d48ec8d848bb7f60bf67a3e8d305
```

Both Go and Swift consume this same file. The cases include dormant invalid
references and cycles, mutually exclusive and threshold-bound producers,
threshold gaps/overlaps, relative timing, inactive actions, equivalent-graph
deduplication, and deterministic graph-budget refusal.

Canonical identity uses the five-vector shared JCS foundation at
`conformance/schemami-v1/canonicalization.json`, consumed independently by Go
and Swift. The Swift resource manifest covers 16 generated/copied authorities.

## Verification

```sh
env CLANG_MODULE_CACHE_PATH=/tmp/schemami-swift-phase2-clang \
  SWIFTPM_MODULECACHE_OVERRIDE=/tmp/schemami-swift-phase2-swiftpm \
  swift test --package-path sdk/swift

GOCACHE=/tmp/schemami-phase2-go-cache go -C tools/schemami test ./...
bash tools/schemami/check-swift-resources.sh
git diff --check
```

Results:

```text
Swift: 16 tests, 0 failures
Go schemami + calculus + acquisition harness: passed
swift-resources: check passed (16 resources)
git diff --check: passed
```

## Boundary

Phase 2 does not implement Recipe Calculus operations or protocol diff. The
`SchemamiCalculus` and `SchemamiDiff` products still contain only independent
build boundaries; their behavior begins in Phases 3 and 4. Full upstream JCS
edge coverage and raw-parser data vectors remain release-candidate hardening,
not hidden runtime dependencies.

No commit, tag, package publication, or Fornada pin was performed.

`PHASE 2 COMPLETE SWIFT ADMISSION AND IDENTITY VERIFIED`
