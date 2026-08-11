# ADR-016: Active-graph, composition, and target-scaling Calculus

**Date:** 2026-08-11
**Status:** Accepted

## Context

ADR-014 accepted authored variation and exact recipe composition. ADR-015 fixed
their wire shapes but froze implementation until operation requests, active
graphs, formula filtering, component scaling, composed scheduling, diagnostics,
and resource behavior were deterministic. Pão de Portugal and Fornada then
reviewed the complete decision set against materially different product
aggregates and agreed on every choice except when branch validity must be
checked. The accepted resolution preserves ADR-014's promise that an inactive
branch cannot hide a broken reachable graph.

## Decision

1. The complete normative behavior and mandatory vectors in
   `docs/product/prds/artifacts/PRD-007/active-graph-composition-calculus.md` are
   accepted as the Schemami v1 Phase 8 Calculus authority.
2. Add public `resolve_selection` beside `scale`, `resolve_formula`,
   `convert_quantity`, `reading_order`, and `schedule`. It returns effective
   selections and active identifiers, never a rewritten recipe.
3. Recipe operations use a closed request containing exactly one `recipe` or
   `bundle`, closed `arguments`, and optional instance-scoped `selections`.
   `component_path` is an ID array from root to component instance. Duplicate,
   unknown, or invalid supplied paths/values refuse. Missing values refuse only
   operations whose result they can affect.
4. Every successful recipe/bundle operation reports JCS-derived exact root
   identity, optional JCS bundle digest, and the effective argument/default
   selection. Standalone quantity conversion has no invented recipe metadata.
   Formula evaluations are present only when formulas are actually evaluated.
5. Selection removes inactive entities, descendant nodes, actions, and incident
   dependency edges. Step flow remains authoritative; action flow is subset
   attribution. Active references to inactive content refuse. Every selected
   preparation/output has at most one producer and every consumed one has
   exactly one.
6. Admission validates all declared content and every distinct reachable active
   graph. Choice/toggle values and exact measurement-threshold boundary/interval
   regions induce finite predicate truth vectors; equivalent active graphs are
   deduplicated. Analysis is exact, cycle-safe, and may refuse only explicitly
   with the existing `resource-limit` identity when accepted budgets are
   exceeded.
7. Formula evaluation computes every authored term and then filters inactive
   input results without redistribution. It reports independently quantized
   authored and selected totals. An inactive percentage basis with another
   active term refuses; a formula with no active terms is not applicable.
8. `scale` accepts exactly one positive decimal `factor` or root
   `formula_target`. Formula targeting requires a positive resolvable selected
   scalar total and compatible measured target. It derives one exact rational
   factor from unquantized values, applies it once across the selected root and
   component instances, and rounds only public results. No residual is assigned
   to an ingredient, so independently quantized lines need not sum byte-for-byte
   to the independently quantized exact target.
9. Component scaling resolves exact loaded bytes, selected child output, and
   positive measured yield. Required amount and yield use exact compatible UCUM
   conversion; range/open, density, mass-volume, missing/mismatched data, and
   cycles refuse. Results carry exact component identity and quantities, never
   rewritten child recipes.
10. Composed reading order and schedule use only selected explicit facts. A
    used child's explicit output producer is placed before/aligned with the
    earliest explicit parent consumer. The final schedule shifts all offsets so
    the earliest begins at `PT0S`. Active unconsumed components remain outside
    the projection and are reported with closed `not-consumed` result entries.
11. `relative_timing` remains validated authored content but never changes v1
    earliest-start schedule. Calendar presentation and a possible future lag
    operation remain outside this release.
12. Independent diagnostics are deduplicated, cascade-suppressed, and sorted by
    ASCII request pointer then type. Phase 8 adds stable binding, inactive
    reference, producer, cycle, and relative-timing problem identities while
    retaining existing `resource-limit` and quantity/reference problems.
13. Conforming implementations support at least 64 recursive levels, 10,000
    evaluated semantic object/reference occurrences, 1,024 bundle documents,
    and 1,024 selected component instances per otherwise-valid request. They may
    support more;
    above the floor, `resource-limit` is an operation outcome rather than a
    document-invalidity claim.
14. Selection and every Calculus result are derived evaluation only. They never
    change recipe/bundle identity, digest, revision, or lineage and never look
    like publishable recipe content.

## Consequences

Pão de Portugal can retain editorial phases and HTTP presentation while
receiving precise active graphs, totals, and composed schedules. Fornada can
retain baking intelligence and execution state while applying the same exact
selection, scaling, and refusal rules. Neither product model enters Schemami.

The admission requirement is intentionally stronger than checking only the
current selection. Authors learn about a broken reachable option before
publication. Finite threshold-region analysis avoids pretending to enumerate an
infinite numeric domain, and explicit resource refusal prevents silent gaps.

Target scaling solves repeating factors such as 400/300 without relaxing the
four-fractional-digit public representation. Exact rationals are internal only;
public totals and lines remain canonical decimal strings.

## Supersession

- ADR-016 closes every Phase 8 item deferred by ADR-014 and ADR-015.
- It supersedes ADR-009 only by adding `resolve_selection` to the public
  operation set and by allowing accepted deterministic variation/composition.
- It extends ADR-011 from root-only selected steps to explicitly composed
  component schedules while retaining earliest-start, no-wall-clock, and no
  inferred-lane semantics.
- It extends ADR-012 from singular formula/factor scaling to ordered formulas,
  typed inputs, inactive-term filtering, exact component instances, and factor
  XOR formula-target scaling. The one-authority and no-precedence rules remain.

## Alternatives rejected

### Validate only the requested active graph

Rejected because it contradicts ADR-014 and would allow a publishable document
to carry a known selectable broken branch.

### Redistribute optional formula terms

Rejected because removing an optional ingredient must not secretly change the
quantities of other inputs.

### Return a resolved or scaled recipe document

Rejected because derived content carrying canonical recipe fields could be
mistaken for a new publishable revision.

### Use rounded factors or assign residual rounding

Rejected because downstream exactness would depend on display quantization and
one ingredient would receive invented quantity.

### Let relative timing alter schedule

Rejected for v1 because calendar placement and elapsed dependency lag are
different contracts; neither may be inferred from editorial phase language.

## References

- ADR-009 — computation and portable-data boundary
- ADR-011 — operation results and earliest-start scheduling
- ADR-012 — formula authority and effective-quantity scaling
- ADR-014 — structured method, variation, composition, and lineage
- ADR-015 — exact structured-method wire and bundle closure
- PRD-007 — Schemami stable protocol release
- SPEC-007 — Schemami v1 stable protocol release
- RFC 8785 — JSON Canonicalization Scheme
- RFC 6901 — JSON Pointer
- UCUM 2.2 — pinned unit identity/conversion profile
