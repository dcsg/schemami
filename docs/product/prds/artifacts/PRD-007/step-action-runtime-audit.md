---
title: "PRD-007 step/action runtime audit"
date: 2026-08-10
status: accepted-evidence
scope: "Model 1 primitive registry, schema, Go/TypeScript Calculus, facts extraction, viewer, and fixtures"
---

# PRD-007 step/action runtime audit

## Finding

The current mandatory primitive reference looks more computational than it is.
No normative Recipe Calculus function branches on a primitive ID. Current
primitive identity primarily supplies a governed display label and registry
admission check.

## Measured surface

- The current seed contains 24 primitive entries.
- 21 of 24 `param_spec` objects define no properties.
- `primitive.mix`, `primitive.mix-machine`, and `primitive.laminate` are the
  only entries with declared parameters; the first two repeat the same
  `speed`/`then_speed` shape.
- The core step schema requires `{primitive: {id, v}}` and delegates `params`
  validation to that registry entry.
- `calculus/SPEC.md`, `tools/rcplint/calc/`, and `tools/viewer/src/calc/` do not
  select behavior by primitive ID. Scheduling derives from explicit step
  dependencies/durations and quantity operations derive from quantity data.
- `tools/rcplint/facts.go` contains two ID-specific profile-fact shortcuts for
  `primitive.cook-custard` and `primitive.laminate`. These are derived reporting
  heuristics outside Recipe Calculus, not a general primitive execution model.
- Viewer rendering uses the registry display name as a fallback action label.
  That is presentation behavior and conflicts with the accepted one-source-
  language/no-translation-registry boundary.
- A repository fixture references `primitive.simmer` even though no matching
  primitive entry exists, demonstrating that the central seed already cannot
  be assumed complete.

## Architectural implication

Removing mandatory primitive registry admission does not remove a proven
deterministic Calculus capability. The Schemami step must instead preserve the
source instruction and carry the explicit structured facts that operations
actually use: dependency, ingredient use/production, duration, temperature,
endpoint, equipment, technique, and constraints.

A protocol-owned operation identity should exist only when a named normative
operation genuinely consumes it. A local action label or step ID must not
silently activate global semantics. Future optional operation definitions can
be added without making v1 capture depend on a complete action catalog.

## Accepted minimum boundary

```yaml
steps:
  - id: mix-dough
    instruction: Misture a farinha, a água e a massa-mãe.
    uses: [flour, water, starter]
    equipment: [spiral-mixer]
    duration:
      target: PT8M
```

The step itself is the recipe-local action entity. It needs no second primitive
ID. Optional local technique/equipment references enrich it; explicit fields
carry deterministic scheduling and calculation inputs. Integrator extensions
remain available under `x-<owner>-*` without changing Schemami behavior.
The later duration decision accepted `PT8M` as a positive elapsed-duration
example; its primary standards-source grammar verification remains a separate
Phase 0 gate.

## Verification commands

```text
rg -n 'primitive|params|ParamSpec|operation' tools/rcplint/calc tools/viewer/src/calc tools/rcplint/facts.go calculus/SPEC.md
rg -n 'primitive:' examples tools/rcplint/testdata -g '*.yaml'
```

Daniel accepted this boundary on 2026-08-10. It is normative through ADR-008
and SPEC-007: the step is the recipe-local action, and a protocol operation may
be introduced later only when Recipe Calculus defines and consumes it.
