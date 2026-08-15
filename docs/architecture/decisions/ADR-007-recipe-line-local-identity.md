# ADR-007: Recipe-line identity is the Schemami v1 local vocabulary boundary

**Date:** 2026-08-10
**Status:** Accepted

## Context

ADR-005 removes a central registry as an admission requirement. The first
candidate implementation added a generic recipe-local `terms` catalogue and
had ingredient lines reference it. That duplicates identity: an ingredient
line already needs a local identifier for formula, steps, substitutions, and
application mapping. A second `term` or `item` ID adds indirection without a
proven use case.

Schemami v1 also intentionally defers package vocabularies. It should not
replace central curation with a smaller embedded registry.

## Decision

1. Each ingredient line has one required recipe-local `id`. It is the sole
   Schemami identity for that ingredient in its document and is the target of
   recipe-internal references. No central registry ID, package ID, `item`, or
   secondary generic `term` ID is required or emitted in Schemami v1.
2. Each ingredient line carries required authored source-language `name` for
   readable display. The document's `content_language` applies to that name.
3. An integrator may map the pair `(Schemami document identity, ingredient-line
   id)` to an internal catalog record. That mapping remains application context:
   it is not serialized in the Schemami document and makes no global equivalence
   claim.
4. An ingredient is structurally valid and displayable without any integrator
   mapping. Operations that need absent explicit facts refuse narrowly under
   ADR-005.
5. Schemami v1 does not introduce a generic `terms` catalogue, package-owned
   vocabulary, central-registry admission check, or free-form substitute for a
   stable ingredient-line `id`.

## Consequences

The ingredient shape is short, readable, and self-contained:

```yaml
ingredients:
  - id: farinha-t65
    name: Farinha de trigo T65
    quantity:
      value: 500
      unit: g
```

An ingredient `id` is local to its containing recipe, not globally reusable.
The document identity plus this local identifier is enough for an app mapping
without forcing Schemami to own an ingredient catalogue.

Techniques, equipment, and protocol operations are separate model decisions.
This ADR does not make an arbitrary text name computable, nor does it weaken
the requirement for a standard operation identity where a specific deterministic
operation needs one.

## Alternatives considered

### Generic `terms` catalogue plus references

Rejected. It is an unnecessary embedded registry and duplicates the identity
already required by an ingredient line.

### Inline `item` object with a second ID

Rejected. It supplies two identifiers for one recipe ingredient without a
shown need and retains the Model 1 name associated with central registry
references.

### Bare source name only

Rejected. An app cannot map or a recipe safely reference a mutable display
string.

## References

- ADR-005 — registry-optional local vocabulary and integrator resolution
- ADR-006 — clean Schemami v1 cutover
