---
title: "Schemami v1 public field register"
date: 2026-08-11
status: accepted
---

# Schemami v1 public field register

This is the closed wire register used to build the replacement schemas. Every
other canonical member requires a new accepted decision and conformance vector.

| Scope | Members | Meaning / authority |
|---|---|---|
| Recipe root | `schemami`, `collection`, `id`, `revision`, `content_language`, `title`, `notes`, `origin`, `ingredients`, `techniques`, `equipment`, `steps`, `formula`, `sources`, `evidence`, `external_references` | Wire model, local published identity, BCP 47 source language, authored prose, optional geographic origin, recipe-local entities, grouped algebra, and non-computational provenance. |
| Origin | `country`, `subdivision`, `locality` | Optional ISO 3166 country/subdivision plus source-language locality; national coding may use owner extensions. |
| Local entity | `id`, `name`, `notes`, `external_references` | 1–128 character local ID and source-language authored content; external links never resolve or supply facts. |
| Step | `id`, `instruction`, `after`, `uses`, `produces`, `duration`, `techniques`, `equipment`, `notes` | Local action. Technique references are ordered/unique and preserve authored sequence; only explicit structured dependency/timing members affect Calculus. |
| Absolute quantity | `kind`, `value`, `unit`, `minimum`, `maximum`, `qualifier`, `guide`, `scaling` | Closed `measured`/`range`/`open` union; UCUM 2.2 unit identity; decimal strings use the accepted 16-total/4-fractional limit. |
| Formula | `kind`, `terms`, `ingredient`, `parts`, `percentage`, `basis`, `target`, `basis_quantity` | Closed ratio/percentage algebra; ratio order is display order; percentage values are percentage points. |
| Evidence | `id`, `source`, `pointer`, `raw_text`, `confidence`, `selector`; selector `kind`, `value`, `conforms_to` | Local evidence ID; optional source-artifact local ID; pointer is RFC 6901, confidence is canonical decimal 0–1, and selector is a standard-backed fragment locator that never supplies Calculus input. |
| Source | `id`, `uri`, `media_type`, `sha256` | Acquisition artifact. A supplied source requires non-empty RFC 3986 URI/URI-reference; `media_type` is registered when supplied; digest is lowercase SHA-256 hex. |
| Pack | `schemami`, `collection`, `revision`, `documents` | Offline collection manifest. Document locks carry exact JCS SHA-256 bytes. |
| Operation result | `operation`, `status`, `result`, `problems`; problem `type`, `pointer` | Five ADR-009 operation tokens; `ok` carries one closed operation-specific `result`; `refused` carries non-empty problems; `not_applicable` carries neither. |
| Effective quantity result | `quantities`; entry `ingredient`, `quantity` | Formula-order output for `resolve_formula`; recipe-ingredient order for `scale`; never a rewritten recipe document. |
| Schedule step result | `id`, `start`, `duration`, `end` | Dependency-derived earliest-start projection in reading order; deterministic elapsed-duration output including `PT0S` for zero offset. |

Forbidden aliases include `rcp`, `lang`, locale maps, `amount`, `item`,
`primitive`, `params`, singular step `technique`, `min`/`max` duration members, `version`, `description`,
`label`, `endpoint`, `until`, and canonical tracks/options/guards/constraints.

Structured readiness conditions are deferred from v1 by ADR-010. Step
instructions remain the source-language location for when a cook advances.
An ingredient named by `formula.terms` cannot also carry explicit `quantity`
(ADR-012); there is no precedence rule between competing authorities.
