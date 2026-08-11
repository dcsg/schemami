# SPEC-009 Swift model coverage inventory

**Date:** 2026-08-11  
**Phase:** 1  
**Result:** no unsupported Schemami v1 JSON field

## Representation rule

`ParsedDocument` retains two independent representations:

- immutable exact `submittedJSON` bytes;
- an ordered `SchemamiValue` tree preserving every admitted member, array order,
  scalar type, and `x-*` extension.

Typed views are projections over that retained tree. They cannot discard or
re-encode away unfamiliar extension content. Their initializers are internal so
applications cannot create an admitted value by bypassing validation.

## Explicit tagged unions

Every `oneOf` family in `schemami-v1-core.schema.json` has an explicit Swift
authority boundary:

| Schema family | Swift type | Cases/authority |
|---|---|---|
| `measurement` | `Measurement` | measured, range |
| `quantityGuide` | `QuantityGuide` | measured, range |
| `quantity` | `Quantity` | measured, range, open |
| `ingredient` | `Ingredient.Identity` | source-language name or strict alternatives |
| `parameter` | `Parameter` | choice, toggle, measurement |
| `activation` | recursive `Activation` | choice, toggle, comparison, all, any, not |
| `completion` | recursive `Completion` | observation, measurement, all, any |
| `step` content authority | `MethodStep.Content` | instruction or ordered actions |
| `methodNode` | recursive `MethodNode` | section or step |
| `formula` | `Formula` | ratio or percentage |

The structured Phase 9 fixture proves parameter, quantity, activation, formula,
recursive method, action, and recursive completion cases in one typed projection.

## Complete document surface

`Recipe` projects every top-level normative field: identity, content language,
title, notes, origin, parameters, ingredients, components, preparations, outputs,
techniques, equipment, formulas, recursive method, lineage, sources, evidence,
external references, and extensions.

`RecipeBundle` projects the exact root reference, ordered embedded documents,
per-document digests, embedded typed recipes, and extensions.

Non-union object families—including named entities, equipment, alternatives,
references, guidance, environment, relative timing, components, preparations,
outputs, sources, evidence, origin, and lineage—use `SchemamiObject`. This is a
typed retained object view with exact member access, common `id`/`name`/`kind`
accessors, and extension access. Additional convenience structs may be added
without changing admission or wire behavior; no current field is inaccessible or
discarded.

## Phase boundary

Phase 1 performs strict JSON and JSON Schema structural projection internally.
It intentionally does not expose an `AdmittedRecipe` or public `admit` result yet:
semantic active-graph admission and canonical identity are Phase 2 and must be
implemented together so a schema-only result cannot masquerade as full admission.
