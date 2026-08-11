# Schemami Swift SDK Phase 4 evidence

**Date:** 2026-08-11  
**Result:** passed

## Outcome

`SchemamiDiff.compare(source:candidate:)` now compares two fully admitted
recipes and returns deterministic, non-canonical protocol change metadata.

The public result contains exact source/candidate document identity and digest,
plus pointer-addressed changes with closed kinds:

- `added`;
- `removed`;
- `renamed`;
- `modified`; and
- `reordered`.

Each change carries the applicable source and candidate RFC 6901 pointers and
retained values. The primary pointer uses the candidate side when it exists and
the source side for removals. This lets an application compose its own
projection limitations without teaching the SDK application mappings.

## Structural behavior

- Objects compare by exact member name, including admitted `x-*` extensions.
- ID-bearing arrays align by recipe-local ID, so insertion/reordering does not
  generate false modifications for every following object.
- Ordered primitive/reference arrays report pure reordering distinctly.
- Added/removed elements retain only the pointer that actually exists.
- Changes are sorted by ASCII pointer, then closed kind and source pointer.
- Both input values and their canonical identities remain unchanged.

The coverage fixture proves identity/revision/lineage, ingredients and
alternatives, quantities/formulas, recursive sections/steps/actions,
instructions, dependencies/durations/completion/environment/activation,
techniques/equipment, components/outputs/yields, and extensions through the
same complete structural engine.

The SDK does not merge recipes, propose substitutions, infer culinary
equivalence, assess Fornada projection, or change canonical recipe bytes.

## Verification

```sh
env CLANG_MODULE_CACHE_PATH=/tmp/schemami-swift-phase4-clang \
  SWIFTPM_MODULECACHE_OVERRIDE=/tmp/schemami-swift-phase4-swiftpm \
  swift test --package-path sdk/swift --filter SchemamiDiffTests
```

```text
3 tests, 0 failures
```

The complete package suite also passed:

```text
27 tests, 0 failures
```

No commit, tag, package publication, automatic merge, or Fornada mutation was
made.

`PHASE 4 COMPLETE SWIFT SCHEMAMI DIFF VERIFIED`
