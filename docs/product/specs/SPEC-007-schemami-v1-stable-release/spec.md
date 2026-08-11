# SPEC-007: Schemami v1 stable protocol release

**Status:** accepted
**Source:** PRD-007
**Structured source of truth:** [spec.yaml](./spec.yaml)

## Summary

SPEC-007 defines the clean Schemami v1 public contract. It replaces every
active RCP wire identity in this repository, removes mandatory central
vocabulary resolution, makes source language and local recipe identities
explicit, introduces exact tagged quantities and narrow UCUM conversion, and
publishes one cross-language conformance surface.

This is a clean pre-publication cutover. No released Schemami reader accepts,
aliases, or migrates an RCP document. Historical RCP material stays historical
and one negative vector proves the unsupported-legacy diagnostic.

## Architectural boundary

Schemami is a deterministic recipe intermediate representation and calculation
contract. Acquisition adapters may use OCR, selectors, parsers, or language
models to create a candidate document, but none is part of the runtime protocol.
Validation and Recipe Calculus consume structured values only. Evidence is
auditable input history, never a second executable representation.

Schemami does not host recipes, translations, catalogs, or inference. An
integrator may map local IDs, translate authored prose, or round calculated
values in its own presentation layer without changing canonical recipe content.

## Wire identity and serialisation

The Schemami v1 root marker is the string `schemami: "1"`. Root documents and
pack manifests use it; nested components omit it. `x-schemami-*` is reserved for
protocol-defined extensions. Integrator extensions use `x-<owner>-*`; readers
preserve unknown `x-*` values but they cannot affect validation, identity,
resolution, or calculation.

Canonical schema identifiers are rooted below:

```text
https://schemami.dev/schema/schemami/1/core.schema.json
https://schemami.dev/schema/schemami/1/pack.schema.json
```

Schemami v1 has no `kind` or `profile` wire member. It therefore has no
category-profile schema graph; the old RCP profiles are historical cutover
material, not renamed Schemami schemas.

JSON is the canonical representation and `.schemami.json` is the canonical file
suffix. YAML may be accepted as an authoring/import representation with suffix
`.schemami.yaml`, but it has no distinct data model: it must parse into an
I-JSON-compatible value and pass the same schema. Identity and hashes operate on
RFC 8785 JCS bytes after schema admission. Because recipe scalars are canonical
decimal strings, their value does not depend on binary floating-point
serialisation.

Until a Schemami-specific `+json` media type is registered under RFC 6838, the
published interoperable media type is `application/json`. The intended future
registration is a release-manifest concern, not a fabricated unregistered claim.

## Language and authored prose

Every root document requires `content_language`, a well-formed BCP 47 tag from
the IANA Language Subtag Registry. `pt-PT` is Portuguese as used in Portugal.
Every authored prose field in a document is a string in that source language;
locale maps are invalid. Recipe origin remains independent and, when supplied,
uses `origin.country` as ISO 3166-1 alpha-2 plus an optional standard-backed
subdivision field.

## Recipe-local identity

An ingredient requires recipe-local `id` and source-language `name`. Its `id` is
unique within the containing recipe and is the target of recipe-internal
references. `item`, `proposed_class`, a generic `terms` catalog, and global or
package vocabulary identifiers are absent.

Every recipe-local ID matches `^[a-z0-9][a-z0-9_-]*$`: lowercase ASCII letters
and digits plus hyphen and underscore, beginning with a letter or digit.
References compare the exact string. Readers never lowercase, case-fold,
transliterate, or otherwise normalize an ID. A lowercase UUID-shaped value such
as `550e8400-e29b-41d4-a716-446655440000` is valid but is not interpreted or
validated as a UUID by Schemami. Every recipe-local ID contains at most 128
characters.

A recipe may declare local `techniques` and `equipment`. Each entry requires an
`id` unique in its respective collection and a source-language `name`. Local
entities are valid and renderable without a catalog. An integrator may map
`(document identity, entity collection, local id)` externally; the mapping is
not canonical recipe data and asserts no global equivalence.

## Quantity algebra

`quantity` replaces `amount` for absolute amounts. It is a closed tagged union
selected by required `kind`; prose or member presence never selects a kind
implicitly. Ratios and percentages are grouped `formula` relationships across
ingredients, not scalar quantity kinds.

### Measured

```yaml
quantity:
  kind: measured
  value: "500"
  unit: g
```

`value` is a canonical decimal string and `unit` is a pinned UCUM 2.2 code.
Ingredient measured quantities are positive. A measured quantity may carry
`scaling: linear` or `scaling: fixed`. An integrator may preserve a custom
scaling declaration in an `x-<owner>-*` extension, but no Schemami operation
interprets it; an operation requiring it refuses.

### Range

```yaml
quantity:
  kind: range
  minimum: "450"
  maximum: "500"
  unit: g
```

Minimum and maximum use the same explicit UCUM unit and `minimum <= maximum`.
A range may be scaled exactly but is not accepted by scalar-only conversion
until SPEC-007 explicitly defines a range conversion result.

### Open

```yaml
quantity:
  kind: open
  qualifier: as_needed
```

`qualifier` is one of `to_taste`, `as_needed`, or `to_consistency`. An open
quantity is intentionally not resolved to zero or a guessed scalar. It may carry
a non-binding measured/range `guide`, but logic must report it as unsupported
when a scalar is required.

Structured readiness endpoints are deferred from v1 by ADR-010. A step's
source-language `instruction` tells a cook when to advance; Schemami v1 never
parses that prose into a machine condition.

## Grouped formulas

A `formula` is a relationship between declared local ingredients. Term order is
canonical and supplies display order. Ingredient references must resolve in the
containing recipe/component and may appear only once in a formula. An ingredient
named by a formula term cannot also carry an explicit `quantity`; the formula is
its sole quantity authority.

### Ratio formula

```yaml
formula:
  kind: ratio
  terms:
    - { ingredient: starter, parts: "1" }
    - { ingredient: flour, parts: "2" }
    - { ingredient: water, parts: "2" }
  target:
    kind: measured
    value: "500"
    unit: g
```

Each `parts` value is a positive canonical decimal. Ordered values `1`, `2`,
`2` mean and render `1:2:2`; `1`, `15` means and renders `1:15`. Ratios are
never stored as decimal multipliers or silently normalized to percentages.

The optional measured `target` supplies the total absolute amount. The example
has five total parts, so it resolves to 100 g starter, 200 g flour, and 200 g
water. Without `target`, the ratio remains valid/renderable but an operation
requesting absolute weights refuses for a missing target.

### Percentage formula

```yaml
formula:
  kind: percentage
  basis: flour
  terms:
    - { ingredient: flour, percentage: "100" }
    - { ingredient: water, percentage: "75" }
    - { ingredient: salt, percentage: "2" }
    - { ingredient: levain, percentage: "20" }
  basis_quantity:
    kind: measured
    value: "1000"
    unit: g
```

`basis` names one local ingredient. Each positive exact-decimal `percentage`
stores percentage points directly: `75` means 75%, `1.8` means 1.8%, and
`0.75` means 0.75%—never 75%. Source `%` characters are presentation/evidence,
not numeric syntax.

The optional measured `basis_quantity` resolves absolute weights. The example
resolves to 1000 g flour, 750 g water, 20 g salt, and 200 g levain. Without a
basis quantity, the formula remains valid/renderable but absolute-weight
operations refuse for a missing basis quantity.

## Canonical decimal precision

Canonical decimals use ordinary base-10 notation with at most 16 total digits
(excluding the decimal point and any permitted minus sign) and at most four
fractional digits, with no exponent, leading plus, leading zero, trailing
fractional zero, or negative zero. Zero is `"0"`; examples of canonical
non-zero values are `"12"`, `"12.5"`, `"1.8"`, `"33.3333"`, `"-40"`, and
`"999999999999.9999"`. Shape rules decide whether negative or zero is allowed.
`"12.5000"`, `"01"`, `"1e2"`, `"-0"`, and the 17-digit
`"10000000000000000"` are not canonical.

Four digits are a maximum, not a display instruction. Most authored recipe
values remain integers. A renderer shows the shortest useful value, may choose
a more suitable compatible unit, and may round further for display; it must not
claim more precision than the canonical value.

Recipe Calculus may use arbitrary-precision arithmetic internally, but every
public scalar result is quantized to at most four fractional digits and emitted
with at most 16 total digits in the same canonical decimal-string form. Public
results never expose a
numerator/denominator object. Go and TypeScript must use round-half-to-even when
the discarded remainder is exactly halfway. Thus `1.23445` quantizes to
`1.2344`, and `1.23455` quantizes to `1.2346`. Implementations must perform the
decision from exact decimal/rational arithmetic, never binary floating-point
tolerance.

## Unit identity and conversion

Schemami v1 pins UCUM 2.2 identities for the supported table. Initial required
codes are `g`, `kg`, `mL`, `L`, `Cel`, `[degF]`, `[cup_us]`, `[tbs_us]`,
`[tsp_us]`, `[foz_us]`, and `[cup_m]`. The unit table and exact conversion
factors ship as normative data replayed by Go and TypeScript.

`convert_quantity` supports explicit same-dimension scalar measured quantities
and affine Celsius/Fahrenheit conversion. It returns a deterministic canonical
decimal at the protocol precision; any further presentation rounding is
external. Bare `cup`, `tbsp`, `tsp`, and `floz`; unknown codes;
formula relationships, range/open inputs, cross-dimension requests, and
mass-volume requests refuse. `g` is never treated as `mL`, and `[cup_m]` means
UCUM's 240 mL only.

## Elapsed durations

Elapsed recipe time uses a strict positive unsigned RFC 5545 section 3.3.6
day/time/week profile with examples `PT8M`, `PT1H10M`, `P2D`, and `P1W`.
Schemami treats `D` and `W` as fixed 86,400- and 604,800-second elapsed
values; this is a recipe-time semantic profile, not iCalendar calendar
arithmetic. Calendar years/months, signed or zero durations, and Model 1
compact strings such as `8m` or `1h10m` are not Schemami v1 input.
Scheduling treats the admitted units as elapsed offsets, never calendar dates.

A duration window uses full names and may supply `minimum`, `target`, and
`maximum` subject to the window invariant. For example:

```yaml
duration:
  minimum: PT25M
  target: PT30M
  maximum: PT35M
```

The owner accepted this shape on 2026-08-11. The standards-first gate still
requires the precise admitted grammar to be checked against the primary
RFC/ISO source before schema implementation; live source access was denied
during the decision session, so this specification does not claim that check
has passed.

## Source artifacts and field evidence

Document-level `sources` identify acquisition artifacts. Each has recipe-local
`id`, a URI or URI-reference, and optional immutable SHA-256 digest metadata.
Fragments retain media-type-defined locator semantics instead of Schemami
inventing a universal page/span syntax.

Document-level `evidence` records target an existing structured field with an
RFC 6901 JSON Pointer and may reference a declared source, retain `raw_text`,
and carry exact decimal `confidence` from zero through one. A failed pointer,
unknown source ID, non-canonical confidence, or duplicate evidence ID is invalid.
Evidence never supplies a missing structured value to validation or Calculus.

## Operation diagnostics

Every public operation returns an envelope with `operation` and `status`.
`status` is one of `ok`, `refused`, or `not_applicable`. A refused result carries
one or more `problems`. Each problem has a stable absolute `type` URI below
`https://schemami.dev/problems/` and, when it concerns document data, an RFC
6901 `pointer`.

This is influenced by RFC 9457 problem types but is not an HTTP Problem Details
object: Schemami `status` is an operation state, not an HTTP status code. A
renderer maps `type` to localised UI wording. Normative logic never parses a
human title or detail.

A successful operation carries exactly one operation-specific object named
`result`. It carries no `problems`. A refusal carries non-empty `problems` and
no `result`; `not_applicable` carries neither. `convert_quantity` returns its
measured quantity at `result.quantity`. `schedule.result.steps` contains
`id`, `start`, `duration`, and `end` in reading order.

`resolve_formula.result.quantities` follows formula term order. `scale` takes a
positive canonical-decimal factor and returns effective ingredient quantities
at `result.quantities` in ingredient declaration order. Formula quantities are
resolved from the exactly scaled target/basis anchor; explicit measured/range
quantities scale without unit conversion, fixed measured values remain fixed,
and open quantities remain open. Neither operation emits a rewritten recipe.

The minimum v1 problem set uses `https://schemami.dev/problems/` with the
codes `unsupported-legacy`, `invalid-document`, `invalid-decimal`,
`resource-limit`, `unknown-unit`, `ambiguous-unit`, `dimension-mismatch`,
`unsupported-quantity-kind`, `unresolved-reference`, `missing-fact`, and
`invalid-operation-arguments`. SPEC vectors pin their exact URI spellings.

## Packs, document identity, and revisions

A separate `.schemami-pack.json` manifest declares a collection of documents.
It carries `schemami: "1"`, a local `collection` ID, manifest `revision`, and
document locks. It does not embed a vocabulary registry, metadata vocabulary,
or network resolver. Presentation attribution, licence, and display metadata
belong to the distribution context rather than this v1 protocol manifest.

Recipe IDs are unique within their collection. Document `id` and `collection`
use the 1–128-character local-ID grammar; `revision` is a positive base-10
integer without a leading zero. A published document is identified by
`(collection, id, revision, JCS SHA-256 digest)`. Package and cross-document
references resolve only within explicit loaded bytes and never search a global
registry or network. Optional `external_references` are absolute RFC 3986 URIs
and never resolve or supply calculation facts.

## Method operation boundary

Local technique and equipment identity is settled by ADR-008. Each step is
itself the recipe-local action and requires a recipe-local `id` plus a
source-language `instruction`. It has no second action identifier, primitive
reference, primitive version, primitive registry requirement, or primitive
parameter object. A step remains valid and renderable from its authored
instruction without any action catalog.

Only explicit structured members may drive deterministic behavior, including
dependencies, ingredients used or produced, duration, equipment, and technique.
Readiness remains in the source-language instruction under ADR-010. Step `id`,
`instruction`, and local entity
names are never parsed or mapped implicitly into operation semantics. The v1
operation set is `scale`, `resolve_formula`, `convert_quantity`,
`reading_order`, and `schedule`. Options, guards, constraints, tracks, and
interleaving are absent. `reading_order` returns one dependency-respecting
linear projection and uses declaration order only to break ties; it makes no
lane or concurrency claim.

`schedule` is the deterministic earliest-start projection of the explicit
`after` graph. Independent steps start at `PT0S`; each dependent step starts at
the greatest end offset of its dependencies. Scalar durations supply their
elapsed value and duration windows require `target`. A missing duration/target
refuses with `missing-fact`. Schedule output normalizes non-negative elapsed
offsets by using the largest exact week/day/hour/minute components, omitting
zeros and using `PT0S` only for zero. It has no wall clock, track, lane,
readiness, or inferred dependency semantics.

The runtime audit found that no normative Recipe Calculus function branches on
the current primitive ID, 21 of 24 primitive ParamSpecs are empty, viewer usage
is principally label fallback, and the only two ID-specific profile-fact paths
are reporting shortcuts outside Calculus. The evidence and accepted minimum
step boundary are recorded in
`docs/product/prds/artifacts/PRD-007/step-action-runtime-audit.md`.

## Conformance and release gates

One shared vector corpus is replayed by Go and TypeScript. The release gates
cover schema admission/refusal, canonical JSON, local reference scope, evidence
pointers, exact quantity arithmetic, conversion/refusal, operation diagnostics,
pack resolution, extension preservation, and unsupported RCP input.

A release is proven only from a clean clone of the candidate commit. It requires
zero active RCP wire identifiers outside historical documents and the explicit
negative fixture, immutable HTTPS resolution for every normative schema/vector
URL, identical cross-language results, and a versioned release manifest. Pão de
Portugal application code is not a release input; it adopts the published
contract afterwards.

The release contract map fixes the publish locations rather than leaving them
to a documentation application:

- core and pack schemas use their declared
  `https://schemami.dev/schema/schemami/1/*.schema.json` identifiers;
- the shared corpus publishes at
  `https://schemami.dev/conformance/schemami/1/calculus.json`;
- each minimum problem type publishes human-readable HTML documentation at its
  own existing `https://schemami.dev/problems/<code>` identity, following the
  RFC 9457 recommendation for locator problem-type URIs.

The generated release manifest binds every local source path, public URL,
media type, byte count, and SHA-256 digest to one candidate commit/tree. The
manifest itself publishes byte-for-byte at
`https://schemami.dev/releases/schemami-v1.0.0.json`. The
publication gate requires the declared media type, keeps any redirect within
the canonical host, and compares downloaded bytes to that digest. The
documentation website may later render these files but is not their authority.

## Wire closure

The v1 wire choices are closed by ADR-004 through ADR-010. RFC 5545 section
3.3.6 confirms the day/time/week lexical source; Schemami's fixed elapsed
`D`/`W` semantics are its explicit strict profile. Structured readiness is
explicitly deferred, not an unimplemented v1 placeholder. No implementation
may infer additional semantics from Model 1.

## References

- PRD-007 — Schemami stable protocol release
- ADR-004 — presentation-owned translations
- ADR-005 — local vocabulary and integrator resolution
- ADR-006 — clean Schemami v1 cutover
- ADR-007 — ingredient-line local identity
- ADR-008 — local method entities and exact quantity contract
- ADR-009 — computation and portable-data boundary
- ADR-010 — defer structured readiness endpoints
- ADR-011 — operation results and earliest-start scheduling
- ADR-012 — formula authority and effective-quantity scaling
- RFC 6901 — JSON Pointer
- RFC 8259 — JSON
- RFC 8785 — JSON Canonicalization Scheme
- RFC 9457 — Problem Details for HTTP APIs (design influence only)
- UCUM 2.2
