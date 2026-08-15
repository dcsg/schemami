# ADR-009: Schemami v1 computation and portable-data boundary

**Date:** 2026-08-11
**Status:** Accepted

**Schemami v1 amendment:** ADR-014 supersedes the closed five-operation claim
and the exclusion of typed options/guards. The five existing operations remain;
the revised wire must add deterministic recipe resolution before those
operations consume an active graph. Tracks, lanes, arbitrary expressions, and
untyped constraints remain outside v1.

## Context

Schemami v1 needs a small, interoperable calculation surface without turning
every useful application feature into a permanent protocol operation. It also
needs portable document identity, optional external links, evidence, authored
prose, and extension rules that do not restore a central vocabulary or require
Schemami to host content.

## Decision

1. **Partially superseded by ADR-014.** The original candidate operations are `scale`, `resolve_formula`,
   `convert_quantity`, `reading_order`, and `schedule`. Validation and
   rendering are protocol behavior but not Recipe Calculus operations.
2. `scale` understands only `linear` and `fixed`. An integrator may preserve a
   custom scaling declaration in an `x-<owner>-*` extension, but Schemami never
   interprets it; an operation requiring that behavior returns a diagnostic.
3. **Superseded by ADR-014 for typed variation.** Options, guards, typed constraints, tracks, and interleaving are not v1
   wire features or operations. A later model may add portable tracks and
   interleaving after evidence demonstrates the need.
4. `reading_order` is normative. It returns one deterministic linear method
   projection: explicit dependency edges take precedence and declaration order
   breaks ties. It exposes no lanes or concurrency claim. `schedule` may still
   expose timing relationships derived from explicit durations and dependencies.
5. A document has opaque `collection` and `id` identifiers using the accepted
   lowercase 1–128-character local-ID grammar. `id` is unique within its
   collection. `revision` is a positive base-10 integer without a leading zero.
   A published pack identifies an exact document by `(collection, id, revision,
   JCS SHA-256 digest)`; no global registry or lookup is implied.
6. An entity MAY carry `external_references`, an array of absolute RFC 3986
   URI strings. References are optional, never resolved by the protocol, and
   never provide calculation facts or alter canonical local identity.
7. `sources` are document-level acquisition records with a local `id`, a URI
   or URI-reference, optional registered `media_type`, and optional lowercase
   hexadecimal SHA-256 digest. Evidence records carry `source`, RFC 6901
   target `pointer`, optional source `raw_text`, and optional canonical-decimal
   `confidence` from `0` to `1`. A media-type-defined URI fragment may locate a
   source span; no Schemami free-form span grammar is introduced.
8. Canonical authored prose is limited to recipe `title`, entity `name`, step
   `instruction`, and `notes`. All are source-language strings under
   `content_language`; `description`, `label`, and locale-map aliases are not
   canonical alternatives.
9. Extension member names match `x-` followed by one or more lowercase ASCII
   DNS-label-style tokens separated by hyphens. The first token is a claimed
   owner convention, not a Schemami registry. Unknown extensions round-trip
   unchanged and do not affect Schemami logic.
10. Operation results use `operation` tokens above, `status` values `ok`,
    `refused`, or `not_applicable`, and RFC 9457-inspired absolute problem
    type URIs under `https://schemami.dev/problems/`. Initial codes are
    `unsupported-legacy`, `invalid-document`, `invalid-decimal`,
    `resource-limit`, `unknown-unit`, `ambiguous-unit`, `dimension-mismatch`,
    `unsupported-quantity-kind`, `unresolved-reference`, `missing-fact`, and
    `invalid-operation-arguments`. A problem with document scope carries an
    RFC 6901 `pointer`.

## Consequences

The operation surface remains deliberately bounded. ADR-014 promotes only
source-authored typed variation and deterministic resolution; arbitrary
branching expressions, custom scaling, constraints, and lanes remain
extensions and cannot masquerade as portable behavior.

Method order is portable without freezing a visual workflow model:

```yaml
steps:
  - id: refresh-starter
    instruction: Refresque a massa-mãe.
  - id: mix
    instruction: Misture os ingredientes.
    after: [refresh-starter]
```

`reading_order` returns `refresh-starter`, then `mix`. Future tracks could
express concurrent lanes, but are intentionally outside v1.

## Alternatives rejected

### Make every existing helper public

Rejected. Internal helpers and no-op operations create permanent promises
without a product-level interoperable need.

### Make tracks a v1 method requirement

Rejected for v1. Track ordering mainly establishes presentation lanes; the
portable method guarantees needed now are explicit dependencies, scheduling,
and deterministic reading order.

### Require global identifiers or reference resolution

Rejected. Local recipe identity remains sufficient for valid capture and
rendering. External URIs are optional links, not catalog admission.

## References

- ADR-004 — presentation-owned translations
- ADR-005 — local vocabulary and integrator resolution
- ADR-006 — clean Schemami v1 cutover
- ADR-008 — local method entities and exact quantity contract
- RFC 3986 — URI generic syntax
- RFC 6901 — JSON Pointer
- RFC 8785 — JSON Canonicalization Scheme
- RFC 9457 — Problem Details for HTTP APIs
