# Standards-first guidance

**Purpose:** Prevent accidental invention of interoperable syntax while
recognising that an external standard can be incomplete or inappropriate for a
recipe-domain meaning.

## Rationale

Standards are not a binary label that can be guessed from a familiar name. A
candidate may be authoritative for a different concern, have no usable
canonical form, or erase meaning RCP needs to preserve. Conversely, freeform
values make every implementation guess and prevent independent readers from
agreeing.

This guidance therefore requires an explicit fit assessment. It prefers the
standard only for the precise semantics it actually governs, and preserves an
RCP-specific model where the standard does not cover the required culinary
meaning.

## Rules

1. Before introducing an interoperable value or operation, the design MUST
   identify the relevant established standard or registry and its canonical
   representation, if one exists.
2. The design MUST record why the selected standard fits the required
   semantics, including its authority, version or registry, canonicalisation,
   and any important limits.
3. An RCP-specific representation MUST be introduced only when the assessment
   records the standard considered, the semantic gap, the smallest extension,
   and its migration/interoperability impact.
4. A design MUST NOT call a shallow regular expression, familiar spelling, or
   informal external label “standard validation.” Validation is only as strong
   as the selected standard's actual grammar, registry, and canonicalisation
   rules.
5. Once selected, a standard-backed field or operation MUST use the
   standard's canonical representation in normative data and conformance
   vectors.

## Examples

### Correct

```json
{
  "source_language": "pt-PT",
  "origin": { "country": "PT" }
}
```

`source_language` uses the BCP 47 language tag for Portuguese as used in
Portugal. `origin.country` uses ISO 3166-1 alpha-2 for the distinct fact of
where a recipe originates. The model does not use one field to mean both.

### Incorrect

```json
{
  "language": "Portugal Portuguese",
  "country": "pt_PT"
}
```

These freeform and non-canonical forms make matching ambiguous and conflate
language variety with country.

## When NOT to apply

This guidance does not require RCP to force culinary, recipe-contextual
semantics into an external ontology merely because the ontology exists. It
requires documenting that mismatch before retaining or creating the
RCP-specific representation.

---

*Created by edikt:guideline — 2026-08-10*

<!-- Compiled directives live in the co-located standards-first.edikt.yaml sidecar. edikt never writes to this .md — edit prose only; run /edikt:guideline:compile to regenerate the sidecar. -->
