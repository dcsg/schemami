# ADR-015: Exact structured method wire and bundle closure

**Date:** 2026-08-11
**Status:** Accepted

## Context

ADR-014 accepted structured method, authored variation, completion,
composition, and lineage, but deliberately left their exact JSON names and
shapes to a separate checkpoint. Review against Pão de Portugal and Fornada
then exposed several places where two conforming implementations could make
different choices: requiredness, action-versus-step resource authority,
inactive dependencies, output yield ownership, extension identity, bundle
closure, section inheritance, and repeated inputs across formula groups.

The wire must close those choices without turning the field register into an
exhaustive matrix or moving application baking intelligence into Schemami.

## Decision

1. The complete shapes and nearest invalid neighbours in
   `docs/product/prds/artifacts/PRD-007/structured-method-wire-proposal.md` are
   accepted as the Schemami v1 wire design. Root `steps` becomes
   `method.sequence`; singular `formula` becomes ordered `formulas`; and the
   lock-only pack becomes one embedded `.schemami-bundle.json`.
2. Requiredness follows one rule: require only members needed to identify an
   object, distinguish its closed kind, make authored content readable, or
   provide the one authority that object promises. All other members are
   optional and absent when unknown. Nulls and empty placeholders never encode
   missing facts. The accepted compact required-field list lives in the Phase
   7 wire artifact and is summarized by the field register; closed JSON Schema
   unions reject members from other kinds.
3. `method.sequence` recursively contains only sections and steps. A section
   requires `kind`, `id`, `name`, and non-empty `sequence`. A step requires
   `kind`, `id`, and exactly one direct `instruction` or non-empty ordered
   `actions`. An action requires `id` and `instruction`. Only steps own `after`
   and `duration`.
4. Step-level `uses` and `produces` are authoritative for inter-step resource
   flow. Action-level resource references are optional fine-grained attribution
   and, when present, must be subsets of their containing step declarations.
   Resource flow never infers a dependency edge.
5. Root `parameters` is a closed union of `choice`, `toggle`, and
   `measurement`. `activation` is a closed recursive union of `choice_is`,
   `toggle_is`, `measurement_compare`, `all`, `any`, and `not`. Only an authored
   default selects implicitly; bindings are execution context, not canonical
   recipe mutation.
6. An ingredient may declare strict symmetric `alternatives` only when every
   option shares one exact quantity/formula/scaling position. Anything needing
   compensation or a method change is an authored branch or a complete derived
   recipe.
7. `completion` is a closed observation/measurement/all/any union. Ordered
   `guidance` contains human-evaluated `cue` plus `instruction`; it has no ID or
   executable effect. An environment measurement contains `name` and `target`
   and has no unused ID. Section `environment` and `relative_timing` describe
   that section only and never implicitly inherit, merge into, or override
   descendant steps.
8. `preparations` are recipe-local intermediate resources and `outputs` are
   externally consumable results. A parent `component` pins an exact child
   recipe and output and declares the amount it needs through exactly one
   authority: explicit quantity or one formula term. The referenced child
   output—not the parent component—may declare measured `yield`; scaling that
   component refuses when yield is absent or incompatible.
9. Every formula has local `id`, closed ratio/percentage semantics, and typed
   ingredient/component inputs. One input may occur in at most one formula and
   cannot also carry explicit quantity. If one culinary ingredient is allocated
   to multiple formula groups, each allocation is a separate recipe-local input
   such as `dough-salt` and `filling-salt`.
10. Phase 8 must define the selected active graph so inactive nodes and their
    edges disappear before method operations. Every active action-list step must
    retain at least one active action, and every consumed preparation or output
    must have exactly one active producer. Missing or multiple active producers
    refuse; resource relationships never silently repair `after` dependencies.
11. A bundle uses `https://schemami.dev/schema/schemami/1/bundle.schema.json`
    and contains exactly the deduplicated transitive component closure for every
    declared branch, not merely one current selection. Root is first and the
    remaining documents use the accepted deterministic tuple order. Duplicate,
    missing, mismatched, or unrelated extra documents are invalid. Lineage
    parents, translations, evidence artifacts, and application overlays are not
    dependency documents.
12. Integrator `x-<owner>-*` values never change protocol validation semantics,
    resolution decisions, or Recipe Calculus. They are nevertheless part of
    canonical JCS bytes, so changing an extension changes the content digest.
    Authored `(collection, id, revision)` and exact-byte digest remain distinct.
13. `lineage.derived_from` is non-executable exact provenance. A direct
    self-reference is invalid. Relative timing cannot anchor a node to itself;
    Phase 8 defines contradiction and cycle diagnostics before implementation.
14. Pão de Portugal and Fornada dogfood against the same committed bytes is the
    first cross-product owner-acceptance milestone before publication. Neither
    application repository is an automated clean-clone conformance input.

## Consequences

The wire stays compact: required members are limited to identity, type,
readability, and promised authority. Partial capture remains valid; missing
optional facts disable only dependent operations. Two integrations can preserve
different domain models while agreeing on canonical recipe facts and protocol
validity.

The stricter flow and formula rules sometimes require explicit duplication. A
shared pantry ingredient used in two formula groups becomes two local
allocations, and action detail cannot contradict its step boundary. This cost is
preferred to hidden summation or competing authorities in v1.

Schema and runtime implementation remain frozen until Phase 8 fixes operation
arguments, active-graph projection, component scaling, result ordering, and
refusal pointers.

ADR-016 now fixes those items and authorizes Phase 9 implementation against the
combined accepted wire and Calculus contract.

## Supersession

- ADR-015 closes the wire choices intentionally left open by ADR-014.
- It supersedes ADR-012 only where ADR-012 assumes singular root `formula` and
  untyped ingredient-only result entries. ADR-012's one-authority,
  no-precedence, exact-scaling invariant remains binding across `formulas`.
- It supersedes the lock-only pack shape in ADR-009 and the unpublished
  candidate while retaining offline-only resolution and exact JCS locks.
- ADR-011 scheduling remains binding after Phase 8 selects the active graph.
- ADR-016 closes the Phase 8 behavior deferred here.

## Alternatives rejected

### Document every optional and forbidden member in a full matrix

Rejected. Closed unions already reject wrong-kind members. A compact required
list plus the absent-when-unknown rule is equally deterministic and easier for
integrators to use.

### Let action and step flow coexist without constraints

Rejected. Two applications could derive different resource graphs from the
same recipe.

### Bundle only the currently selected branch

Rejected. That turns execution context into distribution identity and makes a
supposedly complete export unable to resolve another declared option offline.

### Sum one input across multiple formulas

Rejected for v1. It needs additional allocation, result-ordering, and scaling
semantics. Separate recipe-local occurrences preserve exact authority now.

## References

- ADR-009 — computation and portable-data boundary
- ADR-011 — operation results and earliest-start scheduling
- ADR-012 — formula authority and effective-quantity scaling
- ADR-014 — structured method, variation, composition, and lineage
- ADR-016 — active-graph, composition, and target-scaling Calculus
- PRD-007 — Schemami stable protocol release
- SPEC-007 — Schemami v1 stable protocol release
- RFC 8785 — JSON Canonicalization Scheme
- RFC 6901 — JSON Pointer
