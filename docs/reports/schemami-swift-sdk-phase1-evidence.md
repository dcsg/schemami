# Schemami Swift SDK Phase 1 evidence

**Date:** 2026-08-11  
**Result:** passed  
**Package:** `sdk/swift/`

## Delivered

- Swift-tools-6.1 package targeting iOS 17 and macOS 14;
- three independent products: `SchemamiCore`, `SchemamiCalculus`, and
  `SchemamiDiff`;
- exact approved dependency lock, including the tested revisions;
- strict JSON scanner before `OrderedJSON`, rejecting duplicate members,
  malformed JSON, invalid UTF-8/lone surrogates, and resource exhaustion;
- exact submitted-byte retention and ordered lossless `SchemamiValue`;
- RFC 6901 pointer validation, escaping, and navigation;
- core and bundle JSON Schema structural validation;
- complete recipe/bundle field projection and explicit Swift cases for every
  schema `oneOf` authority;
- deterministic resource sync/check tooling for two schemas, three conformance
  corpora, and five bundle/component fixtures.

The public API exposes parsing but deliberately does not expose schema-only
admission. Full public admission, stable semantic problems, JCS, and SHA-256 are
implemented together in Phase 2.

## Locked dependency graph

`Package.resolved` pins:

- `swift-json-schema` 0.13.1 at
  `f299eb1cce78b2dd736d9a390ec0779d28678416`;
- `BigInt` 5.7.0 at
  `e07e00fa1fd435143a2dcf8b7eec9a7710b2fdfe`;
- transitive `swift-collections` 1.6.0 and `swift-syntax` 603.0.2 at the
  Phase 0 reviewed revisions.

## Verification

```sh
swift test --package-path sdk/swift --scratch-path /tmp/schemami-swift-sdk-build
bash tools/schemami/check-swift-resources.sh
```

Result:

```text
Executed 12 tests, with 0 failures
swift-resources: check passed (10 resources)
```

Coverage includes:

- exact submitted bytes and authored member/array order;
- duplicate-member and invalid-Unicode refusals;
- deterministic recursion/occurrence budget refusal;
- RFC 6901 behavior;
- all seven shared schema-positive validation vectors;
- seven representative structural-invalid vectors;
- recursive method and `x-*` retention;
- explicit tagged-union projection from the structured fixture;
- real bundle projection of every embedded recipe;
- independent compilation of all three products.

A disposable Swift-tools-5.10 consumer targeting iOS 17/macOS 14 imported the
actual local `SchemamiCore`, retained exact submitted bytes, and printed:

```text
schemami-swift-consumer: parsed
```

## Resource integrity

`tools/schemami/sync-swift-resources.sh` generates package resources and a sorted
source/destination/SHA-256 manifest. `check-swift-resources.sh` compares every
source, copied byte, path, and digest. No hand-edited normative duplicate is
accepted.

## Known later work, not Phase 1 defects

- exhaustive semantic active-graph admission and stable problem mapping;
- RFC 8785 canonicalization and SHA-256 identity;
- all six Calculus operations;
- pointer-addressed protocol Diff.

These are Phases 2–4 and are intentionally not represented by placeholder public
success APIs.

`PHASE 1 COMPLETE SWIFT LOSSLESS CORE VERIFIED`
