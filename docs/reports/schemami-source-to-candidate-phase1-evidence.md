# Schemami source-to-candidate Phase 1 evidence

**Date:** 2026-08-11  
**Contract:** `https://schemami.dev/contracts/source-to-candidate/1`  
**Result:** passed

## Delivered bytes

The versioned contract lives at `acquisition/source-to-candidate/1/` and
contains:

- provider-neutral hostile-source and capture instructions;
- strict manifest, acquisition-request, acquisition-report, and repair-request
  JSON Schemas;
- valid host-identity and provisional-identity request examples;
- a valid Schemami v1 candidate, matching acquisition report, and repair example;
- 18 indexed positive and nearest-invalid request/report/repair cases;
- a deterministic manifest covering 25 files, excluding only the manifest
  itself.

The exact manifest SHA-256 is:

```text
b895facc988550440973aa6981862bd74094e9d8b0bdc52dff3573b3332d4851
```

## Accepted architecture proved

- Contract identity is one exact versioned URI.
- The candidate is one recipe, never a bundle or placeholder reference.
- Host identity is preserved; absent identity becomes exactly
  `imports/candidate/1` and must be reported.
- Local generated IDs use deterministic kind-prefixed ordinals.
- Exact submitted bytes use `submitted_sha256`; canonical identity is reserved
  for later deterministic admission.
- Adapter identity is an absolute URI plus opaque non-empty `release`.
- Report coverage and review codes are closed; numeric model confidence and
  adapter-created admission claims are rejected.
- BCP 47 spelling is canonicalized, media types use the platform RFC parser,
  URIs use JSON Schema URI formats, pointers use RFC 6901 grammar, and digests
  are lowercase SHA-256.

## Verification

Commands:

```sh
bash tools/acquisition-harness/build-manifest.sh
bash tools/acquisition-harness/check-contract.sh
bash tools/acquisition-harness/check-manifest.sh
```

Results:

```text
acquisition-contract: build passed
acquisition-contract: check passed
schemami: valid
acquisition-contract: verify passed
```

Rebuilding the manifest and byte-comparing it with the previous output returned
`MANIFEST_REBUILD_IDENTICAL`.

The contract checker rejects duplicate JSON members, asserts JSON Schema 2020-12
formats, applies canonical BCP 47 and RFC media-type checks, validates the
positive candidate through the independent Schemami CLI, and confirms the
report's submitted digest matches the exact candidate bytes.

No inference provider, website, recipe store, network lookup, Fornada checkout,
or private source material is used by these checks.

## Scope boundary

Phase 1 establishes immutable candidate/report/repair contract shapes. It does
not yet implement deterministic machine-readable admission results, stale-aware
repair execution, provider calls, or real-source dogfood. Those remain Phases 2
through 4.

`PHASE 1 COMPLETE ACQUISITION CONTRACT BYTES VERIFIED`
