# 10 — Diet vocabulary: is there an authority?

**Date:** 2026-08-03 · **Trigger:** Daniel, reviewing SPEC-004 — *"I am not sure
if this diet is the same as for food diet? in books? whats the source of this?
is any food european organization or something? I am used to mediterranea,
keto, paleo, etc."*

**Outcome: the `diet` axis was REMOVED from v0.4.** The question was right and
the vocabulary was wrong. Recorded here so the next attempt starts from
evidence. Appended per repo convention.

## F1 — schema.org is not an authority, and says so itself

- Founded by Google, Bing, Yahoo and Yandex. Its FAQ: *"Schema.org is not a
  formal standards body. Schema.org is simply a site where we document the
  schemas that several major search engines will support."*
- `RestrictedDiet` carries **no `schema:source`** — it cites no external
  authority for its 11 members.
- Google's Recipe structured-data documentation **never mentions
  `suitableForDiet` or `RestrictedDiet`** (verified: 0 occurrences). The
  vocabulary's largest consumer ignores the property.

## F2 — schema.org's maintainers declined the role, on the record

Extension requests (#3176 LowCarbDiet, #3211 LowSucrose/Maltose/Starch) sat
open three years and were closed 2025-12-30. Maintainer reasoning: *"there is a
close to infinite number of diets. Why those in particular and not, say FODMAP
Diet, DASH Diet, Renal Diet..."* and *"each group / medical authority can
define their own Diet and we avoid disagreement and discussions on what diet X
actually means."* The resolution was to widen `suitableForDiet` to accept an
open `Diet` type (shipped v30.0, 2026-03-19) — i.e. to point at external
authorities rather than be one.

## F3 — No authority defines dietary PATTERNS

- **EU:** Art 36(3)(b) of Reg 1169/2011 mandated the Commission to define
  "vegetarian" and "vegan". Fifteen years on it is undelivered; the European
  Vegetarian Union confirms no binding definition exists at EU or member-state
  level. Reg 609/2013 *abolished* the general "particular nutritional uses"
  concept, replacing it with four narrow clinical categories.
- **EFSA FoodEx2:** 29 facets, **none for diet** — it classifies foods.
- **Codex:** CXS 146-1985 covers manufactured foods for clinical conditions and
  enumerates no diets. It does define gluten-free quantitatively (≤20 mg/kg,
  CXS 118) and explicitly delegates halal to importing-country authorities.
- **WHO/FAO:** quantitative recommendations only; *"healthy diets come in many
  forms"*.
- **UNESCO Mediterranean diet:** Representative List of Intangible Cultural
  Heritage (2010, extended 2013 to 7 states incl. Portugal). Designates a
  social practice — *"skills, knowledge, rituals, symbols and traditions"* —
  with no food list and no criteria. Citing it as a technical definition is a
  category error.
- **Mediterranean's only operational definition** is a research instrument:
  MEDAS (PREDIMED, Schröder et al. 2011), 14 items scored 0–14 — measuring a
  *person's adherence*, not a *recipe's conformance*.

## F4 — What IS authoritative (and what it covers)

| Source | Authority | Covers | Count |
|---|---|---|---|
| **EU Reg 1169/2011 Annex II** | binding EU law | allergens only | 14 |
| **ISO 23662:2021** | ISO/TC 34 standard, technical criteria | vegetarian/vegan family only; excludes religion; paywalled | 4 |
| **EU Reg 1924/2006** | binding EU law | nutrition claims with thresholds | 30 |
| **GS1 DietTypeCode** | GS1 standards body | packaged-goods labels; no patterns; category-mixed | 10 |

## F5 — Best available vocabularies, none regulatory

- **ONS** (Ontology for Nutritional Studies) — ENPADASI, an EU consortium of 51
  centres across 9 countries; OBO Foundry, CC BY 4.0. **The only source that
  models diets on explicit axes**: by food organism, by nutritional
  composition, ethnographic, prescribed. Covers Mediterranean, keto, DASH,
  FODMAP, the ovo/lacto matrix, halal, kosher. Cross-references GS1.
- **MeSH** (US NLM) — public domain, stable URIs, real hierarchy; broadest
  pattern coverage (Mediterranean D038441, Keto D055423, Paleo D066046, DASH).
  No halal/kosher, no FODMAP. NLM created and then **obsoleted** a "Dietary
  Patterns" descriptor.
- **SNOMED CT** — covers patterns + religious + FODMAP, but licensing fees
  apply to web applications; carries duplicate concepts. HL7 binds it only at
  **Example** strength, the weakest FHIR offers.

## F6 — The modelling lesson (the reason this can\'t be one flat enum)

"Diet" conflates three claim kinds that behave differently under RCP\'s own
Calculus:

1. **Composition-based** (keto, Mediterranean, low-carb) — recomputable from
   ingredients after scaling.
2. **Organism-based** (vegan, pescatarian) — checkable against ingredient rows.
3. **Ethnographic / certified** (halal, kosher) — **not derivable**; assertable
   only, and the certifying body is the datum that matters.

Two production lessons worth importing when this returns:

- **Encode violations, not suitabilities** (Whisk: `constraints.violates.diets[]`)
  — monotone under substitution, so a swap can only *remove* a violation, never
  fabricate a claim. A positive suitability field has the opposite failure mode.
- **Separate asserted from derived, with four states** (Open Food Facts: vegan /
  maybe vegan / non-vegan / unknown). "Computed and can\'t tell" and "nobody told
  us" are different, and neither is "no". Open Food Facts also models ~22 kosher
  certifiers as child nodes — the certifier as data.

## F7 — Field practice

Tandoor and Mealie, the two most-deployed self-hosted recipe apps, have **no
diet field at all**. Every multi-surface diet vocabulary surveyed (Edamam,
Whisk, Spoonacular) has drifted against itself across its own published
sources. Nobody owns this space.

## Recommendation for the future decision

Do not adopt a flat enum. If the axis returns: anchor exclusions on EU
1169/2011\'s 14 allergens (real law), reference ISO 23662 for the vegetarian
family, use ONS identifiers for patterns, and make the claim KIND first-class
so the Calculus knows what it may recompute and what only a certifier may
assert.
