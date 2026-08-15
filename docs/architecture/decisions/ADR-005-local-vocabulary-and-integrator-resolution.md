# ADR-005: RCP is registry-optional; vocabulary ownership is local to recipes, packages, and integrators

**Date:** 2026-08-10
**Status:** Accepted

## Context

The current Model 1 repository contains a central seed registry. It is useful
evidence and supplies facts for current examples, but making a centrally
curated ingredient or technique catalog a prerequisite would create a
permanent RCP-maintainer bottleneck. New, regional, private, branded, or
otherwise unfamiliar ingredients and techniques must not be blocked because
they do not yet have an RCP entry.

An identifier alone does not give an importing application knowledge of a
thing. It can identify a recipe-contextual term, while the recipe itself
remains readable from its authored label and explicit structured facts. An app
may recognize and map that term to its own catalog, but this must not rewrite
the source recipe or silently create universally trusted semantics.

## Decision

1. RCP SHALL NOT require a central or RCP-maintained registry entry for an
   ingredient, technique, equipment item, or other domain term to be captured,
   represented, displayed, or structurally validated.
2. A recipe-local term is valid when its identifier is scoped to the recipe and
   its authored source-language label and any facts needed by the recipe are
   carried with that recipe. The exact future wire syntax is deliberately not
   decided by this ADR.
3. A package MAY provide its own reusable vocabulary definitions. An exported
   package that relies on such definitions MUST include them whenever it claims
   offline semantic portability.
4. An integrator MAY map a recipe-local or package-local term to its own
   private identifier. That mapping is an application resolution context, not
   a modification of the source recipe, a new canonical identity, or a global
   claim about equivalence.
5. An optional external reference MAY be added by a later design using
   established URI/IRI semantics. Resolution is never required for display or
   basic structural validity, and unresolved references MUST retain their
   source-label fallback.
6. An unknown or unresolved term MUST disable only operations that require
   missing facts. It MUST NOT invalidate the entire recipe or cause inferred
   ingredient properties, technique semantics, densities, allergens,
   substitutions, or conversions.
7. RCP-governed identifiers are reserved for the small set of protocol
   semantics that RCP itself promises to evaluate deterministically, such as
   quantity shapes, unit identities, dependency semantics, and machine reason
   codes. They are not a global food or technique catalog.

## Consequences

**Good.** Capture is not blocked by central curation. An integrator can add
value through its own catalog mappings, search, localized display, and
evidenced facts without asking RCP to mint or clean global domain entries.
Recipes remain intelligible when moved to an application that lacks the
mapping.

**Honest limit.** A receiving app can render an unknown local term and perform
operations based solely on facts explicitly supplied by the recipe or package.
It cannot safely perform an operation requiring an absent fact. For example,
it may scale `500 g` of an unknown flour, but it must refuse a volume-to-mass
conversion without an applicable, evidenced conversion profile.

**Cross-application behaviour.** Applications can map the same local term to
different internal records. That is presentation/enrichment behaviour, not a
protocol disagreement, provided the original local identity and source facts
remain intact and computation identifies its resolution context.

**Compatibility.** Model 1's existing registry, references, examples, and
validation behaviour remain unchanged. This ADR does not remove the seed
registry, introduce a new schema, or authorize a migration. A later
specification must define any local-definition wire shape, scoping rule,
package closure rule, and operation diagnostic before implementation.

## Alternatives considered

### RCP-maintained global registry as a prerequisite

Rejected. It turns RCP into a global vocabulary-curation service, delays
capture of unfamiliar terms, invites noisy near-duplicates, and makes protocol
progress depend on ongoing catalog cleanup rather than structured evidence.

### Free-form terms with no local identity or structured context

Rejected. They remain readable but cannot be safely referred to, mapped,
resolved, or diagnosed across recipe steps and imports.

### Require every receiving application to resolve an external vocabulary

Rejected. It makes export network- and provider-dependent and silently turns
unknown terms into portability failures.

## Deferred design questions

- What established identifier syntax best represents a recipe-local term?
- Which minimum explicit facts make a local definition self-contained for each
  recipe category?
- How should an operation report the local/package/external resolution context
  and any missing fact?
- When does a package-owned vocabulary merit a self-contained snapshot?

## References

- ADR-004 — presentation-owned translations
- `docs/reports/obsidian/model2-critique/07-discovery-002-results.md`
- `docs/product/prds/PRD-006-rcp-discovery-prototypes.md`
