# Recipe Format & Protocol Standards — Prior Art Survey

> Research for the universal recipe protocol. Every claim below was verified against the cited
> source on 2026-08-02 unless explicitly marked **unverified**. Where a snippet is illustrative
> (reconstructed from a verified field list rather than copied verbatim), it is marked
> *illustrative*.

---

## A. Existing recipe formats and standards

### A.1 schema.org/Recipe (JSON-LD) — the de-facto web standard

- **Source:** https://schema.org/Recipe
- **Purpose:** SEO/structured-data markup so search engines can render rich recipe cards. Not
  designed as an application interchange format — it is a *publishing annotation* vocabulary.
- **Structure:** `Recipe` subclasses `HowTo` subclasses `CreativeWork`. Recipe-specific
  properties (verified against schema.org): `cookTime` (ISO-8601 Duration), `cookingMethod`
  (Text), `nutrition` (NutritionInformation), `recipeCategory`, `recipeCuisine`,
  `recipeIngredient` (Text — this is the killer: ingredients are *free-text strings*),
  `recipeInstructions` (Text / ItemList / CreativeWork — in practice a list of `HowToStep`),
  `recipeYield` (QuantitativeValue or Text), `suitableForDiet` (RestrictedDiet). Inherited from
  `HowTo`: `prepTime`, `totalTime`, `tool` (HowToTool), `supply` (HowToSupply), `step`,
  `estimatedCost`. Inherited from `CreativeWork`: `author`, `datePublished`, `image`,
  `description`, `isBasedOn` (useful for provenance/forking), `keywords`.
- **Example:**

```json
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Broa de Milho",
  "recipeYield": "2 loaves",
  "totalTime": "PT4H",
  "recipeIngredient": ["500 g corn flour (fine)", "250 g rye flour T130", "water"],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "Scald the corn flour with boiling water." },
    { "@type": "HowToStep", "text": "Knead in the rye flour and ferment 3 h." }
  ]
}
```

- **Strengths:** Universal adoption — effectively every recipe site emits it; Google requires it
  for rich results. Any URL-ingestion pipeline **must** parse it (libraries:
  `recipe-scrapers`, `extruct`). Nextcloud Cookbook uses it verbatim as its storage format.
- **Fatal limitations (verified against the property list):**
  - `recipeIngredient` is a bag of display strings. **No structured quantity/unit/food split.**
  - **No step↔ingredient linkage** — nothing connects "the flour" in step 2 to the ingredient line.
  - **No substitutions**, no alternatives, no "or".
  - **No scaling semantics** — no pivot quantity, no baker's percentages, no per-yield variants.
  - **No sub-recipes / components** (no way to say "one batch of [other recipe] as an ingredient";
    `isBasedOn` is provenance, not composition).
  - Equipment only via the vague `tool`/`supply` HowTo props, which recipe sites essentially never emit.
  - **No sensory endpoints** ("until doubled", "windowpane", target temp/pH) — steps are prose.
- **Adoption:** ubiquitous (publishing). **License:** schema.org terms (CC BY-SA 3.0 for the
  vocabulary docs; using the vocabulary is unencumbered).
- **Versioning model:** schema.org never versions instance documents; terms enter via a
  `pending` staging area and are effectively never removed, only superseded — an additive-only
  evolution policy (https://schema.org/docs/howwework.html). Consumers are told to use
  unversioned term URLs. This "grow, never break" posture is worth copying.

**Verdict for us:** the *import/export lingua franca*, never the internal model.

### A.2 h-recipe / hRecipe (microformats)

- **Source:** https://microformats.org/wiki/h-recipe
- HTML class-based markup (microformats2): `p-name`, `p-ingredient` (repeatable, plain text),
  `p-yield`, `e-instructions`, `dt-duration`, `u-photo`; experimental `p-nutrition`,
  `p-category`. Backward-compat parsing of classic hRecipe (`fn` → `p-name`).
- **Example (from the spec):**

```html
<article class="h-recipe">
  <h1 class="p-name">Bagels</h1>
  <ul><li class="p-ingredient">Flour</li></ul>
  <div class="e-instructions">…</div>
</article>
```

- **Status:** draft, "implemented in the wild" (Pinterest historically). Strictly weaker than
  schema.org JSON-LD; same free-text ingredient problem. **Relevance to us:** parse it as a
  fallback during URL ingestion; nothing to learn for the protocol itself.

### A.3 Cooklang — the human-authoring DSL

- **Source:** https://cooklang.org/docs/spec/
- **Approach:** recipes are Markdown-like prose; machine data is *inline annotations*:
  - Ingredient: `@salt`, `@ground black pepper{}`, `@potato{2}`, `@bacon strips{1%kg}`,
    fractions `@syrup{1/2%tbsp}`.
  - Cookware: `#pot`, `#potato masher{}`.
  - Timers: `~{25%minutes}`, named `~eggs{3%minutes}`.
  - Metadata: YAML front matter between `---` delimiters.
  - Comments `-- …` / `[- … -]`; notes as `>` blocks; sections `= Section Name =`;
    inline preparations `@onion{1}(peeled and finely chopped)`.
  - **Sub-recipe references:** `@./sauces/pesto{2%tbsp}` — relative path to another `.cook` file.
- **Example:**

```cooklang
---
title: Broa de Milho
servings: 2
---
= Escaldar =
Scald @corn flour{500%g} with @boiling water{400%ml} in a #large bowl{}.

= Amassar =
Knead in @rye flour T130{250%g} and rest for ~{180%minutes}.
```

- **Strengths:** the single best *authoring* UX in the field — the recipe stays readable prose;
  step↔ingredient linkage is **free** (the ingredient literally lives inside the step); qty/unit
  are structured; timers and cookware are first-class; git-friendly plain text; healthy OSS
  ecosystem (CookCLI, iOS app, many parsers — cooklang.org).
- **Limits (verified: the spec has no constructs for these):** no substitutions; no scaling
  semantics beyond re-multiplying servings; no per-ingredient totals across steps (must be
  computed); no structured sensory endpoints; metadata schema is open-ended (no validation);
  no identity/canonical ingredient IDs — `@rye flour T130` is just a string; no ranges
  ("2–3 cloves") in the core grammar.
- **License:** spec and tooling are open source (MIT — cooklang GitHub org). Adoption: niche but
  real and growing among plain-text/self-hosting users.

**Verdict:** steal the *step-embedded ingredient reference* idea (as data-model structure, not
necessarily as syntax) and possibly support `.cook` as an authoring input.

### A.4 RecipeMD

- **Source:** https://recipemd.org/specification.html (spec v2.4.0, Feb 2024)
- CommonMark Markdown with a rigid structure: H1 title → description → *italic tags* /
  **bold yields** → `---` divider → ingredient list (amounts in italics, supports vulgar
  fractions like ½) → `---` → free-text instructions. Ingredient names may be Markdown links
  (that's their sub-recipe/linking story).
- **Example:**

```markdown
# Guacamole
*sauce, vegan*

**4 Servings, 200g**

---

- *2* avocados
- *1/2* lemon

---

Mash everything.
```

- **Limits (per spec):** no nutrition, minimal metadata, unstructured instructions, no
  step-ingredient links, no substitutions. **Verdict:** proof that Markdown-with-conventions is
  parseable but too weak; nothing to adopt beyond "amounts support unicode fractions".

### A.5 Open Recipe Format (ORF)

- **Source:** https://github.com/techhat/openrecipeformat (docs:
  https://open-recipe-format.readthedocs.io/)
- YAML, aimed at professional kitchens. Keys include `recipe_name`, `ingredients`, `steps`,
  `yields`, `notes`. Distinctive verified features: **each ingredient carries an `amounts` list**
  (multiple amount entries for multiple yields), explicit `unit` even for count (`each`),
  **`substitutions`** with their own amounts, `processing` states (diced, raw …), **`usda_num`**
  links to the USDA nutrition DB, and HACCP food-safety annotations.
- **Example (structure per walkthrough):**

```yaml
recipe_name: Pão de centeio
yields:
  - servings: 1
ingredients:
  - rye flour T130:
      amounts:
        - amount: 500
          unit: grams
      substitutions:
        - rye flour T85:
            amounts:
              - amount: 500
                unit: grams
steps:
  - step: Mix and ferment overnight.
```

- **Adoption:** essentially dead (moderate GitHub interest, ~151 stars; no ecosystem).
- **Verdict:** the *ideas* — substitutions-with-amounts, USDA linkage, multi-yield amounts —
  are exactly right; the execution (awkward YAML shape: ingredient-name-as-key, amounts tied to
  yield indices) is why it went nowhere. Steal concepts, not shape.

### A.6 RecipeML (XML, legacy)

- **Source:** https://en.wikipedia.org/wiki/RecipeML, http://www.formatdata.com/recipeml/
- Created 2000 by FormatData (né DESSERT). XML with structured `<amt><qty><unit>` ingredient
  markup enabling unit conversion; Dublin Core metadata. Adoption limited (Largo Recipes);
  effectively abandoned. RecipeML required a license agreement to use the DTD (royalty-free but
  agreement-encumbered) — **unverified detail**, commonly cited as an adoption barrier.
- **Verdict:** historical evidence that (a) structured qty/unit was solved 25 years ago and
  (b) XML + licensing friction kills grassroots formats.

### A.7 MealMaster and MasterCook (.mxp / .mx2) — legacy plain-text/XML

- **Sources:** https://support.mastercook.com/hc/en-us/articles/29711288560020-MXP-Files,
  https://github.com/jgreely/mastercook-tools, http://recipetools.gotdns.com/
- **MealMaster:** fixed-column plain text export (`---------- Recipe via Meal-Master (tm) …`,
  `Title:`, `Categories:`, `Yield:` then columnar qty/unit/ingredient lines) — *format details
  partially unverified; reconstructed from converter docs*. Huge 1990s Usenet recipe archives
  exist in it.
- **MasterCook MXP:** text export; **MX2** (MasterCook 5, 1999): "not quite XML — close, but
  several errors, and the DTD included with the software is just plain wrong"
  (jgreely/mastercook-tools). **Verdict:** import targets only, and cautionary tales — a format
  defined by one app's exporter, with no validating spec, rots.

### A.8 Paprika (.paprikarecipes)

- **Sources:** https://movemyrecipes.com/blog/breaking-free-from-paprika-what-paprikarecipes-files-actually-are,
  https://github.com/bojanrajkovic/paprika-exporter,
  https://yabukurosawa.wordpress.com/2012/09/30/paprika-recipe-manager-for-ipad-export-format/
- ZIP of per-recipe **gzip-compressed JSON**. Fields: `name`, `ingredients` (newline-separated
  *text*), `directions` (text), `prep_time`, `cook_time`, `servings`, `source`, `source_url`,
  `categories`, `rating`, `notes`, `nutritional_info`, `image_url`. No published spec; no other
  app adopted it natively.
- **Verdict:** the most popular *consumer* recipe manager stores ingredients as flat text —
  evidence that consumer apps got away without structure, and why none of them can do real
  scaling/substitution. Import target only.

### A.9 Crouton (.crumb)

- **Source:** community schema gist —
  https://gist.github.com/LukeChannings/11ba3649bcb9b9086e3e271c7c3e950d
- UTF-8 JSON per recipe. Verified fields: `name`, `uuid`, `serves`, `duration`,
  `cookingDuration`, `webLink`, `notes`, `folderIDs`, `images` (base64 PNG). Ingredients are
  objects: `{ quantity: { quantityType }, ingredient: { name, uuid }, order, uuid }` with
  `quantityType` a **closed enum**: `ITEM, TABLESPOON, TEASPOON, CUP, MILLS, GRAMS, KGS, POUND,
  OUNCE, LITRES, DECILITER, BOTTLE, PINCH, CAN, BUNCH, PACKET, SECTION`. Steps:
  `{ step, order, uuid }`.
- **Verdict:** structured, but the closed unit enum (`BOTTLE`, `CAN`, `PINCH` as *units*) shows
  what happens without a units standard. UUIDs on every entity is the right instinct.

### A.10 Mela (.melarecipe)

- **Source (official!):** https://mela.recipes/fileformat/index.html
- JSON. Verified fields: `id` (URL-without-scheme for imported recipes, else UUID — a nice
  provenance-as-identity trick), `title`, `text`, `ingredients` (**newline-separated string**,
  Markdown links + `#` group titles), `instructions` (Markdown string), `categories`, `images`
  (base64), `yield`, `prepTime`/`cookTime`/`totalTime`, `link`, `notes`, `nutrition`,
  `favorite`, `wantToCook`, `date` (seconds since 2001-01-01 UTC — Apple epoch).
- **Verdict:** beautifully documented, deliberately *unstructured* (Markdown strings). Import
  target; the "id = source URL" idea is worth noting for dedupe.

### A.11 Tandoor Recipes (open source, Django) — closest battle-tested relational model

- **Source (verified from `cookbook/models.py`):**
  https://github.com/TandoorRecipes/recipes/blob/develop/cookbook/models.py
- Model graph: `Recipe` (`name`, `description`, `servings`, `servings_text`, `working_time`,
  `waiting_time`) → M2M `steps` → `Step` (`name`, `instruction`, `time`, `order`,
  **`step_recipe`** FK enabling sub-recipes) → M2M `ingredients` → `Ingredient`
  (**`food` FK, `unit` FK, `amount` Decimal, `no_amount` bool, `order`**).
  `Food` is a **tree** (TreeModel) with `substitute` self-referential M2M plus
  `substitute_siblings` / `substitute_children` flags (substitution via taxonomy proximity!),
  `preferred_unit`, `preferred_shopping_unit`, inheritance fields. `Unit` has `name`,
  `plural_name`, `base_unit`, `open_data_slug`; **`UnitConversion`** (`base_amount`,
  `base_unit`, `converted_amount`, `converted_unit`, optional `food` FK) — i.e.
  **food-specific density conversions** (cups→grams per food).
- **Verdict:** the richest open model in the wild. Steal: ingredient = (amount, unit, food,
  note) quadruple; `no_amount`; step-scoped ingredients; `step_recipe` sub-recipes; food
  taxonomy with sibling/child substitution; food-scoped unit conversion.

### A.12 Mealie (open source, Pydantic/SQLAlchemy)

- **Source (verified from `mealie/schema/recipe/recipe_ingredient.py`):**
  https://github.com/mealie-recipes/mealie
- `RecipeIngredient`: `quantity` (float|None, default 0, rounded to 3 dp), `unit`
  (IngredientUnit|None), `food` (IngredientFood|None), `note`, `display` (auto-computed
  formatted string), **`original_text`** (the unparsed source string — kept!),
  `reference_id` (UUID), `title` (section header). `IngredientUnit`: `aliases`, `fraction`
  (bool — display as fractions), `abbreviation`, `plural_abbreviation`, `use_abbreviation`.
  `IngredientFood`: `aliases`, `plural_name`. A `ParsedIngredient` wrapper carries
  **confidence metrics** from the NLP/LLM parser alongside the structured result.
  Steps (`RecipeStep`): `title` (section), `summary`, `text`
  ([DeepWiki model map](https://deepwiki.com/mealie-recipes/mealie/3.4-recipe-management)).
- **Verdict:** steal: keep `original_text` forever (lossless round-trip + re-parse), parser
  confidence as first-class data, alias lists on foods/units, display-form separated from data.

### A.13 Nextcloud Cookbook, KitchenOwl, Grocy

- **Nextcloud Cookbook** (https://github.com/nextcloud/cookbook): stores recipes as
  **schema.org Recipe JSON files** on disk. Their FAQ documents the pain: "A lot of websites
  are unfortunately not following the schema.org/Recipe standard, which makes their recipes
  impossible to read." Living proof that schema.org-as-storage inherits all of schema.org's
  gaps (free-text ingredients ⇒ no real scaling).
- **KitchenOwl** (https://github.com/TomBursch/kitchenowl): Flask + Flutter grocery/recipe
  manager; recipe model details not publicly documented in depth — **not further verified**.
- **Grocy** (https://github.com/grocy/grocy): ERP-style; recipes reference stock *products*;
  **product-specific quantity-unit conversions** (e.g. "1 dl flour = 60 g") resolved via
  `recipes_pos_resolved` / `quantity_unit_conversions` — same food-scoped-density answer as
  Tandoor, independently arrived at. That convergence is a strong signal.

### A.14 Cocktails

- **TheCocktailDB** (https://www.thecocktaildb.com/, verified via
  `lookup.php?i=11007` Margarita): flat record with **`strIngredient1`…`strIngredient15`** and
  parallel **`strMeasure1`…`strMeasure15`** — positional pairing, null-padded, hard 15-item cap,
  measures as free text ("1 1/2 oz"). The canonical example of how *not* to model ingredients.
- **IBA datasets:** community JSON/CSV of the ~77 IBA official cocktails —
  https://github.com/teijo/iba-cocktails (all measures normalized to **centilitres**, separate
  `ingredients.json` catalog) and https://github.com/rasmusab/iba-cocktails (CSV/JSON, one row
  per ingredient with parsed quantity/unit/ingredient). No cocktail-specific *format standard*
  exists — cocktails are just recipes with volume-dominant units, garnish (no-amount
  ingredients), glassware (equipment) and technique (shake/stir = method step). A universal
  protocol covers them with zero special-casing if it has: volume units, count units,
  no-amount items, equipment, and method steps.

### A.15 BeerXML → BeerJSON — the fermentation-domain gold standard

**BeerXML 1.0** (http://www.beerxml.com/beerxml.htm): XML, `<VERSION>1</VERSION>` in every
record; **fixed canonical units** (weights always kg, volumes always liters, temp °C, time
minutes, pressure kPa) — no unit fields at all; apps convert on import/export. Separate
display-only fields exist but "shouldn't be used for data import since values may be rounded".
Simple and robust, but inflexible, and its display/data split leaked rounding bugs.

**BeerJSON 1.0** (https://github.com/beerjson/beerjson, MIT, npm `@beerjson/beerjson`):
JSON-Schema-based successor (from the unfinished BeerXML 2 effort). Design choices verified
against the schemas:

1. **Every measurement is a `{unit, value}` object** — typed per physical dimension:
   `MassType` (units enum `mg|g|kg|lb|oz`), `VolumeType` (`ml|l|tsp|tbsp|floz|cup|pt|qt|gal|bbl|…`),
   `TemperatureType` (`C|F`), `TimeType`, `PressureType`, `ColorType`, `GravityType`,
   `AcidityType`, `ConcentrationType`, `SpecificVolumeType`, `UnitType` (unitless counts),
   `PercentType` — 16 measurement types. The *dimension* is fixed by the schema; the *unit* is
   the author's choice within the enum. This is the correct middle path between BeerXML's rigid
   canonical units and free-text.
2. **Ranges as `{minimum: Measurement, maximum: Measurement}`** — `TemperatureRangeType`,
   `PercentRangeType`, etc. Clean answer to "2–3 cloves" / "24–26 °C".
3. **Root wrapper with explicit version:** `{ "beerjson": { "version": …(required VersionType),
   "recipes": [...], "fermentables": [...], "equipments": [...], "cultures": [...],
   "profiles": [...], "styles": [...], "mashes": [...], "fermentations": [...], "boil": [...],
   "packaging": [...] } }` — a document can carry recipes *or* standalone catalog records
   (ingredient definitions, equipment profiles, style guides) in one envelope.
4. **Process as first-class data:** mash/fermentation/boil are *step arrays* with temperature,
   time, pH, gravity targets; **Timing objects let additions be triggered by time, temperature,
   or gravity** — i.e., sensory/measurable endpoints, not prose. This is the model for bread
   ("fold when doubled", "bake to 96 °C core").
5. **Equipment profiles** as separate reusable records (mash tun grain absorption etc.).
6. Ingredients split into typed catalogs (fermentables, hop_varieties, cultures,
   miscellaneous_ingredients) with recipe-side *additions* referencing amounts + timing.

**Verdict:** the single most instructive prior art for our protocol. Its weaknesses: verbose to
hand-author (it's an app-interchange format, nobody writes it by hand), beer-specific typed
catalogs don't generalize, and JSON Schema draft usage is dated. But units, ranges, timing
triggers, equipment profiles, and the versioned envelope are directly stealable.

---

## B. Food/ingredient ontologies and identifier systems

| System | What | Format | Size | License | Indie-app verdict |
|---|---|---|---|---|---|
| **FoodOn** (https://foodon.org/) | Farm-to-fork food ontology (OBO Foundry), expands LanguaL's 14 facets | OWL | >9,600 food product categories | Open (CC BY — OBO norm) | Best *canonical ID* source for whole foods; too heavy to embed wholesale — mint our own slugs, cross-map `foodon:` CURIEs on catalog entries |
| **LanguaL** (via FoodOn page) | FDA faceted food-indexing thesaurus, since 1975 | thesaurus | 14 facets | open | Superseded for our purposes by FoodOn |
| **FoodEx2** (EFSA) | EU food classification for risk/exposure | hierarchical catalog | ~31,600 terms | EFSA open data, free incl. commercial ([Eaternity ref](https://eaternity.org/documentation/reference/glossary/foodex2/)) | Regulatory flavor; useful only if we ever do EU-facing nutrition/exposure work |
| **USDA FoodData Central** (https://fdc.nal.usda.gov/) | Nutrient composition DB; stable **FDC IDs**; free API | REST/JSON, CSV dumps | 600k+ foods (≈8k Foundation Foods with lab-analyzed 150+ nutrient profiles) | **CC0 public domain** | The nutrition backbone: attach optional `fdcId` to catalog ingredients; ORF did exactly this with `usda_num` |
| **Open Food Facts** (https://world.openfoodfacts.org/data) | Crowdsourced *branded products* by barcode + ingredient/allergen taxonomies | API/dumps | millions of products | **ODbL** — attribution + **share-alike on derived databases** | Great for barcode lookup; ODbL share-alike contaminates a combined database — keep OFF data at arm's length (query-time, not merged into our catalog) |
| **GS1 GTIN** | Global trade item numbers (barcodes) | identifier | — | GS1 membership to *issue*; free to *reference* | Reference-only: optional `gtin` field on a purchased-product entity |
| **INFOODS** (FAO) | International food-composition tagnames for nutrients (e.g. `ENERC_KCAL`) | tagname list | — | open | Use INFOODS tagnames as nutrient keys — OFF already does (**adoption detail verified via OFF fields; INFOODS site not fetched — partially unverified**) |

**Allergens/diets:** EU Regulation 1169/2011 Annex II defines the mandatory **14 allergens**
(gluten-containing cereals — wheat/rye/barley/oats, crustaceans, eggs, fish, peanuts, soybeans,
milk, nuts, celery, mustard, sesame, sulphites >10 mg/kg, lupin, molluscs) —
https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=celex%3A32011R1169 (Annex II text at
legislation.gov.uk mirror). No official machine-readable EU list exists; Open Food Facts
maintains an `allergens` taxonomy keyed to these. schema.org has `suitableForDiet` /
`RestrictedDiet` enums (verified on the Recipe page) — a tiny closed set. **Recommendation:**
a 14-value closed enum for EU FIC allergens on catalog ingredients (it is a legal list — closed
enums are correct here), plus an open tag set for diets (vegan, halal…), mapped to
`suitableForDiet` on export.

**Realistic architecture for an indie app:** own small curated catalog (slugs + names + i18n +
aliases), with optional cross-reference fields: `foodon`, `fdcId`, `off` (OFF taxonomy id),
`gtin`. Substitution edges live in *our* catalog (Tandoor-style taxonomy-based + explicit
edges), not in any external ontology — none of them model culinary substitutability.

---

## C. Units and quantities

- **UCUM** (https://ucum.org/ucum): case-sensitive code system for unambiguous machine
  interchange of units; SI base + customary units in square brackets — **it covers kitchen
  units**: `[cup_us]`, `[tsp_us]`, `[tbs_us]`, metric culinary variants `[cup_m]`, `[tsp_m]`.
  Product of arbitrary units, `.` and `/` operators, `{annotation}` braces. Foundation of
  HL7/FHIR. License: Regenstrief copyright, free to use with license terms
  (registration-free since 2024 — **unverified detail**). *Steal:* use UCUM codes as the
  canonical `unit` vocabulary (or a curated culinary subset of it) instead of inventing enum
  strings like Crouton's `MILLS`/`KGS`.
- **QUDT** (https://qudt.org/): NASA-originated RDF/OWL ontology of quantities/units/dimensions,
  CC BY 4.0. Semantically richer than UCUM but heavy (multiple linked RDF vocabularies) —
  wrong tool for an app protocol; right tool if we ever need dimensional analysis metadata.
- **How mature systems encode quantity:**
  - BeerJSON: `{unit, value}` objects typed per dimension; ranges as `{minimum, maximum}` of
    measurements (verified).
  - Tandoor/Mealie: decimal `amount` + unit FK + `no_amount`/`quantity: null` for "to taste"
    (verified).
  - Cooklang: `{qty%unit}`, qty may be a word ("some") — parsers pass text quantities through
    (spec allows non-numeric — **partially unverified**).
  - Nobody in the recipe space handles approximation well. The needed algebra, synthesized
    from prior art: `amount` = one of *exact number* | *range {min,max}* | *none* (to taste),
    plus a free-text `note` and an `approx` flag.
- **Mass vs volume vs count & density:** the battle-tested answer appears twice independently —
  **food-scoped unit conversions**: Tandoor `UnitConversion(base_amount, base_unit,
  converted_amount, converted_unit, food?)`; Grocy product-specific QU conversions
  ("1 dl flour = 60 g"). Generic dimension conversion (kg↔lb) is closed-form; cross-dimension
  (cup→g) requires a per-ingredient density edge in the catalog. Count units (`egg`, `clove`)
  need per-ingredient average-mass edges for nutrition/scaling. **Recommendation:** conversions
  live on the *catalog ingredient*, never in the recipe; recipes state what the author wrote.

---

## D. Schema / serialization technology

### D.1 Surface syntax

Requirements: hand-authorable by a baker *and* emittable by an LLM extractor, diffable in git,
parseable in TS + Swift.

- **JSON:** ubiquitous, zero-ambiguity, best tooling; hostile to hand-authoring (no comments,
  comma pain). Every app-interchange format that survived (BeerJSON, Paprika, Mela, Crouton)
  is JSON.
- **YAML:** human-friendly, comments; but the spec's implicit-typing footguns (`no` → false,
  version `1.10` → float) are notorious, and ORF/openrecipeformat's YAML shape shows how
  awkward nested amounts get. Fine as an *authoring* skin, risky as the *canonical* wire form.
- **TOML:** great for flat config, poor for deeply nested lists of objects (steps of
  ingredients) — wrong shape for recipes.
- **JSON5/JSONC:** comments + trailing commas, but no ecosystem gravity outside config files.
- **Custom DSL (Cooklang-style):** unbeatable authoring for *prose-shaped* recipes; but a DSL
  cannot carry the full protocol payload (substitution graphs, scaling pivots, catalog refs)
  without becoming unreadable, and every consumer needs a bespoke parser (Swift + TS + whatever
  the CMS uses).
- **Markdown + frontmatter (RecipeMD):** parseable but structurally weak (verified above).

**Conclusion:** two-layer approach — **canonical format = JSON** (one unambiguous wire form,
`$schema`-validatable, LLM-extraction-friendly: constrained JSON output is exactly what LLM
structured-output modes do best), with an optional **Cooklang-inspired authoring text form**
that compiles to it. Never make the DSL the source of truth.

### D.2 Schema technology

- **JSON Schema draft 2020-12:** the validation lingua franca; `$schema`/`$id` URIs;
  BeerJSON-proven for this exact problem class. Codegen: **quicktype** generates TypeScript,
  **Swift**, and Zod from JSON Schema (https://github.com/glideapps/quicktype,
  https://quicktype.io/swift, https://quicktype.io/typescript-zod) — one schema → both platforms.
  Editor autocomplete: VS Code natively validates JSON against `$schema`. Weakness: unions/
  discriminated unions generate clumsily in some targets; keep the schema codegen-friendly
  (avoid exotic keywords, prefer `oneOf` with a discriminator property).
- **TypeSpec:** Microsoft's DSL that *emits* JSON Schema/OpenAPI; pleasant authoring, immature
  Swift story (no direct Swift emitter — you'd go TypeSpec → JSON Schema → quicktype anyway).
  Adds a build step without removing one.
- **Protobuf:** best-in-class evolution discipline (see D.3) and codegen, but binary-first,
  poor for human-readable content files, and proto3 JSON mapping loses field-presence nuance.
  Wrong fit for a content format meant to live in git and CMSs.
- **CUE:** elegant validation+defaults, near-zero Swift ecosystem. No.
- **Zod-first:** superb DX in the web app (RHF+Zod is already our stack) but makes TypeScript
  the source of truth — Swift becomes a hand-maintained port. Backwards.

**Conclusion:** **JSON Schema 2020-12 as the normative artifact**, published at a stable URL;
generate TS types + Zod (for the web app) and Swift Codable types (for the iOS app) via
quicktype in CI. TypeSpec optional later as an authoring convenience that emits the same schema.

### D.3 Versioning & evolution — what the survivors do

- **Protobuf** (https://protobuf.dev/programming-guides/proto3/#updating): field numbers are
  immutable; adding fields is safe; deleted fields **must** be `reserved`; unknown fields are
  *preserved through* parse/serialize, not dropped. Reuse of a freed field number "can lead to…
  leaked PII, data corruption".
- **OpenAPI** (https://spec.openapis.org/oas/v3.1.0): `major.minor` designates the feature set,
  `.patch` is only clarifications; tooling for 3.1 SHOULD accept all 3.1.*.
- **schema.org:** unversioned instance documents; additive-only vocabulary with a `pending`
  staging tier; terms get superseded, never removed (https://schema.org/docs/howwework.html).
- **BeerJSON / BeerXML:** explicit required `version` inside the document envelope (verified in
  both schemas).
- **SchemaVer** (Snowplow, https://docs.snowplow.io/docs/api-reference/iglu/common-architecture/schemaver/):
  `MODEL-REVISION-ADDITION` — MODEL bumps when historical data would no longer validate;
  ADDITION for purely additive changes. Purpose-built semver-for-data-schemas; more honest than
  semver ("there are no bug fixes for a schema" — sourcemeta guide,
  https://one.sourcemeta.com/guide/evolution/).

**Synthesis for a long-lived content format:** (1) required `version` field in every document
(BeerJSON) as `"MODEL.ADDITION"` or full SchemaVer; (2) additive-only within a MODEL — never
rename, add + deprecate (Solace/Confluent guidance); (3) readers MUST ignore unknown fields
*and* writers SHOULD round-trip them (Protobuf's preserve rule — critical when an old iOS build
edits a recipe authored by a newer web build); (4) versioned `$id` URLs per MODEL
(`…/recipe/v1.json`); (5) ship migrations as pure functions v(n)→v(n+1) in the reference
libraries.

### D.4 Identity, forking, derivation

- Every entity (recipe, step, ingredient line) gets a UUID (Crouton and Mealie both do this —
  verified; it's what makes sync, references, and UI reactivity work offline).
- Mela's "id = source URL" trick (verified) is the right *dedupe hint* for ingested recipes:
  keep `source.url` + a separate stable UUID; don't conflate identity with provenance.
- Fork/variant lineage: schema.org already has `isBasedOn` (CreativeWork, verified) — use a
  `basedOn` field carrying the parent recipe's ID (+ optional version) for
  parent→variant derivation, exportable straight to `isBasedOn`.
- Content-addressing (hash of canonical JSON as version identifier) is attractive for
  detecting divergence between forks and for cache keys; git already gives us this for
  file-based storage. Use content hashes as *revision* identifiers, UUIDs as *identity* —
  never hashes as identity (editing a typo must not create a "new recipe").
  (*General engineering practice; no single citable spec.*)

---

## E. Protocol design principles

- **Postel refined — RFC 9413 "Maintaining Robust Protocols"**
  (https://www.rfc-editor.org/rfc/rfc9413.html): blind tolerance breeds a "pathological
  feedback cycle" of bug-for-bug compatibility; prefer *active maintenance*, *deliberate
  extensibility with explicit unknown-element rules*, and "virtuous intolerance" (fail loudly
  on spec violations) over silent fixup. Applied here: the *validator* is strict (a recipe
  that claims `version: 1` and violates the v1 schema is rejected at authoring/ingestion
  time); the *reader* is tolerant only in the one designed way — unknown fields.
- **Must-ignore vs must-understand** (RFC 6709 Design Considerations for Protocol Extensions,
  https://www.rfc-editor.org/rfc/rfc6709; Megginson,
  https://quoderat.megginson.com/2005/11/16/must-ignore-and-must-understand/): default
  must-ignore for unknown fields (HTTP/email headers thrive on it; SIP B2BUAs show how
  must-understand-by-default kills extensibility). Reserve an explicit `critical`-style
  marker only if we ever need a field that old clients must not silently drop.
- **Extension points:** OpenAPI's `x-` specification-extension convention (verified,
  https://spec.openapis.org/oas/v3.1.0#specification-extensions) — cheap, proven; Paprika
  converters already use `x-` fields for lossless import (movemyrecipes, cited above). Give
  every object an allowance for `x-*` keys (or a single `extensions: {}` bag — easier for
  Swift Codable) so Fornada-specific data rides inside standard documents without forking the
  spec.
- **Data ≠ presentation:** BeerXML's rounded "display" fields corrupting imports (verified,
  beerxml.com) vs Mealie's computed `display` string that is explicitly derived and
  overridable (verified). Rule: canonical numeric data only in the protocol; rendered strings
  ("1½ cups") are always derivable, optionally cached, never authoritative. Same for
  fraction-vs-decimal display (Mealie's `fraction` flag lives on the *unit*, not the amount).
- **Normalization vs denormalization for offline-first:** server-relational models (Tandoor)
  normalize foods/units into shared tables; document formats (Paprika/Mela/Crouton) inline
  everything. For offline-first clients the working compromise is the **BeerJSON envelope**
  pattern (verified): a self-contained document that *inlines* the ingredient/unit records it
  references (denormalized snapshot) while carrying stable catalog IDs so clients that *do*
  have the catalog can re-link and upgrade. A recipe must render with zero network calls.

---

## RECOMMENDATIONS FOR OUR PROTOCOL

**1. Serialization:** Canonical form is **JSON**, UTF-8, one recipe per document, with a
BeerJSON-style envelope: `{ "fornada": { "version": "1.0", "recipes": [...], "ingredients":
[...], "equipment": [...] } }` (name TBD). Optional human authoring layer: a Cooklang-inspired
text format that *compiles to* the JSON — never the reverse, never the source of truth. LLM
ingestion (URL/screenshot) targets the JSON directly via structured output against the schema.

**2. Schema tech:** **JSON Schema draft 2020-12**, published at versioned `$id` URLs. CI runs
quicktype → TypeScript + Zod (web) and Swift Codable (iOS). Keep the schema in the
codegen-friendly subset: discriminated `oneOf`s with a `type` property, no `patternProperties`
cleverness except the `x-*` extension allowance.

**3. Versioning:** required `version` in the envelope, SchemaVer-flavored (`MODEL.ADDITION`).
Additive-only within a MODEL; add+deprecate instead of rename; readers must-ignore unknown
fields and SHOULD preserve them on rewrite (Protobuf rule); pure-function migrations shipped in
the reference libs; a `pending`/experimental tier for new fields before they're frozen
(schema.org's trick).

**4. Steal explicitly:**
- From **BeerJSON:** `{unit, value}` measurement objects typed by dimension; `{minimum,
  maximum}` ranges; timing/trigger objects (by time, temperature, *or observable state*) — this
  becomes our sensory-endpoint mechanism ("until doubled", "96 °C core"); reusable equipment
  profiles; the versioned multi-record envelope.
- From **Cooklang:** ingredients referenced *inside steps* (in our JSON: steps carry
  `ingredientRefs` to recipe-level ingredient entries with per-step amounts), inline
  preparations, timers as data.
- From **Tandoor/Grocy:** food catalog as a taxonomy; substitution as catalog edges
  (sibling/child) *plus* recipe-level explicit alternatives (ORF's substitutions-with-amounts);
  **food-scoped unit conversions** (density, per-piece mass) in the catalog, never in recipes.
- From **Mealie:** keep `original_text` on every parsed ingredient (lossless, re-parseable);
  parser `confidence`; alias lists; derived-not-authoritative `display` strings.
- From **schema.org:** `isBasedOn`-style `basedOn` lineage for forks; clean *export* mapping to
  schema.org JSON-LD as the publishing/interop face.
- From **UCUM:** its codes (culinary subset incl. `[cup_us]`, `[tsp_m]`) as the unit
  vocabulary, plus a small extension list for culinary counts (pinch, clove, slice) modeled as
  *count units with catalog-resolved mass*, not fake dimensions.
- **Scaling:** first-class `yield` object + per-recipe optional **scaling pivot** (e.g. total
  flour mass for baker's-percentage domains); every amount either scales linearly, is fixed
  (`noScale` — salt-to-taste, pan size), or is stepwise (yeast). No prior format has this; it's
  our differentiator and costs one enum.

**5. Deliberately do NOT:**
- Do not use schema.org as the internal model (free-text ingredients — Nextcloud Cookbook is
  the cautionary tale). It is an export target only.
- No closed app-specific unit enums (Crouton's `BOTTLE`/`KGS`) and no positional ingredient
  arrays (TheCocktailDB's `strIngredient1..15`).
- No fixed canonical units forcing conversion on write (BeerXML) — store what the author wrote,
  convert on read via the catalog.
- No YAML/DSL as canonical wire form; no XML; no licensing friction (RecipeML) — spec under
  CC BY / MIT from day one.
- No display strings as data; no silent tolerance of invalid documents (RFC 9413) — strict
  validation at the boundary, must-ignore only for *unknown* (future) fields.
- Don't embed FoodOn/FoodEx2 wholesale — own catalog with `foodon`/`fdcId`/`off`/`gtin`
  cross-references; keep ODbL (Open Food Facts) data out of the merged catalog to avoid
  share-alike contamination.
