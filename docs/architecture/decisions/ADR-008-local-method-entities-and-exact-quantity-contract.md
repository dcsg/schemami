# ADR-008: Local method entities and a deterministic decimal quantity contract

**Date:** 2026-08-10
**Status:** Accepted

**Schemami v1 amendment:** ADR-014 supersedes this ADR's claim that a step is
itself the sole recipe-local action and supersedes ADR-010's readiness deferral.
The local-entity, exact-decimal, quantity, duration, UCUM, evidence, and
diagnostic decisions below remain accepted.

## Context

Schemami must preserve recipes whose techniques and equipment are meaningful
only in their own culinary, editorial, or application context. A fixed global
taxonomy would make the protocol an integrator bottleneck and would turn a
local label into an unsupported claim of universal equivalence.

The Model 1 quantity surface also conflates source wording, a machine unit
identity, ratios, percentages, open quantities, and numeric values. It cannot
support deterministic conversion or honest refusal without an explicit wire contract.

## Decision

1. A recipe MAY declare recipe-local `techniques` and `equipment` collections.
   An entity has an `id` unique in its collection and an authored source-language
   `name`. No central registry, global identifier, or catalog resolution is
   required for its structural validity or rendering. Every recipe-local `id`
   uses lowercase ASCII letters/digits plus `-` and `_`, begins with a letter or
   digit, and matches `^[a-z0-9][a-z0-9_-]*$`. Matching is exact and
   case-sensitive; readers reject uppercase rather than normalizing it. A
   lowercase UUID string is valid but receives no special UUID semantics. A
   recipe-local ID MUST contain at most 128 characters.
2. **Superseded by ADR-014.** Each step is itself a recipe-local action. It requires a recipe-local `id`
   and a source-language `instruction`; it does not require a second action ID,
   primitive reference, primitive version, primitive registry, or primitive
   parameter object. Only explicit structured step fields may supply
   deterministic scheduling or calculation inputs.
3. Local technique/equipment entities do not themselves provide deterministic
   calculation or scheduling semantics. A protocol-governed operation is added
   only when Recipe Calculus defines and consumes that operation's behavior.
4. Elapsed recipe durations use a strict Schemami profile of RFC 5545 section
   3.3.6: positive unsigned `P` day/time/week values such as `PT8M`,
   `PT1H10M`, `P2D`, and `P1W`. Years and months are forbidden. Schemami
   treats `D` and `W` as fixed 86,400- and 604,800-second elapsed values; this
   is a recipe-time semantic profile, not iCalendar calendar arithmetic. A
   duration window uses the full field names `minimum`, `target`, and
   `maximum`; the Model 1 compact grammar (`8m`, `1h10m`) and abbreviated
   `min`/`max` fields are removed.
5. `quantity` is the canonical absolute-amount field; it replaces `amount`. Its
   required `kind` explicitly selects `measured`, `range`, or `open`. A ratio or
   percentage is a grouped formula relationship across ingredients, not a
   scalar quantity kind. Completion remains a separate method condition under
   ADR-014; it is not a quantity kind.
6. Scalar numeric values are canonical decimal strings with at most sixteen
   digits in total (excluding the decimal point and any permitted minus sign)
   and at most four fractional digits. Trailing fractional zeros, exponent
   notation, leading plus, and negative zero are not canonical. Most recipe
   values remain integers; four digits are a precision ceiling, not a display
   instruction.
   When an exact result has more than four fractional digits, it is quantized
   to four places using round-half-to-even. For example, `1.23445` becomes
   `1.2344`, while `1.23455` becomes `1.2346`.
   Public Calculus results use the same decimal form and never expose rational
   numerator/denominator objects.
7. A measured `quantity.unit` contains a pinned UCUM 2.2 unit identity. Only
   explicit same-dimension conversions and Celsius/Fahrenheit are supported in
   v1. Bare regional unit words, formula relationships, unknown units, cross-dimension
   requests, and mass-volume conversion explicitly refuse.
8. A ratio formula stores an ordered list of ingredient terms with positive
   exact-decimal `parts`; `1`, `2`, `2` means and renders `1:2:2`. An optional
   measured target resolves those parts to weights. A percentage formula names
   one ingredient basis and stores percentage points directly: `75` means 75%,
   while `1.8` means 1.8%. It never stores 75% as `0.75`.
9. Import spelling, raw text, confidence, and source location are document-level
   evidence records that target structured fields through RFC 6901 JSON Pointers.
   They are never calculation input.
10. Operation diagnostics have a `status` and standards-shaped problem entries
   with stable `type` URIs and RFC 6901 `pointer`s. Presentation localizes the
   result; it does not alter the deterministic result.

## Consequences

A recipe may be locally expressive without asserting global semantic identity:

```yaml
techniques:
  - id: autolyse
    name: Autólise
equipment:
  - id: banneton
    name: Cesto de fermentação
```

The original candidate represented the step as the local action. ADR-014 now
permits either one direct instruction or ordered structured actions while
retaining the no-registry boundary:

```yaml
steps:
  - id: mix-dough
    instruction: Misture a farinha, a água e a massa-mãe.
    uses: [flour, water, starter]
    equipment: [spiral-mixer]
```

No primitive/action catalog admission is required. An implementation must not
infer operation semantics from `id`, `instruction`, technique, or equipment.

A measured quantity is explicit and exact:

```yaml
quantity:
  kind: measured
  value: "500"
  unit: g
```

A starter build preserves its authored ratio as a group:

```yaml
formula:
  kind: ratio
  terms:
    - { ingredient: starter, parts: "1" }
    - { ingredient: flour, parts: "2" }
    - { ingredient: water, parts: "2" }
  target:
    value: "500"
    unit: g
```

The target contains five total parts, so the exact resolved weights are 100 g,
200 g, and 200 g. Without `target`, the ratio remains valid and renderable but
does not claim absolute weights.

A baker's-percentage formula stores percentage points rather than multipliers:

```yaml
formula:
  kind: percentage
  basis: flour
  terms:
    - { ingredient: flour, percentage: "100" }
    - { ingredient: water, percentage: "75" }
    - { ingredient: salt, percentage: "2" }
  basis_quantity:
    value: "1000"
    unit: g
```

Imported wording can remain auditable without becoming logic:

```yaml
sources:
  - id: original-page
    uri: https://example.org/recipe
evidence:
  - id: imported-ingredient-01
    source: original-page
    pointer: /ingredients/0/quantity
    raw_text: "1 cup flour"
    confidence: "0.81"
```

An ambiguous conversion is machine-readable and presentation-neutral:

```yaml
status: refused
problems:
  - type: https://schemami.dev/problems/ambiguous-unit
    pointer: /ingredients/0/quantity/unit
```

This adds schema and vector work, but avoids a future breaking change caused
by float-dependent behavior, unit ambiguity, or an accidental global method
vocabulary. Presentation may show fewer digits or a more suitable unit; it may
not claim more precision than the canonical value.

## Alternatives considered

### Fixed protocol technique/equipment taxonomy

Rejected. It limits integrators and creates catalogue governance without
evidence that these concepts have universal operational semantics.

### Free-form quantity expressions

Rejected. It would require parsers in deterministic logic and repeats the
prose-as-computation failure this protocol avoids.

### JSON numbers as canonical exact values

Rejected. Their cross-language binary representation and serialization rules
would need a more fragile calculation and hashing contract than decimal strings.

### Rational objects in public results

Rejected. Recipes do not need numerator/denominator output. A deterministic
maximum of four fractional digits is sufficient for recipe quantities and keeps
operation results identical in shape to authored scalar values.

### Inline per-field evidence

Rejected. It mixes source history with semantic recipe values and duplicates
the structure needed for targets, artefacts, and imported spans.

### Human-prose-only errors

Rejected. They are neither deterministic nor presentation-independent.

## References

- ADR-005 — local vocabulary and integrator resolution
- ADR-007 — ingredient-line recipe-local identity
- RFC 6901 — JSON Pointer
- UCUM 2.2
- PRD-007 — Schemami stable protocol release
