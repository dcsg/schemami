---
title: "PRD-007 Recipe Calculus operation retention audit"
date: 2026-08-11
status: accepted-baseline-evidence-amended
scope: "Model 1 Calculus specification, Go/TypeScript exports, shared vectors, viewer calls, and Schemami v1 accepted model changes"
---

# PRD-007 Recipe Calculus operation retention audit

## Finding

Model 1 names ten functions as Recipe Calculus operations and has Go and
TypeScript implementations for each. That parity proves implementation
alignment, but not that every exported helper deserves permanent Schemami v1
public API status. Three current operations are internal rules or extension
points, and two rely on Model 1 data shapes that Schemami removes.

## Current evidence

| Model 1 function | Shared vectors | Actual role | Schemami v1 recommendation |
|---|---:|---|---|
| `scale` | 2 | Deep quantity transformation across a recipe/component tree | **Retain and rewrite** with exact decimal strings, grouped formulas, explicit fixed/linear behavior, diagnostics, and no float64. |
| `resolveBases` | 3 | Sums gram amounts selected through role filters and optional components | **Replace**, not port verbatim. Grouped ratio/percentage formulas now name their terms and basis explicitly; a role-derived gram basis would reintroduce hidden semantics and g-only assumptions. |
| `selectGuardPath` | 3 | Selects authored option/guard branches and checks a connected DAG | **Retain if options/guards survive the field register.** It depends on explicit structured fields, not primitive identity. |
| `enforceConstraints` | 3 | Evaluates old ratio/value bounds, renders pt/en reason maps, and calls `minBatchFloor` | **Replace contract, retain capability.** Schemami needs exact typed constraints and stable problems; presentation-owned prose and removed role bases cannot remain in the operation. |
| `minBatchFloor` | 2 | One constraint rule, already invoked inside `enforceConstraints` | **Internalize.** Keep its refusal semantics as part of constraint evaluation/scale, not a separate public operation. The vector writer's named `minBatchFloor` cases currently call the combined enforcement wrapper. |
| `fixedQuantityTransform` | 3 | Per-quantity helper called by `scale` | **Internalize.** Its public export exposes implementation decomposition rather than a user-level protocol operation. Keep conformance cases under `scale`. |
| `reestimateDurations` | 1 | Identity function that returns the input unchanged for every scale factor | **Remove.** “Duration does not scale” is a rule of `scale`, not an operation. A named no-op creates a false capability and speculative extension point. |
| `readingOrder` | 1 | Deterministic component/step reading projection | **Retain as a derived operation** if the product wants cross-app ordering parity; it does not change canonical recipe data. |
| `interleave` | 1 | Deterministic topological lane ordering | **Retain as a derived operation** if tracks remain; it is structured and independent of primitive identity. |
| `schedule` | 4 | Computes duration-window offsets and referenced-preparation placement | **Retain and rewrite** for accepted duration syntax, exact arithmetic, local step actions, and problem envelopes. Rendered schedules remain application views. |

The corpus currently contains 23 vectors across the ten functions. Vector count
is shallow for several operations; retention requires nearest-negative and
cross-language result/refusal vectors, not only preservation of the old count.

## Baseline operation set and ADR-014 amendment

The accepted baseline set was:

1. `scale`
2. `resolve_formula` — replaces role-derived `resolveBases` for explicit ratio
   and percentage groups
3. `convert_quantity`
4. `reading_order` — deterministic dependency-respecting linear projection;
   declaration order breaks ties
5. `schedule`

These five tokens remain accepted. ADR-016 completes the design checkpoint and
adds `resolve_selection` as the sixth public token. It pins closed requests,
instance-scoped selections, reachable active graphs, results, refusals,
component composition, target scaling, and mandatory shared vectors.
Go/TypeScript language-level function names may use their native conventions
while emitting an accepted token.

## Explicitly non-public

- Per-quantity transform helpers.
- A no-op duration re-estimation operation.
- Human-text rendering helpers.
- Registry resolution, primitive lookup, translation, presentation rounding,
  or app catalog mapping.
- Any operation inferred from step instructions, technique names, equipment
  names, or local-ID spelling.

## Accepted owner decisions

- Typed source-authored choices and conditional activation are required by
  ADR-014; arbitrary expressions and the old Model 1 guard/constraint wire do
  not return automatically.
- `reading_order` is normative; tracks and `interleave` are application-owned.
- `scale` supports only `linear` and `fixed`; unknown extension-defined scaling
  stays valid as data but refuses when core behavior is requested.
- Problem type URIs are absolute under `https://schemami.dev/problems/`.

ADR-009 governs the retained baseline operations. ADR-014 reopened only the
variation/composition boundary, and ADR-016 is the accepted Calculus checkpoint
that closes it.
