# Domain stress test: pastry + savoury cooking against a universal recipe protocol

Two personas write this report: a pastry chef/confectioner and a professional savoury chef. Our job was not to design the protocol — it's to break a naive "ingredients list + numbered steps" model with real recipes, then enumerate precisely what a protocol needs to represent honestly. Every ratio, temperature, and rule below is sourced; where sources disagreed we said so.

---

## Part 1 — Recipe corpus (20 recipes, what each one breaks)

| # | Recipe | Source | What it breaks in a naive model |
|---|---|---|---|
| 1 | Pastéis de nata (Portuguese custard tart) | [Daring Gourmet](https://www.daringgourmet.com/pasteis-de-nata-portuguese-custard-tarts/), [Leite's Culinaria](https://leitesculinaria.com/7759/recipes-pasteis-de-nata.html) | A recipe whose *ingredients* are themselves two sub-recipes (laminated dough + custard), one of which requires a sugar syrup cooked to a temperature stage (~104°C / 220°F), not a fixed time. Bakes at an unusually extreme oven temp (250–290°C) that a generic "350°F" default would misrepresent. |
| 2 | French macarons | [Sugar Geek Show](https://sugargeekshow.com/french-almond-macaron-recipe/), [Indulge with Mimi](https://www.indulgewithmimi.com/how-to-age-egg-whites-for-baking-macarons/) | Ingredient *prep* has its own time dimension independent of the recipe (egg whites aged 24h–4 days *before* the recipe even starts). Meringue doneness is a visual/tactile stage ("stiff glossy peaks"), not a timer. A rest step (20–30 min) is inactive time with a sensory exit condition (touch-dry skin), not a cook step. Gram-only measurement — volume units are explicitly wrong here. |
| 3 | Chocolate entremet (mousse/insert/glaze cake) | [Sugar Geek Show](https://sugargeekshow.com/chocolate-entremet-cake/) | 5+ components (sponge, insert, mousse, crunch, glaze) built in parallel across a multi-day timeline, assembled inside a mould, frozen between stages, unmoulded, then glazed *at a specific liquid temperature* (37°C reheat → 35°C pour) onto a *frozen* surface. A linear step array cannot express "make the insert two days ahead, freeze; bake the sponge the day before; freeze the assembled mousse cake overnight; glaze only once frozen solid." |
| 4 | Tempered chocolate (seeding method) | [Ecole Chocolat](https://www.ecolechocolat.com/en/chocolate-tempering.html), [Dessertisans](https://dessertisans.com/insight/all-the-ways-to-temper-chocolate/) | "Temperature" is a 3-point curve (melt 45–55°C → cool 26–29°C → rework to working temp 28–32°C), and the three target bands differ by chocolate type (dark/milk/white). A scalar `temperature_c` field cannot represent this at all. |
| 5 | Salted caramel sauce | [Sally's Baking Addiction](https://sallysbakingaddiction.com/homemade-salted-caramel-recipe/), [Inspired Taste](https://www.inspiredtaste.net/11084/salted-caramel-sauce-recipe/) | Endpoint is a temperature *range* mapped to a *color* descriptor ("light amber" ≈ 170°C vs "dark amber" ≈ 177°C+), and overshooting by ~15°C changes the finished product's texture category (pourable sauce → chewy candy). The same base process yields structurally different foods depending on where you stop. |
| 6 | Crème anglaise | [A Baking Journey](https://www.abakingjourney.com/creme-anglaise/) | Dual endpoint: a numeric ceiling (82–84°C) *and* a sensory test ("coats the back of a spoon," nappe) that must agree — and a hard failure mode (curdling) just past the target with no recovery. The finished sauce is also routinely an *ingredient* in other recipes (ice cream base, bavarois, trifle). |
| 7 | Choux pastry (pâte à choux) | [Chef Lindsey Farr](https://cheflindseyfarr.com/choux-pastry-pate-a-choux/), [BakeClub](https://bakeclub.com.au/blogs/baketips/the-correct-consistency-for-choux-pastry) | The headline ingredient quantity — eggs — is explicitly *not fixed*: how much water cooked out of the panade (which varies by stove, pan, humidity) determines how much egg the paste can absorb. The recipe's own instruction is "add to consistency," verified by a visual test (a slow-closing trench, a V-shaped drop off a spatula), not a gram figure. |
| 8 | Cake scaled from 20 cm round to a different pan | [Omni Calculator — Cake Pan Converter](https://www.omnicalculator.com/food/cake-pans), [Chef Gail Sokol](https://chefgailsokol.com/baking-essentials/scaling-adjusting-your-recipe-to-fit-your-pans/) | Naive "×2 the pan diameter → ×2 the ingredients" is wrong: pan capacity scales with **area/volume**, not linear diameter (going 6"→10" round is a 2.78× ingredient multiplier, not 1.67×). Bake time does **not** scale proportionally with volume, and layer *depth* interacts with the correct oven temperature (shallower = hotter/shorter). |
| 9 | Mango sorbet (PAC/POD-balanced) | [So Good Magazine](https://www.sogoodmagazine.com/pastry-blog/pastry-chef-articles/fruit-sorbets-from-a-syrup-base-a-practical-resource/), [Ice Cream Calc](https://icecreamcalc.com/2023/08/22/how-is-pac-and-pod-calculated/) | Sugar isn't a single fungible ingredient: swapping sucrose for dextrose or invert sugar changes *two independent axes at once* (freeze-point depression via PAC, perceived sweetness via POD), and a substitution that's ratio-correct on weight can still wreck the product's scoopability or make it sickly sweet. |
| 10 | Gluten-free / vegan pastry conversion (pie dough, choux, cake) | [The Loopy Whisk — GF flour blend](https://theloopywhisk.com/2021/09/23/homemade-gluten-free-flour-blend/), [The Loopy Whisk — xanthan](https://theloopywhisk.com/2021/10/08/xanthan-gum-101/) | A single substitution ("use GF flour") is actually a *coordinated bundle*: flour blend (40% whole-grain / 60% starch by the common rule) + a binder (xanthan gum, dosed differently per application — ~1/2 tsp per 120g flour for pastry vs less for cake) + method changes (no gluten development to protect/avoid). One swap, three correlated deltas. |
| 11 | Béchamel (mother sauce) used inside moussaka/lasagna | [The International Kitchen](https://www.theinternationalkitchen.com/recipes/bechamel-the-mother-sauce/), [Cook Like a Greek — moussaka béchamel](https://cooklikeagreekblog.com/bechamel-sauce-recipe/) | Textbook component recipe: a fixed roux ratio (≈1:1 butter:flour, ~4 oz butter per quart of milk) produces a sauce that is itself consumed as one "ingredient" line inside a bigger recipe, at a *specific thickness variant* (moussaka wants it thicker: 2–3 Tbsp flour/cup milk vs a pourable table béchamel). |
| 12 | Coq au vin (braise) | [The Hungry Bluebird](https://thehungrybluebird.com/coq-au-vin-chicken-braised-in-red-wine/), [Le Cordon Bleu](https://www.cordonbleu.edu/news/coq-au-vin-recipe/en) | Long, low, wet cooking with an overnight marinate as a *separate prerequisite step with its own duration*, and doneness expressed only as "fork-tender," reported time ranges spanning 75 min–2 hrs depending on the source and cut. Time is advisory; the exit condition is sensory. |
| 13 | Chicken stock | [RecipeTin Eats](https://www.recipetineats.com/chicken-stock-recipe/), bone:water ratio discussion ([Quora / kitchen sources](https://kitchencrafthubs.com/how-many-pounds-of-bones-do-you-need-for-chicken-stock/)) | A recipe whose *output* is a yield (a ratio of bones:water:time reduced to a target volume — e.g., 4 lb chicken + 8 qt water → ~4 qt stock), which then gets consumed elsewhere in *partial, arbitrary quantities* ("200 mL of the batch"). The "ingredient" other recipes reference isn't a market good, it's another recipe's finished yield. |
| 14 | Sous vide steak | [Anova — Medium Rare Steaks](https://recipes.anovaculinary.com/recipe/print/medium-rare-steaks-17), [Anova — sous vide steak guide](https://anovaculinary.com/pages/sous-vide-steak) | Time is a genuine **2D lookup**: f(thickness, target doneness) → (temperature, time-range), with a *minimum safe time* floor independent of doneness, plus a distinct finishing step (45–60 sec sear per side) with its own separate implicit "temperature" (very high, unspecified numerically). |
| 15 | Stir-fry | [The Woks of Life](https://thewoksoflife.com/how-to-make-stir-fry/), [Valtcan](https://www.valtcan.com/blogs/valtcan-blog/stir-fry-technique-guide) | Prep (~10–40 min) vastly outweighs active cooking (60–120 seconds), and prep is a **hard gate**: mise en place must be 100% complete before the first active step, because there is no time to chop mid-cook. Step sequencing inside the cook is order-critical at second-level granularity (protein → aromatics → vegetables → sauce). Doubling the recipe *doesn't* just double time — it can break the technique entirely (overcrowding kills wok hei). |
| 16 | Thai red curry paste (sub-recipe) inside a curry | [Eating Thai Food](https://www.eatingthaifood.com/thai-red-curry-paste-recipe/), [RecipeTin Eats](https://www.recipetineats.com/thai-red-curry-paste/) | A 10+ ingredient spice paste is a nested sub-recipe consumed in a larger dish, where the *tool used to make it* (mortar and pestle vs. blender) is a first-class technique variable that changes the outcome (fiber-tearing vs. bruising → different texture/flavor extraction), not merely a time-saving substitution. |
| 17 | Mushroom risotto | [Kylee Cooks](https://www.kyleecooks.com/mushroom-risotto/) | Liquid quantity is explicitly open-ended and incremental — "add stock a ladle at a time, until absorbed," repeated ~15–18 times — a loop with a per-iteration sensory exit condition, not a fixed total volume. Finishing (mantecatura: off-heat butter/cheese emulsification) is a distinct technique step whose failure mode ("cement effect") is textural, not measurable by a thermometer. |
| 18 | Roast beef/chicken (weight-dependent formula) | [Parade — roast beef](https://parade.com/172491/benrayl/perfect-roast-beef-is-easy/), [RecipeTips — roast beef cook time](https://www.recipetips.com/kitchen-tips/t--1542/roast-beef-cook-time.asp) | Cook time is a **function**, not a stored constant: "12 min/lb + 12 min," with additional flat minutes tiered by total weight (+10 min over 4 lb, +15 min over 5 lb). A protocol that stores `cook_time_minutes: 90` for one weight is simply wrong for any other weight of the same roast. |
| 19 | Curry with regional/seasonal paste variance (Thai red/green/yellow; Indian curry by region) | Cross-referenced from #16 sources + general curry-paste literature | Same dish name, materially different authentic ingredient sets by region (chile type, presence of shrimp paste, coconut vs. yogurt base), plus ingredient names that differ by locale (coriander/cilantro). A protocol needs to store *variant* as a structured relationship to a base dish, not fork a whole new recipe file per region. |
| 20 | Neapolitan pizza (Margherita / Marinara / Bianca) | [Coley Cooks — dough](https://coleycooks.com/neapolitan-pizza-dough/), [Wikipedia — Pizza Margherita](https://en.wikipedia.org/wiki/Pizza_Margherita), [Wikipedia — Pizza marinara](https://en.wikipedia.org/wiki/Pizza_marinara) | One base recipe (4-ingredient dough) with named canonical variants that differ *only* in the topping/assembly step, not the base — the opposite failure mode from #19: here the protocol must avoid duplicating the entire dough recipe for every named variant. |

---

## Part 2 — Modelling requirements

### 1. Component / sub-recipe composition

A recipe's ingredient list must be able to contain **a reference to another recipe**, not just a leaf ingredient. Requirements:

- **Nesting, arbitrary depth.** Pastéis de nata (#1) → massa folhada (dough) + custard, and the custard syrup step is itself a sub-procedure with its own temperature target. An entremet (#3) nests 5 components, one of which (a praline crunch) may itself reference a base praliné recipe.
- **Partial use of a yield.** Chicken stock (#13) yields ~4 qt; a soup recipe consumes "500 mL of the stock," not "the stock." The protocol needs `quantity_used` distinct from the child recipe's own yield, and scaling logic must NOT assume 1 batch = 1 use.
- **Scaling propagation.** If the parent recipe is scaled ×1.5, any sub-recipe consumed in full must scale ×1.5 too; a sub-recipe consumed *partially* ("200 g of the 1 kg batch") scales the *consumed amount*, and only scales the *child recipe itself* if the child has no other independent use elsewhere (e.g., you don't need 1.5 batches of stock if you only ever draw a fixed 500 mL from it — you just make one batch and take more from it, or you do need proportionally more if the batch is dedicated).
- **Yield as a first-class field**, expressed in the same unit system as consumption ("makes 1 L," "makes 12 tartlet shells").

```json
{
  "id": "pasteis-de-nata",
  "components": [
    { "ref": "recipe:massa-folhada", "role": "shell", "use": "all" },
    { "ref": "recipe:nata-custard", "role": "filling", "use": { "qty": 750, "unit": "ml" } }
  ]
}
```

### 2. Assembly graph, not a linear list

An entremet (#3) is a DAG: components are made in parallel, some frozen, then assembled, then glazed. Requirements:

- Steps carry **dependencies** (`depends_on: [step_ids]`), not just array order — enabling a renderer to say "these three steps can run concurrently" or "you can't glaze until the mousse cake has been frozen ≥4h."
- Steps carry an explicit **temporal placement relative to serving**, not just relative to each other: "make 2–3 days ahead," "the day before," "same day." This is a scheduling primitive, independent of the dependency graph — a cook-along UI needs it to backward-plan from a serving deadline.
- **State transitions as nodes**: "freeze until solid (≥4h, ideally overnight)" is itself a step with duration but zero active labor — it must be distinguishable from an active step so a timeline view doesn't imply the cook needs to *do* something for 4 hours.
- A component subgraph can be marked **reusable/batchable** — e.g., a béchamel (#11) used in one recipe today and referenced from a different parent recipe tomorrow, without duplicating the step graph.

```json
{
  "steps": [
    { "id": "s1", "does": "bake sponge", "depends_on": [] },
    { "id": "s2", "does": "make insert, freeze", "depends_on": [], "schedule_hint": "2-3 days before" },
    { "id": "s3", "does": "make mousse", "depends_on": ["s1"] },
    { "id": "s4", "does": "assemble in mould, freeze overnight", "depends_on": ["s2", "s3"], "state": "frozen", "min_duration_h": 8 },
    { "id": "s5", "does": "glaze at 35°C on frozen cake", "depends_on": ["s4"] }
  ]
}
```

### 3. Mise en place vs. active cooking

- **Prep state belongs to the ingredient-in-context, not the base ingredient.** "1 onion, finely diced" is a step-scoped transformation of a catalog ingredient (`onion`), not a different ingredient. Model as `{ ingredient: "onion", qty: 1, prep: "finely diced" }` attached to the *usage*, so the same onion can appear "roughly chopped" in a stock (#13) and "finely diced" in a curry (#16) without forking the ingredient catalog.
- **Active vs. passive time as separate fields**, not folded into one `time` number. Coq au vin (#12): active prep ~30 min, marinate 12h passive, braise 1.25–2h mostly passive (oven does the work) but needs periodic checking. A single `total_time` misrepresents effort.
- **Hands-on time vs. total time** is the number that actually matters for a "can I make this on a weeknight" decision — stir-fry (#15) is 40 min total but 2 minutes of that is a scramble; risotto (#17) is ~25 min and *all* of it is hands-on (constant stirring). Same total time, opposite user experience — the protocol must carry both numbers.

### 4. Quantities that aren't fixed numbers

Real recipes routinely give non-numeric or open quantities: "to taste," "as needed," "enough to cover," "a pinch," "1–2 cloves," choux's egg "to consistency" (#7). A `quantity` field needs a tagged union, not a single numeric type:

```json
// fixed
{ "kind": "fixed", "value": 250, "unit": "g" }
// range
{ "kind": "range", "min": 1, "max": 2, "unit": "clove" }
// open — no scaling relationship to batch size implied
{ "kind": "to_taste" }
{ "kind": "as_needed", "note": "enough to cover the meat" }
// variable, resolved by a sensory test at cook time
{ "kind": "to_consistency", "approx": { "value": 4, "unit": "egg" }, "test": "trench-test-v-drop" }
// small, culturally-fixed non-metric unit
{ "kind": "colloquial", "value": "pinch" }
```

Rendering and scaling rules differ per kind: `fixed` and `range` scale linearly (or non-linearly per §8); `to_taste`/`as_needed` **do not scale** — doubling a batch does not mean doubling "salt to taste"; `to_consistency` gives an *approximate* scaled anchor but flags that the real quantity is determined live by the named sensory test, which the renderer should surface (not hide behind a number).

### 5. Temperature as a stage/curve/target, not a scalar

Four distinct temperature shapes appear in the corpus, and none of them is "one number":

- **Single ceiling + sensory correlate**: crème anglaise (#6), 82–84°C *and* "coats the back of a spoon" — both must be satisfied; either alone is an unsafe proxy (a thermometer failure shouldn't mean "just eyeball it" is wrong, and vice versa).
- **A range mapped to a qualitative outcome band**: sugar stages (#5) — soft-ball 235–240°F/113–116°C, hard-crack 300–310°F/149–154°C, six named stages between, each tied to a distinct downstream product ([WebstaurantStore candy chart](https://www.webstaurantstore.com/blog/4052/candy-temperature-chart.html)). This needs a lookup table (`stage_name → [min,max], product_use[]`), not a scalar target.
- **A multi-waypoint curve**: chocolate tempering (#4) is melt (45–55°C) → cool with seed (26–29°C) → rework to working temp (28–32°C), three sequential targets, each type-dependent (dark/milk/white have different numbers at every waypoint — [Ecole Chocolat](https://www.ecolechocolat.com/en/chocolate-tempering.html)).
- **A 2D lookup, not even a curve**: sous vide (#14) is f(thickness, doneness) → (temp, time-range), e.g. 1"–1.5" whole-muscle steak, 129–135°F, 1.5–4h ([Anova](https://anovaculinary.com/pages/sous-vide-steak)) — plus a hard safety-minimum time independent of the doneness target.

```json
"temperature_profile": {
  "kind": "curve",
  "unit": "celsius",
  "waypoints": [
    { "label": "melt",  "min": 45, "max": 55 },
    { "label": "cool_seed", "min": 26, "max": 29 },
    { "label": "working", "min": 28, "max": 32 }
  ],
  "variant_by": "chocolate_type"
}
```

### 6. Formula-based timing

Roast time (#18) is `minutes = weight_lb * 12 + 12`, tiered with flat add-ons above weight thresholds ([Parade](https://parade.com/172491/benrayl/perfect-roast-beef-is-easy/), [RecipeTips](https://www.recipetips.com/kitchen-tips/t--1542/roast-beef-cook-time.asp)). This is a genuine function of a runtime variable (the actual weight of the cook's roast), not the recipe author's original weight. The protocol must carry an **expression**, evaluated against the user's actual scaled quantity, e.g.:

```json
"cook_time": {
  "kind": "formula",
  "expr": "weight_kg * 26.4 + 20",
  "unit": "minutes",
  "inputs": { "weight_kg": "ref:main_ingredient.weight" },
  "notes": "≈12 min/lb + 12 min base; add flat minutes above weight tiers"
}
```

**Safest way to express computation in a data format**: do **not** embed a general-purpose scripting language (JS/Python `eval`) in recipe data — that's a security and portability liability (arbitrary code execution from user-generated recipe content) and makes the format unauditable. Instead:
- Use a **small, closed arithmetic grammar** (`+ - * / min max clamp`, references to named recipe fields only, no loops/branches/IO) that a sandboxed evaluator can parse into an AST and run deterministically. This is the same tradeoff spreadsheet formula languages made decades ago, and it's well-trodden.
- Alternatively, a **lookup table with interpolation** (weight bracket → time) sidesteps formulas entirely for cases like this and is trivially safe, at the cost of being coarser between brackets.
- Any formula field should declare its **valid input range** (e.g., 0.5–8 kg) so the renderer can refuse to extrapolate absurdly (nobody has verified the 12 min/lb rule at 50 kg).

### 7. Pan / mould / vessel geometry scaling

Real rule (#8, [Omni Calculator](https://www.omnicalculator.com/food/cake-pans), [Chef Gail Sokol](https://chefgailsokol.com/baking-essentials/scaling-adjusting-your-recipe-to-fit-your-pans/)):

- Round pan volume ∝ **r²h**; rectangular ∝ **l·w·h**. Ingredient scale factor = `new_pan_area / old_pan_area` (or volume, for equal depths). Going 6"→10" round is **×2.78**, not ×1.67 (which is what a naive linear-diameter scale would give — a >65% error).
- **Baking time does not scale with the same factor as volume.** A flatter/wider pan at the same batter volume needs a *higher* temperature and *shorter* time; a deeper pan needs lower temperature, longer time, to cook through without burning the exterior. The recipe's original oven temperature should generally be held constant when only pan *shape* (not depth) changes; when depth changes materially, temperature itself should shift.
- Practically: the protocol needs a `pan_geometry` object (`shape: round|rect|other`, `diameter`/`length`×`width`, `depth`) attached to the recipe, plus a scaling function that computes the area/volume ratio and applies it to *quantities* while applying a **separate, non-linear time/temperature adjustment rule** (not the same multiplier) — these must be two different transforms, not one.

### 8. Non-linear scaling in general

4×-ing a recipe is not "×4 every number." Real practitioner rules that break linear scaling:

- **Pan surface area** doesn't scale with volume (§7) — a 4× batch in a proportionally-sized pan changes the surface-to-volume ratio, hence browning and evaporation rates.
- **Salt and potent spices scale sub-linearly** in some dish types — professional guidance (and Ruhlman-style ratio thinking) is to scale salt/spice to ~75–90% of the linear factor and adjust to taste at the end, because perceived intensity is not linear with mass, and error is asymmetric (easy to add, hard to remove). This is a practitioner heuristic, not a hard law — the protocol should support marking specific ingredients as `scaling: sublinear` with a tunable exponent, defaulting to linear (1.0) unless flagged.
- **Leavening (baking powder/soda, yeast) scales sub-linearly** past small multiples — doubling a cake doesn't need double leavening; commercial baking guidance generally caps leavening increases and lets bake time/pan size absorb the difference.
- **Reduction and evaporation times don't scale linearly with volume** — a stock (#13) or sauce reduced by half takes longer in a wider, shallower pan (more surface area) than the naive "same time, more liquid" assumption; time is a function of surface area, not volume, for evaporation-driven steps.
- **Thickeners (starch, gelatin) scale roughly linearly by weight but are sensitive to the *ratio* to liquid**, not an absolute amount — if liquid quantity itself changes non-linearly (e.g., because the reduction step now behaves differently at scale), thickener dosing has to be recalculated from the ratio, not simply multiplied.

This means the scaling engine needs **per-ingredient scaling behavior**, not one global multiplier: `linear` (default), `sublinear(exponent)`, `fixed` (doesn't scale — a single vanilla pod flavors 1L or 4L custard about the same), and `formula` (references pan/vessel geometry per §7).

### 9. Pastry ratio systems (computable formula systems)

These are real enough to implement as calculators, not just describe:

- **Baker's percentage**: flour = 100%, every other ingredient expressed as % of flour weight by mass. Formula: `ingredient_pct = ingredient_weight / flour_weight * 100`. Hydration is the water/flour case specifically (e.g., 340 g water / 440 g flour = 77% hydration) — [The Perfect Loaf](https://www.theperfectloaf.com/reference/introduction-to-bakers-percentages/), [Baker Bettie](https://bakerbettie.com/basics-bakers-percentages/). Note percentages sum to well over 100% — this is *not* a proportion-of-whole system, and a protocol must not normalize it to 100%.
- **Ruhlman's ratios** (by weight): cookie dough 1 sugar : 2 fat : 3 flour; pie dough 3 flour : 2 fat : 1 water; biscuit 3 flour : 1 fat : 2 liquid; quick bread 2 flour : 2 liquid : 1 egg : 1 fat; pâte à choux 2 water : 1 butter : 1 flour : 2 egg ([Ruhlman's *Ratio*, summarized](https://www.themanual.com/food-and-drink/easy-baking-ratio-guide/)). A protocol representing a recipe as a ratio (not absolute weights) lets a user swap total yield freely — this is a genuinely different mode from "scale this specific recipe."
- **PAC/POD ice cream and sorbet balance** ([Ice Cream Calc](https://icecreamcalc.com/2023/08/22/how-is-pac-and-pod-calculated/)): PAC (Potere Anti-Congelante / anti-freeze power) controls scoopable texture/serving temperature; POD (Potere Dolcificante / sweetening power) controls perceived sweetness. Sucrose = 100 for both, by definition. Dextrose ≈190 PAC / ~70 POD-ish depending on source — i.e., swapping sugars moves *two independent axes at once*. Target ranges: recipe POD ~17–22% of total mix; every 20 PAC points shifts serving temperature by roughly 1°C. A real implementation needs a small reference table of common sweeteners' PAC/POD values and a solver that balances a blend against target ranges — this is legitimately a linear-algebra problem, not a lookup.
- **Choux/pâte à choux hydration**: water+egg (both count as the liquid phase) relative to flour+fat is what determines whether the paste pipes vs. slumps — consistent with the "to consistency" open-quantity problem in §4; the ratio system gives the *target*, the sensory test gives the *stop condition*.
- **Fat/flour/sugar/liquid balance generally** (Ruhlman's broader thesis): most pastry doughs/batters are legible as a 3–4 axis ratio; a protocol that stores both the absolute recipe *and* its ratio decomposition enables "make this leaner" or "make this richer" as a slider, not a rewrite.

### 10. Sensory / non-numeric endpoints

Every domain has "you'll know it when you see/feel/hear/smell it" endpoints that cannot be reduced to a single number without losing real information: nappe/"coats the back of a spoon" (#6), ribbon stage (batters), "fork tender" (#12), the choux trench/V-drop test (#7), "until absorbed" per risotto ladle (#17), "the sound changes" (frying, searing), skin-formed-and-touch-dry (#2 macaron rest).

Model these as a **named test** with a machine-checkable *fallback proxy* where one exists, and an honest "no numeric substitute" flag where none does:

```json
"doneness": {
  "kind": "sensory_test",
  "test_id": "fork_tender",
  "description": "meat pulls apart easily with a fork, no resistance",
  "numeric_proxy": { "field": "internal_temp_c", "approx_value": 95, "confidence": "correlated, not equivalent" },
  "time_estimate": { "min_h": 1.25, "max_h": 2, "confidence": "cut-dependent, advisory only" }
}
```

The key design point: the numeric proxy and time estimate are explicitly *advisory*, and the renderer's UI should present the sensory test as the actual instruction, with the numbers as a secondary aid — inverting the naive model's assumption that a number is always the ground truth.

### 11. Substitutions and their method consequences

This is the sharpest failure mode for a "swap ingredient A for B, done" model — many real substitutions force a **different technique**, not just a different quantity. Ratio table (sourced), method-change flagged:

| From → To | Ratio | Forces method change? | Why |
|---|---|---|---|
| Butter → neutral oil | 1 cup butter → ~⅞ cup oil + ½ tsp salt ([Summer & Cinnamon](https://summerandcinnamon.com/oil-substitute-for-butter/)) | **Yes** | Butter is ~80% fat/20% water+solids; oil is 100% fat — creaming method (aerating solid fat) doesn't work with oil at all; oil-based batters use a "muffin method" (wet+dry, minimal mixing) instead. |
| Eggs → flax egg / aquafaba | 1 tbsp ground flax + 3 tbsp water = 1 egg; ~3 tbsp aquafaba = 1 egg white | **Yes** | Whole eggs aerate (foam) and emulsify; flax/aquafaba have weak-to-no aeration capacity — recipes relying on whipped egg for lift (sponge, soufflé) need a different leavening strategy entirely, not a 1:1 drop-in. |
| Dairy milk → plant milk | 1:1 by volume, commonly | Sometimes | Protein (casein) and fat content differ by plant-milk type; custards/béchamel-type thickened sauces (which rely on dairy protein/fat interaction) can behave differently — oat/soy milk are closer functional matches than almond/rice for cooking applications. |
| Gelatine → agar agar | 1 tsp agar powder ≈ 1 tbsp gelatine powder; or 1:3 agar:gelatine by some sources ([Modernist Pantry](https://blog.modernistpantry.com/advice/the-starting-guide-to-replacing-gelatin-with-agar/), [flourfacts.blog](https://flourfacts.blog/gelatin-vs-agar-conversion-guide)) | **Yes, hard** | Agar **must reach a full boil** (~85–90°C+) to hydrate/activate — gelatine is destroyed by boiling and only needs bloom + gentle warming (<60°C). Setting temps differ too: agar sets at room temp (32–45°C), gelatine needs refrigeration (<15°C). This is not a substitution you can drop into an existing step list — the step itself ("bloom in cold water, warm gently") must be replaced with a different one ("sprinkle into cold liquid, bring to a full boil for ≥4 min"). |
| Cornstarch → flour (as thickener) | ~2:1, flour:cornstarch (flour has roughly half the thickening power) | Sometimes | Cornstarch thickens clear/glossy and must not boil long after adding (breaks down); flour needs to be cooked out (roux-style, several minutes) to lose raw taste and thickens opaque — different technique, different visual endpoint. |
| Buttermilk → milk + acid | 1 cup: 1 tbsp lemon juice/vinegar + milk to 1 cup, rest 5–10 min | No (drop-in after prep) | The rest period *is* the method addition — it's not instant, and skipping it under-curdles. |
| Fresh herbs → dried | 1 tbsp fresh ≈ 1 tsp dried (3:1) ([common substitution charts](https://www.thefreshcooky.com/ingredient-substitution-chart/)) | Sometimes | Dried herbs should go in earlier (rehydrate during cooking); fresh, delicate herbs (basil, parsley) are typically added at the end — a straight ratio swap without moving the step timing under-extracts the dried version. |
| Cooking wine → stock + acid | 1:1 volume, stock + ~1 tsp vinegar/lemon per cup | No | Functional swap for deglazing/braising liquid; loses wine's specific aromatic compounds but doesn't change technique. |
| Sugar → alternative sweeteners (honey, maple, allulose, etc.) | Varies; e.g., honey ~¾ cup per 1 cup sugar + reduce other liquid | **Yes, often** | Different sweeteners bring different moisture, and some (honey, maple) promote faster browning (Maillard-active reducing sugars) — oven temp or bake time often needs to drop 10–25°F/a few minutes to avoid over-browning; this is a genuine second-order method change, not just a ratio. |

The protocol needs a **substitution edge type** that carries: `ratio`, `unit_note`, `forces_method_change: boolean`, and (when true) a `method_delta` — a diff against the affected step(s), not a footnote. A renderer showing "swap gelatine for agar" without surfacing the changed step is actively dangerous (unset dessert, wasted batch).

### 12. Dietary / allergen transforms as coordinated sets

Veganizing, making gluten-free, or making nut-free is never one substitution — it's a **bundle of correlated substitutions plus method deltas** applied together (#10 is the concrete example: GF flour blend *and* xanthan gum dosage *and* awareness that there's no gluten to avoid overworking). The protocol should support a `dietary_profile_transform` as a named, versioned bundle:

```json
"transforms": {
  "gluten_free": {
    "substitutions": [
      { "from": "wheat_flour", "to": "gf_flour_blend", "ratio": "1:1_by_weight", "note": "120g per 1 cup wheat flour" },
      { "add": "xanthan_gum", "ratio_to_flour": "0.5tsp per 120g", "reason": "restores bound structure lost from gluten" }
    ],
    "method_deltas": [
      { "step_type": "mixing", "change": "no need to avoid overmixing — no gluten to toughen" }
    ]
  }
}
```

This lets an app apply "make this vegan" as one operation across an entire recipe (and its sub-recipes, recursively per §1) rather than the user hand-swapping every egg and every butter reference individually and hoping the technique still holds.

### 13. Equipment dependence

Equipment changes both **time** and, sometimes, **method**:

- **Stand mixer vs. hand vs. food processor**: choux (#7) explicitly changes texture/extraction depending on whether eggs are beaten in by machine (fast, even) or hand (slower, riskier for the emulsion); curry paste (#16) explicitly changes *product* by mortar-and-pestle (fiber-tearing, ~45 min) vs. blender (bruising/pureeing, ~10 min) — not just speed, a different extraction mechanism.
- **Convection vs. conventional oven**: the widely-cited rule is reduce temperature by ~25°F (~15°C) and keep time the same for baked goods, OR keep temperature and cut time ~25% for roasting meats, OR split the difference (−15–20°F and −10–15% time) ([multiple sources](https://www.had2know.org/culinary/conventional-oven-convection-conversion-calculator.html), [Good Calculators](https://goodcalculators.com/convection-oven-calculator/)) — critically, **which rule applies depends on the dish category** (baked goods vs. roasted meat), so this can't be a single global conversion constant.
- **Induction vs. gas**: faster, more precise heat response — sugar work (#5) and risotto (#17), both requiring rapid heat modulation, behave differently; not usually a *ratio* change but a *responsiveness* difference that affects how literally to trust a stated "medium heat."
- **Air fryer**: generally run 20–25°F (≈25°C) lower and check ~20% earlier than a conventional oven recipe, similar rationale to convection (smaller cavity, forced air) but not numerically identical to a full-size convection oven.
- **Pressure cooker vs. pot**: braises (#12) compress dramatically — a 1.5–2h braise can become 35–45 min under pressure — this is a large, non-linear time conversion, not a percentage tweak, and changes the liquid-reduction dynamics (less evaporation under pressure, so less liquid needed going in).

The protocol needs an `equipment_variant` construct per step or per recipe: a named equipment context with its own time/temperature deltas and, where applicable, a method note — not a single global "adjust by X%" knob.

### 14. Cultural/regional variance and naming

- **Same dish, multiple authentic variants** (#19): Thai curry pastes vary materially by color/region (red/green/yellow, differing chile, herb, and paste-base choices) — these deserve a `variant` relationship to a shared base concept, with each variant's *actual* differing ingredients, not a "note" field bolted onto one canonical recipe.
- **Ingredient naming by locale**: coriander/cilantro, aubergine/eggplant/brinjal, natas/cream, capsicum/bell pepper. The protocol should store one canonical ingredient identity (e.g., an internal ID) with a **locale-keyed display-name table**, so the same ingredient renders correctly per user locale without being multiple ingredients in the data model.
- **Measurement culture**: US volume (cups) vs. metric weight (grams) is not just unit conversion (a cup of flour and a cup of packed brown sugar have different densities) — the protocol should store canonical **weights** where precision matters (baking, per #2's "grams non-negotiable") and offer volume as a *rendered, locale-aware approximation* with its own density lookup, not a stored parallel truth.

### 15. Plating, serving, storage, make-ahead, leftovers as first-class data

The corpus repeatedly treats these as part of the recipe, not an afterthought: entremet (#3) glazing/serving temp and make-ahead schedule; coq au vin/braises (#12) that are explicitly *better* the next day (a `rest_before_serving` field with a stated benefit, not just a shelf-life warning); stock (#13) storage/reduction-for-freezing guidance; sorbet (#9) storage temperature affecting scoopability (a direct consequence of its PAC value). These need first-class fields — `make_ahead: { component, max_lead_time, storage_method }`, `storage: { method, duration, reheat_instructions }`, `serving: { temperature, plating_note }` — not free-text notes appended to the end of a step list, because a cook-along renderer needs to actively schedule around them (§2).

### 16. Media needs per step

Techniques in this corpus that are genuinely hard-to-impossible to execute correctly from text alone, and should be flaggable as `media_required: true` on the step:

- **Lamination** (#1 massa folhada / any laminated dough) — folding/turning geometry.
- **Tempering** (#4) — visual cue of the chocolate's sheen/viscosity change at the seed point.
- **Ribbon stage / nappe** (#6 and general pastry) — a viscosity judgment call that photos communicate far better than prose.
- **Folding technique** (macaronnage for #2, folding egg whites into a mousse for #3) — the exact motion (not overmixing) is the entire risk point.
- **Knife cuts and prep shapes** ("finely diced" in #16, uniform cuts for stir-fry #15) — size consistency is invisible in text.
- **Shaping** (choux piping #7, pizza dough stretching #20).
- **Doneness color/visual cues** (caramel amber shade #5, sear color for sous vide finishing #14).
- **Plating** (#3, #12) — final presentation is inherently visual.

A step-level `media_hint: { type: "photo"|"video", teaches: "lamination_fold" }` lets a renderer prioritize which steps most need an image/video slot, rather than treating media as decorative on every step equally.

---

## Summary of the hardest constructs to get right

1. **Quantity as a tagged union, not a number** (§4) — everything downstream (scaling, rendering, substitution) breaks if `quantity` is assumed numeric. "To taste" and "to consistency" are first-class states, not edge cases to special-case later.
2. **Sub-recipe composition with partial-use and correct scaling propagation** (§1) — a recipe referencing another recipe, at a fractional yield, that must scale correctly when the *parent* scales but not necessarily when it doesn't need to (the stock-batch problem). Getting this wrong either forces silly over-production or silently mis-scales nested components.
3. **The assembly graph** (§2) — entremets, braises-made-ahead, and marinate-overnight steps are not linear. A protocol without a dependency/timeline model literally cannot represent "make this two days before" correctly, which is common in professional pastry and completely mishandled by a numbered-steps array.
4. **Temperature as curve/range/2D-lookup** (§5) — four distinct shapes appeared in a 20-recipe sample. A scalar `°C` field is simply insufficient for tempering, sugar work, or sous vide.
5. **Substitutions with forced method changes** (§11) — gelatine→agar is the starkest example: it's not a ratio problem, it's a "delete this step and insert a different one" problem. A protocol that treats substitution as pure quantity math will produce recipes that fail outright (unset desserts, curdled sauces).
6. **Non-linear scaling** (§8) — per-ingredient scaling behavior (linear/sublinear/fixed/geometry-formula) is required; a single global multiplier is provably wrong for pan geometry, salt, leavening, and reduction times simultaneously.
7. **Formula-based timing, sandboxed safely** (§6) — real recipes need computed times (roast-by-weight), but embedding a general scripting language is a security and portability risk. The fix is a closed arithmetic grammar or bracketed lookup tables, never `eval`.

Together these mean the protocol's core data model cannot be `{ ingredients: [{name, qty, unit}], steps: [string] }`. It needs typed quantities, a recipe-reference type for ingredients, a step graph with dependencies and scheduling hints, a temperature-shape union, an explicit scaling-behavior tag per ingredient, and a substitution-edge type that can carry a method diff — or it will misrepresent a large fraction of real, everyday professional cooking, not just edge-case haute cuisine.
