# SPEC-009 Swift conformance corpus inventory

**Date:** 2026-08-11  
**Purpose:** identify what the Swift SDK can replay directly and what must become
language-neutral conformance data before a production Swift release.

## Pinned shared corpus

| File | Shape | Coverage | SHA-256 |
|---|---|---|---|
| `conformance/schemami-v1/validation.json` | object, version 2, 27 vectors | 7 accepted and 20 refused schema/semantic documents with exact stable problems | `907d8e7b5d98bc9ed621c5d0353eef1fa7b4d48ec8d848bb7f60bf67a3e8d305` |
| `conformance/schemami-v1/calculus.json` | array, 36 vectors | five original operations, result bodies and stable refusals | `ab5853a0f73514eb53d394ab34927b1741429438c862544df2edb2cb6331122c` |
| `conformance/schemami-v1/structured-calculus.json` | object, version 1, 19 vectors | structured method, selection, component/bundle, and formula-target results pinned by JCS digest | `b4c10c14a1d04c8971420f72fac6b740625a8bf89bb1f69b3ccbbf85d341ab2a` |
| `conformance/schemami-v1/canonicalization.json` | object, version 1, 5 vectors | member-order invariance, UTF-16 ordering, escapes, and numeric thresholds | `6f2e5b645adee84ebb1f3f9e83ddae4a670ca73a8636b34ebb1b4b1354a655a0` |

The current shared operation coverage is:

| Operation | Original corpus | Structured corpus | Total |
|---|---:|---:|---:|
| `convert_quantity` | 17 | 0 | 17 |
| `resolve_selection` | 0 | 4 | 4 |
| `scale` | 7 | 8 | 15 |
| `resolve_formula` | 6 | 3 | 9 |
| `reading_order` | 1 | 2 | 3 |
| `schedule` | 5 | 2 | 7 |

The 36 original operation vectors contain 17 successful and 19 refused
outcomes. The structured corpus pins the canonical digest of the complete
operation envelope, so Swift must reproduce bytes with the same semantics and
JCS identity rather than compare an implementation-specific object graph.

## Reusable fixtures

The following committed fixtures are the present bundle/component integration
inputs:

- `tools/schemami/testdata/phase9-minimal.schemami.json`;
- `tools/schemami/testdata/phase9-structured.schemami.json`;
- `tools/schemami/testdata/phase9-child.schemami.json`;
- `tools/schemami/testdata/phase9-root.schemami.json`;
- `tools/schemami/testdata/phase9.schemami-bundle.json`.

`basic.schemami.yaml` and `local-entities.schemami.yaml` are useful reference
fixtures for the Go CLI, but YAML admission is deliberately outside the first
Swift release. JSON equivalents or generated canonical JSON must be used for
cross-language Swift proof.

## Behavior currently trapped in Go tests

These protocol-relevant cases exist as Go assertions rather than portable data:

1. duplicate JSON object members refuse before last-member-wins parsing;
2. invalid Unicode/unpaired surrogates refuse;
3. the JCS golden object containing `<tag>` and a supplementary-plane character;
4. the pinned canonical digest for `basic.schemami.yaml`;
5. malformed JSON and unsupported top-level JSON values;
6. canonical equivalence across submitted whitespace and member order;
7. raw-parser problem ordering beyond semantic admission (semantic problem
   identities, pointers, deduplication, ordering, and cascade suppression are
   now pinned in the shared validation corpus and consumed by Go and Swift).

Swift may use temporary unit tests while these are extracted, but production
parity cannot be claimed from language-private tests. They must become committed
language-neutral parsing/canonicalization/diagnostic vectors consumed by Go and
Swift, and later by TypeScript.

## Missing Swift-fast-lane corpus

The following suites do not yet exist as shared data and are required by
SPEC-009:

- additional upstream RFC 8785/JCS edge vectors beyond the new shared five-vector
  foundation, especially the full binary64 serialization corpus;
- strict raw-byte JSON parser vectors with exact accept/refuse outcomes;
- bundle admission vectors that name both expected validity and stable problems,
  rather than only operation-result digests;
- exact arbitrary-precision rational and half-even quantization boundary vectors;
- a deterministic `SchemamiDiff` corpus covering normative field families,
  array reorder, `x-*` changes, and lineage; application projection limitations
  are deliberately outside this corpus;
- resource-budget vectors for parser bytes/nesting, bundle documents, semantic
  occurrences, selected component instances, and evaluation depth;
- additional raw-parser diagnostic vectors; semantic admission problems are now
  pinned directly on every refused shared validation vector, including one
  independent multi-problem ordering case.

## Phase requirements

### Before Phase 1 implementation is called conforming

- Copy/generate the existing schema and three shared corpora into Swift package
  resources from a checked manifest; do not hand-edit duplicate normative data.
- Replay all 27 validation vectors and all 55 calculus vectors (36 original plus
  19 structured).
- Add temporary Swift unit coverage for strict duplicate-member and invalid
  Unicode refusal so the dependency's last-member-wins behavior cannot leak into
  admission.

### Before the Swift SDK release candidate

- Externalize the Go-only parsing and canonicalization assertions into shared
  vectors and make both Go and Swift consume them.
- Add the missing diff, budget, and diagnostic corpora listed above.
- Pin every generated resource by path and SHA-256 in the Swift package resource
  manifest.
- Prove the package from a clean checkout without invoking Go, TypeScript, a
  network service, or Fornada at test runtime.

## Conclusion

The existing corpus is sufficient to start the Swift implementation after the
dependency/API gate is approved. It is not by itself sufficient to release the
Swift SDK as fully conforming. The highest-risk gaps are strict raw JSON
admission, RFC 8785 identity, deterministic diagnostics, and the entirely new
diff contract.
