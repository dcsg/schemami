# SPEC-010: Schemami Go and TypeScript SDKs

**Status:** accepted
**Source PRD:** PRD-010
**Author:** Daniel Gomes
**Created:** 2026-08-11

## 1. Authorities

The SDKs implement, in order: Schemami v1 schemas; accepted ADR-014/015/016;
`calculus/SPEC.md`; the shared corpus; SPEC-007. Existing CLI/viewer behavior is
an extraction source only where it agrees with those authorities.

## 2. Layout and dependency direction

```text
sdk/go                  sdk/typescript
  schemami (Core)         @schemami/sdk (Core)
  calculus                @schemami/sdk/calculus
  diff                    @schemami/sdk/diff
       ^                         ^
       |                         |
Go CLI consumer          Viewer consumer
```

Core owns strict parsing, retained values, schema/semantic admission,
canonicalization, digest, problems, pointers, and resource budgets. Calculus
depends on Core types where useful; Diff depends on admitted Core documents.
Core must not depend on Calculus or Diff in a way that creates an import cycle.

## 3. Public contract

Both implementations expose idiomatic equivalents of:

```text
parse(bytes, budgets) -> parsed | refused(problems)
admit(parsed, budgets) -> admitted recipe | admitted bundle | refused(problems)
canonicalJSON(admitted/value) -> bytes | refused
sha256(admitted/value) -> lowercase hex | refused
evaluate(operation request, admitted input, budgets) -> result | refused(problems)
compare(admitted source, admitted candidate) -> ordered structural changes
```

An admitted document retains immutable submitted bytes and its complete JSON
tree. Public callers cannot manufacture an `AdmittedRecipe` by decoding a data
structure and bypass admission.

Go uses explicit result structs rather than panics. TypeScript uses discriminated
unions rather than exceptions for expected refusal. Programmer misuse may still
raise a language-native error, but invalid documents and operations may not.

## 4. Strict parsing and admission

- JSON only is mandatory for the SDK core; optional YAML authoring adapters may
  be separate exports and never define canonical identity.
- Reject duplicate object names before generic decoding.
- Reject lone Unicode surrogates, invalid UTF-8, non-finite/out-of-range I-JSON
  numbers, and a non-object root.
- Validate recipe and bundle schemas from deterministic embedded resources.
- Run complete semantic admission and distinct reachable-graph analysis with
  protocol logical-capacity budgets plus the separate request-scoped
  `analysisStates` safety ceiling from ADR-017. The v1 SDK default is 10,000
  canonical residual states; bundle admission shares one counter across all
  embedded documents.
- Admission-wide budget exhaustion is exactly one root-pointer
  `resource-limit` problem in both SDKs. Operation-local exhaustion may retain
  the exact operation request/result pointer.
- Return stable problem URI + RFC 6901 pointer, deduplicated and sorted by ASCII
  pointer then URI.

## 5. Canonical identity

RFC 8785 bytes are produced from the retained admitted value. SHA-256 uses those
bytes, never submitted formatting. Object member ordering uses UTF-16 code units
as required by JCS. Invalid/unadmitted input receives no canonical identity.

## 6. Calculus

Both packages expose the six closed operations and replay
`conformance/structured-calculus.json` and legacy vectors. All decimal/rational
intermediates are arbitrary precision. Public quantization is half-even. Unit
conversion is limited to the pinned compatible UCUM profile; no density or
prose inference is allowed.

## 7. Diff

Diff compares two admitted recipes and returns ordered changes containing a
kind plus source/candidate RFC 6901 pointers and retained before/after values
where applicable. It covers all schema fields including extensions. It does
not mutate, merge, infer equivalence, calculate substitutions, or incorporate
application projection capability.

## 8. Package requirements

### Go

- Module `github.com/dcsg/schemami/sdk/go`.
- Go source consumers import package `schemami`; Calculus and Diff may be
  subpackages.
- The CLI uses the module through an explicit local replace during repository
  development; released consumers use the tagged module path.

### TypeScript

- npm package `@schemami/sdk`, ESM-first with generated declarations.
- Export map for `.`, `./calculus`, `./diff`, and package metadata.
- Browser and server compatible; no DOM dependency in the SDK.
- Exact arithmetic uses `bigint`; protocol JSON values remain JSON-compatible
  values and never expose `bigint` in serialized results.

## 9. Verification

- Core suites replay validation and canonicalization corpora.
- Calculus suites replay every shared result/refusal byte-for-byte after JCS.
- Diff suites replay the same before/after cases as Swift.
- Disposable consumers prove real package imports.
- CLI and viewer regression suites prove extraction did not change behavior.
- A manifest records schema/vector source digest for each SDK copy.

## 10. Release boundary

Passing implementation tests makes the packages release candidates only.
Commit, tag, Go module release, npm publication, and consumer pinning require a
separate evidence review and explicit approval.
