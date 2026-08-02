# 06 — Substitution Model

Status: research + proposed design
Date: 2026-08-02
Scope: how the recipe protocol encodes ingredients, their substitutions, and the *method changes* a substitution forces.

Hard requirement being answered (product owner):

> "It MUST always encode ingredients and whenever possible have replacements for each ingredient for each recipe. The recipe protocol/method can also be changed if certain ingredients change."

The second sentence is the whole problem. A substitution is not a quantity swap. `gelatine → agar` is not "use 1/3 as much"; it is "use 1/3 as much **and boil it**, because agar does not hydrate at bloom temperature". A protocol that models substitution as `{from, to, ratio}` is wrong in the majority of interesting cases, and silently wrong — which is worse.

Everything below builds to §7, the proposed schema, and §8, the method-delta design decision.

---

## 1. Prior art survey

### 1.1 Interchange formats

| Format | Ingredient model | Substitution support | Notes |
|---|---|---|---|
| **schema.org `Recipe`** (JSON-LD) | `recipeIngredient` is an array of **free-text strings** — quantity, unit and name are not separated | **None.** No substitution property exists at any level | `suitableForDiet` takes a `RestrictedDiet` enum (`VeganDiet`, `GlutenFreeDiet`, `HalalDiet`, `KosherDiet`, `LowLactoseDiet`, `LowSaltDiet`, `DiabeticDiet`, …) but it is a *label on the whole recipe*, not a mechanism. Google explicitly advises against putting "optional" or section headers into ingredient strings, i.e. the format has no slot for qualifiers at all. [schema.org/Recipe](https://schema.org/Recipe), [schema.org/recipeIngredient](https://schema.org/recipeIngredient), [schema.org/suitableForDiet](https://schema.org/suitableForDiet) |
| **Cooklang** | Structured: `@ingredient{qty%unit}` plus a preparation note `(peeled and finely chopped)`, plus recipe references `@./sauces/Hollandaise{150%g}` | **None.** The spec has no syntax for alternatives, optionality, variants, or conditional steps | Confirmed against the published spec. Alternatives can only be smuggled into free-text prep notes or comments, which are opaque to tooling. [cooklang.org/docs/spec](https://cooklang.org/docs/spec/) |
| **Tandoor Recipes** | Structured ingredients, food entities, supermarket categories, automation rules | Has an ingredient-substitute *data field*, but as of the open issue [TandoorRecipes/recipes#3951](https://github.com/TandoorRecipes/recipes/issues/3951) (Aug 2025) it "doesn't seem to be used anywhere useful" — the request is precisely to surface a substitute toggle in the recipe view and shopping list | Closest thing to (a) global catalog knowledge in an OSS product. Purely 1-to-1; no method impact. |
| **Mealie / Paprika / RecipeKeeper / Chowdown** | Proprietary or lightly structured JSON | None known for substitution as a first-class object | Tandoor's importer list is the de-facto census of what these formats carry. [docs.tandoor.dev/features/import_export](https://docs.tandoor.dev/features/import_export/) |
| **RecipeML** | XML, ingredient elements with `<alt-ingredient>` grouping (legacy) | Alternatives exist structurally, but as flat alternates with no conversion semantics and no method linkage | Effectively dead format. [Wikipedia: RecipeML](https://en.wikipedia.org/wiki/RecipeML) |
| **Samsung Food (ex-Whisk)** | Proprietary; large ingredient graph inherited from Whisk | "Personalize Recipe" — an LLM rewrites a saved recipe to be vegan / gluten-free / seasonal, swapping cheese→vegan cheese, sausage→beans, tortillas→GF tortillas | This is the state of the art *in product*, and it is **generative, not declarative**: the output is a new recipe blob, not a reviewable delta. No provenance, no confidence, no guard rails you can inspect. Behind a Food+ subscription. [Samsung Newsroom](https://news.samsung.com/uk/samsung-announces-global-launch-of-samsung-food-an-ai-powered-personalised-food-and-recipe-service), [Samsung Food support](https://support.samsungfood.com/hc/en-us/articles/18369261226644-Getting-Started-with-Samsung-Food-Create-and-Edit-Recipes) |

**Conclusion on formats:** no shipping interchange format encodes substitutions as structured, conversion-bearing, method-affecting objects. Two encode a weak 1-to-1 alternate; the rest encode nothing. This is genuinely open ground.

### 1.2 Academic and applied research

- **FoodKG + DIISH** — Shirai et al., *Identifying Ingredient Substitutions Using a Knowledge Graph of Food* (RPI + IBM Research, 2021). Builds on FoodKG, which links recipes to FoodOn categorisation and USDA nutrition. Introduces the **diet-improvement ingredient substitutability heuristic (DIISH)**, combining explicit KG semantics with word embeddings to *rank* plausible substitutes given a health context. Evaluated against ground-truth substitutions scraped from substitution guides and recipe reviews. [PubMed 33733228](https://pubmed.ncbi.nlm.nih.gov/33733228/), [PMC7861309](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7861309/)
- **GISMo** — Fatemi, Duval et al., *Learning to Substitute Ingredients in Recipes* (Meta AI, arXiv:2302.07960, 2023). GNN over an ingredient graph, refined with recipe context, ranks substitutions. Ships the **Recipe1MSubs** benchmark (substitution pairs grounded in Recipe1M) with standard splits and metrics. Code at [facebookresearch/gismo](https://github.com/facebookresearch/gismo). [arXiv:2302.07960](https://arxiv.org/abs/2302.07960)
- **LLM substitution** — *Large Language Models for Ingredient Substitution in Food Recipes using Supervised Fine-tuning and Direct Preference Optimization* (arXiv:2412.04922 / Natural Language Processing Journal, 2025). SFT + DPO on Mistral-7B beats prior baselines at predicting context-appropriate substitutes. [arXiv:2412.04922](https://arxiv.org/abs/2412.04922)
- **FlavorGraph** — Park et al., *Scientific Reports* (2021). 6,653 ingredient nodes + 1,646 compound nodes, 147,179 edges; metapath2vec variant with a chemical-property layer, yielding dense food embeddings for pairing recommendation. Explicitly motivated in part by finding "potential substitutes for unhealthy or unsustainable ingredients." [Nature Sci Rep s41598-020-79422-8](https://www.nature.com/articles/s41598-020-79422-8)
- **Flavour network** — Ahn et al., *Flavor network and the principles of food pairing*, Sci Rep (2011) — the shared-compound hypothesis underpinning most pairing work. [Sci Rep srep00196](https://www.nature.com/articles/srep00196)
- **Food Recipe Ingredient Substitution Ontology Design Pattern** — Ławrynowicz, Wróblewska, Adrian, Kulczyński, Gramza-Michałowska (2022). **The single most relevant piece of prior art for this document.** It reifies substitution as an n-ary relation rather than a binary edge, with classes for `food recipe`, `ingredient specification`, `food item`, `quality` (technological / dietary / tastiness), `condition` (technological / dietary / cultural), `objective`, and — crucially — **both `ingredient set transformation (specification)` and `instruction set transformation (specification)`**. Their worked example is exactly our problem: substituting "melted butter" with "regular butter" requires *adding a pre-processing step*. They state plainly that prior ontologies had "no links with food preparation process, recipes." [PMC8837940](https://pmc.ncbi.nlm.nih.gov/articles/PMC8837940/)
- **Health-nudging context** — Elsweiler, Trattner & Harvey, *Exploiting Food Choice Biases for Healthier Recipe Recommendation*, SIGIR 2017. Relevant because it establishes that substitution-driven recommendation is a *behavioural* intervention, not just a data transform. [ACM 10.1145/3077136.3080826](https://dl.acm.org/doi/10.1145/3077136.3080826)
- Adjacent: *RecipeBowl* (set-transformer recommender), *KitcheNette* (arXiv:1905.07261, Siamese nets for pairing scores), MDPI *Optimizing Ingredient Substitution Using LLMs to Enhance Phytochemical Content* (2024). No format contribution; ranking only.

> No paper named "SubstitutionNet" was located. Treat that name as unverified.

### 1.3 What is missing — the gap this protocol fills

Every system above answers **"what can replace X?"** — a ranking problem. None of them, except the 2022 ODP *conceptually*, answers **"and then what changes about how I cook?"** — an authoring and representation problem. And the ODP is an ontology paper: it models that an instruction-set transformation exists, without specifying an operational, authorable, testable serialisation for it.

Three concrete gaps:

1. **No method-delta serialisation.** Nobody has a wire format for "step 4 becomes a whisk, step 7 is deleted, a boil is inserted."
2. **No safety floor.** Every system will happily let you halve the salt in a lacto-ferment or swap out nitrite. Substitution engines are unguarded.
3. **No provenance.** GISMo/LLM outputs and a baker's tested note are presented identically. Users cannot tell "a textbook says so" from "a model guessed."

---

## 2. Functional-role taxonomy

The reason `1 egg → 1 flax egg` fails in a sponge and succeeds in a brownie is that an egg carries **six roles simultaneously**, and flax covers two of them. Substitution must therefore be modelled **role-wise, not identity-wise**.

Proposed closed vocabulary of functional roles. Each is a namespaced enum value used in `roles.preserves` / `roles.loses` / `roles.adds`.

| Role ID | Definition | Typical carriers | Failure signature when lost |
|---|---|---|---|
| `structure.protein` | Forms the coagulated or viscoelastic network that holds shape | Wheat gluten, egg white, meat myosin, dairy casein | Collapse, crumbliness, no gas retention |
| `structure.starch` | Gelatinises and sets structure on heating | Flour, potato, rice, corn starch | Gummy or soupy set |
| `leavening.biological` | CO₂ from fermentation; also produces acid + flavour over time | Yeast, sourdough culture, *massa velha* | No rise; no fermentation flavour; no dough maturation |
| `leavening.chemical` | CO₂ from an acid–base reaction, time- and heat-gated | Baking soda + acid, baking powder | Flat, dense; also loses alkaline browning |
| `leavening.mechanical` | Air folded/whipped into a matrix and held | Creamed butter+sugar, whipped whites, aquafaba | Dense crumb, no lift — *cannot be fixed by adding more of the substitute* |
| `leavening.steam` | Water flashing to steam expands the structure | Water, egg (whites ~88% water), butter (~16% water) | Poor oven spring, no laminated lift |
| `fat.shortening` | Coats flour, interrupts gluten, tenderises | Butter, lard, *banha*, oil, shortening | Tough, bready texture |
| `fat.plasticity` | Solid-at-room-temp fat that can be laminated or creamed | Butter, lard, block margarine | Lamination impossible; creaming impossible |
| `moisture.hydration` | Free water available to hydrate flour / dissolve solutes | Water, milk, egg, juice | Under-hydrated dough, dry crumb |
| `sweetener.sweetness` | Perceived sweetness | Sucrose, honey, maple, sugar alcohols | Flat flavour |
| `sweetener.hygroscopy` | Binds water, keeps product soft, extends shelf life | Sucrose, invert sugars, honey, glycerol | Rapid staling |
| `sweetener.structure` | Delays gluten development and sets the set-point of the crumb; also creaming substrate | Crystalline sugar specifically | Tougher crumb; loss of creaming aeration if crystals are removed |
| `browning.maillard` | Reducing sugar + amino acid → colour and flavour | Lactose, glucose, fructose, milk solids, egg | Pale crust, muted flavour |
| `browning.caramel` | Sugar thermal decomposition (>~160 °C) | Sucrose and other sugars | Pale, one-note |
| `emulsifier` | Stabilises fat-in-water or water-in-fat | Egg yolk lecithin, mustard, lecithin, mono/diglycerides | Split batter, greasy crumb |
| `binder` | Holds particulates together without necessarily forming a network | Egg, flax mucilage, chia, starch, breadcrumb | Crumbles, falls apart |
| `thickener.gel` | Forms a set gel | Gelatine, agar, pectin, carrageenan, starch | Runny; or *wrong* set (see §4) |
| `thickener.viscosity` | Raises viscosity without gelling | Xanthan, guar, roux, cream | Thin sauce |
| `acid.ph` | Lowers pH — flavour, safety, protein/pectin behaviour, leavening trigger | Vinegar, citrus, buttermilk, cream of tartar, lactic ferment | Loss of tang; **loss of safety margin**; chemical leavening fails to trigger |
| `alkali.ph` | Raises pH — browning, colour, texture (e.g. pretzel, ramen) | Baking soda, lye, kansui | No pretzel crust; muddy alkaline noodle texture |
| `salt.flavour` | Seasoning, suppression of bitterness | NaCl, KCl (with off-notes), soy, miso | Bland |
| `salt.fermentation_control` | Osmotic regulation of microbial rate and selection | NaCl | Runaway or wrong fermentation |
| `salt.gluten_strength` | Tightens gluten via charge shielding; inhibits protease | NaCl | Slack, tearing dough |
| `salt.preservation` | Water-activity reduction; pathogen suppression | NaCl, nitrite salts | **Food-safety failure** |
| `aromatic` | Volatile flavour contribution | Herbs, spices, hops aroma, citrus zest | Flavour gap — usually not substitutable by function, only by taste |
| `colourant` | Visual colour | Saffron, paprika, egg yolk, annatto, beetroot | Wrong appearance |
| `preservative.antimicrobial` | Direct microbial inhibition | Nitrite, sulphites, salt, acid, sugar | **Food-safety failure** |
| `preservative.antioxidant` | Delays rancidity/oxidation | Ascorbic acid, tocopherols, sulphites | Rancidity, browning of cut fruit |
| `enzyme.amylase` | Converts starch to fermentable sugar | Malt, diastatic malt, sprouted flour | Slow fermentation, pale crust |
| `enzyme.protease` / `enzyme.coagulant` | Protein modification / curdling | Rennet, papain, bromelain | No curd, no tenderising |
| `texture.inclusion` | Discrete textural element, not a functional network | Seeds, nuts, chocolate chips, *sementes* | Purely sensory |

**Role vector notation.** Every ingredient *slot in a recipe* declares the roles it plays **in that recipe**, with an intensity and a criticality:

```yaml
roles:
  - { role: binder,               weight: 3, critical: true  }
  - { role: leavening.mechanical, weight: 2, critical: false }
```

`weight` 0–3 = how much of that role this slot supplies. `critical: true` = if a substitution loses this role, the substitution is invalid unless a method delta or added ingredient restores it.

This is the single most load-bearing idea in the design: **the recipe declares what the ingredient is *for here*, and the substitution declares what it can *do*.** A slot-level role declaration is what makes the same catalog-level substitution valid in a brownie and invalid in a génoise, without needing per-recipe authoring of every swap.

Sources for the role decomposition: eggs — [American Egg Board: emulsification](https://www.incredibleegg.org/professionals/manufacturers/real-egg-functionality/emulsification/) and [binding](https://www.incredibleegg.org/professionals/manufacturers/real-egg-functionality/binding/), [Chemistry LibreTexts 7.4 The Function of Eggs](https://chem.libretexts.org/Bookshelves/Biological_Chemistry/Chemistry_of_Cooking_(Rodriguez-Velazquez)/07:_Eggs/7.04:_The_Function_of_Eggs), [Understanding Ingredients for the Canadian Baker — The Function of Eggs](https://opentextbc.ca/ingredients/chapter/the-function-of-eggs/); sugar — [BAKERpedia](https://bakerpedia.com/the-function-of-sugar-in-baking/), [Medicine LibreTexts 6.1.4 Functions of Sugar](https://med.libretexts.org/Courses/Kansas_State_University/FNDH_313:_Science_of_Food/06:_Sweeteners_Fats_and_Desserts/6.01:_Sweeteners/6.1.04:_Functions_of_Sugar), [Baker Bettie](https://bakerbettie.com/function-of-sugar-in-baking/); salt — [Understanding Ingredients for the Canadian Baker — Functions of Salt](https://opentextbc.ca/ingredients/chapter/functions-of-salt-in-baking/), [King Arthur: why salt matters in yeast bread](https://www.kingarthurbaking.com/blog/2020/07/29/why-is-salt-important-in-yeast-bread), [Cargill: Salt in bread dough](https://www.cargill.com/salt-in-perspective/salt-in-bread-dough).

---

## 3. Substitution data table

Columns: **ratio**, **roles preserved**, **roles failed**, **method / parameter deltas required**. Rows are ordered roughly by how badly a naive 1-to-1 swap fails.

Source-quality marks: **[P]** peer-reviewed or standards body · **[T]** textbook / professional reference · **[S]** secondary (vendor, trade press, established practitioner site) · **[U]** unverified — number is commonly repeated but I did not confirm it against a primary source in this pass.

| # | From → To | Ratio / conversion | Preserves | **Fails** | **Method / parameter delta** | Src |
|---|---|---|---|---|---|---|
| 1 | Gelatine (powder) → agar-agar (powder) | ≈ 1 tsp agar per 1 Tbsp gelatine ≈ **1:3 by volume** | `thickener.gel` | melt-in-mouth mouthfeel (agar melts ≈85 °C vs gelatine at body temp), elasticity, clarity | **Must boil**: dissolve at ≥85–90 °C, simmer 2–3 min. Bloom/soak step *removed*. Sets at room temp (≈32–40 °C) → working window shortens drastically; no long pouring/layering step. Any "chill 4 h to set" step's duration collapses. | [S] |
| 2 | Whole egg → flax egg | 1 Tbsp ground flax + 3 Tbsp water per egg | `binder`, `moisture.hydration`, partial `emulsifier` | **`leavening.mechanical`**, `leavening.steam`, `structure.protein` (no coagulation), `colourant`, `browning.maillard` | Insert "hydrate 5 min until gelled" *before* the mixing step. **Delete any whipping/foaming step** — it does nothing. Invalid in sponge, angel food, soufflé, meringue. Expect denser crumb; often needs added chemical leavening. | [S] |
| 3 | Egg white → aquafaba | ≈ 3 Tbsp per egg (≈2 Tbsp per white) | `leavening.mechanical`, partial `binder`, `emulsifier` | `structure.protein` (much weaker coagulated set), neutral flavour | Whip time **substantially longer**; usually add an acid stabiliser (cream of tartar). Meringue drying temp/time changes. Does not set into a firm custard. | [S] |
| 4 | Butter → neutral oil, **in a creaming-method cake** | ≈ 0.8 g oil per 1 g butter by fat content (butter ≈80–84 % fat, ≈16 % water) — treat the 0.8 as *derived*, not measured | `fat.shortening` | **`leavening.mechanical` (creaming)**, `fat.plasticity`, `moisture.hydration` (butter's water), flavour | **This is the canonical method-rewrite case.** "Cream butter and sugar 4 min" must be *replaced* by "whisk eggs and sugar to ribbon, then stream in oil". Add back ≈16 % of the butter weight as liquid. Usually add chemical leavening to replace lost air. Lamination and shortcrust: substitution is simply **invalid**. | [S] |
| 5 | Wheat flour → gluten-free blend | 1:1 by weight *only as a starting point*; hydration must rise | `structure.starch`, bulk | **`structure.protein`** entirely | Add hydrocolloid (xanthan / psyllium / HPMC) as a **new ingredient**. **Delete the kneading step** — there is no gluten to develop; mixing becomes "beat 2–3 min to hydrate". Handling changes from dough to batter. Raise hydration (psyllium in particular permits and requires more water). Proof once, not twice. Bake longer/lower. | [P] hydration study, [S] technique |
| 6 | Baking powder → baking soda + cream of tartar | 1 tsp BP = **¼ tsp soda + ½ tsp cream of tartar** (2:1 acid:base) | `leavening.chemical` | **double-acting behaviour** — the DIY blend is single-acting | Reaction starts **on contact with liquid**. Any "rest the batter", "chill overnight", "portion tomorrow" step must be **removed**, and a "bake immediately" constraint inserted. Add ¼ tsp cornstarch if pre-blending. | [S] |
| 7 | NaCl → KCl (salt reduction) in bread | ~1:1 by molar Na equivalence **[U]** | `salt.gluten_strength`, `salt.fermentation_control` (approx) | `salt.flavour` — pronounced metallic/bitter off-note at high replacement | Usually partial replacement only. Bounded parameter, not a free swap (see #8). | [U] |
| 8 | Salt level in bread dough (parameter, not swap) | **1.8–2 % of flour weight**; workable band 1.5–2.5 % | — | — | Below ~1.5 %: gluten weakens, fermentation accelerates unpredictably, flavour strips. Above ~2.5 %: yeast suppressed, reduced volume, "foxy" reddish crust. → encode as a **bounded parameter with a quality guard**, and note that changing it changes bulk-ferment *duration*. | [T]/[S] |
| 9 | Salt level in a lacto-ferment (parameter) | **2 % of total (vegetable + water) weight** standard; 2–3.5 % working band | `salt.fermentation_control`, `salt.preservation` | — | **Safety-critical floor.** Salt is the primary antimicrobial barrier until acidification takes over; the durable protection is pH — *C. botulinum* cannot grow below pH 4.6, and below pH 4.0 essentially all pathogens are inhibited. → `severity: critical`, `on_violation: reject`. Reducing salt must *also* extend/verify the acidification step. | [P] BCCDC guidance + [S] |
| 10 | Sodium nitrite (cure #1) → celery juice powder | **No safe equivalence** | nominally `preservative.antimicrobial`, `colourant` | precision of dose | **Mark `no_substitute`.** Regulations permit up to **156 ppm ingoing nitrite** for comminuted cured meats; celery-powder curing delivers nitrite via bacterial conversion of nitrate with far less dose control and is regulated differently (labelled "uncured"). This is a slot that must be `locked: true`, `safety_class: regulated`. | [P]/[T] |
| 11 | Any acidulant swap in **canning** | Only valid if measured acidity is equivalent | `acid.ph` | — | **pH ≤ 4.6 is the gate** between boiling-water-bath and pressure canning. Substituting a weaker acid, or adding low-acid ingredients, silently moves a product across that line. → `computed: ph` guard with `severity: critical`. | [P] NCHFP |
| 12 | Garlic → garlic-infused oil (low-FODMAP) | ~1 Tbsp infused oil per 1–2 cloves **[U]** | `aromatic` | bulk, `texture.inclusion`, thickening from the paste, pungency of fresh allicin | Fructans are water-soluble but **not** oil-soluble — that is *why* this works. Method: **cannot be browned/sautéed as the aromatic base**; add the oil at the end or off heat. The "sweat the garlic 30 s" step is replaced, not rescaled. | [S] |
| 13 | Onion → asafoetida (low-FODMAP) | ~⅛–¼ tsp asafoetida per onion **[U]** | `aromatic` (allium-like) | bulk, `moisture.hydration`, sweetness from caramelised onion, `browning.maillard` | **Insert a new step**: bloom asafoetida in fat before other ingredients — raw it is harshly pungent, cooked it mellows. **Allergen interaction:** many asafoetida products use a *wheat-flour carrier* — a low-FODMAP substitution that can introduce gluten. Perfect example of why substitutions need allergen re-derivation, not inheritance. | [S] |
| 14 | Hop A → Hop B (bittering) | `mass_new = mass_old × aa_old / aa_new` (equal AAU; AAU = %α × oz) | bitterness contribution | **`aromatic`** — completely | Valid **only for bittering (long-boil) additions**. AAU ignores boil length, wort gravity and volume, so it is an approximation to IBU. For late/whirlpool/dry-hop additions the equivalence is *invalid* and the substitution must be by aroma profile, changing which step it enters. | [S] trade press |
| 15 | Granulated sugar → honey / maple | ~0.75 by weight with liquid reduction **[U]** | `sweetener.sweetness`, `sweetener.hygroscopy` (increased) | **`sweetener.structure` / creaming aeration** — no crystals to cut air into fat | Reduce other liquids. **Lower oven temperature** — fructose browns faster. Creaming step degrades to blending. Crumb becomes moister and denser. | [S], ratio [U] |
| 16 | Dairy milk → plant milk | 1:1 | `moisture.hydration` | `browning.maillard` (lactose + milk protein), fat, protein | Usually no method change in bread. **In custards and puddings**: protein-poor plant milks will not set → must **insert a starch/thickener** and a "cook to thicken, stirring" step. Same swap, different method impact depending on the slot's role vector — the argument for slot-level roles in one line. | [T]/[S] |
| 17 | Fresh yeast → instant dry yeast | ~1:3 by weight **[U]** | `leavening.biological` | minor flavour/tolerance differences | Fresh yeast's "dissolve in a little warm water" step is **deleted**; instant is added dry to flour. Reverse direction *inserts* that step. Small delta, but it is a genuine step insert/delete. | [U] |
| 18 | Preferment / *massa velha* → straight direct yeast | Rebalance: the preferment's flour and water must be folded back into the final dough totals | `leavening.biological` | `acid.ph` (fermentation acidity), dough maturation, flavour depth, keeping quality | **Removes an entire 12–16 h step** and changes the total-formula arithmetic. Bulk-ferment duration must be re-derived. Not a swap — a formula restructure. (Project knowledge; not web-sourced.) | project |

**Reading of the table.** Of 18 rows, **15 require a method or parameter delta**, and 6 require inserting or deleting a step outright. A ratio-only substitution model would be correct for roughly rows 16 (bread only) and 7. That is the empirical case for §8.

---

## 4. Constraint interactions

Substitutions do not live in isolation. Four independent constraint systems intersect them.

### 4.1 Allergens — EU 14

Regulation (EU) No 1169/2011, Annex II lists 14 substances requiring declaration: cereals containing gluten (wheat, rye, barley, oats, spelt, kamut), crustaceans, eggs, fish, peanuts, soybeans, milk (incl. lactose), tree nuts, celery, mustard, sesame, sulphur dioxide & sulphites (>10 mg/kg), lupin, molluscs. ([EU 1169/2011 Annex II](https://sites.manchester.ac.uk/foodallergens/information-for-food-businesses/eu-legal-requirements-on-food-allergen-labelling/))

Two protocol consequences:

1. **Allergen sets must be re-derived after substitution, never inherited.** Row 13 above (asafoetida with a wheat carrier) is a live counter-example, as is celery — an EU allergen that appears in "natural" curing and in stock powders. Sulphites appear in dried fruit and wine used as substitutes.
2. **Allergen freedom is a property of a resolved recipe, not of a substitution.** `tags: [gluten-free]` on a substitution record is a *claim about the replacement ingredient*, and the engine must recompute the union over the whole resolved ingredient set before asserting the resolved recipe is GF.

### 4.2 Diets

Model diets as **predicates over the resolved ingredient set**, evaluated post-substitution, not as free-text tags. Map to `schema.org/RestrictedDiet` on export for interop, but keep richer internal values: `vegan`, `vegetarian`, `pescatarian`, `halal`, `kosher` (+ `kosher-pareve` / `-dairy` / `-meat`, which is a *combination* constraint, not an ingredient one), `keto`, `low-fodmap`, `coeliac`, `low-lactose`, `low-sodium`.

Two diets break the simple predicate model and need explicit handling:

- **Kosher** is partly a *co-occurrence* constraint (meat + dairy in the same dish/equipment), so it must be evaluated over pairs, and it touches equipment, which lives outside the ingredient list.
- **Low-FODMAP** is *dose-dependent* — the constraint is on quantity per serving, so it must be evaluated **after scaling**, not before. This alone forces the ordering decision in §7.6.

### 4.3 Availability, seasonality, region

Substitutions carry `availability: { regions: [...], seasons: [...] }`. This is the layer that makes the protocol useful in Portugal specifically: a substitution catalog entry can be `available_in: [PT]` (e.g. *banha*, T65/T80/T130 flour designations, *massa velha*) and outrank a US-centric generic. Availability affects **ranking**, never **validity** — an unavailable substitution is still a correct substitution.

### 4.4 Cost

`cost_delta` as a signed relative figure with a currency and a date, or an enum (`cheaper` / `similar` / `pricier`). Absolute prices rot; keep them out of the recipe file and in a separate priced catalog.

### 4.5 Safety — the hard constraints

Three verified classes where substitution/scaling must be **refused, not warned**:

1. **Fermentation salinity floor.** 2 % of total weight standard for vegetable lacto-ferments; salt is the antimicrobial barrier before acidification, and pH < 4.6 is the durable protection. ([BCCDC fermented-vegetable guidance](https://www.bccdc.ca/resource-gallery/Documents/Educational%20Materials/EH/FPS/Food/Fermented/Fermented_Foods_Guidance-3.1_Fermented_Vegetables.pdf))
2. **Canning pH.** pH ≤ 4.6 permits boiling-water-bath processing; above it, pressure canning at 240 °F/116 °C is mandatory. A substitution that adds a low-acid ingredient can cross that line invisibly. ([NCHFP — Ensuring Safe Canned Foods](https://nchfp.uga.edu/how/can/general-information/ensuring-safe-canned-foods/))
3. **Curing nitrite.** 156 ppm ingoing limit for comminuted cured meats; "natural" celery-powder curing is a different regulatory and dose-control regime, not a drop-in.

Design implication: **guards are first-class objects that no layer can override**, and the engine must fail closed.

---

## 5. Where do substitutions live? A layered model

Three candidate homes were posed. All three are needed; the question is precedence.

**L0 — Catalog (global ingredient knowledge).** "Agar can generally replace gelatine at 1:3 and must be boiled." Authored once, versioned, cited, reused across every recipe. This is where the bulk of the table in §3 lives. L0 entries are *role-scoped*: they declare the roles they cover, and are only offered into slots whose critical roles they satisfy.

**L1 — Recipe overrides (author-asserted).** "In *this* pastel de nata, do not substitute the egg yolks — the custard depends on coagulation." Or: "in this recipe, use the L0 agar rule but *also* cut the chilling step to 45 min, because this filling sets faster." L1 can `extend`, `refine`, `deny`, or `define`.

**L2 — Computed / derived at render time.** GISMo-style ranking, LLM proposals, nutrition-driven swaps, pantry-driven swaps. Cheap to add, impossible to trust.

**L3 — User / household preference.** "I never keep butter." A *selection* over available offers plus a standing pantry state.

### Precedence (highest wins)

```
guards (safety)            ← absolute; no layer overrides. Evaluated last, always.
  ▲
L1.deny                    ← author says "not in this recipe"      (hard veto)
L1.define / L1.refine      ← author's per-recipe substitution / refinement of an L0 rule
L0                         ← catalog default
L2 (derived)               ← only surfaced if nothing above matched; always badged
L3                         ← chooses among what survives; can never create or unlock
```

Rules that make this tractable:

- **L1 refines by reference**, not by copy: `extends: cat.sub.gelatin-to-agar`, then override only the fields that differ. This prevents the catalog fix from being stranded behind a hundred stale copies.
- **L1 may tighten a guard, never loosen it.** A recipe can say "salt floor 2.5 % here"; it cannot say "1 % is fine".
- **L2 output is never auto-applied** to a slot containing a `critical: true` role, and never at all where a `severity: critical` guard is in scope. It may be *suggested*, badged `derived: true` with its model/version in provenance.
- **L3 cannot invent.** The user picks from resolved offers. "I don't have X" without an available offer produces an honest "we can't safely tell you how to do that", not a hallucination.

This layering is the answer to "substitutions for *each* ingredient for *each* recipe" without asking authors to write N×M records: L0 supplies breadth, slot role vectors filter it per recipe, L1 supplies precision only where the author knows better.

---

## 6. Recipe "variants" vs "substitutions" — decision rule

The project already has a variant model (SPEC-006: `recipe_family_id`, `variant_of_recipe_id`, `variant_label`; e.g. *Lagoinha Sementes* as a variant of *Lagoinha*). Substitutions must not duplicate it.

**Decision rule — promote a substitution to a derived variant if ANY of the following holds:**

1. **Identity change.** The result has its own name or cultural identity in the domain. (*Broa de milho* is not "*pão* with a maize substitution.")
2. **Technique-class change at the top level.** Creaming-method cake → oil cake; baked → no-bake; direct dough → preferment dough.
3. **Breadth.** Method deltas touch more than ~40 % of steps, **or** ≥ 3 ingredient slots change **and** ≥ 2 steps are inserted.
4. **Yield/format change.** Different pan, different unit count, different portioning.
5. **Bundling.** Two or more substitution axes are *always* applied together in practice — that bundle is a recipe, not a toggle.
6. **Expert judgement.** A domain expert would call it a different product.

**Keep it a substitution when** it touches one slot, needs ≤ 3 method ops, does not change what the dish *is*, and the base recipe remains an honest description of what you are doing.

**Critical corollary — variants are compiled, not forked.** A variant may declare:

```yaml
derived_from:
  recipe: rcp.pao-de-lo
  apply: [sub.butter-to-oil, sub.wheat-to-gf]
  materialised_at: 2026-08-02
```

The variant is *generated* by resolving the parent plus substitutions, then frozen. This gives the offline-completeness SPEC-006 requires (the stored snapshot is complete and standalone) while keeping a machine-checkable link to the parent, so a parent fix surfaces as "this variant is stale" instead of silently drifting. That is the failure mode of every fork-based system.

---

## 7. Proposed schema

### 7.1 Core shape

```yaml
recipe:
  id: rcp.pao-de-lo-ovar
  version: 3
  yield: { amount: 1, unit: bolo, basis_weight_g: 900 }

  ingredients:                      # SLOTS, not strings. Each has a stable id.
    - id: slot.flour
      ref: cat:flour-wheat-t65      # canonical catalog id
      qty: { value: 250, unit: g }
      scaling_basis: batch          # batch | per:<slot> | fixed
      roles:
        - { role: structure.protein, weight: 3, critical: true }
        - { role: structure.starch,  weight: 2, critical: false }

  steps:
    - id: step.cream                # STABLE SLUG, never an array index
      technique: creaming           # semantic tag — enables anchoring + validation
      uses: [slot.butter, slot.sugar]
      params:
        duration: { value: 4, unit: min }
        speed: medium
      text:
        pt: "Bater a manteiga com o açúcar 4 min até esbranquiçar."

  guards: [...]                     # see 7.5
  substitutions: [...]              # L1; see 7.3
```

Three non-negotiables in that shape:

- **Ingredients are slots with IDs.** Not strings (schema.org's mistake), not positions. A slot is the thing a substitution targets.
- **Steps have author-stable slugs.** `step.cream`, not `steps[3]`. Editing the text of a step does not move it. Reordering does not move it.
- **Steps carry a `technique` tag.** This gives a *semantic* anchor as a fallback to the ID anchor, and lets the engine validate "you removed the only `creaming` step but a slot still declares `leavening.mechanical, critical: true`."

### 7.2 The substitution record

```yaml
- id: cat.sub.gelatin-to-agar
  layer: catalog                    # catalog | recipe | derived
  target:
    ingredient: cat:gelatin         # OR: role_selector, for generic rules
    requires_roles: [thickener.gel] # only offered into slots needing these
  replacement:
    - ingredient: cat:agar-agar-powder
      conversion:
        type: ratio                 # ratio | per_unit | formula | equivalence | table
        by: mass
        factor: 0.33
        confidence: medium
  roles:
    preserves: [thickener.gel]
    loses:
      - { role: texture.mouthfeel, note: "agar melts ≈85 °C; no melt-in-mouth" }
    adds: []
  method_deltas: [...]              # THE KEY FIELD — see 7.4
  tags: [vegan, vegetarian, halal, kosher-pareve]
  allergens: { removes: [], adds: [] }
  availability: { regions: [PT, EU], seasons: null }
  cost_delta: similar
  quality:
    rating: 4                       # 1–5
    tested: true
    n_trials: null
    result_delta:
      texture: "firmer, cleaner break, less creamy"
      flavour: "neutral"
      shelf_life: "stable at room temperature"
  provenance:
    asserted_by: { type: publisher, name: "Cape Crystal Brands" }
    source:
      kind: vendor-technical
      url: https://www.capecrystalbrands.com/blogs/cape-crystal-brands/replacing-gelatin-with-agar-agar-a-comprehensive-guide
    method: literature
    date: 2026-08-02
    confidence: 0.7
    verification: secondary         # primary | secondary | unverified | model
```

**Conversion types.** A single `ratio` field is not enough:

| `type` | Use when | Example |
|---|---|---|
| `ratio` | Linear mass or volume factor | agar = 0.33 × gelatine mass |
| `per_unit` | The source is counted, not weighed | 1 egg → 1 Tbsp flax + 3 Tbsp water |
| `formula` | Deterministic expression over declared variables | hops: `mass_new = mass_old * aa_old / aa_new` |
| `equivalence` | Preserve a **functional unit**; engine solves for mass | preserve `AAU`; preserve `bloom_strength`; preserve `salinity_pct`; preserve `total_flour_protein_pct` |
| `table` | Non-linear, empirically tabulated | hydration curves for GF blends |
| `compound` | Replacement is a **set** | butter → oil + water + (optional) extra leavening |

`equivalence` is the most powerful and the least obvious: it lets the catalog say "these two things are interchangeable *in this functional unit*", and the engine derives the quantity from ingredient properties, so the record does not go stale when a supplier's alpha acid changes.

### 7.3 L1 recipe-level override

```yaml
substitutions:
  - extends: cat.sub.gelatin-to-agar
    layer: recipe
    override:
      method_deltas:
        - op: set_param
          target: { step: step.chill, param: duration }
          value: { value: 45, unit: min }
          reason: "agar sets at room temperature; 4 h is pointless here"

  - deny:
      target: { slot: slot.egg-yolk }
      reason: "the custard's set depends on yolk coagulation; nothing else here provides structure.protein"
      severity: quality
```

### 7.4 Method deltas — the op vocabulary

A **closed, typed, domain-specific op list**, anchored to stable IDs, colocated with the substitution record. Roughly ten ops:

| Op | Args | Notes |
|---|---|---|
| `set_param` | `target{step,param}`, `value` | Non-commutative. Max one per address. |
| `adjust_param` | `target`, `factor` or `delta`, optional `clamp` | Commutative — factors fold multiplicatively, deltas additively. |
| `set_text` | `target{step}`, `text{locale}` | Localised. May interpolate `{{slot.x}}`. |
| `insert_step` | `anchor{before|after: step-id \| technique}`, `step{…}` | New step's `id` is namespaced by the substitution id → globally unique, no collisions when two subs both insert. |
| `remove_step` | `target{step}`, `reason` | Reason is required, and is shown to the user. |
| `replace_step` | `target{step}`, `step{…}` | Sugar for remove+insert with the same id; keeps downstream anchors valid. |
| `set_technique` | `target{step}`, `technique` | Semantic. `creaming → whisking`. Drives validation of lost roles. |
| `set_quantity` | `target{slot}`, `value` or `factor` | For knock-on quantity changes (e.g. reduce other liquid). |
| `add_ingredient` | `slot{…}` | Must declare `scaling_basis` (see 7.6). |
| `remove_ingredient` | `target{slot}`, `reason` | |
| `require_equipment` / `drop_equipment` | `equipment id` | e.g. GF bread needs a loaf tin; agar needs a saucepan. |

**Anchors.** Two forms, checked in order:

```yaml
target: { step: step.cream }                  # primary: stable slug
target: { technique: creaming, occurrence: first }   # fallback: semantic
```

Semantic anchoring is what keeps deltas alive across substantial recipe edits, and it degrades honestly: if no `creaming` step exists, the op fails loudly rather than patching the wrong place.

**Write-set.** Every op declares a computable **target address** — `(step.cream, param.duration)`, `(slot.butter, qty)`, `(step.knead, existence)`. This is what makes conflict detection mechanical (§7.7).

### 7.5 Safety guards

```yaml
guards:
  - id: guard.brine-salinity
    applies_to:
      computed: salinity_pct        # a named, engine-computed quantity
    min: 2.0
    max: 5.0
    unit: "%w/w"
    severity: critical              # critical | quality | preference
    on_violation: reject            # reject | warn | clamp
    immutable_by: [substitution, scaling, user, derived]
    rationale: >
      Salt is the primary antimicrobial barrier until acidification takes over.
      Durable protection is pH < 4.6 (C. botulinum); below 4.0 essentially all
      pathogens are inhibited.
    source:
      kind: public-health-guidance
      name: "BCCDC — Fermented Foods Guidance 3.1, Fermented Vegetables"
      url: https://www.bccdc.ca/resource-gallery/Documents/Educational%20Materials/EH/FPS/Food/Fermented/Fermented_Foods_Guidance-3.1_Fermented_Vegetables.pdf

  - id: guard.no-nitrite-substitution
    applies_to: { slot: slot.cure-1 }
    locked: true
    no_substitute:
      reason: >
        Regulated ingoing nitrite limit (156 ppm for comminuted cured meats).
        Celery-powder curing is a different dose-control and regulatory regime,
        not a drop-in replacement.
    severity: critical
    safety_class: regulated
```

Guard semantics:

- Guards are evaluated **after every transform** (substitution, scaling, user edit) — never once at author time.
- `severity: critical` + `on_violation: reject` → **fail closed**. The engine refuses to emit a resolved recipe and reports which transform breached which guard. It does not quietly clamp.
- `on_violation: clamp` is permitted only for `severity: quality`, and the resolved output must carry `clamped: true` with the original value, surfaced in the UI. (This matches the project's existing Norman-aligned clamp-feedback convention.)
- `immutable_by` names the layers that cannot touch the guard. `substitution` and `derived` should almost always be in that list.
- `computed:` quantities (`salinity_pct`, `ph`, `nitrite_ppm`, `salt_pct_of_flour`, `hydration_pct`) are declared once in the catalog with their formulas, so guards are portable across recipes.

### 7.6 Scaling × substitution — order of operations

This is under-specified in every system I looked at, and it is a correctness bug, not a nicety.

**Canonical pipeline. Normative order:**

1. **Resolve base** at the authored yield. Canonical quantities in canonical units.
2. **Apply substitutions** — ingredient-set transforms *and* method deltas — **at the authored yield**.
3. **Apply yield scaling** to the substituted ingredient set.
4. **Apply non-linear scaling rules** — bake time vs. pan geometry, leavening sub-linearity, brine volume vs. vessel.
5. **Recompute derived quantities** — allergen union, diet predicates, `computed:` values.
6. **Evaluate guards.** Fail closed on `critical`.

**Why substitutions come first (step 2 before step 3):** conversion formulas are authored and *tested* in one frame of reference — the authored yield. `equivalence` and `table` conversions are frequently non-linear, so applying them to an already-scaled quantity gives a different (wrong) answer. Testing is also far easier: every substitution has exactly one canonical resolved output to snapshot.

**The invariant that makes this safe.** Any absolute quantity a substitution *introduces* must declare a `scaling_basis`:

```yaml
- op: add_ingredient
  slot:
    id: slot.xanthan
    ref: cat:xanthan-gum
    qty: { value: 5, unit: g }
    scaling_basis: { per: slot.flour, per_amount: { value: 500, unit: g } }
```

With `scaling_basis` declared, steps 2 and 3 **commute** for that quantity — the result is identical either way, which is exactly the property that makes the ordering rule safe rather than merely conventional. A substitution that introduces a `scaling_basis: fixed` quantity (rare: e.g. "one bay leaf") must be flagged, because it *does* break commutativity and needs the author's judgement about what happens at 10×.

**Dose-dependent diet predicates (low-FODMAP) are evaluated at step 5**, after scaling, because the constraint is per serving. Allergen predicates are set-membership and can be evaluated at either point, but are pinned to step 5 for uniformity.

### 7.7 Conflict detection

Two substitutions applied at once either commute or they do not. Resolve mechanically:

1. Compute each substitution's **write-set** of target addresses.
2. **Disjoint write-sets → commute.** Apply in deterministic order (sorted by substitution id) so output is reproducible.
3. **Overlapping write-sets** →
   a. Both ops are `adjust_param` → fold (multiply factors / sum deltas), then clamp. Safe.
   b. Any `set_param` / `set_text` / `set_technique` collision, or one substitution removes a step another writes → **conflict**.
4. On conflict, look for a declared **pair override**:

```yaml
combined_substitutions:
  - id: cat.sub.pair.vegan-plus-gf-creamed-cake
    applies_when: [cat.sub.butter-to-oil, cat.sub.wheat-to-gf]
    supersedes: true
    method_deltas: [ ... ]          # authored resolution for the pair
    quality: { rating: 3, tested: true }
```

5. No pair override → **refuse and explain**. Show the user both substitutions, the addresses they fight over, and offer the choice. Never guess, never silently pick one.

Combinatorial reality check: with *n* substitutions there are 2ⁿ subsets, but conflicts are sparse — most substitutions touch disjoint slots and steps. The engine only ever materialises pairs (and rarely triples) that actually collide, and only those need authored overrides. This keeps the authored surface roughly O(conflicts), not O(2ⁿ). CI should enumerate all pairs, compute write-sets, and fail the build on any *undeclared* conflicting pair — turning a combinatorial blow-up into a finite, enumerable list of authoring TODOs.

### 7.8 Provenance and confidence

Non-negotiable fields on every substitution:

```yaml
provenance:
  asserted_by: { type: publisher|author|community|model, name: ..., id: ... }
  source: { kind: peer-reviewed|textbook|standards-body|vendor-technical|trade-press|blog|folk, title, url }
  method: tested_in_kitchen | literature | model_inference
  date: 2026-08-02
  confidence: 0.0–1.0
  verification: primary | secondary | unverified | model
quality:
  rating: 1–5
  tested: true|false
  n_trials: 6
  result_delta: { texture: ..., flavour: ..., appearance: ..., shelf_life: ... }
```

Rules:

- `verification: model` implies `layer: derived`, implies a visible badge, implies never auto-applied where a `critical` role or guard is in scope.
- `quality.rating` and `provenance.confidence` are **different axes** and must not be collapsed: a substitution can be *certainly known* to give a *mediocre* result (flax egg in a sponge: confidence high, rating 1).
- `result_delta` is the honest-outcome field. "This works" is not the same as "this gives the same result", and users deserve the second.

---

## 8. Method-delta design: options weighed, decision made

### Option (i) — JSON Patch (RFC 6902) against the step array

**For:** an existing IETF standard; libraries everywhere; no invention.

**Against, decisively:**

- **Pointers are positional.** `/steps/3/text` breaks the moment anyone inserts a step. Recipes are edited constantly. This is a silent-corruption failure mode: the patch still *applies*, to the wrong step.
- **Untyped.** There is no way to say "raise the temperature by 10 °C" — only "replace this whole value". Every parameter tweak becomes a full-value restatement that goes stale.
- **No domain semantics → no validation.** The engine cannot know that a patch removed the only aerating step, because `remove /steps/2` carries no meaning.
- **Conflict detection is impossible in general.** Two patches over an array are not comparable without applying them.
- **Unreadable to a baker.** The product owner's users author YAML. `{"op":"replace","path":"/steps/3/params/duration/value","value":2}` is not a thing a baker writes or reviews.

RFC 6902's `test` op does not rescue this; it detects breakage after the fact rather than preventing mis-anchoring.

### Option (ii) — inline conditionals (`when: subs.eggs == flax`)

**For:** excellent locality — you read the step and see all its variants. No anchoring problem at all, since the condition lives where it applies. Familiar (feature flags).

**Against:**

- **The base recipe stops being readable.** Every conditional is a tax on the 90 % of readers using no substitutions. A bread recipe with five substitution axes becomes a nest of `when:` blocks.
- **The substitution is not a *thing*.** Its consequences are scattered across the step array, so you cannot review, version, cite, rate, or test "the agar substitution" as an object. Provenance has nowhere to attach.
- **Combinatorics land on the author.** With two axes, the author must anticipate and hand-write the `A ∧ B` branches inline. This is the exact place feature-flag systems rot.
- **Insertions are awkward.** A conditionally-present step must be written into the base array with a `when:`, so the base recipe carries steps that are not part of it.

### Option (iii) — full alternative variants (fork/derive)

**For:** trivially readable; trivially renderable; each variant is exactly what you cook; perfect for large divergence.

**Against:** N substitutions → N (or 2ⁿ) maintained recipes. Fixing a typo in the base does not fix the forks. Drift is guaranteed, and it is the observed failure mode of every recipe site with "vegan version" pages. Unacceptable as the *primary* mechanism for the 80 % case of a single-slot swap.

### Option (iv) — general rules engine

**For:** maximum expressiveness; handles the long tail.

**Against:** unbounded semantics means untestable, unexplainable, and unauthorable. The user cannot be told *why* the method changed. It also collapses the L0/L1/L2 layering, since a rule can do anything. This is how you get Samsung Food's behaviour — plausible output, no accountability.

### Recommendation

**Adopt (i′): a closed, typed, domain-specific op list anchored to stable step IDs with semantic fallback anchors, colocated inside the substitution record — with (iii) available via an explicit promotion rule, and (ii) permitted only as non-structural rendering annotations. Reject (iv) outright.**

Concretely:

- **Primary mechanism: the op vocabulary of §7.4.** Not JSON Patch — the same *shape* as a patch list, but with domain-typed ops, ID-based anchors, and declared write-sets. This is the crucial divergence from RFC 6902 and it buys three things RFC 6902 cannot give: stability under editing, mechanical conflict detection, and semantic validation ("you removed the only `creaming` step but `slot.butter` declares `leavening.mechanical, critical: true`").
- **Colocation is the point.** All consequences of `sub.butter-to-oil` live in one record. That record is the unit of review, versioning, citation, rating, testing, and display. Option (ii) forfeits this; option (i) forfeits it too, since a bare patch has nowhere to hang provenance.
- **`when:` survives in one narrow role:** inline *notes* — "if using agar, the mixture will set as it cools, so work quickly." Advisory text, no structural effect, no combinatorial burden.
- **Promotion to (iii) via the §6 decision rule,** with variants *compiled* from parent + substitutions and marked stale when the parent moves. This handles genuine divergence without fork drift.

**Why this wins on each axis the brief asked about:**

- *Step-ID stability under editing:* author-assigned slugs plus semantic technique anchors. Text edits and reorderings are free; deleting an anchored step is caught by a CI lint that resolves every op against every recipe.
- *Authoring ergonomics:* a baker writes the base recipe once, cleanly, with no substitution noise. Then, separately, a short block: "if you use oil instead of butter, step `cream` becomes a whisk and you add 40 g of milk." That is close to how bakers already talk. The common case — a pure ratio swap — needs **zero** ops.
- *Renderer complexity:* one fold over an op list against a step map. Simpler than evaluating conditions inside every step (option ii) and far simpler than a rules engine. Renderers that don't support substitution ignore the field and still render a valid recipe — the format degrades gracefully, which matters for interop.
- *Combinatorial explosion:* handled by write-sets, not by authoring. Only genuinely colliding pairs need an authored `combined_substitutions` record, and CI enumerates them so the list is finite and known.
- *Testability:* every substitution has a canonical resolved output at the authored yield → golden-file snapshot tests. Guards get property tests ("no substitution × scale combination drives salinity below 2 %"). Ops get resolution lints. This is the axis where options (ii) and (iv) fail worst.

---

## 9. Worked examples

### (a) Simple ratio swap — no method change

```yaml
# catalog
- id: cat.sub.milk-to-oat
  layer: catalog
  target:
    ingredient: cat:milk-whole
    requires_roles: [moisture.hydration]
  replacement:
    - ingredient: cat:oat-milk
      conversion: { type: ratio, by: mass, factor: 1.0 }
  roles:
    preserves: [moisture.hydration]
    loses:
      - { role: browning.maillard, note: "no lactose or milk protein; paler crust" }
      - { role: fat.shortening, note: "much lower fat unless barista-style" }
  method_deltas: []                       # ← genuinely empty. The easy case stays easy.
  tags: [vegan, dairy-free]
  allergens: { removes: [milk], adds: [gluten-oats] }   # NB: oats are an Annex II gluten cereal
  availability: { regions: [PT, EU] }
  cost_delta: pricier
  quality:
    rating: 4
    tested: true
    result_delta: { appearance: "paler crust", texture: "marginally drier crumb" }
  provenance:
    asserted_by: { type: author, name: "Pão de Portugal" }
    method: tested_in_kitchen
    verification: primary
    confidence: 0.9
```

Note the allergen field: swapping *out* an allergen swapped *in* another. Inheritance would have got this wrong.

### (b) A swap that rewrites the method

Butter → oil in a creaming-method *pão-de-ló*-style cake. This is the case the whole design exists for.

```yaml
- id: cat.sub.butter-to-oil-creamed
  layer: catalog
  target:
    ingredient: cat:butter-unsalted
    requires_roles: [fat.shortening]
    # deliberately NOT requires_roles: [fat.plasticity] — see `blocked_when`
  blocked_when:
    - slot_declares: { role: fat.plasticity, critical: true }
      reason: "lamination and shortcrust depend on solid fat; oil cannot substitute"
  replacement:
    - ingredient: cat:sunflower-oil
      conversion:
        type: equivalence
        preserve: fat_mass          # butter ≈80–84 % fat → engine derives ≈0.82×
        confidence: medium
  roles:
    preserves: [fat.shortening]
    loses:
      - { role: leavening.mechanical, note: "oil cannot be creamed; air is not incorporated" }
      - { role: fat.plasticity }
      - { role: moisture.hydration, note: "butter is ≈16 % water" }
    adds: []
  method_deltas:
    - op: set_technique
      target: { step: step.cream }
      technique: whisking

    - op: set_text
      target: { step: step.cream }
      text:
        pt: "Bater os ovos com o açúcar até fita (≈6 min), depois juntar o óleo em fio, sem parar de bater."
        en: "Whisk eggs and sugar to the ribbon (≈6 min), then stream in the oil, whisking continuously."

    - op: set_param
      target: { step: step.cream, param: duration }
      value: { value: 6, unit: min }

    - op: add_ingredient          # restore butter's water
      slot:
        id: slot.compensating-liquid
        ref: cat:milk-whole
        qty: { value: 0.16, unit: ratio_of }
        scaling_basis: { per: slot.butter }
        roles: [ { role: moisture.hydration, weight: 2, critical: false } ]

    - op: insert_step             # restore some of the lost mechanical leavening
      anchor: { after: step.cream }
      step:
        id: step.fold-leavener
        technique: folding
        uses: [slot.baking-powder]
        text:
          pt: "Peneirar o fermento em pó sobre a massa e envolver delicadamente."

    - op: add_ingredient
      slot:
        id: slot.baking-powder
        ref: cat:baking-powder
        qty: { value: 6, unit: g }
        scaling_basis: { per: slot.flour, per_amount: { value: 250, unit: g } }
        roles: [ { role: leavening.chemical, weight: 2, critical: true } ]
  tags: [vegan-compatible, dairy-free, cheaper]
  allergens: { removes: [milk], adds: [] }
  quality:
    rating: 3
    tested: true
    result_delta:
      texture: "moister, denser, closer crumb; stays soft longer"
      flavour: "loses butter flavour entirely"
      shelf_life: "longer — oil does not firm on cooling"
  provenance:
    asserted_by: { type: publisher, name: "Nigella Lawson (Ask Nigella)" }
    source:
      kind: trade-press
      url: https://www.nigella.com/ask/oil-instead-of-butter-for-baking
    method: literature
    verification: secondary
    confidence: 0.75
    note: >
      Source is explicit that oil cannot be creamed and that creamed-method cakes
      go flatter and denser with oil. The compensating milk (0.16×) and the added
      chemical leavening are DERIVED from butter's composition and the lost
      mechanical-leavening role, not quoted from the source. Mark as engineered.
```

Six ops, one record, fully reviewable, honestly attributed, with the derived parts flagged as derived. That is the thing options (i), (ii) and (iv) cannot produce.

### (c) A swap gated by safety bounds

Reducing sodium in a *chucrute*-style lacto-ferment.

```yaml
recipe:
  id: rcp.chucrute-base
  yield: { amount: 1, unit: frasco, basis_weight_g: 1000 }

  ingredients:
    - id: slot.cabbage
      ref: cat:cabbage-white
      qty: { value: 900, unit: g }
      roles: [ { role: structure.starch, weight: 1, critical: false } ]
    - id: slot.salt
      ref: cat:salt-sea-fine
      qty: { value: 20, unit: g }        # 2.0 % of 1000 g total
      roles:
        - { role: salt.fermentation_control, weight: 3, critical: true }
        - { role: salt.preservation,         weight: 3, critical: true }
        - { role: salt.flavour,              weight: 2, critical: false }

  computed:
    salinity_pct:
      formula: "sum(slots where role contains salt.preservation).mass / total_mass * 100"

  guards:
    - id: guard.brine-salinity
      applies_to: { computed: salinity_pct }
      min: 2.0
      max: 5.0
      unit: "%w/w"
      severity: critical
      on_violation: reject
      immutable_by: [substitution, scaling, user, derived]
      rationale: >
        Salt is the primary antimicrobial barrier until acidification takes over;
        pH < 4.6 inhibits C. botulinum, and most active ferments reach < 4.0.
      source:
        kind: public-health-guidance
        name: "BCCDC — Fermented Foods Guidance 3.1, Fermented Vegetables"
        url: https://www.bccdc.ca/resource-gallery/Documents/Educational%20Materials/EH/FPS/Food/Fermented/Fermented_Foods_Guidance-3.1_Fermented_Vegetables.pdf

  substitutions:
    - id: rcp.sub.reduce-sodium
      layer: recipe
      target: { slot: slot.salt }
      replacement:
        - ingredient: cat:salt-sea-fine
          conversion: { type: ratio, by: mass, factor: 0.5 }   # user wants half the salt
      guarded_by: [guard.brine-salinity]
      quality: { rating: 1, tested: false }
      provenance:
        asserted_by: { type: community }
        verification: unverified
```

**Engine trace.**

```
step 1  resolve base                 salt 20 g / total 1000 g  → salinity 2.00 %
step 2  apply rcp.sub.reduce-sodium  salt 10 g / total  990 g  → salinity 1.01 %
step 5  recompute                    salinity_pct = 1.01
step 6  guards                       guard.brine-salinity: 1.01 < min 2.0
                                     severity=critical, on_violation=reject
        →  REJECT. No resolved recipe emitted.
```

Surfaced to the user:

> Não é possível reduzir o sal para metade nesta receita. A salinidade cairia para 1,0 %, abaixo do mínimo de segurança de 2,0 %. O sal é a barreira antimicrobiana até o pH descer abaixo de 4,6.

And the same guard blocks the scaling attack: adding 500 g more cabbage without more salt trips the identical check at step 6, because guards run after *every* transform rather than at authoring time. A partial NaCl→KCl replacement, by contrast, **passes** — it preserves `salt.preservation` mass-wise while trading `salt.flavour` — which is precisely the distinction a role-aware guard can make and a naive "don't reduce salt" rule cannot.

### (d) Two substitutions at once, with a conflict

Vegan (butter→oil) + coeliac (wheat→GF) applied to the same creamed cake.

```yaml
# sub A: cat.sub.butter-to-oil-creamed  (example b)
#   write-set: (step.cream, technique) (step.cream, text) (step.cream, param.duration)
#              (slot.compensating-liquid, exists) (step.fold-leavener, exists)
#              (slot.baking-powder, exists)

- id: cat.sub.wheat-to-gf-blend
  layer: catalog
  target:
    ingredient: cat:flour-wheat-t65
    requires_roles: [structure.starch]
  replacement:
    - ingredient: cat:gf-blend-rice-tapioca
      conversion: { type: ratio, by: mass, factor: 1.0 }
  roles:
    preserves: [structure.starch]
    loses: [ { role: structure.protein, note: "no gluten network at all" } ]
  method_deltas:
    - op: add_ingredient
      slot:
        id: slot.psyllium
        ref: cat:psyllium-husk
        qty: { value: 10, unit: g }
        scaling_basis: { per: slot.flour, per_amount: { value: 250, unit: g } }
        roles: [ { role: structure.protein, weight: 2, critical: true } ]
    - op: adjust_param
      target: { step: step.bake, param: duration }
      factor: 1.15
    - op: set_param
      target: { step: step.cream, param: duration }        # ← COLLISION
      value: { value: 3, unit: min }
      reason: "GF batters break down with prolonged beating"
  # write-set: (slot.psyllium, exists) (step.bake, param.duration)
  #            (step.cream, param.duration)
```

**Conflict detection.**

```
A ∩ B = { (step.cream, param.duration) }
A writes  set_param 6 min
B writes  set_param 3 min
both are set_param → non-commuting → CONFLICT
lookup combined_substitutions where applies_when ⊇ {A, B} → found
```

```yaml
combined_substitutions:
  - id: cat.sub.pair.vegan-gf-creamed-cake
    applies_when: [cat.sub.butter-to-oil-creamed, cat.sub.wheat-to-gf-blend]
    supersedes: true
    resolution_note: >
      A wants a long whisk to build mechanical aeration lost with the butter;
      B wants a short mix because GF batters degrade with prolonged beating.
      Neither wins on its own terms: aerate the eggs BEFORE the flour is present,
      then fold briefly. This splits one step into two.
    method_deltas:
      - op: set_param
        target: { step: step.cream, param: duration }
        value: { value: 6, unit: min }
        reason: "aeration happens before flour is added, so GF degradation does not apply"
      - op: insert_step
        anchor: { after: step.cream }
        step:
          id: step.fold-gf-flour
          technique: folding
          uses: [slot.flour, slot.psyllium]
          params: { duration: { value: 60, unit: s } }
          text:
            pt: "Envolver a mistura sem glúten e o psyllium em 3 adições, no máximo 60 s no total."
      - op: remove_step
        target: { step: step.mix-flour }
        reason: "superseded by step.fold-gf-flour"
      - op: adjust_param
        target: { step: step.rest, param: duration }
        factor: 3.0
        reason: "psyllium and GF starches need hydration time before baking"
    quality:
      rating: 3
      tested: true
      n_trials: 4
      result_delta:
        texture: "tighter, moister crumb; noticeably more fragile when warm"
    provenance:
      asserted_by: { type: author, name: "Pão de Portugal" }
      method: tested_in_kitchen
      verification: primary
      confidence: 0.8
```

**If no pair override existed**, the engine refuses:

> *Não podemos aplicar "sem lacticínios" e "sem glúten" ao mesmo tempo nesta receita.* Both substitutions want to change how long you beat the batter, for opposite reasons (6 min to build air vs 3 min to protect the gluten-free batter). Choose one, or ask us to test the combination.

That message is only possible because ops carry addresses **and reasons**. A JSON Patch conflict can say "both wrote `/steps/3/params/duration/value`"; it cannot say why, and it cannot say what to do instead.

---

## 10. Open questions

1. **Canonical ingredient IDs.** Everything here presumes a stable catalog namespace (`cat:flour-wheat-t65`). Alignment with FoodOn / USDA (as FoodKG does) buys interop; alignment with Portuguese practice (T65/T80/T130, *banha*, *massa velha*) buys correctness for this project. Probably: local IDs with optional `sameAs` mappings outward.
2. **How many ops is too many before promotion to a variant?** §6 proposes ~40 % of steps or ≥3 slots + ≥2 inserts. This threshold is a guess and should be calibrated against the first 50 real substitutions authored.
3. **Should `equivalence` conversions be extensible?** A closed set (`fat_mass`, `AAU`, `bloom_strength`, `salinity_pct`, `protein_pct`) is testable; an open set is expressive. Lean closed, extend by version.
4. **L2 (derived) ranking source.** GISMo/Recipe1MSubs is the obvious offline candidate and is open-source, but is trained on English-language Recipe1M and will be weak on Portuguese heritage ingredients. Assume L2 is a convenience, never a dependency.
5. **Locale of method-delta text.** Ops carry localised `text`, so a substitution's consequences must be translated. Untranslated ops should fall back to the base locale with a marker rather than dropping the delta.

---

## 11. Sources

Peer-reviewed / standards / public-health:

- Shirai, Seneviratne et al., *Identifying Ingredient Substitutions Using a Knowledge Graph of Food* (2021) — https://pubmed.ncbi.nlm.nih.gov/33733228/ · https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7861309/
- Fatemi, Duval et al., *Learning to Substitute Ingredients in Recipes* (GISMo), arXiv:2302.07960 — https://arxiv.org/abs/2302.07960 · code https://github.com/facebookresearch/gismo
- *Large Language Models for Ingredient Substitution…*, arXiv:2412.04922 — https://arxiv.org/abs/2412.04922
- Ławrynowicz et al., *Food Recipe Ingredient Substitution Ontology Design Pattern* (2022) — https://pmc.ncbi.nlm.nih.gov/articles/PMC8837940/
- Park et al., *FlavorGraph*, Sci Rep (2021) — https://www.nature.com/articles/s41598-020-79422-8
- Ahn et al., *Flavor network and the principles of food pairing*, Sci Rep (2011) — https://www.nature.com/articles/srep00196
- Elsweiler, Trattner & Harvey, *Exploiting Food Choice Biases for Healthier Recipe Recommendation*, SIGIR 2017 — https://dl.acm.org/doi/10.1145/3077136.3080826
- *Effect of Hydration on Gluten-Free Breads Made with HPMC in Comparison with Psyllium and Xanthan Gum* — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7693925/
- NCHFP, *Ensuring Safe Canned Foods* — https://nchfp.uga.edu/how/can/general-information/ensuring-safe-canned-foods/
- BCCDC, *Fermented Foods Guidance 3.1 — Fermented Vegetables* — https://www.bccdc.ca/resource-gallery/Documents/Educational%20Materials/EH/FPS/Food/Fermented/Fermented_Foods_Guidance-3.1_Fermented_Vegetables.pdf
- Regulation (EU) 1169/2011 Annex II, 14 allergens — https://sites.manchester.ac.uk/foodallergens/information-for-food-businesses/eu-legal-requirements-on-food-allergen-labelling/
- AMSA / Pork Information Gateway, *Alternative Curing* — https://meatscience.org/docs/default-source/publications-resources/updated-resources/alternative-curing.pdf

Formats and products:

- schema.org `Recipe` — https://schema.org/Recipe · `recipeIngredient` — https://schema.org/recipeIngredient · `suitableForDiet` — https://schema.org/suitableForDiet
- Cooklang specification — https://cooklang.org/docs/spec/
- Tandoor import/export — https://docs.tandoor.dev/features/import_export/ · substitution issue #3951 — https://github.com/TandoorRecipes/recipes/issues/3951
- RecipeML — https://en.wikipedia.org/wiki/RecipeML
- Samsung Food launch — https://news.samsung.com/uk/samsung-announces-global-launch-of-samsung-food-an-ai-powered-personalised-food-and-recipe-service · Personalize Recipe — https://support.samsungfood.com/hc/en-us/articles/18369261226644-Getting-Started-with-Samsung-Food-Create-and-Edit-Recipes

Food-science references (textbook / professional / vendor-technical / trade press):

- *Understanding Ingredients for the Canadian Baker* — eggs https://opentextbc.ca/ingredients/chapter/the-function-of-eggs/ · salt https://opentextbc.ca/ingredients/chapter/functions-of-salt-in-baking/
- Chemistry LibreTexts, *The Function of Eggs* — https://chem.libretexts.org/Bookshelves/Biological_Chemistry/Chemistry_of_Cooking_(Rodriguez-Velazquez)/07:_Eggs/7.04:_The_Function_of_Eggs
- American Egg Board — emulsification https://www.incredibleegg.org/professionals/manufacturers/real-egg-functionality/emulsification/ · binding https://www.incredibleegg.org/professionals/manufacturers/real-egg-functionality/binding/
- BAKERpedia, *The Function of Sugar in Baking* — https://bakerpedia.com/the-function-of-sugar-in-baking/
- Medicine LibreTexts, *Functions of Sugar* — https://med.libretexts.org/Courses/Kansas_State_University/FNDH_313:_Science_of_Food/06:_Sweeteners_Fats_and_Desserts/6.01:_Sweeteners/6.1.04:_Functions_of_Sugar
- King Arthur Baking — salt in yeast bread https://www.kingarthurbaking.com/blog/2020/07/29/why-is-salt-important-in-yeast-bread · egg substitution guide https://www.kingarthurbaking.com/blog/2021/01/21/guide-for-substituting-eggs-best-egg-replacers
- Cargill, *Salt in Bread Dough* — https://www.cargill.com/salt-in-perspective/salt-in-bread-dough
- PizzaBlab, *The Role of Salt in Dough* — https://www.pizzablab.com/learning-and-resources/ingredients/the-role-of-salt-in-dough/
- Cape Crystal Brands, *Replacing Gelatin with Agar Agar* — https://www.capecrystalbrands.com/blogs/cape-crystal-brands/replacing-gelatin-with-agar-agar-a-comprehensive-guide
- Nigella Lawson, *Oil Instead of Butter for Baking* — https://www.nigella.com/ask/oil-instead-of-butter-for-baking
- Brew Your Own, *Alpha-Hop Soup: Figuring Bitterness (IBUs, AAUs and HBUs)* — https://byo.com/articles/alpha-hop-soup-figuring-bitterness-ibus-aaus-and-hbus/
- Craft Beer & Brewing, *The Ins and Outs of Alpha Acid Units* — https://www.beerandbrewing.com/the-ins-and-outs-of-alpha-acid-units
- Gluten Free Alchemist, *Xanthan Gum in Gluten Free Baking* — https://www.glutenfreealchemist.com/xanthan-gum-and-gluten-free-baking-a-complete-guide/
- FODMAP Everyday, *Low FODMAP Garlic and Onion Substitutes* — https://www.fodmapeveryday.com/low-fodmap-garlic-onion-substitutes/
- A Little Bit Yummy, *Replacing Onion and Garlic on the Low FODMAP Diet* — https://alittlebityummy.com/blog/replacing-onion-and-garlic-on-the-low-fodmap-diet/

**Unverified in this pass** (marked [U] in §3): NaCl→KCl molar equivalence for bread; garlic-infused-oil and asafoetida dose ratios; sugar→honey 0.75 weight ratio; fresh→instant yeast 1:3. The butter→oil 0.82 factor is *derived* from butter's fat content, not quoted. No paper named "SubstitutionNet" was found.
