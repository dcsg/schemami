# ADR-017: Separate semantic capacity and analysis safety budgets

**Date:** 2026-08-12
**Status:** Accepted

## Context

ADR-016 defined a portability floor using registered semantic object/reference
occurrences and deduplicated completed active graphs. The first three SDK
implementations then proved that this logical count cannot safely bound the
internal work required to discover those graphs for an unrestricted closed
Boolean activation grammar.

A compact activation comparing two fourteen-toggle vectors has only two
completed active graphs and far fewer than 10,000 registered semantic objects,
but an authored-order residual analysis reaches 16,384 distinct partial
states. Treating those internal states as semantic occurrences makes an
algorithm-dependent implementation detail violate the portability definition.
Ignoring them permits CPU or memory exhaustion.

## Decision

1. Keep `semanticOccurrences` as the algorithm-independent logical capacity
   budget. It counts registered protocol objects/references during static
   admission and once in each deduplicated completed active graph in which they
   participate. Partial solver states never consume this budget.
2. Add a separate `analysisStates` safety budget. One analysis state is one
   newly visited canonical residual-analysis state, keyed by the next parameter
   index and the canonical residual vector of every normative activation after
   current bindings are substituted and simplified.
3. Parameter exploration follows authored parameter declaration order after
   removing parameters unused by normative activation sites. Equivalent
   residual states are visited once. Extension content never supplies a
   parameter, threshold, residual expression, or analysis state.
4. The analysis-state counter is request-scoped. Recipe admission uses one
   counter; bundle admission shares one counter across all embedded documents;
   an operation shares one counter across every activation-analysis stage it
   invokes. It is never reset per embedded document or component instance.
5. The Schemami v1 reference SDK profile defaults to 10,000 analysis states.
   Callers may choose a positive lower or higher ceiling. Exceeding it returns
   the existing `resource-limit` identity without claiming the recipe is
   intrinsically invalid and without changing its canonical identity.
6. The analysis-state ceiling is an implementation safety declaration, not a
   portability minimum. Therefore an otherwise-valid request can explicitly
   refuse below the semantic-occurrence floor when its solver complexity
   exceeds the declared analysis-state ceiling.
7. Implementations must still validate every completed reachable graph they do
   discover. They may not silently truncate, skip a graph, reinterpret
   extension content, or charge partial solver states as semantic occurrences.
8. Admission-wide exhaustion returns exactly one `resource-limit` problem at
   the root request pointer. It does not enumerate every descendant that would
   exceed the same exhausted budget. An operation-local exhaustion may instead
   identify the exact operation argument or calculated field that exhausted
   its bounded representation.

## Consequences

Ordinary recipes retain the shared semantic, recursion, bundle-document, and
component-instance capacity floors. Pathological but logically compact Boolean
expressions fail explicitly and safely instead of creating an impossible
unbounded-work guarantee.

Go, TypeScript, and Swift expose the same default SDK profile and deterministic
state definition. Raising `analysisStates` can admit a computationally harder
document without changing its bytes, digest, semantic graph set, or recipe
meaning.

## Supersession

This ADR narrows ADR-016 decision 13 and its Phase 8 resource wording. It does
not change the activation grammar, exhaustive completed-graph validation, the
10,000 semantic-occurrence capacity, or any other Recipe Calculus operation.

## Alternatives rejected

### Restrict the activation grammar

Rejected because fixed parameter/node limits would unnecessarily prevent
integrators from expressing authored recipe conditions that remain safe under
a configurable analysis ceiling.

### Keep one shared counter

Rejected because charging partial solver states as semantic occurrences makes
the published capacity depend on implementation strategy and variable order.

### Promise unbounded analysis below the logical floor

Rejected because arbitrary Boolean analysis can require exponential internal
work even when the number of completed active graphs is small.

## References

- ADR-014 — structured method, variation, composition, and lineage
- ADR-016 — active-graph, composition, and target-scaling Calculus
- PRD-007 Phase 8 active-graph and composition contract
- SPEC-007 Schemami v1 stable release
