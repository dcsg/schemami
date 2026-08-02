# Findings & learnings — the brainstorm synthesis

Date: 2026-08-02. This is the honest digest of the six research tracks:
what we learned, what is easy, what is hard, what is not worth attempting,
and what is genuinely still **your call**. The `00-PROPOSAL` document is a
*strawman* — one candidate shape to react to, not a decision. Where it made
a choice the research doesn't force, that choice is listed under
"Open decisions" below.

---

## 1. What each research lens found

### The codebase (architect/data-analyst lens)

- We have **five independent recipe representations** with zero shared types:
  web `Recipe`, web `OtherRecipe`, iOS `BreadRecipeFormulaSnapshot`, site
  `BreadRecipe`, and two unjoined Postgres tables. Baker's-percentage math is
  implemented **three times** independently (web, iOS, site) with subtly
  different pivots.
- Every bread type hardcodes `agua/azeite/banha/mv/mm/sal` as named fields.
  Each non-bread need so far spawned a bespoke parallel type (`PizzaOpts`,
  `MMVariant`, `OtherRecipe`) — evidence the current shape does not extend.
- **Generalization has already started twice**, independently: SPEC-008's
  versioned step primitives + `RecipeKindProfile` (iOS, accepted, shipped) and
  the Sanity CMS migration plan (site, planned). Neither touches the backend.
- Untouched gold: the site's provenance model (`sources`, `testemunhos`,
  `divergencias`, `confidence`, `verified`) has no equal in any format we
  surveyed. Also: **no step anywhere has a media field today** — the per-step
  media slot is aspiration, not implementation.

### Prior-art formats (software-research lens)

- **Every mass-market format failed the same way**: ingredients as free-text
  strings (schema.org, Paprika, Mela). That single choice is why none can
  rescale, substitute, or link steps to ingredients, and why every importer
  needs a fragile NLP pass. schema.org is an SEO export target, not a storage
  model.
- **Over-structuring also kills**: RecipeML modelled everything and died
  (47 lines per trivial recipe, one adopting app). Crouton typed its
  quantities but froze units in a closed enum — can't add a regional unit
  without a schema change.
- The **battle-tested** models are BeerJSON (typed measurements, ranges,
  equipment profiles, events triggered by time OR temperature OR gravity) and
  the open-source managers Tandoor/Mealie, which independently converged on
  ingredient = `(amount, unit, food, note)` with food as a catalog entity.
  Independent convergence is the strongest signal in the whole survey.
- **Nobody has scaling semantics.** No surveyed format can express "this
  scales by area" or "this never scales". That would be genuinely novel.
- Ingestion is a solved pipeline (JSON-LD → microdata → per-site selectors;
  vision-LLM for screenshots) but its output is only as good as the target
  schema's tolerance for partial data: required-fields-minimal + a preserved
  `raw` string per ingredient is what makes LLM extraction reliable.

### The five cook lenses (baker, fermenter, pastry chef, chef, barista/bartender/brewer)

Convergent findings — every domain independently hit these:

1. **"Percentage of what" differs per domain** — flour (bread), trimmed
   vegetable (kraut), water (brine), meat (cure, in ppm), dose (coffee 1:16),
   total mix (ice cream). One generic "ratio of a named basis" covers all.
2. **Time is a range + a condition + temperature-dependent.** "4–6 h OR until
   doubled OR poke test" — and lamination rests fail on *both* ends.
3. **Recipes are DAGs**: preferment chains, entremet assembly (5–7 parallel
   components frozen at different times), Italian meringue's syrup/whites
   convergence, kombucha F1→F2.
4. **Sub-recipes are everywhere**: levain, scald, stock, syrup, espresso
   inside a latte, ganache. Partial draw included ("makes 500, use 200").
5. **Substitutions change methods, not just quantities** — 15 of the 18
   sourced swaps require a method or parameter delta; 6 insert/delete steps.
   (Gelatine→agar must boil; egg→flax can't aerate; yeast↔levain swaps a
   whole subtree; butter→margarine rewrites every lamination rest.)
6. **Equipment changes method, not just speed** — tandoor vs skillet, dutch
   oven vs steam, stand mixer as a feasibility gate, grinder settings that
   are not portable between grinders.
7. **Safety thresholds are real numbers** — 2% minimum brine, nitrite
   120–625 ppm by category, pH < 4.6/4.0, bottle-bomb pressure limits. A
   naive scaler or substituter can silently produce an unsafe recipe.

Divergent findings — things only one domain forces, which a protocol must
allow without imposing on the rest:

- **Drinks**: dilution is an ingredient that comes from no bottle (~20%
  stirred, ~25–30% shaken) and must become explicit water when batching;
  ratio-first recipes (1:1:1) have no absolute quantities at all; hop
  substitution is a solved *formula* (alpha-acid units), not a lookup.
- **Pastry**: choux egg quantity is genuinely unknowable in advance ("add to
  consistency"); chocolate tempering is a 3-waypoint curve differing by
  chocolate type; pan scaling is r²; sous-vide is a 2D table.
- **Ferments**: backslopping (batch N feeds batch N+1); cultures are
  *removed*, not consumed; ferment time does NOT scale with batch size.
- **Bread**: preferment flour counts toward total flour; DDT water-temp
  formula; double fermentation with different purposes per phase.

---

## 2. What is EASY (solved problems, low risk)

| Capability | Why it's easy |
|---|---|
| Typed ingredient rows (amount/unit/item/note + raw) | Tandoor/Mealie convergence; just don't do free text |
| Ratio-of-named-basis quantities | One mechanism, well understood in every domain |
| Duration as {min,target,max} + sensory endpoint | BeerJSON already ships timing triggered by measurements |
| Step→ingredient links (`uses`) | Cooklang proves it; cheap; enables highlight-as-you-cook + "unused ingredient" validation |
| Per-step media with licence | Pure schema addition; the project already wants it |
| Provenance/confidence/divergences | Already designed and shipped on the site; generalizes as-is |
| Registry vocabularies (step primitives, flour classes) | SPEC-008/007 already prove the pattern in production |
| URL ingestion | recipe-scrapers pipeline is mature; JSON-LD is everywhere |
| JSON Schema → TS + Swift codegen | Standard tooling (quicktype/zod); kills the 3-way hand-sync problem |

## 3. What is HARD (doable, but this is where the effort goes)

| Capability | Why it's hard | Mitigation found |
|---|---|---|
| **Method-changing substitutions** | Deltas must survive recipe edits; two swaps at once can conflict; authoring must stay human | Typed op list on stable step slugs + write-set conflict detection (06's design) — but this is the most novel, least battle-tested part of the whole idea |
| **Combinatorial variant explosion** | options × substitutions × equipment × diets multiply paths | Validator walks combinations; promotion rule (big divergence → fork a variant). Real cost: authoring discipline |
| **Non-linear scaling** | Bake time vs loaf size, r² pans, sublinear yeast — nobody has ever shipped this | Per-quantity scaling tags + a closed arithmetic grammar; each rule needs a domain expert to write it |
| **Temperature-aware time adjustment** | Fermentation rate models (Q10) are approximations; overselling accuracy misleads cooks | Ship as estimate + always keep the sensory endpoint primary |
| **Ingredient-line parsing on import** | "3/4 cup packed brown sugar" → structured is still the weakest link in every importer | LLM extraction into the schema + `raw` preserved + human review gate (imports land unverified) |
| **A DAG renderer that stays simple** | Most recipes are linear; the UI must not tax them with graph complexity | `after` is opt-in; linear recipes read as numbered lists |
| **Registry governance** | Vocabularies rot without review; enum-vs-registry discipline requires saying no | Process problem, not a schema problem — unsolved |

## 4. What is NOT possible / not worth attempting

- **Fully automatic substitution.** The research is unambiguous: quality data
  on "does this swap work *in this recipe*" doesn't exist at scale, and roles
  interact (egg is 5 things at once). Substitutions must be authored or
  curated, with the engine checking constraints — never invented by the app.
  (Samsung Food's auto-personalize is the cautionary tale: plausible output,
  zero accountability.)
- **One closed schema that covers everything.** Both failure modes are on the
  record: RecipeML (everything typed, dead) and free-text (everything loose,
  unusable). Any workable answer is layered.
- **Encoding sensory judgment numerically.** "Smells lactic not putrid",
  windowpane, macaronage flow — these resist numbers *in principle*. Media +
  prose cues are the honest encoding; pretending otherwise produces false
  precision.
- **A general expression language in recipe data.** Formula timing is needed
  (roast = 12 min/lb + 12) but anything Turing-complete is an RCE hole and
  unreviewable. Closed arithmetic grammar or lookup tables only.
- **Perfect import.** Screenshot/URL → *draft* is achievable and valuable;
  screenshot → publishable recipe is not, and for a heritage archive
  shouldn't even be the goal.

## 5. Open decisions — genuinely your call, with trade-offs

These are the places where the strawman proposal picked an option the
research does not force:

1. **Serialization: JSON-canonical vs YAML-canonical.** Research supports
   either with compilation between them. Strawman picked JSON-canonical +
   YAML authoring. If recipes will mostly be written by hand in git,
   YAML-canonical is defensible; if mostly app/CMS-authored, JSON wins.
2. **How much structure at v1.** The full strawman (guards, options,
   execution modes, op-list deltas) is a lot. A legitimate alternative: ship
   core + bread profile only, add mechanisms as each category onboards.
   Trade-off: retrofitting substitution scopes later is harder than carrying
   unused schema now.
3. **Profiles: how many, how granular.** Is coffee its own profile or part of
   drinks? Is preserve separate from ferment? The research shows the *core*
   boundary clearly but not the profile boundaries.
4. **Where execution state lives.** Strawman keeps sessions/timers/
   measurements outside RCP (recipe = immutable description). Counter-view:
   BeerJSON embeds OG/FG readings in the recipe document. Affects sync design.
5. **Substitution catalog: build vs curate-in-recipes-first.** A global
   catalog is powerful but is a second product to maintain. Starting with
   per-recipe substitutions only (author-curated) is a real option.
6. **Registry governance.** Who approves a new ingredient class or step
   primitive once there are contributors? Unanswered by research.
7. **CMS interaction.** Does RCP become the Sanity content model, or does
   Sanity store its own shapes and *emit* RCP? Both are viable; affects the
   editor build.
8. **Nutrition — deferred by design, but the shape matters now.** Finding
   from the survey: Mealie stores nutrition statically per recipe and
   documents it as a known defect (doesn't scale with servings, drifts as the
   recipe is edited). The safe posture: nutrition is **derived** — the
   ingredient *catalog* carries per-100g nutrition per canonical class (the
   repo already does exactly this for flour brands via `FlourNutrition` /
   `INGREDIENT_NUTRITION`), and recipe nutrition = Σ(resolved quantities ×
   catalog values), computed at render. Substitutions and scaling then update
   nutrition for free, and `removed_after` ingredients (SCOBY, bouquet garni)
   are excluded automatically. Licensing checked: USDA FoodData Central is
   CC0 (safe to embed); Open Food Facts is ODbL share-alike (reference,
   don't merge). What is genuinely hard and safely deferrable:
   cooked-vs-raw transformation (water loss on baking ~10–20%, fat absorbed
   vs discarded in frying, brine absorbed) and EU FIC-compliant rounding if
   labelling ever matters. Nothing in the core schema blocks any of this —
   `derived: [{compute: nutrition}]` is reserved, and allergens are already a
   closed enum on catalog classes.

## 6. How to read the rest of this folder

- `01`–`06` — the raw research, with sources. Each ends with its own summary.
- `00-PROPOSAL-rcp-v1.md` — the strawman assembled from the findings above
  plus the decisions you gave in conversation (enums over free text; one core
  + profiles; equipment first-class; substitution beyond ingredients; recipes
  composing recipes; optional steps). Treat every *other* choice in it as
  proposed, not agreed.
- `schema/` + `examples/` — the strawman made executable: 6 recipes across 5
  categories validating against a real JSON Schema. Their value for the
  brainstorm: they prove the shape *can* hold the hard cases (autolise paths,
  batch dilution, safety bounds, cross-category nata, referenced ganache) —
  not that this exact shape is final.
