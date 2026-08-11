---
title: "Schemami v1 public field register"
date: 2026-08-11
status: accepted
---

# Schemami v1 public field register

This register produced the verified unpublished `da8449f` baseline. ADR-014
reopened its method boundary and ADR-015 now accepts the exact replacement
method, variation, completion, authored-environment, composition, formula,
bundle, lineage, and digest wire before publication. ADR-016 accepts the closed
operation request/result, active-graph, formula-target, component-instance,
diagnostic, and resource-limit meanings. Existing unaffected rows remain
accepted.

The exact accepted Phase 7 package is
`structured-method-wire-proposal.md`. Its root additions are
`parameters`, `components`, `preparations`, `outputs`, ordered `formulas`,
`method`, and `lineage`; it replaces lock-only packs with embedded
`.schemami-bundle.json`.

Requiredness follows one rule: require only members needed to identify an
object, distinguish its closed kind, make authored content readable, or supply
the one authority that object promises. All other registered members are
optional and absent when unknown. The compact required-field table in the
accepted Phase 7 package is normative; closed unions reject wrong-kind members.

| Scope | Members | Meaning / authority |
|---|---|---|
| Recipe root | Existing baseline members plus optional `parameters`, `components`, `preparations`, `outputs`, `formulas`, `lineage`, and required `method` | Wire model, local published identity, source content, recipe-local facts, grouped algebra, method/composition, and provenance. Root `steps` and singular `formula` are removed. |
| Origin | `country`, `subdivision`, `locality` | Optional ISO 3166 country/subdivision plus source-language locality; national coding may use owner extensions. |
| Local entity | `id`, `name`, `notes`, `external_references` | 1–128 character local ID and source-language authored content; external links never resolve or supply facts. |
| Method hierarchy | `sequence`; section/step/action members, `completion`, `guidance`, `environment`, `relative_timing`, `activation`, `uses`, `produces` | Recursive ordered sections/steps; steps alone own dependencies and scheduling; step flow is authoritative and action flow is a subset used for attribution. Section environment/timing never implicitly inherits. |
| Absolute quantity | `kind`, `value`, `unit`, `minimum`, `maximum`, `qualifier`, `guide`, `scaling` | Closed `measured`/`range`/`open` union; UCUM 2.2 unit identity; decimal strings use the accepted 16-total/4-fractional limit. |
| Formula | Ordered `formulas`; each uses `id`, optional `name`, `kind`, `terms`, typed `input`/`basis`, and optional `target`/`basis_quantity` anchor | Closed ratio/percentage algebra. One input has one quantity authority and occurs in at most one formula; multiple culinary allocations use separate local input IDs. |
| Evidence | `id`, `source`, `pointer`, `raw_text`, `confidence`, `selector`; selector `kind`, `value`, `conforms_to` | Local evidence ID; optional source-artifact local ID; pointer is RFC 6901, confidence is canonical decimal 0–1, and selector is a standard-backed fragment locator that never supplies Calculus input. |
| Source | `id`, `uri`, `media_type`, `sha256` | Acquisition artifact. A supplied source requires non-empty RFC 3986 URI/URI-reference; `media_type` is registered when supplied; digest is lowercase SHA-256 hex. |
| Bundle | `schemami`, exact `root`, embedded `documents[].document`, entry `sha256` | Exactly the deduplicated all-branch component closure; root first, remaining tuple-sorted; no missing/duplicate/unrelated documents; canonical schema is `bundle.schema.json`. |
| Recipe operation request | Exactly one `recipe`/`bundle`; `arguments`; optional `selections` entries with `component_path`, `bindings`, `alternatives` | Closed Calculus input. Paths are component-ID arrays; dynamic argument maps use declared local IDs; problem pointers address this request object. |
| Operation result | `operation`, `status`, `result`, `problems`; problem `type`, `pointer` | Six closed tokens include `resolve_selection`; success/refusal/not-applicable retain ADR-011 exclusivity. Independent problems are cascade-suppressed, deduplicated, and pointer/type sorted. |
| Evaluation result | `evaluation.recipe`, optional `bundle_sha256`, ordered `selections`; selection `component_path`, binding/alternative entries and `source` | Non-publishable JCS-derived input identity and effective argument/default choices. Absent from standalone conversion. |
| Active selection result | `active_instances`; each `component_path`, exact `recipe`, ordered active entity IDs, method nodes, and scoped actions | Identifiers only, in component-instance preorder; never copied canonical recipe objects. |
| Effective quantity result | `quantities` entries require typed `input`, `quantity` | `resolve_formula` uses selected term order; `scale` uses active ingredients then active components in declaration order. |
| Formula evaluation result | `formula_evaluations`; entry `component_path`, `formula_id`, `authored_total`, `selected_total`, optional `scaled_total` | Present only when formulas are evaluated. Totals quantize independently; inactive terms never redistribute and no residual is allocated. |
| Scale arguments | Exactly one positive `factor` or `formula_target`; target `formula_id`, measured `quantity` | Formula target identifies a root formula and derives one exact unrounded factor from the selected total. |
| Component instance result | `component_instances`; entry `component_path`, exact `recipe`, `output`, required `quantity`, calculated `quantities` | Depth-first instances preserve exact child identity and evaluated quantities without returning rewritten recipe documents. |
| Reading-order step result | `component_path`, `id`; optional `unplaced_components` entries with closed `reason` | Composed topological projection from explicit selected facts; `not-consumed` reports active components without placement. |
| Schedule step result | `component_path`, `id`, `start`, `duration`, `end`; optional `unscheduled_components` with closed `reason` | Composed earliest-start projection shifted to earliest `PT0S`; `not-consumed` reports active components without explicit consumer. |

Forbidden aliases include `rcp`, `lang`, locale maps, `amount`, `item`,
`primitive`, `params`, singular step `technique`, `min`/`max` duration members, `version`, `description`,
`label`, and canonical tracks/lanes/arbitrary expressions. Historical
`endpoint`, historical options/guards/constraints, generic `context`, and a
rewritten resolved/scaled recipe are not aliases for accepted Phase 8 shapes.

No implementation may reuse a historical field or add a free-form placeholder.
ADR-015 supersedes singular `formula`, formula term `ingredient`, and untyped
effective-result entries in favour of ordered formula groups and typed
ingredient/component input references. An input named by `formulas[].terms`
cannot also carry explicit `quantity` or occur in another formula; there is no
precedence rule between competing authorities. ADR-016 adds no convenience
alias: `factor` and `formula_target` are exclusive, `component_path` is never a
JSON Pointer, and `relative_timing` is never a schedule lag.
