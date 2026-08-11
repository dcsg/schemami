# ADR-010: Defer structured readiness endpoints from Schemami v1

**Date:** 2026-08-11
**Status:** Accepted

## Context

Recipes commonly state a completion condition: dough has risen, a crust is
golden, a syrup reaches a temperature, or a mixture passes a sensory test.
Earlier v1 drafts named an `endpoint` field but never defined its closed value
shape, a standard-backed vocabulary, or a Recipe Calculus operation that
consumes it. Carrying that placeholder into a stable model would either make
free-form prose appear computational or introduce a speculative global
taxonomy.

Step order and step completion are distinct concepts. `after` gives portable
method order, while the source-language `instruction` tells a cook when to
advance. An optional structured `duration` supplies elapsed-time information
for `schedule`; it does not assert readiness.

## Decision

Schemami v1 has no canonical `endpoint`, `until`, sensory-condition, visual
condition, stage, or readiness-condition field. Completion conditions remain
in the step's required source-language `instruction` and do not participate in
Recipe Calculus.

The v1 operation set remains `scale`, `resolve_formula`,
`convert_quantity`, `reading_order`, and `schedule`. A future model may add a
structured readiness feature only with all of the following accepted together:

1. a closed value shape and unambiguous field names;
2. its standards/value-vocabulary basis, including treatment of sensory and
   visual claims;
3. at least one deterministic operation that consumes the structured facts;
4. refusal behavior for unavailable or non-computable conditions; and
5. cross-language conformance vectors.

ADR-010 supersedes the `endpoint` portion of ADR-008 for Schemami v1. It does
not erase the distinction between a quantity and a readiness condition; it
keeps readiness out of the v1 canonical wire until it can be made honest.

## Consequences

A complete v1 step remains readable and actionable:

```yaml
steps:
  - id: bulk-ferment
    instruction: Fermente até aumentar cerca de 50% de volume.
    duration:
      target: PT4H
```

`instruction` communicates the real recipe condition, `duration` is an
optional scheduling estimate, and `after` determines the next step. A reader
must not parse the instruction into a machine condition.

Removing the placeholder prevents a breaking redesign of an underspecified
field before publication. It also means sensor integration, image-derived
readiness, stage labels, and automated condition checking are explicitly
future work rather than v1 claims.

## Alternatives considered

### Measured-only endpoint in v1

Rejected. It would exclude common sensory conditions and still add a field
without a defined v1 operation consuming it.

### Broad condition union in v1

Rejected. Sensory and visual variants would require an unproven vocabulary or
new free-form prose members, recreating registry pressure and ambiguous logic.

### Preserve a permissive extension-shaped endpoint

Rejected. Integrator extensions remain possible under `x-<owner>-*`, but a
canonical field with undefined semantics would falsely appear portable.

## References

- ADR-008 — local method entities and exact quantity contract
- ADR-009 — computation and portable-data boundary
- SPEC-007 — Schemami v1 stable protocol release
