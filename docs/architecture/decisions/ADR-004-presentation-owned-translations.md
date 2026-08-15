# ADR-004: Translation is presentation-owned; RCP defines no companion format or content store

**Date:** 2026-08-10
**Status:** Accepted

## Context

The Model 2 exploration and DISCOVERY-002 tested an external translation
companion. It proved that a translation can be bound to source text and shown
or refused safely. It did not prove that RCP should own a translation format,
store translations, distribute locale bundles, or provide an editorial
workflow.

RCP is a deterministic recipe protocol and compilation target. It is not a
recipe-hosting or translation product. Requiring companion artifacts would
make the protocol or its operators responsible for content persistence,
fetching, integrity lifecycle, cache invalidation, translation review, and
attribution. Those are presentation/product concerns and add no value to
Recipe Calculus, validation, or canonical recipe identity.

## Decision

1. RCP SHALL NOT define, require, store, host, distribute, or manage recipe
   translation companions, locale bundles, or a translation registry.
2. RCP SHALL NOT operate a recipe-content store. This does not constrain an
   integrator's own local, hosted, or imported recipe storage.
3. Authored recipe prose remains source-language content. Its BCP 47 language
   tag identifies the content language; it is not an instruction to translate.
4. An integrator owns presentation translation of arbitrary recipe prose. It
   may use JSON files, a CMS, a database, a translation service, or no
   translation at all. Those resources are outside RCP validation, identity,
   canonical hashing, conformance, and calculation.
5. An integrator also owns localized display labels for stable RCP identifiers
   and reason codes. The identifiers and machine codes remain the protocol
   boundary; an absent label must not prevent deterministic evaluation.
6. Existing Model 1 inline localized data remains supported as existing input.
   This decision does not remove, migrate, or reinterpret it. It only rejects
   a new companion-based architecture.

## Consequences

**Good.** RCP avoids an unnecessary hosted-content and translation-management
responsibility. Integrators can select the language, storage, licensing,
review, offline, and caching behaviour appropriate to their product. Runtime
calculation remains independent of translated prose.

**Cost accepted.** RCP cannot promise a rendered language other than authored
source content. Two integrations may present different translations of the
same recipe. That is expected presentation behaviour, not a protocol
divergence.

**Discovery disposition.** The companion harness remains retained as rejected
evidence: it demonstrates safe binding mechanics, not an approved product or
protocol direction. No successor companion PRD, schema, pack entry, network
endpoint, or migration is authorized by this ADR.

## Alternatives considered

### RCP-managed external companions

Rejected. They require new artifact, storage, retrieval, cache, integrity,
translation-review, licensing, and offline-distribution contracts without
improving recipe semantics or computation for integrators that already own
their presentation layer.

### Per-field companions

Rejected. They multiply retrieval and failure points without meaningful
protocol benefit.

### Require inline translations in a future recipe model

Not selected. That would make presentation content part of a recipe document
again and still would not solve editorial ownership. Model 1's existing inline
data remains unchanged under its frozen compatibility contract.

## References

- `docs/reports/obsidian/model2-critique/07-discovery-002-results.md`
- `docs/product/prds/PRD-006-rcp-discovery-prototypes.md`
- `docs/product/specs/SPEC-006-rcp-discovery-prototypes/spec.md`
