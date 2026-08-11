---
title: "PRD-007 field-name audit — Schemami wire v1"
date: 2026-08-10
status: partially-accepted
scope: "Current RCP Model 1 schema, package, registry, Calculus, validator, viewer, and cutover surface"
---

# PRD-007 field-name audit — Schemami wire v1

This is the evidence baseline for `FR-MODEL-001`. It is not a new schema and
does not rename Model 1. Every Schemami v1 wire/API field must be traced back
to one row here or added by an accepted update before implementation.

## Audit rule

One field has one semantic meaning in one scope. Repeated names in different,
clearly typed scopes are valid and do not require renaming. A familiar spelling
is not a reason to merge concepts, and a stylistic preference is not a reason
to break a schema. Schemami v1 has no legacy reader or convenience alias; a
legacy spelling is historical source material rather than a runtime input.

When a standard directly defines the semantic value, the new field uses that
standard. Examples include BCP 47 language tags, ISO 3166 country codes, URI/
IRI references when external references are introduced, RFC 8785 for canonical
JSON where hashing applies, and UCUM 2.2 for the narrow unit-identity table.
The standard does not decide an unrelated JSON property name by itself.

## Current-surface baseline

The 2026-08-10 audit found:

- 15 schema/registry identifiers under `rcp.invalid`;
- 55 recipe/test fixture files containing the legacy `rcp:` marker;
- 19 files using `x-rcp-*` extension names;
- 71 files referring to RCP-named core/package/file artifacts;
- 8 Go module/import surfaces under `github.com/dcsg/rcp`; and
- 379 user-facing, technical, test, and release references to RCP names.

The Pão de Portugal parity adapter currently treats an absent central registry
identity as an admission blocker. That is a Schemami local-vocabulary target
under `FR-VOCAB-001`, not a terminology-only change or a Pão release gate.

### Mechanical evidence

The scan covered 147 JSON Schema, YAML, Go, and TypeScript files below
`schema/`, `registry/schemas/`, `calculus/`, `tools/rcplint/`, and
`tools/viewer/src/` on 2026-08-10. It found 965 occurrences of the selected
potentially-overloaded names. Occurrence count is **not** a rename trigger:
schema and result-object paths define the relevant scope.

For example, Model 1 has document-root `/id`, `/version`, and `/collection`
in `schema/rcp-core-v1.schema.json`; package `/collection` and `/version` in
`schema/rcp-pack-v1.schema.json`; and record-target `collection`, `id`, and
`version` in `tools/rcplint/records/record.go`. Those identify different
objects and can retain their familiar spelling when the finalized field
register records their scope and resolution rule.

Conversely, the scan confirms material candidate collisions rather than mere
repetition:

- `lang` is the document-root content tag while `$defs.text` also accepts
  locale-keyed maps; viewer rendering reads those maps directly.
- ingredient `item` is a vocabulary reference, while `ScheduleEntry.Item` is
  a scheduled-work identifier in `tools/rcplint/calc/timeline.go`.
- `source` appears as imported artefact location, provenance claim/evidence,
  record source path, and public vector source path.
- `unit` is both a source/display token and the proposed machine conversion
  identity in `$defs.quantity` and related registry constraints.

The final register must trace these paths individually. It must not rename
`id`, `version`, `collection`, or another repeated property merely because it
appears in more than one correctly typed object.

## Material ambiguity inventory

| Current term | Current meanings/surfaces | Why it is ambiguous or inconsistent | Schemami v1 decision required |
|---|---|---|---|
| `lang` | Root recipe content tag | Abbreviated field; easily confused with viewer locale, registry display maps, or a source/translation language pair. | Accepted: required root `content_language`, whose value MUST be BCP 47. Presentation locale and translation data are not protocol data. |
| locale maps / `{pt,en}` text | Recipe prose, registry `display_name`, reasons, viewer rendering | Mixes authored content, legacy translations, and application display vocabulary; key `pt` is not a full BCP 47 tag. | Keep legacy maps readable only. New wire carries authored source content and its content language; app localization is external (ADR-004). |
| `origin` / region-like values | Recipe origin object and prose | Geographic origin, jurisdiction, source language, and display region are distinct. | Retain separate geographical fields only when needed; country MUST use ISO 3166-1 alpha-2 and any subdivision needs its own standard-backed field. |
| `id` | Document ID, ingredient local ID, step ID, registry entry ID, component ID, option ID | All are identifiers but have different scope and resolution rules. Reuse itself is not defective because the containing object supplies the scope. | Accepted for recipe-local IDs: `^[a-z0-9][a-z0-9_-]*$`, 1–128 characters, exact case-sensitive equality, no reader normalization. A lowercase UUID-shaped value is an ordinary valid local ID. Document/package/external ID scopes remain separate register rows; do not infer scope outside the containing object. |
| `item` | Ingredient registry reference; schedule output item label | The same word means a vocabulary reference in one context and a scheduled work item in another. | Accepted: remove ingredient `item` in favour of the containing ingredient line's local `id` and `name` (ADR-007). Schedule output may retain `item` where its typed scope makes “scheduled item” unambiguous. |
| `primitive`, `params`, `technique`, `definition` | Step method reference, primitive-specific parameters, registry primitive, technique registry entry, prose definition | Present Model 1 makes governed vocabulary mandatory even though Calculus does not branch on primitive identity. | Accepted: the step itself is the recipe-local action with `id` and source-language `instruction`. Remove mandatory `primitive`, primitive version, primitive registry admission, and `params`. A recipe MAY declare local technique and equipment IDs with authored source-language names. A protocol operation is added only when Recipe Calculus defines and consumes it (ADR-008). |
| `amount`, `quantity`, `ratio`, `parts`, `percentage`, `value`, `of` | Ingredient amounts, formulas, bases, substitutions, yields, Calculus inputs | Similar numeric structures carry physical quantities, colon ratios, baker's percentages, readiness conditions, and display. | Accepted: `quantity` is an absolute amount with measured/range/open shapes. `formula` is a grouped relationship: ratio terms carry ordered `parts`; percentage terms carry percentage points against `basis`. Structured readiness is deferred from v1; completion remains source-language instruction (ADR-010). Numeric values are canonical decimal strings with at most 16 total digits and four fractional digits (ADR-008). |
| `min`, `max`, `minimum`, `maximum`, compact durations | Quantity ranges, duration windows, constraints, and custom elapsed-time strings | Abbreviated and full bounds differ across similar window types; Model 1 duration strings require a protocol-specific parser. | Accepted for elapsed durations: use full `minimum`, `target`, and `maximum`; admit positive standard-shaped elapsed values such as `PT8M`, `PT1H10M`, `P2D`, and `P1W`; reject calendar years/months, negative durations, compact Model 1 strings, and `min`/`max` aliases. Primary-source grammar confirmation remains required. |
| `unit` | Authored display string and attempted conversion identity | `cup`, `tbsp`, `tsp`, and `floz` lack regional identity; raw string conflates source spelling, identity, and display. | Accepted: measured `quantity.unit` carries UCUM 2.2 identity only. Source spelling/display data belongs to evidence/presentation; no bare unit conversion (ADR-008). |
| `raw`, `proposed_class`, `item: null` | Unresolved ingredient import | Useful source evidence is entangled with a central-registry admission shape; an unknown primitive/equipment/governed value has no equivalent honest representation. | Remove the `item: null`/proposal admission shape. Preserve raw source evidence in the general evidence/provenance model, distinct from recipe-local identity and never parsed by logic. |
| `source`, `source_url`, `provenance.sources`, step `source` | URI, provenance object, source claim, imported source URL | Reuses “source” for different evidence levels and value types. | Name the evidence relationship and target precisely: imported artifact, claim/source citation, source span, or external reference. URI values must be typed as URIs where applicable. |
| `name`, `title`, `label`, `display_name`, `definition`, `note`, `body`, `description` | Authored recipe prose, step prose, registry presentation, registry definition, UI fallback | These overlap in English but differ in authored content, controlled display, and explanatory prose. | Establish a prose taxonomy and state which fields are authored source content, application-owned labels, or protocol definitions. |
| `version`, `v`, `rcp` | Document revision, primitive version, wire marker, package version | Several versions exist with different compatibility/identity effects. Reuse is acceptable only where object type makes the versioned thing obvious. | Define wire-model version, document revision, primitive revision, package release, registry/vocabulary release, and resolver version separately; retain established local spelling where it is unambiguous. |
| `collection`, `collectionId`, package collection, application collection | Distribution scope, document namespace, Pão collection/product context | Existing Model 1 intentionally gives collection an opaque separate value space, but API naming is uneven. | Define exact scope/identity role and one canonical spelling at each layer; do not make Pão aggregate ownership a protocol field. |
| `status`, `confidence`, `verified`, `maturity` | Provenance, registry, profile maturity, document lifecycle | Similar lifecycle words govern different authorities. | Separate document admission state, source confidence, verification attestation, registry entry lifecycle, and schema maturity. |

## Required field-name register columns

The measured recipe-local identifier corpus and the accepted grammar are
recorded in `local-identifier-runtime-audit.md`. The current lowercase-kebab
corpus is evidence, not an automatically accepted restriction.

The accepted register must contain, for every Schemami v1 field and public
result member:

1. JSON Pointer/type location and canonical field name;
2. object scope and identifier/resolution scope;
3. normative semantic definition and forbidden interpretations;
4. value type, requiredness, cardinality, default, and canonicalization rule;
5. authoritative external standard and release where directly applicable, or a
   recorded reason no standard applies;
6. authored-content versus app-presentation ownership;
7. Model 1 predecessor(s), repository-cutover disposition, and any historical
   evidence exclusion;
8. conformance vectors proving the field is not conflated with its nearest
   neighbour.

## Accepted register entry — document content language

| Register column | Schemami v1 decision |
|---|---|
| Canonical path/name | document root `/content_language` |
| Scope | Every authored source-prose value in this recipe document, including inline components; it does not describe UI chrome or an external translation. |
| Type/requiredness | Required string; no default. |
| Value vocabulary | Well-formed IETF BCP 47 language tag, using the IANA Language Subtag Registry. Portugal Portuguese is `pt-PT`. |
| Forbidden interpretations | UI locale, preferred rendering locale, target translation language, recipe origin, country, jurisdiction, or registry-display language. |
| Cutover disposition | Repository-owned active Model 1 `/lang` uses are replaced by required `/content_language`. A missing/invalid legacy value does not justify a Schemami default. Legacy locale-map prose is historical material under ADR-004, never silently translated or flattened into a Schemami fixture. |
| Required vectors | `pt-PT` acceptance; `en-GB` acceptance; absent field refusal; malformed tag refusal; `origin.country: PT` remains independent; UI locale/translation data rejected from the canonical document. |

## Accepted register entry — ingredient local identity

| Register column | Schemami v1 decision |
|---|---|
| Canonical paths/names | `/ingredients/*/id` and `/ingredients/*/name` |
| Scope | `id` is unique inside its containing recipe and is the only protocol identity of that ingredient. `name` is authored source-language display content governed by root `content_language`. |
| Forbidden interpretations | `id` is not a central registry identifier, package identifier, purchasable product identifier, or app catalog ID. `name` is not an app translation or a machine conversion fact. |
| Integrator boundary | An application may map `(document identity, ingredients[*].id)` to its private catalog. The mapping is not serialized in Schemami and does not make a global equivalence claim. |
| Removed Model 1 shape | `/ingredients/*/item`, its null/proposed-class admission path, and any generic `terms` catalogue are absent from Schemami v1. Raw source evidence is retained only through the general evidence/provenance model, never as a substitute identity or machine-logic input. Repository source conversion must explicitly relocate useful evidence; no runtime migration is shipped. |
| Required vectors | known local ingredient with no catalog; unknown local ingredient renders; app mapping is absent from canonical document; a fact-dependent operation refuses narrowly; duplicate local id refuses. |

## Accepted register entry — recipe-local identifier token

| Register column | Schemami v1 decision |
|---|---|
| Applicable paths | `id` of recipe-local ingredient, component, step, technique, equipment, option, and other explicitly local entity types. Document, collection, external, and protocol operation identifiers are separate scopes. |
| Grammar | `^[a-z0-9][a-z0-9_-]*$`: lowercase ASCII letters/digits, hyphen, underscore; first character alphanumeric; 1–128 characters. |
| Equality | Exact and case-sensitive. Readers reject uppercase and never lowercase, case-fold, transliterate, or Unicode-normalize an ID. |
| Semantics | Opaque within its containing local scope. Separators carry no namespace, hierarchy, registry, language, or path meaning. |
| UUID handling | `550e8400-e29b-41d4-a716-446655440000` is syntactically valid as an ordinary local ID. Schemami does not require UUIDs or validate version/variant semantics. |
| Required vectors | kebab/snake/alphanumeric/UUID/128-character acceptance; uppercase/dot/space/tilde/non-ASCII/129-character rejection; exact reference success; mismatched case refusal; duplicate refusal; no UUID-specific behavior. |

## Accepted register entry — quantities and unit identity

| Register column | Schemami v1 decision |
|---|---|
| Canonical path/name | Context-specific `/quantity`; `quantity` replaces Model 1 `amount` wherever the value describes an absolute recipe amount. A grouped relationship is `/formula`, not a quantity. |
| Shape | A required `quantity.kind` discriminates `measured`, `range`, and `open`. A calculator MUST NOT infer a kind from field presence or prose. Ratio and percentage are not quantity kinds; structured readiness is absent from v1. |
| Scalar precision | Numeric scalar values are canonical decimal strings with at most 16 total digits (excluding the decimal point and permitted minus sign) and four fractional digits. Integers have no decimal point; fractional trailing zeros, exponent notation, leading plus, and negative zero are non-canonical. Public results use the same shape; rational objects are absent. Exact results beyond four fractional digits use round-half-to-even: `1.23445` becomes `1.2344`, while `1.23455` becomes `1.2346`. |
| Unit identity | Measured quantities use `unit` with a pinned UCUM 2.2 code, such as `g`, `mL`, `Cel`, `[degF]`, or `[cup_us]`. A bare regional spelling such as `cup` is source evidence, not a convertible unit identity. |
| Conversion boundary | Only explicit scalar measured same-dimension conversions and Celsius/Fahrenheit are in v1. Formula relationships, ranges/open values, bare regional units, unknown units, cross-dimension conversion, and mass-volume conversion refuse. |
| Presentation boundary | Source spelling, rendered labels, and display rounding do not alter `quantity` identity or calculation. They are evidence/presentation concerns. |
| Required vectors | decimal lexical acceptance/refusal; every quantity/formula shape; UCUM accepted examples; bare `cup` refusal; exact cross-language conversions; no `g`/`mL` inference. |

## Accepted register entry — grouped ratio and percentage formulas

| Register column | Schemami v1 decision |
|---|---|
| Canonical path/name | Recipe/component `/formula`, with `kind: ratio` or `kind: percentage`. |
| Ratio terms | Ordered `terms`; each term has `ingredient` referencing a local ingredient ID and positive exact-decimal `parts`. Term order defines display order. `1`, `2`, `2` means and renders `1:2:2`; the protocol never normalizes it into percentages. |
| Ratio target | Optional measured `target` with exact-decimal `value` and UCUM `unit`. With target 500 g, `1:2:2` resolves as 100 g, 200 g, 200 g. Without a target the formula is valid/renderable but has no absolute weights. |
| Percentage terms | Required local ingredient `basis`; ordered terms carry `ingredient` plus positive exact-decimal `percentage`. Values are percentage points: `75` means 75%; `1.8` means 1.8%; `0.75` means 0.75%, never 75%. |
| Percentage basis quantity | Optional measured `basis_quantity` with exact-decimal `value` and UCUM `unit`. Without it the percentage formula remains valid/renderable but cannot resolve absolute weights. |
| Forbidden interpretations | A ratio is not a decimal multiplier, percentage, or scalar quantity. A percentage is not a colon ratio. Source display characters (`:`, `%`) are presentation, not stored numeric syntax. |
| Required vectors | `1:2:2` and `1:15` rendering; ratio target resolution; ratio without target refusal for absolute result; 75%/1.8% basis resolution; 0.75% non-alias; duplicate/unknown term ingredient; non-positive part/percentage refusal. |

## Accepted register entry — elapsed duration windows

| Register column | Schemami v1 decision |
|---|---|
| Canonical path/name | Context-specific `/duration`; window members `minimum`, `target`, and `maximum`. |
| Value semantics | Positive fixed elapsed duration. Examples include `PT8M`, `PT1H10M`, `P2D`, and `P1W`. Scheduling consumes elapsed offsets, not calendar dates. |
| Forbidden forms | Calendar year/month units, negative durations, Model 1 compact `8m`/`1h10m`, and abbreviated `min`/`max` aliases. |
| Presentation boundary | Applications may render `PT1H10M` as “1 h 10 min” in the selected UI language; rendered text does not change canonical input or scheduling. |
| Standards gate | Owner shape is accepted. The precise lexical subset must be rechecked against the primary RFC/ISO source before schema implementation; the 2026-08-11 live check was denied by the environment. |
| Required vectors | every accepted example; malformed ordering; negative/year/month/compact/alias refusal; window ordering; byte-identical Go/TypeScript schedule offsets. |

## Accepted register entry — evidence, local method entities, and diagnostics

| Register column | Schemami v1 decision |
|---|---|
| Evidence placement | Document-level evidence records target canonical fields with RFC 6901 JSON Pointers. Source artifact URIs and raw captured text remain separate from the structured value and are never parsed by protocol logic. |
| Technique/equipment identity | A recipe MAY declare its own local technique and equipment entities, each with an `id` unique in its respective recipe-local collection and an authored source-language `name`. Their use is valid without a central registry. |
| Step action | Each step is the recipe-local action and requires a local `id` plus source-language `instruction`. It has no second action identifier, mandatory primitive, primitive version, registry admission, or primitive parameter object. v1 structured facts are dependencies, uses/produces, duration, equipment, and technique. Readiness/endpoint, temperature, and constraints remain absent unless a later accepted operation consumes them. |
| Protocol operations | A step ID, instruction, technique, or equipment name does not assert deterministic semantics. A protocol operation is introduced only when Recipe Calculus defines and consumes its behavior; v1 does not reserve a speculative operation field. |
| Diagnostic shape | Operation results use `status` and a list of standards-shaped problems. Each problem has a stable `type` URI and a RFC 6901 `pointer`; rendered wording is presentation-owned. |
| Required vectors | field evidence target; malformed pointer refusal; step validates/renders without primitive registry; primitive/params reject; unknown local technique/equipment render; instruction changes no calculation; explicit structured facts do; operation with absent required facts refuses; diagnostic type/pointer stability. |

## Provisional naming constraints for the SPEC

These are constraints, not chosen replacement spellings:

- `content_language` is the required full, unambiguous field name and contains
  a BCP 47 tag such as `pt-PT`; `locale` is forbidden in normative recipe
  data.
- Country and subdivision are not language fields; they require their own
  standards-backed semantics.
- A raw authored token, a local recipe term, a package definition, an external
  reference, and an application mapping cannot share one overloaded field.
- A machine unit identity and a user-facing formatted unit string cannot share
  a field if they can differ.
- Results expose a stable problem `type` URI and field `pointer`; UI
  localization is not a result input.
- Schemami v1 validation and writers reject legacy RCP spellings and
  convenience aliases; historical RCP documents are not runtime input.

## Review gates before SPEC-007

1. Resolve every row in the ambiguity inventory into accepted Schemami v1
   names and field semantics.
2. Run a mechanical inventory across JSON Schema, Go, TypeScript, vectors,
   package manifests, generated artifacts, and Pão adapter code; no unreviewed
   public field may remain.
3. Confirm every adopted external standard and version through primary source
   material, and record why any custom representation is necessary.
4. Add collision vectors: `language` versus UI locale, local term versus app
   mapping, unit identity versus display string, document revision versus wire
   version, and evidence URI versus reference URI.
