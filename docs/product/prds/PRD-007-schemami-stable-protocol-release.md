# PRD-007: Schemami stable protocol release — full wire rename and PaodePortugal adoption

**Status:** accepted
**Rigor:** platform
**Author:** Daniel Gomes
**Created:** 2026-08-10
**Sidecar:** [PRD-007-schemami-stable-protocol-release.yaml](./PRD-007-schemami-stable-protocol-release.yaml) — structured source of truth

---

## Problem

Schemami is now the project and public product name, but the protocol wire
format still identifies itself as RCP: `rcp: 1`, `x-rcp-*`, `rcp.invalid`,
RCP-named schema/package artifacts, and RCP tooling. A cosmetic rename would
leave the stable public protocol under the old identity. There is no published
schema host, remote release tag, or known external consumer, so Schemami v1
can make one clean pre-publication cutover rather than preserve a private RCP
contract indefinitely (ADR-006).

At the same time, the next real adopter, Pão de Portugal, already has a parity
spike that blocks recipes when its terms lack central RCP registry entries.
That contradicts ADR-005: a central catalog must not be a capture, rendering,
or structural-validity prerequisite. The stable release must give Pão de
Portugal a trustworthy protocol boundary without moving its product aggregate,
heritage model, seals, routes, or editorial workflow into Schemami.

The release therefore has one integrated job: establish a stable Schemami wire
model, introduce the accepted narrow unit-conversion capability,
registry-optional resolution boundary, local method entities, and exact
quantities, and prove them through repository-owned
conformance. Pão de Portugal adapts as a future integrator on its own schedule;
AI conversion and the documentation/manual launch follow this release.

## Product boundary

Schemami is a deterministic recipe protocol and compilation target. It does
not host recipes, operate an LLM, own translations, own an integrator's
catalog, or become Pão de Portugal's application model.

```text
Pão de Portugal recipe aggregate and editorial data
             │  app-owned adapter / compatibility evidence
             ▼
       Schemami document or immutable snapshot
             │  schema + semantic validation + Calculus
             ▼
       supported result or pointer-specific refusal
```

An integrator may retain its own catalog mappings and presentation
translations. These enrich its product but never rewrite the source Schemami
document, recipe identity, canonical content, or deterministic result.

## Accepted release identity

The canonical wire identity is **Schemami wire v1**:

- root marker: `schemami: "1"`;
- extension prefix: `x-schemami-*`;
- core and pack schema identifiers below
  `https://schemami.dev/schema/schemami/1/...`;
- Schemami-named schema, package, vector, validator, and release artifacts.

Schemami readers and writers accept and emit only the new wire form. An RCP
marker is an explicit unsupported-legacy input, not a dual-read fallback. The
final specification must pin the exact filenames, canonical URLs, and cutover
inventory before implementation starts.

`x-schemami-*` is reserved for extensions defined by this protocol. An
integrator may use its own namespaced `x-<owner>-*` extension, such as
`x-pao-de-portugal-*`; readers preserve unknown `x-*` data but it cannot alter
validation, identity, or Calculus unless a Schemami specification explicitly
standardizes it.

## Users

- `schemami.integrator.recipe-platform` — needs a stable, versioned protocol
  contract it can adopt without central vocabulary curation.
- `pao-de-portugal.recipe-editor` — can adopt the stable public contract later
  while retaining Pão-only context in the application.
- `schemami.cook` — needs quantities rendered in an explicit compatible unit
  without hidden regional or physical-conversion assumptions.
- `schemami.implementer` — needs one canonical model without legacy parser or
  migration obligations.

## Goals

| Goal | Target | Counter-metric |
|---|---|---|
| Stable Schemami identity | One canonical Schemami wire model, namespace, artifacts, and release tag | No ambiguous mixture of RCP and Schemami markers in newly written documents |
| Semantic field clarity | One audited definition for every wire/API field, with reuse allowed across clearly typed scopes | No unsafe aliases, same-scope overloads, or locale/language ambiguity in newly written documents |
| Clean cutover | One Schemami-only reader/writer/schema graph | No dual read, legacy aliases, public migration tool, or deprecation burden |
| Recipe-local vocabulary | Unknown local ingredients, techniques, and equipment remain valid and readable without a central registry entry | No inferred facts or unearned computation |
| Deterministic conversion | Explicit compatible units and temperatures produce the same canonical decimal result in every implementation or refuse | No bare-regional inference, `g = mL`, floating tolerance, or integrator-dependent rounding |
| Pão readiness | Schemami-owned vectors prove an unknown local term needs no central registry admission | No Pão aggregate, identity, heritage, seal, route, editor, or worktree becomes protocol release scope |

## Non-goals

- A Schemami-hosted recipe, catalog, translation, or LLM service.
- Translation companions, locale bundles, or protocol-managed translation
  storage (ADR-004).
- A mandatory global ingredient/technique registry, registry federation, or
  vocabulary cleanup program (ADR-005).
- Mass-volume conversion, density defaults, substitution inference, or
  presentation rounding inside protocol operations. The accepted four-digit
  canonical precision rule is protocol quantization, not UI formatting.
- AI source-to-draft conversion, consumer-chat integration, telemetry, or the
  documentation/manual launch. These follow a stable protocol.
- Modeling Pão de Portugal users, bakeries, BreadKinds, seals, moderation,
  routes, media, or product workflows in Schemami.
- Dual RCP/Schemami parsing, a public migration CLI, deprecation policy, or
  Pão adapter implementation (ADR-006).

## Requirements

| ID | Component | Requirement |
|---|---|---|
| FR-NAME-001 | protocol identity | Deliver Schemami wire v1 with the accepted `schemami: "1"`, protocol-reserved `x-schemami-*`, Schemami-named schema/package/vector/validator artifacts, and immutable canonical schema URLs under the accepted `schemami.dev` host. A release gate rejects new canonical RCP identifiers and `rcp.invalid` identifiers. Integrator `x-<owner>-*` data is preserved but cannot affect protocol logic unless explicitly standardized. |
| FR-MODEL-001 | semantic field contract | Audit every field and public API across documents, packages, schemas, registry, Calculus, validator, viewer, vectors, and cutover inventory. Publish an accepted field-name register before new schemas are written: name, type, scope, semantic definition, and authoritative standard/value vocabulary where one exists. Reuse of a familiar name is allowed when the containing type and scope make its meaning unambiguous; a rename is justified only by a demonstrated semantic collision, not by repetition alone. The required `content_language` field contains a BCP 47 source-content tag; UI locale/translation is outside the protocol; country/region, unit identity, display formatting, source evidence, local identity, external reference, and app resolution context are all distinct concepts. |
| FR-CUTOVER-001 | clean cutover | Replace repository-owned active RCP schemas, documents, package artifacts, vectors, generated data, validation, Calculus, and viewer paths with Schemami wire v1. The released reader/writer recognizes Schemami only; RCP input returns an explicit unsupported-legacy diagnostic. Ship no dual reader, public migration tool, alias, or deprecation-window commitment. Historical records may retain historical RCP terminology outside the active normative/runtime surface. |
| FR-VOCAB-001 | vocabulary resolution | Ingredient lines require recipe-local `id` and source-language `name`; recipes MAY also declare local technique and equipment entities with their own local IDs and source-language names. Every recipe-local ID matches `^[a-z0-9][a-z0-9_-]*$` and contains at most 128 characters; matching is exact and case-sensitive, and readers never normalize uppercase. Lowercase UUID strings are permitted without acquiring UUID semantics. A step is itself the recipe-local action and requires `id` plus source-language `instruction`; it has no mandatory primitive/action reference, registry, version, or parameter object. These entities remain structurally valid and readable without a central registry. An optional integrator maps `(document identity, local id)` as application resolution context only. Do not introduce `item`, generic `terms`, package-owned vocabulary, federation, or global registries in v1. Local labels do not assert deterministic facts; only explicit structured step fields may drive defined behavior, and operations needing absent facts return structured diagnostics. |
| FR-CALC-006 | Recipe Calculus | Define tagged absolute `quantity` shapes for `measured`, `range`, and `open`. Define grouped `formula` shapes separately: ordered ratio terms store decimal `parts` and render colon ratios such as `1:2:2`; percentage terms store percentage points directly against a named basis (`75` means 75%, not `0.75`). Canonical numeric values have at most 16 total digits and four fractional digits; public results use the same shape, not rational objects. Exact results beyond four fractional digits use round-half-to-even. The only v1 operations are `scale`, `resolve_formula`, `convert_quantity`, `reading_order`, and `schedule`; core scaling is `linear` or `fixed`, while unknown extension-defined behavior refuses. Options, guards, constraints, tracks, and interleaving are absent. `reading_order` is one dependency-respecting linear projection with declaration-order tie breaking. Elapsed durations use the accepted standard-shaped form; measured units use pinned UCUM 2.2; unsupported, ambiguous, and physical requests refuse. |
| FR-EVIDENCE-001 | source evidence and diagnostics | Preserve imported values through document-level `sources` and RFC 6901-targeted evidence. A source has local ID, URI/URI-reference, optional registered media type, and optional SHA-256 digest; evidence may carry raw text and 0–1 canonical-decimal confidence. Calculus/validation never parses source evidence. Operation results use the accepted operation tokens, status, stable `https://schemami.dev/problems/` type URIs, and RFC 6901 pointers; human rendering and localization remain integrator-owned. |
| FR-PORTABLE-001 | portable data boundary | Keep document identity local to an explicit `collection`: document `id` and collection use the accepted opaque local-ID grammar; `revision` is a positive integer, and a published pack pins the JCS SHA-256 bytes. Optional `external_references` contain absolute RFC 3986 URIs without resolution or calculation semantics. Canonical prose is limited to `title`, `name`, `instruction`, and `notes`. Extension names use lowercase DNS-label-style `x-<owner>-<name>` tokens, round-trip unchanged, and never affect core logic. |
| FR-PAO-001 | adoption readiness | Prove the Pão-relevant central-registry boundary with Schemami recipe-local vocabulary and operation diagnostics. Do not change, test-gate, or require a target Pão de Portugal branch; Pão owns any later adapter, mapping, UI overlay, aggregate, and compatibility report. |
| FR-REL-001 | release and conformance | Publish a versioned release manifest, clean-cutover scope note, normative conversion vectors, recipe-local vocabulary vectors, and cross-language conformance results. Tag only after every release gate passes; Pão adapter adoption is not a gate. |

## Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-NAME-001-1 | a canonical Schemami v1 schema, package, vector, or document | identity and marker gates run | it uses only the approved Schemami wire identity and protocol-owned immutable URL; legacy RCP identifiers fail in newly written canonical artifacts |
| AC-MODEL-001-1 | the complete protocol field/API inventory | the field-name review runs | every field has an accepted definition, scope, type, and standard/value vocabulary decision; only same-scope ambiguity, unsafe aliasing, or undocumented semantics fail the review |
| AC-MODEL-001-2 | a Schemami v1 document, package, validator result, and Calculus result | naming/language ambiguity gates run | contextually repeated names remain valid where their types/scopes differ; required `content_language` is one BCP 47 field and is never conflated with UI locale, translation, country/region, or display preference |
| AC-CUTOVER-001-1 | an active Schemami v1 schema, package, vector, document, validator, viewer, or Calculus path | the cutover inventory gate runs | it contains only Schemami names and identifiers; RCP remains only in explicitly historical records, ADR-006, or negative unsupported-legacy input vectors |
| AC-CUTOVER-001-2 | an RCP-marked input | the released Schemami reader evaluates it | it returns the documented unsupported-legacy diagnostic and never falls back to a legacy parser or migrator |
| AC-VOCAB-001-1 | a recipe-local ingredient, technique, or equipment entity unknown to any catalog | it is structurally validated and rendered | it remains valid and readable from source facts without a central or package entry |
| AC-VOCAB-001-2 | an operation requiring an absent fact for an unknown/local term | the operation runs | only that operation refuses with a pointer-specific machine code; the recipe remains available |
| AC-VOCAB-001-3 | a step with local `id`, source-language `instruction`, and explicit structured facts | it is validated, rendered, and scheduled | it requires no primitive/action catalog; only the explicit structured facts affect protocol behavior |
| AC-VOCAB-001-4 | lowercase kebab, snake, UUID-shaped, and 128-character local IDs plus uppercase/dotted/spaced/129-character neighbours | local identity validation and reference resolution run | lowercase letters/digits/`-`/`_` of at most 128 characters resolve exactly; uppercase, dot, space, tilde, non-ASCII, and overlong forms reject without normalization |
| AC-CALC-006-1 | explicit UCUM 2.2 same-dimension or Celsius/Fahrenheit input | Go and TypeScript replay shared vectors | they return identical canonical decimal strings with at most 16 total digits and four fractional digits under the pinned tie-rounding rule and no floating tolerance or integrator-dependent rounding |
| AC-CALC-006-2 | bare `cup`/`tbsp`/`tsp`/`floz`, unknown unit, formula relationship, non-measured quantity, cross-dimension, or mass-volume input | conversion runs | it refuses with the applicable documented code and does not infer region, density, percentage, ratio, or ingredient facts |
| AC-CALC-006-3 | positive elapsed durations and a duration window | schema validation and Go/TypeScript scheduling run | `PT8M`, `PT1H10M`, `P2D`, and `P1W` use identical elapsed semantics; `minimum`/`target`/`maximum` are preserved; compact Model 1, negative, year, and month forms reject |
| AC-CALC-006-4 | a recipe with dependency edges and unrelated declared steps | Go and TypeScript run `reading_order` | they return the same dependency-respecting linear projection, using declaration order only to break ties, with no track/lane field required |
| AC-EVIDENCE-001-1 | imported source evidence and a structured target field | evidence validation runs | the evidence uses a valid RFC 6901 target and cannot substitute for or alter the structured value used by logic |
| AC-EVIDENCE-001-2 | a refused operation | its result is rendered by two integrations | its stable problem type and pointer are identical; each integration may render its own localized wording |
| AC-PORTABLE-001-1 | a packed document and an external URI reference | canonicalization and pack resolution run | identity is local to `(collection, id, revision, digest)`; the URI remains optional and unresolved and cannot alter calculation |
| AC-PAO-001-1 | a Schemami recipe with an unknown recipe-local term | it is validated, rendered, and a fact-dependent operation is evaluated | it remains valid/readable without a central or package entry; only the dependent operation refuses with a stable diagnostic |
| AC-PAO-001-2 | a Schemami release candidate | release gates run | no Pão repository checkout, branch, adapter, UI overlay, or Pão aggregate field is a required input or release gate |
| AC-REL-001-1 | release candidate | release gates run from a clean clone | all cutover, schema, semantic, Calculus, vocabulary, and cross-language conformance gates pass before the stable tag is created |

## Protections

- **SP-001 — Explicit clean cutover.** No released Schemami v1 path accepts,
  emits, aliases, or migrates RCP. Historical records remain clearly
  historical; an RCP marker receives an explicit unsupported-legacy result.
- **SP-002 — No silent knowledge.** Local, package, external, and
  integrator-resolved facts are distinguishable in an operation diagnostic.
  Resolution must never make an unknown term appear centrally governed.
- **SP-003 — No content ownership expansion.** This release must not create a
  Schemami recipe store, translation service, hosted model, or global catalog
  stewardship obligation.
- **SP-004 — Pão boundary stays external.** Pão adapts after publication on its
  own schedule. Its product aggregate remains authoritative, and no Pão code,
  branch, or test is a Schemami v1 release input.
- **SP-005 — Cutover scope is evidence-led.** Active RCP implementation
  surfaces are classified before replacement; generated data is regenerated
  from Schemami sources. No text replacement may silently turn a historical
  record into false Schemami evidence.
- **SP-006 — No gratuitous rename or unsafe alias.** A field rename is a model
  decision, not a style cleanup. Reuse is permitted when scope and type retain
  meaning. Schemami v1 carries no convenience aliases or legacy spellings.

`schemami.dev` is accepted as the canonical schema-ID host. Its deployment is
a release gate: immutable HTTPS URL resolution must be proven without making a
documentation UI a prerequisite.

## Sequencing

1. Accept this PRD, then write the remaining field-name register and
   SPEC-007: exact wire schemas, cutover inventory, vocabulary wire shape,
   resolution diagnostics,
   conversion algorithm, and conformance suite.
2. Execute in phases: identity cutover → semantic field contract → local
   vocabulary → unit conversion → conformance/release gate/tag.
3. Revise and renumber the AI conversion bridge after this release; it must
   consume Schemami wire v1 and ADR-005 semantics.
4. Resume documentation/manual work against the released normative surface.

## References

- ADR-004 — presentation-owned translations
- ADR-005 — registry-optional local vocabulary and integrator resolution
- ADR-006 — clean Schemami v1 cutover
- ADR-007 — ingredient-line recipe-local identity
- ADR-008 — local method entities and exact quantity contract
- [PRD-007 field-name audit](./artifacts/PRD-007/field-name-audit.md)
- [PRD-007 wire-identity standards fit](./artifacts/PRD-007/wire-identity-standards-fit.md)
- [PRD-007 RCP clean-cutover inventory](./artifacts/PRD-007/rcp-clean-cutover-inventory.md)
- [Pão de Portugal adoption gap](./artifacts/PRD-007/paodeportugal-adoption-gap.md)
- `docs/product/prds/PRD-006-rcp-discovery-prototypes.md`
- `prototypes/discovery-002/` — conversion and local-payload evidence only
- `/Users/danielgomessm/MyProjects/dcsg/paodeportugal/experiments/recipe-rcp-parity/`
- `/Users/danielgomessm/MyProjects/dcsg/paodeportugal/docs/domain/BC-REC-001-recipe.md`
