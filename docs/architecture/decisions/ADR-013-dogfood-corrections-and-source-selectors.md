# ADR-013: Dogfood corrections and source selectors

**Date:** 2026-08-11
**Status:** Accepted

## Context

Pão de Portugal dogfooded the unpublished Schemami v1 candidate at commit
`884d5842473cd99e50c139842a759e7b496be543`. Its committed SPEC-013 fixtures
reproduced four contract defects and two unresolved wire choices: inverted
duration windows validated, open quantity guides recursed into open quantities,
percentage bases could be absent or non-100 terms, documented origin was
forbidden, steps could name only one technique, and an empty source URI
reference validated.

The owner also required source evidence to identify the exact part of a video,
audio, document, or other artifact that supports a step or technique without
turning media playback time into culinary duration.

## Decision

1. Every supplied duration-window pair MUST be ordered: `minimum <= target`,
   `target <= maximum`, and `minimum <= maximum`. Document validation and the
   direct `schedule` operation enforce the same invariant.
2. An open quantity `guide` MAY be measured or range only. It MUST NOT be open.
   Range ordering applies equally to a top-level quantity and an open guide.
3. A percentage formula's named `basis` MUST occur exactly once in `terms` and
   that term MUST carry `percentage: "100"`. Validation, `resolve_formula`, and
   formula-backed `scale` enforce this before resolving quantities.
4. Optional `origin` has optional `country`, `subdivision`, and `locality`.
   `country` is ISO 3166-1 alpha-2; `subdivision` is ISO 3166-2 syntax and MUST
   start with the supplied country plus `-`; `locality` is source-language
   authored place text, not a globally resolved identity. When present,
   `origin` MUST contain at least one of those fields. Integrators MAY carry a
   versioned national identifier in an owner extension.
5. A step uses ordered, unique `techniques`, not singular `technique`. Array
   order is the authored/application sequence inside that step. Readers and
   writers MUST preserve it and MUST NOT sort it. Reordering changes canonical
   bytes and hashes. The outer `steps` array remains the method sequence.
6. `sources` remains optional. A supplied source requires a non-empty URI or
   URI-reference; `null` and the empty string are invalid. A missing source is
   represented by omitting `sources`, not by an empty source record.
7. Evidence MAY carry one `selector` with `kind: fragment`, a non-empty
   fragment `value` without the leading `#`, and an absolute `conforms_to` URI.
   The shape follows W3C Web Annotation FragmentSelector semantics while
   retaining Schemami's snake-case field convention. For W3C Media Fragments,
   temporal `t` intervals use Normal Play Time and MUST have start less than
   end when both are supplied.
8. Evidence `pointer` identifies the exact structured occurrence, such as
   `/steps/0` or `/steps/0/techniques/1`. A selector locates evidence inside
   its declared source; it never supplies Recipe Calculus input. Media offsets
   are not culinary `duration` values.

## Consequences

```yaml
origin:
  country: PT
  subdivision: PT-11
  locality: Mafra
  x-paodeportugal-ine-municipality:
    version: "2025"
    code: "1109"

sources:
  - id: video-main
    uri: https://example.org/bread.mp4
    media_type: video/mp4

steps:
  - id: knead
    instruction: Misture, amasse e dobre a massa.
    techniques: [mixing, kneading, folding]

evidence:
  - id: kneading-clip
    source: video-main
    pointer: /steps/0/techniques/1
    selector:
      kind: fragment
      value: t=300,600
      conforms_to: https://www.w3.org/TR/media-frags/
```

An integrator can reconstruct
`https://example.org/bread.mp4#t=300,600`. The fragment says where the
demonstration appears; it does not say the kneading itself takes five minutes.

The dogfood regressions and positive/refused selector cases are published in
the shared validation conformance corpus and replayed by both implementations.
Validators may replace a known nested JSON-Schema union trace with one concise
pointer-level diagnostic, but the schema remains the admission authority and
the accepted/refused outcome cannot change.

## Alternatives considered

### Retain singular `technique`

Rejected. It forces a lossy adapter or arbitrary winner when one authored step
uses multiple techniques, despite arrays already being ordered by JSON.

### Put a fragment directly in every source URI

Rejected. It duplicates one artifact as many source records and weakens the
artifact/evidence distinction.

### Add bespoke `video_start`, `video_end`, `page`, and `text_span` fields

Rejected. Standards already define media-type fragment syntaxes and W3C Web
Annotation defines how a selector identifies a fragment.

### Model every national administrative level in core

Rejected. Country hierarchies differ and codes change. The compact global core
uses ISO country/subdivision plus authored locality; exact national coding is
integrator-owned extension data.

## References

- Pão de Portugal SPEC-013 and SCH-DF-001 through SCH-DF-006
- RFC 8259 — JSON arrays are ordered sequences
- ISO 3166-1 and ISO 3166-2 — country and subdivision codes
- RFC 3986 — URI references
- RFC 6901 — JSON Pointer
- W3C Media Fragments URI 1.0
- W3C Web Annotation Data Model, FragmentSelector
- SPEC-007 — Schemami v1 stable protocol release
