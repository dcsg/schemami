# Schemami source-to-candidate Phase 0 decision

**Date:** 2026-08-11  
**Track:** PRD-008 / SPEC-008  
**Decision:** accepted by Daniel

## Why this checkpoint exists

The source-to-candidate contract can now be specified without a central registry,
translation companion, runtime LLM, or documentation website. Seven wire and
workflow choices still affect integrators. They must be approved before schemas
and instruction bytes are frozen.

## 1. Candidate document identity

Schemami recipes require `collection`, `id`, and `revision`. A direct consumer-chat
user should not need to understand or fill protocol identity fields.

### A — host identity only

The host must supply all identity before acquisition. The adapter refuses when it
is absent.

- Strongest identity discipline.
- Poor direct-chat UX and conflicts with source-first, non-form acquisition.

### B — adapter chooses arbitrary identity

The adapter invents any valid identity.

- Easy for direct chat.
- Unstable across runs and gives probabilistic output authority over application
  identity.

### C — host identity or fixed provisional identity (recommended)

Use host-supplied identity when present. Otherwise contract version 1 requires:

```json
{
  "collection": "imports",
  "id": "candidate",
  "revision": 1
}
```

The acquisition report adds `provisional-document-identity`. Deterministic
admission may operate on it, but an importer must consciously assign application
identity before publication. The report and UI must never present the provisional
identity as globally unique.

This avoids asking users for schema metadata and avoids fabricated hashes/UUIDs.
Exact submitted/canonical digests still distinguish candidate bytes during review.

## 2. Generated recipe-local IDs

### A — semantic slugs

Examples: `acucar-mascavado`, `fermentacao-frio`.

- More readable to developers.
- Transliteration, normalization, homonyms, and model wording create instability.

### B — random UUIDs

- Collision-resistant.
- Not deterministic, visually noisy, and disconnected from authored order.

### C — kind-prefixed ordinals (recommended)

Examples: `ingredient-1`, `technique-1`, `section-1`, `step-1`, `action-1`.

- Deterministic from authored first occurrence.
- Language-neutral and requires no invented slugging standard.
- Human renderers show source-language names, not IDs.

Valid IDs already supplied by an application-data source remain unchanged. This
is an acquisition-contract convention only; Schemami v1 continues to permit any
valid integrator-selected local ID.

## 3. Single recipe versus bundle output

Schemami v1 bundles require canonical SHA-256 for every embedded recipe, and a
component recipe reference also requires the exact child digest. An AI/model
adapter is not canonicalization authority.

### A — let adapters emit bundles

- Appears convenient.
- Encourages fabricated/incorrect digests or requires the model to implement JCS.
- Rejected as unsafe.

### B — allow placeholder hashes

- Makes pre-link composition possible.
- Output is not Schemami and placeholder values can masquerade as identity.
- Rejected.

### C — Track A v1 emits one recipe candidate at a time (recommended)

The core contract emits one candidate recipe. A composed source is captured in
dependency order:

1. capture and admit the child recipe;
2. obtain its deterministic canonical digest;
3. provide the exact child reference as an authorized input when capturing or
   finalizing the parent;
4. admit the parent;
5. let deterministic tooling build the Schemami bundle.

A future acquisition-linker increment may automate this staged process using a
separate non-normative candidate graph. It must not put symbolic or placeholder
references inside a Schemami recipe.

This narrows PRD-008/SPEC-008 from “recipe or bundle candidate” to “recipe
candidate; deterministic bundle compilation after admission.”

## 4. Contract identity and version fields

### A — separate short ID and version

```json
{"contract":"schemami-source-to-candidate","version":"1"}
```

### B — exact versioned URI everywhere (recommended)

```json
{
  "contract": "https://schemami.dev/contracts/source-to-candidate/1"
}
```

Use the same `contract` value in manifest, request, report, repair request, and
admission metadata. Local operation does not require resolving the URI; immutable
hosting may later serve the same bytes.

This follows the project's existing immutable schema-identifier direction and
removes `contract`/`version` combinations that can disagree.

## 5. Candidate digest field names

### A — context-specific aliases

Examples: `candidate_input_sha256`, `input_sha256`, `candidate_sha256`.

- Clear in isolation.
- Violates the accepted field-consistency direction and complicates integrators.

### B — one exact vocabulary (recommended)

- `submitted_sha256`: SHA-256 of exact candidate bytes as submitted.
- `canonical_sha256`: RFC 8785/Schemami canonical digest, present only after
  successful deterministic admission.
- `sha256`: exact digest where the containing source/document type already makes
  the subject unambiguous.

Use `submitted_sha256` in acquisition report, admission result, and repair request.

## 6. Adapter identity

### A — free-form name/version

Easy but ambiguous and hard to compare.

### B — URI identity plus opaque release (recommended)

```json
{
  "adapter": {
    "id": "https://example.com/adapters/recipe-import",
    "release": "2026-08-11"
  }
}
```

- `id` is an absolute URI.
- `release` is a required non-empty string. It is deliberately not constrained to
  Semantic Versioning because provider models, manual processes, and dated prompt
  bundles do not share one versioning scheme.
- Provider/model details may be additional report metadata but never affect
  candidate validity.

## 7. Uncertainty and confidence

### A — numeric model confidence

Looks precise but is not calibrated source evidence and can be mistaken for trust.

### B — closed review outcomes only (recommended)

The acquisition report uses coverage statuses and stable review codes. It may
include explanatory prose, source selectors, and candidate pointers. It does not
store numeric adapter confidence in the Schemami document or report.

If a source itself states uncertainty, that authored fact may be preserved as
source evidence/prose. Model self-confidence is not source evidence.

## Recommended authority set

Approve together:

1. **1C** — host identity or fixed provisional `imports/candidate/1`;
2. **2C** — deterministic kind-prefixed ordinal local IDs;
3. **3C** — single recipe candidate; deterministic staged component/bundle build;
4. **4B** — exact versioned contract URI everywhere;
5. **5B** — `submitted_sha256` and `canonical_sha256` vocabulary;
6. **6B** — adapter absolute URI plus opaque `release`;
7. **7B** — closed review outcomes, no numeric model confidence.

Daniel accepted the complete recommended set on 2026-08-11. It is the authority
for PRD-008, SPEC-008, the version-1 contract schemas, and fixtures.

## After approval

- Amend PRD-008 and SPEC-008 to the accepted single-recipe/staged-bundle boundary.
- Produce full positive and nearest-invalid JSON examples.
- Mark this report `Decision: accepted` with the exact choices.
- Implement Phase 1 schemas, instructions, manifest, and deterministic fixtures.
