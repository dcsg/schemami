# ADR-011: Operation results and earliest-start scheduling

**Date:** 2026-08-11
**Status:** Accepted

## Context

ADR-009 fixed the five v1 Recipe Calculus operation names and the common
`operation`/`status`/`problems` diagnostic fields, but did not name the success
payload member. `schedule` also lacked an exact projection rule. Implementing
either differently in Go and TypeScript would create an accidental wire
contract.

## Decision

1. Every successful public operation envelope has `operation`, `status: ok`,
   and one operation-specific object named `result`. A refusal has
   `operation`, `status: refused`, and non-empty `problems`; it has no `result`.
   `not_applicable` has no `result` or `problems`. Human prose is never part of
   the machine envelope.
2. `convert_quantity.result.quantity` is a measured quantity containing
   `kind: measured`, canonical-decimal `value`, and the requested UCUM `unit`.
3. `schedule` is an earliest-start projection over explicit `after`
   dependencies. Steps with no dependencies start together at offset zero. A
   dependent step starts at the greatest end offset of its dependencies.
4. A scalar duration supplies its elapsed value. A duration window supplies
   its required `target`; minimum and maximum do not select the planned offset.
   A scheduled step without a scalar duration or target refuses with
   `missing-fact` at that step's duration pointer. Dependency cycles are invalid
   documents and never reach scheduling.
5. `schedule.result.steps` follows normative `reading_order`. Each item has
   `id`, `start`, `duration`, and `end`. These are canonical elapsed-duration
   strings. Output uniquely uses the largest exact week/day/hour/minute units
   in that order, omits zero components, and uses `PT0S` for offset zero.
6. Scheduling has no wall-clock date, locale, track, lane, readiness condition,
   or inferred dependency. Independent steps may overlap; the result makes no
   resource-capacity claim.

## Examples

```json
{
  "operation": "convert_quantity",
  "status": "ok",
  "result": {
    "quantity": {
      "kind": "measured",
      "value": "236.5882",
      "unit": "mL"
    }
  }
}
```

```json
{
  "operation": "schedule",
  "status": "ok",
  "result": {
    "steps": [
      { "id": "mix", "start": "PT0S", "duration": "PT8M", "end": "PT8M" },
      { "id": "rest", "start": "PT8M", "duration": "PT45M", "end": "PT53M" }
    ]
  }
}
```

## Consequences

One stable envelope avoids operation-specific top-level success fields while
letting each operation publish a closed result object. Earliest-start
scheduling remains useful for applications without turning an application
calendar or visual workflow into protocol data.

The accepted decision does not define success payloads for `scale`,
`resolve_formula`, or `reading_order` beyond the common `result` member; their
closed result shapes remain in SPEC-007 and the shared vectors before release.

## Alternatives considered

### Operation-specific top-level fields

Rejected. It would make the envelope inconsistent and make generic result
handling unnecessarily operation-aware.

### Serial declaration-order schedule

Rejected. It would invent dependencies and erase valid parallel work.

### Schedule incomplete steps anyway

Rejected. Treating absent duration as zero would masquerade missing facts as a
calculation.

## References

- ADR-009 — computation and portable-data boundary
- ADR-010 — defer structured readiness endpoints
- SPEC-007 — Schemami v1 stable protocol release
