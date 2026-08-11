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
registry-optional resolution boundary, structured method and variation model,
portable recipe composition, lineage, and exact quantities, and prove them through repository-owned
conformance. Pão de Portugal adapts as a future integrator on its own schedule;
AI conversion and the documentation/manual launch follow this release.

Dogfood also showed that flattening authored sections, actions, completion
conditions, alternatives, and prerequisites into prose loses culinary meaning.
Those structures belong in the compilation target when the source states them;
application timer policy, notifications, session state, and UI behavior do not.

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
- core and bundle schema identifiers below
  `https://schemami.dev/schema/schemami/1/...`;
- Schemami-named schema, package, vector, validator, and release artifacts.

Schemami readers and writers accept and emit only the new wire form. An RCP
marker is an explicit unsupported-legacy input, not a dual-read fallback. The
final specification must pin the exact filenames, canonical URLs, and cutover
inventory before implementation starts.

`x-schemami-*` is reserved for extensions defined by this protocol. An
integrator may use its own namespaced `x-<owner>-*` extension, such as
`x-pao-de-portugal-*`; readers preserve unknown `x-*` data. It cannot alter
protocol validation semantics, resolution decisions, or Calculus unless a
Schemami specification explicitly standardizes it, but it remains part of
canonical bytes and therefore affects the exact content digest.

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
| Structured culinary method | Preserve authored hierarchy, action order, completion conditions, alternatives, prerequisites, and reusable recipe components | No parsing prose to recover executable meaning and no application timer policy in canonical data |
| Deterministic conversion | Explicit compatible units and temperatures produce the same canonical decimal result in every implementation or refuse | No bare-regional inference, `g = mL`, floating tolerance, or integrator-dependent rounding |
| Pão readiness | Schemami-owned vectors prove an unknown local term needs no central registry admission | No Pão aggregate, identity, heritage, seal, route, editor, or worktree becomes protocol release scope |
| Cross-product fit | Pão de Portugal and Fornada both implement adapters against the same committed candidate bytes, preserve their different portable subsets, and separate protocol validity from application projectability | This proves a first interoperability milestone, not independent-owner adoption or ecosystem scale |

## Non-goals

- A Schemami-hosted recipe, catalog, translation, or LLM service.
- Translation companions, locale bundles, or protocol-managed translation
  storage (ADR-004).
- A mandatory global ingredient/technique registry, registry federation, or
  vocabulary cleanup program (ADR-005).
- Mass-volume conversion, density defaults, inferred substitution, compensating
  recalculation, or
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
| FR-NAME-001 | protocol identity | Deliver Schemami wire v1 with the accepted `schemami: "1"`, protocol-reserved `x-schemami-*`, Schemami-named schema/bundle/vector/validator artifacts, and immutable canonical schema URLs under the accepted `schemami.dev` host. A release gate rejects new canonical RCP identifiers and `rcp.invalid` identifiers. Integrator `x-<owner>-*` data is preserved but cannot affect protocol logic unless explicitly standardized. |
| FR-MODEL-001 | semantic field contract | Audit every field and public API across documents, bundles, schemas, registry, Calculus, validator, viewer, vectors, and cutover inventory. Publish an accepted field-name register before new schemas are written: name, type, scope, semantic definition, and authoritative standard/value vocabulary where one exists. Reuse of a familiar name is allowed when the containing type and scope make its meaning unambiguous; a rename is justified only by a demonstrated semantic collision, not by repetition alone. The required `content_language` field contains a BCP 47 source-content tag; UI locale/translation is outside the protocol. Optional origin uses ISO 3166-1 `country`, matching ISO 3166-2 `subdivision`, and source-language `locality`; country/region, unit identity, display formatting, source evidence, local identity, external reference, and app resolution context are all distinct concepts. |
| FR-CUTOVER-001 | clean cutover | Replace repository-owned active RCP schemas, documents, bundle artifacts, vectors, generated data, validation, Calculus, and viewer paths with Schemami wire v1. The released reader/writer recognizes Schemami only; RCP input returns an explicit unsupported-legacy diagnostic. Ship no dual reader, public migration tool, alias, or deprecation-window commitment. Historical records may retain historical RCP terminology outside the active normative/runtime surface. |
| FR-VOCAB-001 | vocabulary resolution | Ingredient lines require recipe-local `id` and exactly one source-language `name` or strict `alternatives`; recipes MAY also declare local technique and equipment entities with their own local IDs and source-language names. Every recipe-local ID matches `^[a-z0-9][a-z0-9_-]*$` and contains at most 128 characters; matching is exact and case-sensitive, and readers never normalize uppercase. Lowercase UUID strings are permitted without acquiring UUID semantics. Local entities remain structurally valid and readable without a central registry. An optional integrator maps `(document identity, local id)` as application resolution context only. Do not introduce `item`, generic `terms`, package-owned vocabulary, federation, or global registries in v1. Local labels do not assert deterministic facts; operations needing absent facts return structured diagnostics. |
| FR-METHOD-002 | structured method | Represent the authored method as one recursively nested ordered `sequence` containing only sections and steps. Array order is authored reading order; explicit dependencies govern execution. Sections express culinary phases and may be conditional. Steps are the only dependency and scheduling units and use exactly one of direct `instruction` or a non-empty ordered action list. Actions preserve meaningful internal order and may carry techniques, completion conditions, ingredient/equipment usage, and evidence, but never independent dependencies or schedule duration. Application timer policy, notifications, session state, and UI behavior remain outside canonical data. |
| FR-VARIATION-001 | authored variation | Represent source-authored recipe-local choices, toggles, and measured inputs with closed typed predicates. Conditional activation may apply to ingredients, component references, equipment, sections, steps, and actions. `resolve_selection` uses instance-scoped selections and returns active identifiers without rewriting a recipe. Missing required selections keep all authored alternatives displayable and refuse only dependent operations. Admission validates every distinct reachable active graph, including exact measurement-threshold boundaries/regions, and never lets an inactive branch hide invalid content. Only a source-authored default may select implicitly. Strict substitutions replace exactly one ingredient at the same resolved quantity, unit, formula participation, and scaling behavior; anything requiring recalculation or another process change is an authored branch or a separate recipe. |
| FR-COMPOSITION-001 | composition and timing | Allow exact references to required outputs of other recipe documents by collection, document ID, revision, and JCS SHA-256 digest, resolved only from explicitly loaded offline bytes. A parent component declares its required amount; the referenced child output may declare a compatible measured yield for exact UCUM cross-recipe scaling, and absent/incompatible yield causes refusal. Step resource flow is authoritative; action flow is subset attribution. Each selected preparation/output has at most one producer and each consumed one exactly one. Composed reading/schedule results place a used child output producer from explicit facts, while reporting active unconsumed components instead of silently claiming completeness. `relative_timing` remains validated authored/calendar presentation and does not alter earliest-start scheduling. Complete export is one self-contained JSON bundle containing exactly the deduplicated dependency closure of every declared branch. |
| FR-LINEAGE-001 | recipe identity and lineage | Source-authored optional ingredients, strict one-for-one substitutions, and alternatives remain one recipe. Any user modification outside those declared choices creates a complete new recipe document with lineage to its source; lineage is provenance, never a runtime patch. Imports preserve the source recipe unchanged. |
| FR-CALC-006 | Recipe Calculus | Define tagged absolute `quantity` shapes for `measured`, `range`, and `open`; an open guide is measured or range only. Define ordered locally identified formulas with typed inputs, direct ratio parts, percentage points, and one authority per input. Public operations are `resolve_selection`, `resolve_formula`, `scale`, `convert_quantity`, `reading_order`, and `schedule`. Formula evaluation computes all authored terms, filters inactive results without redistribution, and reports authored/selected totals. `scale` requires exactly one decimal factor or root formula target; target scaling derives one unrounded exact rational factor from the selected total and applies it once across active root/component inputs. Results carry JCS-derived input identity, effective selection, typed quantities, and applicable formula evaluations, never a rewritten recipe. Canonical numeric values/results retain the accepted 16-total/four-fractional/half-even rule. Core scaling is linear or fixed; unknown extension behavior, ambiguous/physical conversion, arbitrary expressions, tracks, lanes, inferred interleaving, and residual rounding allocation remain absent. |
| FR-EVIDENCE-001 | source evidence and diagnostics | Preserve imported values through optional document-level `sources` and RFC 6901-targeted evidence. A supplied source has local ID, non-empty URI/URI-reference, optional registered media type, and optional SHA-256 digest. Evidence may carry raw text, 0–1 canonical-decimal confidence, and a standard-backed fragment selector locating part of its source. Selector offsets are source locators, never culinary duration or Calculus input. Calculus/validation never parses evidence into structured recipe facts. Operation results use the accepted operation tokens, status, stable `https://schemami.dev/problems/` type URIs, and RFC 6901 pointers; human rendering and localization remain integrator-owned. |
| FR-PORTABLE-001 | portable data boundary | Keep document identity local to an explicit `collection`: document `id` and collection use the accepted opaque local-ID grammar; `revision` is a positive integer, and a published bundle pins JCS SHA-256 bytes. Optional `external_references` contain absolute RFC 3986 URIs without resolution or calculation semantics. Canonical prose occurs only in explicitly registered source-language fields. Extension names use lowercase DNS-label-style `x-<owner>-<name>` tokens and round-trip unchanged; they never affect core logic but remain digest-significant canonical content. |
| FR-PAO-001 | adoption readiness | Prove the registry-free and cross-product boundary through owner-reviewed Pão de Portugal and Fornada adapter dogfood against the same committed candidate bytes. Each product owns its adapter, mapping, UI overlay, aggregate, and compatibility report; neither application checkout becomes an automated Schemami conformance input. |
| FR-REL-001 | release and conformance | Publish a versioned release manifest, clean-cutover scope note, normative conversion vectors, recipe-local vocabulary vectors, and cross-language conformance results. Owner-reviewed two-product dogfood precedes publication, but clean-clone release gates consume only repository-owned Schemami fixtures and never either application repository. |

## Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-NAME-001-1 | a canonical Schemami v1 schema, bundle, vector, or document | identity and marker gates run | it uses only the approved Schemami wire identity and protocol-owned immutable URL; legacy RCP identifiers fail in newly written canonical artifacts |
| AC-MODEL-001-1 | the complete protocol field/API inventory | the field-name review runs | every field has an accepted definition, scope, type, and standard/value vocabulary decision; only same-scope ambiguity, unsafe aliasing, or undocumented semantics fail the review |
| AC-MODEL-001-2 | a Schemami v1 document, bundle, validator result, and Calculus result | naming/language ambiguity gates run | contextually repeated names remain valid where their types/scopes differ; required `content_language` is one BCP 47 field and is never conflated with UI locale, translation, country/region, or display preference |
| AC-CUTOVER-001-1 | an active Schemami v1 schema, bundle, vector, document, validator, viewer, or Calculus path | the cutover inventory gate runs | it contains only Schemami names and identifiers; RCP remains only in explicitly historical records, ADR-006, or negative unsupported-legacy input vectors |
| AC-CUTOVER-001-2 | an RCP-marked input | the released Schemami reader evaluates it | it returns the documented unsupported-legacy diagnostic and never falls back to a legacy parser or migrator |
| AC-VOCAB-001-1 | a recipe-local ingredient, technique, or equipment entity unknown to any catalog | it is structurally validated and rendered | it remains valid and readable from source facts without a central or package entry |
| AC-VOCAB-001-2 | an operation requiring an absent fact for an unknown/local term | the operation runs | only that operation refuses with a pointer-specific machine code; the recipe remains available |
| AC-VOCAB-001-3 | a step with local `id`, source-language `instruction`, and explicit structured facts | it is validated, rendered, and scheduled | it requires no primitive/action catalog; only the explicit structured facts affect protocol behavior |
| AC-VOCAB-001-4 | lowercase kebab, snake, UUID-shaped, and 128-character local IDs plus uppercase/dotted/spaced/129-character neighbours | local identity validation and reference resolution run | lowercase letters/digits/`-`/`_` of at most 128 characters resolve exactly; uppercase, dot, space, tilde, non-ASCII, and overlong forms reject without normalization |
| AC-VOCAB-001-5 | one step references multiple declared techniques | validation, canonicalization, and round-trip rendering run | ordered unique `techniques` is preserved byte-significantly; singular `technique`, duplicates, undeclared IDs, and reader sorting reject or fail conformance |
| AC-METHOD-002-1 | nested sections, steps, ordered actions, and step/action resource declarations | validation, round-trip rendering, and selected-graph calculation run | the recursive `sequence` preserves authored order; only steps own dependencies/schedule duration and authoritative resource flow; action flow is a subset; selected action-list steps retain an action; each consumed resource has exactly one active producer |
| AC-METHOD-002-2 | observation, measurement, and composed completion conditions | validation and method resolution run | conditions remain structured, target the correct semantic node, and are never inferred by parsing prose or confused with elapsed duration |
| AC-METHOD-002-3 | an application workflow primitive and an explicitly authored culinary technique | an adapter creates a Schemami document | only the explicitly authored technique is emitted; workflow step types, heuristics, timer defaults, and recommendations do not become canonical technique facts |
| AC-VARIATION-001-1 | a recipe with authored choices, toggles, measured inputs, alternatives, optional nodes, and a dormant broken branch | admission and `resolve_selection` run over exact threshold boundaries/regions plus valid, missing, and invalid instance-scoped selections | every distinct reachable graph is checked and equivalent graphs deduplicated; valid selection returns active identifiers/effective defaults without changing identity; missing values refuse only dependent operations; dormant invalid content rejects; excessive analysis returns `resource-limit` |
| AC-VARIATION-001-2 | a declared strict substitution and a proposed replacement needing quantity or process compensation | validation and scaling run | the one-for-one replacement preserves exact quantity/unit/formula/scaling behavior; the compensating replacement cannot masquerade as a substitution |
| AC-COMPOSITION-001-1 | a parent recipe references an exact child output and all pinned bytes are loaded | resolution, scaling, reading order, and scheduling run | the reference resolves offline by collection/id/revision/JCS digest; exact compatible measured yield scales the child once; explicit producer/consumer facts compose order/schedule; active unconsumed components are reported; missing bytes, mismatch, incompatible yield, producer ambiguity, or cycle refuses |
| AC-COMPOSITION-001-2 | a complete export with nested component dependencies and conditional branches | bundle validation runs | one JSON bundle contains exactly the deduplicated closure of every declared branch, rejects missing/duplicate/unrelated documents, detects cycles/resource exhaustion, and needs no network access |
| AC-LINEAGE-001-1 | a source recipe, a source-authored option selection, and a user-authored undeclared modification | identity evaluation runs | the option selection retains source identity while the undeclared modification is a complete new recipe with lineage and never a runtime patch |
| AC-CALC-006-1 | explicit UCUM 2.2 same-dimension or Celsius/Fahrenheit input | Go and TypeScript replay shared vectors | they return identical canonical decimal strings with at most 16 total digits and four fractional digits under the pinned tie-rounding rule and no floating tolerance or integrator-dependent rounding |
| AC-CALC-006-2 | bare `cup`/`tbsp`/`tsp`/`floz`, unknown unit, formula relationship, non-measured quantity, cross-dimension, or mass-volume input | conversion runs | it refuses with the applicable documented code and does not infer region, density, percentage, ratio, or ingredient facts |
| AC-CALC-006-3 | positive elapsed durations and a duration window | schema validation and Go/TypeScript scheduling run | `PT8M`, `PT1H10M`, `P2D`, and `P1W` use identical elapsed semantics; `minimum`/`target`/`maximum` are preserved and every supplied pair is ordered; inverted windows, compact Model 1, negative, year, and month forms reject |
| AC-CALC-006-4 | a recipe with dependency edges and unrelated declared steps | Go and TypeScript run `reading_order` | they return the same dependency-respecting linear projection, using declaration order only to break ties, with no track/lane field required |
| AC-CALC-006-5 | an open guide plus percentage formulas whose named basis is correct, non-100, or absent | schema, semantic validation, `resolve_formula`, and `scale` run | guides admit measured/range only; a percentage basis appears exactly once at `100`; recursive open guides and invalid basis authority reject identically |
| AC-CALC-006-6 | a formula with optional terms, authored total 400 g, selected total 300 g, and a 400 g `formula_target` | both implementations resolve and scale it | inactive terms do not redistribute; one exact unrounded 400/300 factor applies once to all active root/component quantities; targeted `scaled_total` is 400 g; line quantization is half-even with no residual allocation |
| AC-CALC-006-7 | nested components, equivalent reachable graphs, multiple independent blockers, and requests at the portability floor | admission and Calculus run in both implementations | results, evaluation digests/selections, component paths, deduplicated diagnostics, pointer/type ordering, and resource-limit boundary behavior match byte-for-byte |
| AC-EVIDENCE-001-1 | imported source evidence and a structured target field | evidence validation runs | the evidence uses a valid RFC 6901 target and cannot substitute for or alter the structured value used by logic |
| AC-EVIDENCE-001-2 | a refused operation | its result is rendered by two integrations | its stable problem type and pointer are identical; each integration may render its own localized wording |
| AC-EVIDENCE-001-3 | one video source and evidence for a step plus two ordered technique occurrences | evidence validation and URI-fragment reconstruction run | each pointer resolves, W3C temporal intervals are ordered, one source is reused, and selector offsets never alter schedule or culinary duration |
| AC-PORTABLE-001-1 | a bundled document, owner extension, and external URI reference | canonicalization and bundle resolution run | authored identity is local to `(collection, id, revision)`, exact bytes use the digest, the extension changes that digest but not protocol logic, and the URI remains optional/unresolved |
| AC-PAO-001-1 | a Schemami recipe with an unknown recipe-local term | it is validated, rendered, and a fact-dependent operation is evaluated | it remains valid/readable without a central or package entry; only the dependent operation refuses with a stable diagnostic |
| AC-PAO-001-2 | a Schemami release candidate accepted through Pão and Fornada dogfood | clean-clone release gates run | adapter reports are owner acceptance evidence, while no application checkout, branch, overlay, aggregate, or product test executes as a conformance input |
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
- **SP-004 — Application boundaries stay external.** Pão and Fornada dogfood
  committed candidate bytes before publication as owner acceptance. Their
  product aggregates remain authoritative, and no application code, branch, or
  test is a clean-clone Schemami conformance input.
- **SP-005 — Cutover scope is evidence-led.** Active RCP implementation
  surfaces are classified before replacement; generated data is regenerated
  from Schemami sources. No text replacement may silently turn a historical
  record into false Schemami evidence.
- **SP-006 — No gratuitous rename or unsafe alias.** A field rename is a model
  decision, not a style cleanup. Reuse is permitted when scope and type retain
  meaning. Schemami v1 carries no convenience aliases or legacy spellings.
- **SP-007 — No hidden branch semantics.** Prose, labels, evidence, and app
  extensions never activate alternatives or satisfy completion conditions.
  Every executable variation is typed, source-authored, and deterministically
  resolved or explicitly refused.

`schemami.dev` is accepted as the canonical schema-ID host. Its deployment is
a release gate: immutable HTTPS URL resolution must be proven without making a
documentation UI a prerequisite.

## Sequencing

1. Implement the ADR-015 wire and ADR-016 active-graph/composition Calculus in
   schema, Go, TypeScript, viewer, and shared conformance.
2. Preserve the accepted exact selection, formula-target, component,
   diagnostic, and resource-limit behavior without adding aliases.
3. Re-run Pão and Fornada dogfood against the replacement candidate, complete
   the clean-clone proof, and request approval before tag or publication.
4. Revise and renumber the AI conversion bridge after this release; it must
   consume Schemami wire v1 and ADR-005 semantics.
5. Resume documentation/manual work against the released normative surface.

## References

- ADR-004 — presentation-owned translations
- ADR-005 — registry-optional local vocabulary and integrator resolution
- ADR-006 — clean Schemami v1 cutover
- ADR-007 — ingredient-line recipe-local identity
- ADR-008 — local method entities and exact quantity contract
- ADR-014 — structured method, variation, composition, and lineage
- ADR-015 — exact structured-method wire and bundle closure
- ADR-016 — active-graph, composition, and target-scaling Calculus
- [Phase 8 Calculus contract](./artifacts/PRD-007/active-graph-composition-calculus.md)
- [PRD-007 field-name audit](./artifacts/PRD-007/field-name-audit.md)
- [PRD-007 wire-identity standards fit](./artifacts/PRD-007/wire-identity-standards-fit.md)
- [PRD-007 RCP clean-cutover inventory](./artifacts/PRD-007/rcp-clean-cutover-inventory.md)
- [Pão de Portugal adoption gap](./artifacts/PRD-007/paodeportugal-adoption-gap.md)
- `docs/product/prds/PRD-006-rcp-discovery-prototypes.md`
- `prototypes/discovery-002/` — conversion and local-payload evidence only
- `/Users/danielgomessm/MyProjects/dcsg/paodeportugal/experiments/recipe-rcp-parity/`
- `/Users/danielgomessm/MyProjects/dcsg/paodeportugal/docs/domain/BC-REC-001-recipe.md`
