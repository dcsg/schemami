# ADR-014: Structured method, variation, composition, and lineage

**Date:** 2026-08-11
**Status:** Accepted

## Context

The unpublished Schemami v1 candidate deliberately reduced a method to one
ordered `steps` array and placed readiness inside `instruction`. Complete-recipe
dogfood falsified that boundary. Pão de Portugal has 117 authored stages, 226
named actions, 37 conditional sensory cues, conditional schedules, and method
phases such as “Na véspera”. Fornada independently confirmed that application
execution policy belongs outside the protocol while recipe structure and exact
application projection must remain distinguishable.

Flattening sections, actions, alternatives, prerequisites, and completion
conditions into prose loses culinary meaning and forces every integrator to
invent an incompatible overlay. Conversely, a free-form expression language or
arbitrary conditional JSON would make identical documents behave differently.
The stable boundary therefore needs typed recipe structure and deterministic
refusal without parsing prose or introducing a central registry.

## Decision

1. A recipe method is a recursive authored tree. The root and every section use
   an ordered collection named `sequence`. Its only member kinds are `section`
   and `step`. Recursion has no arbitrary schema depth limit; implementations
   may refuse pathological input with `resource-limit`.
2. Sequence order is authored reading order, not an inferred dependency.
   Explicit step dependencies determine execution order and permit independent
   preparations to overlap.
3. A step is the only dependency and scheduling unit. It carries exactly one of
   a direct source-language instruction or a non-empty ordered action list. An
   action is structured execution detail inside its step and may carry local
   identity, instruction, techniques, completion, and evidence, but no
   independent dependency or scheduling duration. Work needing independent
   scheduling is represented as another step.
4. Recipes may declare typed recipe-local decision inputs: one-of choices,
   toggles, and UCUM measured values. A closed predicate vocabulary may activate
   ingredients, referenced components, equipment, sections, steps, and actions.
   Arbitrary expressions, prose predicates, JavaScript, and integrator-defined
   operators are forbidden. Exact field names other than the accepted
   `sequence` name are fixed by the subsequent wire-design checkpoint.
5. Missing selections never acquire an implicit first-option or application
   default. All alternatives remain displayable; an operation needing an
   unresolved selection refuses with a stable pointer-specific problem. A
   default is canonical only when the source explicitly authors it.
6. Selecting a source-authored option is resolution/execution context and does
   not change recipe identity. Source-authored optional ingredients, strict
   substitutions, conditional methods, and alternative schedules remain in the
   same recipe. A user or application change outside those declared options
   creates a complete new recipe document with exact lineage; lineage is not a
   runtime patch chain.
7. A strict substitution replaces exactly one ingredient and preserves its
   resolved quantity, unit, formula participation, and scaling behavior. It
   cannot alter any other canonical node or trigger ingredient, method,
   equipment, or timing recalculation. Anything broader is an authored
   alternative branch or a separate derived recipe.
8. Completion is structured separately from planning duration. Completion may
   be a human-authored observation, a typed measurement, or a closed `all`/`any`
   composition. Human observations remain human-evaluated; no validator or
   Calculus function parses them or claims sensor truth. Duration remains the
   deterministic planning estimate/window consumed by scheduling.
9. Method phases may carry authored relative timing. Elapsed lead time uses the
   accepted RFC 5545-shaped duration profile. Relative calendar-day semantics
   remain distinct from fixed elapsed `P1D`; an application supplies event date,
   timezone, and presentation. A label such as “Na véspera” never creates
   timing semantics by itself.
10. Recipe-local intermediate resources connect preparation through explicit
    `uses` and `produces` relationships. The protocol never infers flow from
    ingredient names or prose.
11. A recipe may reference another exact Schemami recipe as a component by
    `(collection, id, revision, JCS SHA-256 digest)`. Cross-recipe scaling is
    supported only when the reference declares a required output and the target
    recipe declares a compatible measured yield; otherwise dependent operations
    refuse. Runtime resolution uses exact loaded bytes and never a registry or
    network search.
12. A complete portable export is one self-contained JSON bundle containing the
    locked recipe documents required for offline resolution. Each document keeps
    its independent canonical bytes and digest. Missing referenced bytes do not
    erase display fallback, but disable only dependent logic.
13. Validation covers every declared option and every reachable resolved graph.
    Inactive content cannot hide broken references, dependency cycles, invalid
    quantities, or malformed method structure. Pathological combination counts
    may refuse with `resource-limit`; they are never silently skipped.
14. Evidence may target any exact section, step, action, completion condition,
    choice option, conditional ingredient, substitution, lineage reference, or
    component reference through RFC 6901.
15. Timer policy, notification behavior, execution-session state, user
    reminders, UI grouping preferences, and wall-clock event instances remain
    application-owned and never affect canonical recipe identity.
16. Explicitly authored culinary environment facts remain recipe facts. A
    source statement such as cold fermentation, refrigerator location, target
    temperature, or ambient fermentation must be preserved when represented;
    biological models, adjustment formulas, recommendations, and live measured
    bake context remain application-owned. An adapter must not promote an
    application workflow `stepType` to a Schemami technique unless the source
    explicitly authors that culinary technique.

## Consequences

A simple step remains concise:

```json
{
  "kind": "step",
  "id": "mix",
  "instruction": "Misture todos os ingredientes."
}
```

A structured source may preserve sections and actions without making actions a
second scheduler:

```json
{
  "method": {
    "sequence": [
      {
        "kind": "section",
        "id": "previous-day",
        "name": "Na véspera",
        "sequence": [
          {
            "kind": "step",
            "id": "prepare-levain",
            "actions": [
              {
                "id": "feed-starter",
                "instruction": "Refresque a massa-mãe."
              },
              {
                "id": "wait-for-peak",
                "instruction": "Deixe a cultura desenvolver-se."
              }
            ],
            "duration": {"target": "PT8H"}
          }
        ]
      }
    ]
  }
}
```

ADR-015 closes the public field names, requiredness, closed unions, predicate,
lineage, formula, resource, bundle, and digest shapes. ADR-016 closes the
resolved-result and Calculus operation behavior required before schema code
changes.

## Supersession

- ADR-014 supersedes ADR-008 only where ADR-008 says a step is itself the sole
  recipe-local action and carries all instruction directly.
- ADR-014 supersedes ADR-009 only where ADR-009 excludes options/guards and
  freezes the operation set before deterministic recipe resolution.
- ADR-014 fully supersedes ADR-010’s deferral of structured readiness.
- ADR-011’s duration-based earliest-start schedule remains valid after the
  recipe is deterministically resolved; completion does not silently become a
  schedule input.

All other local-identity, exact-decimal, quantity, UCUM, evidence, diagnostic,
registry-free, and clean-cutover decisions remain binding.

## Alternatives rejected

### Keep all structure in prose

Rejected. It loses repeatable action, condition, phase, alternative, and
evidence boundaries and makes reconstruction depend on an LLM or app overlay.

### Let integrators define arbitrary conditional expressions

Rejected. Integrators may define recipe-local IDs and option values, but not
new predicate semantics. Portable behavior requires a closed grammar and shared
Calculus vectors.

### Treat every changed ingredient as a substitution

Rejected. Sweetness, bulk, hydration, fermentation, and method compensation
cannot be inferred. Only exact same-quantity one-node replacement earns the
substitution name.

### Store derived recipes as patches

Rejected. Patch chains make a recipe depend on mutable ancestry. A derived
recipe is a complete document whose lineage is provenance, not executable data.

## References

- ADR-005 — local vocabulary and integrator resolution
- ADR-008 — local method entities and exact quantity contract
- ADR-009 — computation and portable-data boundary
- ADR-010 — readiness deferral, superseded by this decision
- ADR-011 — operation results and earliest-start scheduling
- ADR-013 — dogfood corrections and source selectors
- ADR-015 — exact structured method wire and bundle closure
- ADR-016 — active-graph, composition, and target-scaling Calculus
- Pão de Portugal SPEC-014 complete-method feedback
- Fornada Schemami v1 adapter experiment
- RFC 5545 section 3.3.6 — duration syntax basis
- RFC 6901 — JSON Pointer
- RFC 8785 — JSON Canonicalization Scheme
