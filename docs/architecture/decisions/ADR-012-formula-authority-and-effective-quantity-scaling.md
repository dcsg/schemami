# ADR-012: Formula authority and effective-quantity scaling

**Date:** 2026-08-11
**Status:** Accepted

## Context

The initial Schemami fixture allowed one ingredient to carry an explicit
`quantity` while also appearing in the document's formula. Those two
authorities could disagree. Neither validation nor Calculus had a principled
way to choose one without silently changing the recipe.

`scale` also needs a useful result that does not emit a modified canonical
recipe carrying unchanged identity and revision fields.

## Decision

1. An ingredient that appears in `formula.terms` MUST NOT carry an explicit
   `quantity`. Its absolute quantity, when resolvable, comes only from the
   formula. An ingredient outside the formula MAY carry an explicit quantity.
2. `resolve_formula.result.quantities` is an ordered array following formula
   term order. Each entry has `ingredient` and measured `quantity`.
3. A ratio formula requires measured `target` to resolve absolute quantities.
   A percentage formula requires measured `basis_quantity`. Missing anchors
   preserve a valid/renderable formula but `resolve_formula` and formula-based
   `scale` refuse with `missing-fact` at the missing anchor pointer.
4. `scale` takes one positive canonical-decimal factor and returns
   `result.quantities`, ordered by the recipe's ingredient declaration. Each
   entry has `ingredient` and the effective scaled `quantity`; it does not
   return or mutate a canonical recipe document.
5. Formula quantities are resolved from the exactly scaled anchor. Explicit
   measured and range quantities scale exactly. `scaling: fixed` measured
   quantities and fixed formula anchors remain unchanged. Open quantities
   remain open and are returned without inventing a scalar.
6. An ingredient with neither formula authority nor an explicit quantity makes
   `scale` refuse with `missing-fact`. Scaling never converts units or reads
   prose/evidence.

## Consequences

There is one authority for every effective quantity and no precedence rule:

```yaml
ingredients:
  - { id: flour, name: Farinha }
  - { id: water, name: Água }
formula:
  kind: percentage
  basis: flour
  terms:
    - { ingredient: flour, percentage: "100" }
    - { ingredient: water, percentage: "75" }
  basis_quantity:
    kind: measured
    value: "500"
    unit: g
```

Resolving returns 500 g flour and 375 g water. Scaling by `"2"` returns
1000 g flour and 750 g water without creating a second recipe identity.

## Alternatives considered

### Prefer explicit quantity over formula

Rejected. A conflict would silently discard authored formula semantics.

### Prefer formula over explicit quantity

Rejected. It would silently discard an authored absolute quantity.

### Return a complete scaled recipe document

Rejected. Changed content with the original document identity and revision
would look publishable while violating immutable identity semantics.

## References

- ADR-008 — local method entities and exact quantity contract
- ADR-009 — computation and portable-data boundary
- ADR-011 — operation results and earliest-start scheduling
- ADR-015 — plural typed formulas partially supersede this wire shape while retaining its one-authority invariant
- SPEC-007 — Schemami v1 stable protocol release
