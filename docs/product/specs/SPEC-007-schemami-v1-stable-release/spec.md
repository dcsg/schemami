# SPEC-007: Schemami v1 stable protocol release

**Status:** in-progress
**Source:** PRD-007
**Structured source of truth:** [spec.yaml](./spec.yaml)

## Summary

SPEC-007 defines the clean Schemami v1 public contract. It replaces every
active RCP wire identity in this repository, removes mandatory central
vocabulary resolution, makes source language and local recipe identities
explicit, introduces exact tagged quantities and narrow UCUM conversion, and
publishes one cross-language conformance surface.

ADR-014 reopened the method boundary after two application dogfoods showed that
the unpublished candidate flattened authored culinary structure. The
`da8449f` candidate remains verified baseline evidence, but it is superseded
before publication. ADR-015 accepts the exact public member names, minimal
requiredness, closed unions, resource authority, formula groups, bundle, and
digest rules. ADR-016 now closes operation requests, active-graph admission,
formula filtering/target scaling, component composition, result identity,
diagnostics, and resource floors. Schema/runtime implementation begins in
Phase 9 only.

The complete accepted JSON package is
`docs/product/prds/artifacts/PRD-007/structured-method-wire-proposal.md`.
It also closes a pre-publication formula correction: ordered root `formulas`
with local IDs replace singular `formula`, so independent culinary groups do
not require another breaking release.

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
bundle documents use it. `x-schemami-*` is reserved for
protocol-defined extensions. Integrator extensions use `x-<owner>-*`; readers
preserve unknown `x-*` values. They cannot change protocol validation
semantics, resolution decisions, or calculation, but are included in canonical
JCS bytes and therefore change the exact content digest.

Canonical schema identifiers are rooted below:

```text
https://schemami.dev/schema/schemami/1/core.schema.json
https://schemami.dev/schema/schemami/1/bundle.schema.json
```

Schemami v1 has no `kind` or `profile` wire member. It therefore has no
category-profile schema graph; the old RCP profiles are historical cutover
material, not renamed Schemami schemas.

JSON is the canonical representation; `.schemami.json` is the canonical recipe
suffix and `.schemami-bundle.json` is the canonical bundle suffix. YAML may be
accepted as an authoring/import representation with suffix
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
locale maps are invalid. Recipe origin remains independent. Optional `origin`
may contain ISO 3166-1 alpha-2 `country`, an ISO 3166-2 `subdivision` whose
prefix matches the supplied country, and source-language `locality`. At least
one is required when `origin` exists. Locality is descriptive source content,
not a globally resolved identity; versioned national codes belong in an owner
extension.

## Recipe-local identity

An ingredient requires recipe-local `id` and exactly one source-language
`name` or strict `alternatives` object. Each alternative requires its own local
`id` and source-language `name`; the ingredient slot retains one shared
quantity/formula/scaling position. The ingredient `id` is unique within the
containing recipe and is the target of recipe-internal references. `item`,
`proposed_class`, a generic `terms` catalog, and global or package vocabulary
identifiers are absent.

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

A method is an authored recursive `sequence` of section and step nodes. A step
may refer to ordered, unique local techniques, directly or through its ordered
actions as fixed by the wire checkpoint. Readers and writers preserve authored
order and never alphabetically sort references. An adapter emits a technique
only when the source explicitly authors the culinary technique; an application
workflow `stepType` is not evidence that the recipe states one.

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

Open-quantity qualifiers and guides do not represent method completion.
Structured completion is defined independently by the method contract and is
never inferred by parsing an instruction or open-quantity prose.

## Grouped formulas

Root `formulas` is an ordered collection of locally identified ratio or
percentage relationships. Term order is canonical and supplies display order.
Typed `input` references select a declared ingredient or component. One input
may occur in at most one formula across the document and cannot also carry an
explicit `quantity`; the formula is its sole quantity authority. Multiple
allocations of the same culinary ingredient use distinct recipe-local inputs,
such as `dough-salt` and `filling-salt`.

### Ratio formula

```yaml
formulas:
  - id: feed
    kind: ratio
    terms:
      - { input: { kind: ingredient, id: starter }, parts: "1" }
      - { input: { kind: ingredient, id: flour }, parts: "2" }
      - { input: { kind: ingredient, id: water }, parts: "2" }
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
formulas:
  - id: dough
    kind: percentage
    basis: { kind: ingredient, id: flour }
    terms:
      - { input: { kind: ingredient, id: flour }, percentage: "100" }
      - { input: { kind: ingredient, id: water }, percentage: "75" }
      - { input: { kind: ingredient, id: salt }, percentage: "2" }
      - { input: { kind: component, id: levain }, percentage: "20" }
    basis_quantity:
      kind: measured
      value: "1000"
      unit: g
```

`basis` is one typed local input reference. Each positive exact-decimal `percentage`
stores percentage points directly: `75` means 75%, `1.8` means 1.8%, and
`0.75` means 0.75%—never 75%. Source `%` characters are presentation/evidence,
not numeric syntax.

The optional measured `basis_quantity` resolves absolute weights. The example
resolves to 1000 g flour, 750 g water, 20 g salt, and 200 g levain. Without a
basis quantity, the formula remains valid/renderable but absolute-weight
operations refuse for a missing basis quantity.

The input named by `basis` occurs exactly once in `terms` with
`percentage: "100"`. A missing basis term or any other percentage for that term
is invalid and makes direct `resolve_formula` and formula-backed `scale` refuse
before returning quantities.

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
codes are unity `1`, `g`, `kg`, `mL`, `L`, `Cel`, `[degF]`, `[cup_us]`,
`[tbs_us]`, `[tsp_us]`, `[foz_us]`, and `[cup_m]`. Unity expresses a
dimensionless count such as one loaf and never converts to mass or volume. The
unit table and exact conversion factors ship as normative data replayed by Go
and TypeScript.

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
`maximum`. Every supplied pair is ordered: `minimum <= target`,
`target <= maximum`, and `minimum <= maximum`. For example:

```yaml
duration:
  minimum: PT25M
  target: PT30M
  maximum: PT35M
```

The owner accepted this shape on 2026-08-11. Document validation and direct
`schedule` calls enforce the same invariant.

## Source artifacts and field evidence

Document-level `sources` are optional and identify acquisition artifacts. Each
supplied source has recipe-local `id`, a non-empty URI or URI-reference, and
optional immutable SHA-256 digest metadata. Absence is represented by omitting
`sources`, never by `null`, an empty source record, or an empty URI.

Document-level `evidence` records target an existing structured field with an
RFC 6901 JSON Pointer and may reference a declared source, retain `raw_text`,
and carry exact decimal `confidence` from zero through one. A failed pointer,
unknown source ID, non-canonical confidence, or duplicate evidence ID is invalid.
Evidence never supplies a missing structured value to validation or Calculus.

Evidence may carry one standard-backed `selector`:

```yaml
selector:
  kind: fragment
  value: t=300,600
  conforms_to: https://www.w3.org/TR/media-frags/
```

`value` is the fragment without `#`; `conforms_to` is the absolute URI of the
fragment specification. With a video source this reconstructs
`<source-uri>#t=300,600`. W3C Media Fragment intervals use Normal Play Time and
are half-open; when start and end are supplied, start is less than end.
Evidence can target any exact section, step, action, completion condition, or
technique occurrence through its final RFC 6901 path. The replacement examples
and pointers are fixed with the reopened method wire; baseline `/steps/...`
pointers are not aliases. Selector offsets locate source evidence and never
become culinary `duration`, schedule input, or any other structured fact.

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
no `result`; `not_applicable` carries neither. Recipe operations use one closed
request with exactly one `recipe` or `bundle` plus closed `arguments`.
Standalone `convert_quantity` has only quantity arguments and returns its
measured quantity at `result.quantity`.

Every successful recipe/bundle result carries `evaluation`: the exact root
reference with SHA-256 over admitted RFC 8785 JCS, optional bundle JCS digest,
and ordered effective selections showing argument/default source. Submitted
whitespace, key order, and YAML spelling cannot change these identities.
Formula-evaluating operations may additionally carry ordered
`formula_evaluations`; method-only operations omit them. No result carries the
root marker, authored method, or other shape that could look publishable.

The public operations are `resolve_selection`, `resolve_formula`, `scale`,
`convert_quantity`, `reading_order`, and `schedule`. `resolve_selection`
returns active identifiers. `resolve_formula` requires one root `formula_id`,
returns typed quantities in selected term order, and reports authored/selected
totals. `scale` requires exactly one positive decimal `factor` or compatible
measured root `formula_target`, returns root quantities in ingredient-then-
component declaration order, and returns depth-first component instances.
Inactive formula terms are filtered after full authored evaluation and never
redistributed. Target scaling derives one unrounded exact rational factor and
rounds only public totals/lines; it never allocates residual rounding.

`reading_order` and `schedule` entries carry `component_path` plus step `id`.
Schedule additionally carries `start`, `duration`, and `end`. Explicit used
component output producers are composed with explicit parent consumers; active
unconsumed components are reported as unplaced/unscheduled with closed
`not-consumed` reason rather than silently omitted.

The minimum v1 problem set uses `https://schemami.dev/problems/` with the
codes `unsupported-legacy`, `invalid-document`, `invalid-decimal`,
`resource-limit`, `unknown-unit`, `ambiguous-unit`, `dimension-mismatch`,
`unsupported-quantity-kind`, `unresolved-reference`, `missing-fact`,
`invalid-operation-arguments`, `missing-binding`, `invalid-binding`,
`inactive-reference`, `missing-producer`, `multiple-producers`,
`dependency-cycle`, `component-cycle`, and `relative-timing-conflict`. SPEC
vectors pin their exact URI spellings. Independent problems are cascade-
suppressed, deduplicated, and sorted by ASCII request pointer then type URI.

## Bundles, document identity, and revisions

A `.schemami-bundle.json` document carries `schemami: "1"`, one exact root
recipe reference, and embedded recipe documents. It contains exactly the
deduplicated transitive component dependency closure of every declared branch,
including currently inactive branches. Root is first; remaining documents use
the accepted ASCII tuple order. Missing, duplicate, digest-mismatched, or
unrelated extra documents are invalid. A bundle does not embed translations,
evidence artifacts, lineage parents, application overlays, a vocabulary
registry, metadata vocabulary, or network resolver.

Recipe IDs are unique within their collection. Document `id` and `collection`
use the 1–128-character local-ID grammar; `revision` is a positive base-10
integer without a leading zero. A published document is identified by
`(collection, id, revision, JCS SHA-256 digest)`. Bundle and cross-document
references resolve only within explicit loaded bytes and never search a global
registry or network. Optional `external_references` are absolute RFC 3986 URIs
and never resolve or supply calculation facts.

## Structured method, variation, and composition amendment

Requiredness follows one rule: require only members needed to identify an
object, distinguish its closed kind, make authored content readable, or supply
the one authority that object promises. Every other registered member is
optional and absent when unknown. Nulls, empty strings, and placeholder objects
never encode missing facts. The accepted compact list is normative in the
Phase 7 field register; closed unions reject wrong-kind members.

ADR-014 replaces the flattened method boundary. The root method and every
section contain an ordered `sequence` whose only node kinds are section and
step. Sequence order is authored reading order. Explicit dependencies—not array
position—govern execution, and a step is the only dependency and scheduling
unit. A step contains exactly one direct instruction or a non-empty ordered
action list. Actions may preserve local identity, instruction, techniques,
completion conditions, uses/produces facts, and evidence, but never independent
dependencies or scheduling duration. Step resource flow is authoritative for
inter-step use; action flow, when present, is a subset used only for attribution.

Source-authored decisions use typed recipe-local inputs: choices, toggles, and
UCUM measured inputs. A closed predicate grammar may activate ingredients,
component references, equipment, sections, steps, or actions. Prose, arbitrary
expressions, extension-defined operators, and application defaults cannot
activate canonical content. Missing required input leaves every alternative
displayable while dependent operations refuse. Only a source-authored default
may select implicitly. Selecting declared content is execution context and does
not create a new recipe.

Completion is distinct from duration. It supports an authored observation, a
typed measurement, or closed `all`/`any` composition. Human observation remains
human-evaluated. Duration remains a schedule estimate/window. Explicitly
authored cold or ambient fermentation, location/environment, and target
temperature remain recipe facts; fermentation models, adjustment heuristics,
recommendations, live sensor context, timer policy, notifications, and bake
state remain application concerns.

Section environment and relative timing describe the section itself. They do
not implicitly inherit, merge into, or override descendant steps. Guidance is
human cue/instruction content with no local ID or executable effect; environment
measurements similarly need no unused ID.

A strict substitution replaces exactly one ingredient while preserving exact
resolved quantity, unit, formula participation, and scaling behavior. It cannot
recalculate another quantity or alter the method. Any broader change is an
authored branch or a complete derived recipe with lineage. Lineage is provenance
to an exact source, not an executable patch chain.

Recipe-local resources connect method work through explicit uses/produces
relationships. A recipe component may reference an exact required output of
another document by collection, id, revision, and JCS digest. Cross-recipe
scaling uses the measured yield declared by the referenced child output, not by
the parent component. Resolution uses only explicitly loaded bytes, and a
complete export is one self-contained JSON bundle containing exactly the
deduplicated closure of every declared branch. Missing bytes, mismatched
digests, cycles, incompatible yields, or resource exhaustion refuse dependent
logic without erasing readable source content.

Admission validates all declared content and every distinct reachable active
graph; inactive content cannot hide an invalid reference, cycle, quantity, or
method node. Choice/toggle values and the exact boundary points/open regions
created by measurement thresholds induce finite truth vectors. Implementations
explore or symbolically analyse them, deduplicate equivalent active semantic
graphs, and refuse with `resource-limit` rather than skipping excessive
analysis. Evidence may target each semantic level with RFC 6901.

Selection removes inactive subtrees/nodes and incident dependency edges before
method operations. Every active action-list step retains an action. Active
references to inactive content refuse. Every preparation/output has at most one
active producer and every consumed one exactly one. Resource flow never infers
or repairs an `after` dependency. Missing bindings refuse only operations whose
result they can affect; app defaults never select.

`schedule` is the deterministic earliest-start projection of the explicit
`after` graph. Independent steps start together; each dependent step starts at
the greatest end offset of its dependencies. Scalar durations supply their
elapsed value and duration windows require `target`. A missing duration/target
refuses with `missing-fact`. Composed schedules align a child's explicit
selected-output producer end with its earliest explicit parent-consumer start,
recurse through used components, and shift every offset together so the
earliest step is `PT0S`. `relative_timing` is validated but does not affect this
mathematical schedule. It has no wall clock, track, lane, completion-condition,
editorial-phase inference, or inferred resource dependency semantics.

Cross-recipe scale resolves the parent amount, exact loaded child bytes,
selected output, and positive measured yield. Required amount and yield use
exact compatible UCUM conversion to derive an unquantized rational child
factor. Range/open, density, mass-volume, missing/mismatched facts, and cycles
refuse. The exact contract, result members, ordering, security floors, and
nearest invalid cases are normative in
`docs/product/prds/artifacts/PRD-007/active-graph-composition-calculus.md`.

The portable resource floor is 64 recursive levels, 10,000 evaluated semantic
object/reference occurrences across static admission and distinct reachable
graphs, 1,024 embedded bundle documents, and 1,024 selected component
instances. The Phase 8 contract defines each count exactly. Implementations may
support more; above a floor they may return `resource-limit`, but never silently
skip a graph, truncate a result, or claim that the document is intrinsically
invalid merely because a local budget was exceeded.

The runtime audit found that no normative Recipe Calculus function branches on
the current primitive ID, 21 of 24 primitive ParamSpecs are empty, viewer usage
is principally label fallback, and the only two ID-specific profile-fact paths
are reporting shortcuts outside Calculus. The evidence and accepted minimum
step boundary are recorded in
`docs/product/prds/artifacts/PRD-007/step-action-runtime-audit.md`.

## Conformance and release gates

Two shared vector corpora are replayed by Go and TypeScript: validation vectors
for document admission and dogfood regressions, and Calculus vectors for exact
operations. The release gates cover schema admission/refusal, canonical JSON, local reference scope, evidence
pointers, exact quantity arithmetic, conversion/refusal, operation diagnostics,
bundle resolution, extension preservation, and unsupported RCP input.

The replacement corpus also covers recursive section/step sequences, mutually
exclusive instruction/actions, action ordering, typed input and predicate
resolution, missing-selection refusal, strict substitutions, completion
conditions, authored environment facts, uses/produces flow, exact component
references and yields, self-contained dependency bundles, lineage identity,
cycle/resource limits, exhaustive inactive-branch validation, and evidence at
every new semantic level. Phase 8 adds dormant broken branches, exact threshold
boundaries/regions, equivalent-graph deduplication, nested selections, optional
formula terms without redistribution, authored/selected/scaled totals, factor
XOR formula target, exact component instances, composed schedules, unconsumed
component reporting, deterministic diagnostic aggregation, JCS evaluation
identity, and the accepted portability floors.

The validation corpus permanently includes the Pão dogfood corrections:
ordered duration windows, non-recursive open guides, percentage-basis authority,
portable origin, ordered plural techniques, non-empty supplied source URIs, and
valid/refused W3C Media Fragment selectors. Known tagged-union failures should
return one concise pointer-level diagnostic instead of exposing a nested
JSON-Schema `oneOf` trace; this changes diagnostics, never admission.

Post-correction adapter experiments in Pão de Portugal and Fornada confirmed
the same application boundary. Pão validated 49/49 formula documents and all
117 promoted method stages while deliberately omitting two conditional
schedules. Fornada round-tripped all 20 current system bread formulas and
refused only application projections that required an unreviewed local mapping
or numeric rounding. These experiments are adoption evidence, not clean-clone
release inputs or additional protocol fields.

A release is proven only from a clean clone of the candidate commit. It requires
zero active RCP wire identifiers outside historical documents and the explicit
negative fixture, immutable HTTPS resolution for every normative schema/vector
URL, identical cross-language results, and a versioned release manifest. Pão de
Portugal and Fornada adapter reports are owner-acceptance evidence before
publication; neither application checkout or test suite is a clean-clone
conformance input.

The release contract map fixes the publish locations rather than leaving them
to a documentation application:

- core and bundle schemas use their declared
  `https://schemami.dev/schema/schemami/1/*.schema.json` identifiers;
- the shared corpora publish at
  `https://schemami.dev/conformance/schemami/1/calculus.json` and
  `https://schemami.dev/conformance/schemami/1/validation.json`;
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

Identity, language, local vocabulary, quantity, unit, evidence, diagnostic, and
clean-cutover choices remain closed by ADR-004 through ADR-013. ADR-014 accepts
the expanded product semantics, ADR-015 closes its exact wire, and ADR-016
closes active-graph, formula-target, component, schedule, result, diagnostic,
and resource behavior. Phase 9 implements only these accepted authorities. No
implementation may infer additional semantics from Model 1, application
workflow primitives, relative-timing prose, or product policy.

## References

- PRD-007 — Schemami stable protocol release
- ADR-004 — presentation-owned translations
- ADR-005 — local vocabulary and integrator resolution
- ADR-006 — clean Schemami v1 cutover
- ADR-007 — ingredient-line local identity
- ADR-008 — local method entities and exact quantity contract
- ADR-009 — computation and portable-data boundary
- ADR-010 — readiness deferral, superseded by ADR-014
- ADR-011 — operation results and earliest-start scheduling
- ADR-012 — formula authority and effective-quantity scaling
- ADR-014 — structured method, variation, composition, and lineage
- ADR-015 — exact structured method wire and bundle closure
- ADR-016 — active-graph, composition, and target-scaling Calculus
- Phase 8 active-graph and composition Calculus contract
- RFC 6901 — JSON Pointer
- RFC 8259 — JSON
- RFC 8785 — JSON Canonicalization Scheme
- RFC 9457 — Problem Details for HTTP APIs (design influence only)
- UCUM 2.2
