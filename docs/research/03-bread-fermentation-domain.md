# Bread + Fermentation Domain Stress-Test — Recipe Protocol

Two-hat review: professional artisan bread baker + fermentation specialist (pickles, kraut,
kimchi, koji, miso, kombucha, hot sauce, cures). Goal: enumerate what a naive
"ingredients list + numbered steps" recipe protocol cannot express in these domains, backed
by a real, diverse corpus.

---

## PART 1 — Recipe corpus (14 recipes)

| # | Recipe | Source | What it breaks in a naive ingredients+steps model |
|---|---|---|---|
| 1 | Direct-dough white sandwich bread (yeasted, single stage) | Standard formula, e.g. King Arthur basic white | Baseline case — even here, "ingredients" mixes two unit systems (flour/water/salt by weight, yeast often by volume) and the rise step is time-*and*-condition ("1–2h or until doubled"), not a fixed duration. |
| 2 | Tartine country loaf (sourdough, multi-day, levain feeding) | [The Perfect Loaf – Tartine recipe](https://www.theperfectloaf.com/tartine-sourdough-country-loaf-bread-recipe/), [My Sourdough Bread with a Young Levain](https://www.theperfectloaf.com/my-sourdough-bread-with-a-young-levain/) | Levain build (50g starter + 50g flour + 50g water, 4–6h) is a **recurring sub-recipe**, not a line item. Its 50g flour must fold into total-flour% math. Bulk (3–4h at 78–82°F, folds every 30 min ×4) is temperature-gated; cold retard is 8–20h depending on desired sourness — a *range* whose endpoints are both valid outcomes, not a single number. |
| 3 | Biga → ciabatta (preferment chain) | [ChainBaker biga ciabatta](https://www.chainbaker.com/biga-ciabatta/), [Fresh Loaf biga:dough ratio](https://www.thefreshloaf.com/node/28284/biga-dough-ratio) | Biga (100% flour : 55% water : 0.25–1% yeast, ferment 16–18h @ 60°F) is a nested recipe whose *entire output* (not just its flour) becomes a single dough-formula ingredient line in the final mix. Pre-fermented-flour% (10–50% depending on style) is itself a named ratio bakers reason in. |
| 4 | Brioche (enriched dough, staged butter incorporation) | [ChainBaker 100% butter brioche](https://www.chainbaker.com/100-brioche/), [JayArr Bread — butter timing](https://jayarrbread.com/blog/butter-in-bread-dough/) | Butter (20–100% of flour weight) and eggs are baker's-percentage ingredients but must be added in a specific *sequence and state* (fully developed gluten first, then cold butter added incrementally over 5–8 min) — the method is order-and-state-dependent, not just a mix step. |
| 5 | Croissant (laminated dough) | [Brod & Taylor lamination guide](https://brodandtaylor.com/blogs/recipes/how-to-level-up-your-lamination), [h3artofthehome butter lock-in](https://h3artofthehome.com/2025/04/16/croissant-class-locking-in-your-butter-block/) | Requires a repeating fold-and-rest loop (3 folds, ~30–60 min chill between each) with **two simultaneous temperature-critical bands**: dough 36–41°F, butter block 52–61°F. If either drifts, the method fails (butter melts into dough or cracks). Room temp target 60–68°F is a *process variable*, not an ingredient. |
| 6 | Broa de milho (Portuguese heritage, scalded corn flour) | [Pãomania broa de milho](https://paomania.pt/receitas-de-pao/broa-de-milho-tradicional-adocicada/), [Cozinha Tradicional](https://www.cozinhatradicional.com/broa-de-milho/) | The corn flour is scalded with boiling water (gelatinization step, not fermentation) and rested 1h before yeast/rye/wheat flour are added — a **thermal pre-treatment sub-step** that changes flour's water-binding capacity; naive "mix ingredients" loses the ordering and the physical-transformation reason for it (starch gelatinization enables the flour to hold moisture without gluten). |
| 7 | Pão Alentejano (heritage, sourdough, IGP) | [Pãomania Alentejano](https://paomania.pt/receitas-de-pao/pao-tradicional-alentejano/), [Ruralea receita original](https://ruralea.com/pao-alentejano-receita-original/) | Massa mãe (sourdough starter) built from scratch (50g flour + 50g water, fed once daily, 48h) is itself a recurring maintenance process feeding into a bake that needs only 100g of it. Protocol needs to represent "starter maintenance" as decoupled from any single bake. |
| 8 | Regueifa (Portuguese Easter bread, braided, enriched) | [Pingo Doce regueifa](https://www.pingodoce.pt/receitas/regueifa/), [Clara de Sousa](https://claradesousa.pt/receita/regueifa-doce/) | Two-stage proof (2h bulk, then 30 min after shaping) plus a braiding/shaping step that is fundamentally non-verbal — no text description substitutes for watching hands cross two strands and seal the ends. Media-slot requirement. |
| 9 | Gluten-free sandwich loaf (psyllium husk + xanthan) | [The Loopy Whisk — psyllium 101](https://theloopywhisk.com/2021/10/23/psyllium-husk-101/), [Meaningful Eats GF sandwich bread](https://meaningfuleats.com/gluten-free-sandwich-bread/) | Not a substitution inside the same method — it's a **different method entirely**: batter (poured, not kneaded), no windowpane test, no shaping in the wheat-bread sense, psyllium gel formed as its own timed sub-step (mix + rest 5–10 min to gel before use). Flags that "same protocol shape, different technique tree" must be representable. |
| 10 | Lacto-fermented dill pickles | [Fermenting for Foodies — brine ratio](https://www.fermentingforfoodies.com/fermentation-brine-salt-to-water-ratio-for-vegetables/), [Practical Self Reliance](https://practicalselfreliance.com/lacto-fermented-pickles/) | Salt is expressed as % of **combined water + vegetable weight** (e.g. 3.5% of an 860g cucumber+water system = 30g salt) — a ratio basis that has nothing to do with "flour," and is safety-bounded (must not go below 2%). |
| 11 | Napa cabbage kimchi (multi-stage) | [Maangchi tongbaechu-kimchi](https://www.maangchi.com/recipe/tongbaechu-kimchi), [The Kitchn easy kimchi](https://www.thekitchn.com/how-to-make-easy-kimchi-at-home-189390) | Four sequential, chemically-distinct stages (dry-salt 2h turning every 30 min → triple-rinse → drain 15–20 min → coat in rice-porridge-bound paste → ferment) where an intermediate product (salted, rinsed cabbage) is neither a raw ingredient nor a finished dish — a naive model has no slot for "processed intermediate that is not itself a sub-recipe output with its own yield." |
| 12 | Sauerkraut (self-brining, no added water) | [MakeSauerkraut — salt by weight](https://www.makesauerkraut.com/salt-by-weight/), [Frugal Organic Mama — extension-approved 2%](https://www.frugalorganicmama.com/blog/how-to-make-sauerkraut/) | Salt is 2.00–2.25% of **trimmed cabbage weight only** — no water in the ratio basis at all, because the process itself generates the liquid via osmosis. Directly contradicts the "brine ratio" basis used in pickles (#10); the protocol needs distinct named bases, not one universal "brine%." |
| 13 | Miso (koji fermentation, weeks–months) | [mai-rice.com — ratios and timing](https://www.mai-rice.com/fermentation/how-to-make-miso), [Preserved — miso formulas](https://preservedgoods.com/blogs/recipes/miso-recipe-formulas) | Ratios are soybean : koji by weight (1:1 for white/sweet, 1:0.6 for red) with salt 5–13% of *total* mass, and the koji itself is a separate multi-day inoculated-grain sub-recipe (Aspergillus oryzae spores on rice/barley, temperature/humidity controlled). Aging is 4 weeks to 3 years depending on salt%/koji ratio chosen — duration is a *function of* the ratio, not independent of it. |
| 14 | Kombucha (SCOBY, F1/F2 backslopping) | [You Brew Kombucha — F1/F2 guide](https://www.youbrewkombucha.com/guide-to-2nd-fermentation), [The Ferment Guide — timing](https://thefermentguide.com/blog/how-long-does-kombucha-ferment) | Backslopping: 10–20% of the finished F1 batch (1–2 cups per gallon) becomes the starter *liquid* for the next F1, while the SCOBY mat is reused indefinitely — two different "carry-forward" outputs from one batch, feeding two different roles in the next. F1 endpoint is a *taste/pH test*, not a clock. F2 adds sealed-vessel pressure buildup (safety note: risk of over-pressurized bottles) absent from F1. |
| 15 | Fermented hot sauce (chili mash, pH-gated) | [Salamander Sauce — mash vs brine, salt, pH](https://www.salamandersauce.com/salamander-hot-sauce-blog/how-to-ferment-hot-sauce), [Ferment Foundry](https://fermentfoundry.com/how-to-make-fermented-hot-sauce/) | Salt 2–8% of chopped-pepper weight (mash) *or* 3–5% brine (whole peppers) — same ferment, two different bases depending on technique chosen. Safety endpoint is explicitly pH-based (<4.6 for stability, target <4.0 for margin), not time-based — the protocol needs a machine-checkable numeric safety gate, not prose. |
| 16 | Gravlax (dry salt-sugar cure) | [RecipeTin Eats gravlax](https://www.recipetineats.com/cured-salmon-gravlax/), [Practical Self Reliance gravlax](https://practicalselfreliance.com/gravlax/) | Cure mix is 50% of fish weight (combined salt+sugar), cure duration (24/36/48h) directly determines the doneness/texture outcome — duration is not "at least X" but a **selectable dial** with named outcomes (light/medium/hard cure) mapped to specific hour counts. |
| 17 | Dry-cured sausage / bacon (nitrite ppm, safety-critical) | [Charcuterie Handbook — curing salts guide](https://charcuteriehandbook.com/guides/curing-salts-guide/), [AmazingRibs — curing meats safely](https://amazingribs.com/tested-recipes/salting-brining-curing-and-injecting/curing-meats-safely/) | Sodium nitrite must be dosed against **meat weight**, expressed in **ppm of the final product**, via an intermediate curing-salt product that is itself only 6.25% active nitrite (Prague Powder #1/Instacure #1). A 2× measurement error blows through the legal/safety ceiling (USDA caps: 120 ppm bacon, 156 ppm frankfurters/cured sausage, 200 ppm brine-cured ham, 625 ppm dry-cured). This is the clearest case in the whole corpus of a ratio that must be *hard-bounded*, not just displayed. |

Two additional cross-cutting artifacts referenced throughout Part 2 (not separate corpus rows,
but load-bearing for specific requirements):
- Garlic-confit / garlic-in-oil botulism risk (pH >4.6 + anaerobic + 40–120°F = danger zone) — [CSIRO oil preservation](https://www.csiro.au/en/research/health-medical/nutrition/vegetable-preservation), botulism condition summary via search above.
- DDT (desired dough temperature) formula and friction factor — [King Arthur — determining friction factor](https://www.kingarthurbaking.com/blog/2018/08/27/determining-the-friction-factor-in-baking), [Fresh Loaf DDT explanation](https://www.thefreshloaf.com/node/68247/explanation-ddt-formula).

---

## PART 2 — Modelling requirements

### 1. Baker's percentages (scaling pivot ≠ total weight)

The pivot for scaling a bread formula is **total flour = 100%**, not total recipe weight.
Every other ingredient — including preferment flour — is expressed as a percentage of that
flour total.

Concrete example (Tartine-style levain-built loaf):

```
overall formula (100% flour includes levain's flour):
  bread flour        90%   (810g)
  whole wheat flour  10%    (90g)     -> total flour = 900g = 100%
  water              78%   (702g)
  salt                2%    (18g)
  levain             20%   (180g, of which 90g is flour, 90g is water)
```

The protocol needs a `total_flour_basis` concept that:
- sums all `flour_type` ingredients across the *entire* nested recipe tree (main dough + every
  preferment/soaker/scald that contains flour) to derive 100%,
- lets every other ingredient (including preferment sub-recipe *outputs*, decomposed into
  their own flour/water/salt) declare its quantity as `percent_of(total_flour)`,
- distinguishes **overall formula** (includes preferment's internal flour/water, useful for
  hydration math and buying flour) from **final-dough formula** (what actually goes in the
  mixer at final-mix time, where the preferment is one already-mixed ingredient) — these are
  two valid *views* over the same data, not two different recipes.

### 2. Percentage-of-what (general ratio-basis concept)

A single `ratio` field ("2%") is meaningless without its basis. Bases actually observed in
this corpus, each of which changes the safety/scaling math if confused with another:

| Basis | Used by | Example |
|---|---|---|
| `total_flour_weight` | all bread doughs | hydration 78% = 702g water / 900g flour |
| `vegetable_or_fruit_weight` (trimmed, pre-salt) | sauerkraut | 2.25% of 900g trimmed cabbage = 20g salt |
| `water_weight` or `water_plus_vegetable_weight` | brined pickles | 3.5% of (water+cucumber) combined weight |
| `mash_weight` (chopped, no added liquid) | fermented hot sauce (mash style) | 2–8% of pepper mash weight |
| `total_mass_at_pack` | miso | 5–13% of (soybean + koji) combined weight |
| `protein_weight` (meat/fish) | cures, charcuterie | 50% salt+sugar of gravlax fillet weight; nitrite ppm of meat weight |
| `finished_batch_volume` | kombucha backslop | 10–20% of prior F1 batch volume becomes new starter liquid |
| `curing_salt_product_weight` (a *derived* intermediate) | nitrite dosing | 0.25% of meat weight *as Prague Powder #1*, which is itself only 6.25% active nitrite — a two-hop conversion, not a direct ratio |

The protocol needs `Ratio { value: number, basis: BasisRef, unit: "%"|"ppm" }` where
`BasisRef` points to a named, resolvable quantity in the recipe graph (an ingredient group, a
sub-recipe's total weight, or "this ingredient before an upstream processing step" — e.g.
sauerkraut's basis is cabbage weight *before* it loses ~10–20% to trimming, which must be
captured, not the weight of a random uncored head).

### 3. Preferments, sub-recipes, starter maintenance, backslopping

Four distinct nesting patterns, not one:

- **One-shot sub-recipe consumed by the parent** (biga, poolish, scald/tangzhong, soaker): a
  fully self-contained recipe (own ingredients, own timeline) whose *entire output weight*
  becomes a single ingredient line in the parent, but whose *internal* flour/water still needs
  to be decomposed back into the parent's overall-formula percentages (see §1).
- **Recurring maintenance process, decoupled from any bake** (starter/levain/massa mãe): has
  its own independent cadence ("feed 1:5:5 twice daily until it doubles in 6h") that exists
  whether or not a bake is scheduled. A bake's "build the levain" step *references* this
  process and pulls a portion of it, rather than owning it.
- **Backslopping** (kombucha SCOBY + starter liquid, sourdough discard reused as inoculant in
  next kraut, vinegar mother): output of batch N becomes required input of batch N+1, in a
  loop with no fixed start — the protocol needs a `carries_forward_from: previous_batch`
  reference distinct from a normal ingredient purchase, and ideally two carry-forward slots
  when a process yields two different reusable outputs (SCOBY mat vs. starter liquid).
- **Physical-transformation pre-step that is not a ferment** (corn-flour scald in broa de
  milho, tangzhong): time+temperature-bound but with no microbial activity — needs the same
  "produces an intermediate with a new weight/hydration state" shape as a preferment, without
  implying fermentation semantics (no "ripeness" endpoint, just "fully hydrated/gelatinized").

### 4. Time as range + condition, not a number

Every fermentation stage in the corpus is bounded by at least one of: a duration range, a
sensory/objective endpoint, or both, and the two are not interchangeable — "4–6h" is a
planning estimate; "until doubled" is the actual gate. Required shape:

```
Duration {
  min: "3h", max: "4h",              // range, both optional
  endpoint: SensoryTest | ObjectiveTest,  // e.g. "poke test springs back slowly in ~5s"
  temperature_ref: "78-82F ambient/dough temp"  // duration is only valid at this temp
}
```

Examples needing this: Tartine bulk (3–4h @ 78–82°F, *or* until domed and jiggly); kimchi
ferment (1–5 days room temp depending on desired sourness, taste-tested); fermented hot sauce
(2–4 weeks, gated by pH <4.6 not by calendar); F1 kombucha (7–14 days, gated by taste
"tart but not vinegary," not a fixed day count); gravlax (24/36/48h — here duration *is* the
selectable dial, mapped to named outcomes, an inversion of the usual "duration until state"
pattern that the protocol must also support: `Duration { fixed: "48h", implies_outcome: "hard cure" }`).

### 5. Temperature dependence

Two distinct temperature mechanisms, both needed:

- **DDT / friction-factor formula** (mixing-time-scoped, wheat doughs): desired dough temp
  (typically 75–78°F) is hit by solving for water temperature:
  `water_temp = (DDT × N) − (room_temp + flour_temp + friction_factor [+ preferment_temp])`,
  where `N` is the count of temperature terms used (3 without preferment, 4 with) and friction
  factor depends on *mixing method* (hand ≈ 5°F rise, stand mixer ≈ 20°F, food processor ≈
  25°F) — [King Arthur friction factor](https://www.kingarthurbaking.com/blog/2018/08/27/determining-the-friction-factor-in-baking).
  The protocol needs `mixing_method` as an input this formula reads, plus room/flour temp as
  user-supplied environment variables.
- **Fermentation-rate vs ambient temp** (post-mix, applies to every stage after mixing,
  bread and non-bread alike): higher ambient temp → shorter duration, roughly following a
  Q10-like acceleration (colder retard, e.g. 8h room vs 18–20h fridge for the *same* bulk
  outcome in Tartine's method). The app needs, at minimum, `ambient_temperature_c` as a
  process variable that can rescale a `Duration.min/max` — this requires the protocol to carry
  either an explicit rate curve or a reference temperature the stated duration assumes, so the
  app isn't guessing an adjustment out of thin air.

### 6. Process variables that aren't ingredients

Observed in this corpus, all of which change outcome/timing without being consumed:
ambient temperature and kitchen humidity (proofing rate, laminated-dough workability);
flour protein/ash/W-value (hydration ceiling, gluten strength — relevant to substituting flour
types, §10); water hardness/chlorine (affects fermentation rate and starter health — chlorine
can suppress wild yeast/LAB); altitude (leavening/boil-point effects, mentioned as a bread
variable generally); oven type — deck vs convection vs Dutch oven (steam retention,
heat transfer, directly changes bake time/temp for the *same* dough); steam injection
presence/absence (crust development); fermentation vessel material and headspace (crock vs
mason jar vs vacuum bag — airlock vs open jar changes CO2/pressure handling, relevant to
kimchi "burping"); vessel size/geometry relative to batch (surface-area-to-volume ratio
affects both bread crust% and ferment's air exposure/mold risk). None of these are
"ingredients" in any schema sense, but several (mixing method, ambient temp, vessel type) are
read by formulas in §5, so the protocol needs a `process_context` object distinct from the
ingredient list, with fields recipes can declare dependence on.

### 7. Repeating/cyclic steps

Every corpus domain has at least one loop that is not "repeat N times" alone — it has an exit
condition layered on top:

- Croissant folds: `repeat(3, { fold, rest: "30-60min chilled" })`, fixed count.
- Tartine bulk folds: `repeat(4, interval: "30min")` but *only during the first 2h* — a
  loop bounded by elapsed time of the parent stage, not a fixed count independent of it.
  the specific 78-82°F loop also stops early if the dough visibly over-expands.
- Kombucha/kimchi jar burping: `repeat(daily, until: parent_stage_complete)` — open-ended,
  bounded by the fermentation's own endpoint rather than a count.
  Starter feeding: `repeat(2/day, ratio: "1:5:5", until: "doubles within 6h")` — the loop's
  *exit condition is itself a performance test* (starter is "ready" once each feed round
  hits the 6h-double target consistently), and the ratio inside the loop can itself change
  over the loop's lifetime (novice starters often start at 1:1:1 and are stepped up).

The protocol needs a `Loop { repeat: count | cadence, condition: exitTest, body: Step[] }`
shape, and the exit condition must be able to reference the same `SensoryTest`/`ObjectiveTest`
vocabulary as single-step endpoints (§4), not a separate mini-language.

### 8. Non-linear scaling

Things that do **not** scale linearly with batch size, all present in this corpus:

- **Bake time vs loaf size/shape**: doubling dough weight does not double bake time
  (heat penetration is roughly surface-area/volume-governed); a baguette (high
  surface-to-volume) loses far more moisture and bakes faster per gram than a boule of equal
  weight. Scaling must NOT simply scale the `Duration` of a bake step.
- **Salt in ferments**: this one *does* scale linearly by weight ratio (2% of cabbage weight
  is still 2% at 10× batch) — worth stating explicitly as the contrast case, since it is one
  of the few things that is safe to naively scale.
  **Yeast**: sub-linear at large/commercial scale (professional formulas often reduce % yeast
  as batch size or bulk length increases) — the corpus's biga at 0.25–1% yeast for an
  18h ferment vs. same-day direct-dough recipes at 2%+ instant yeast shows the *inverse*
  relationship between fermentation time and yeast% within a single style, which the protocol
  should expose as a coupling, not treat yeast% as independent of chosen bulk duration.
- **Pan/vessel geometry**: a sauerkraut crock scaled 4× cannot just get 4× the salt+cabbage in
  the same jar — headspace and weight-down pressure need to scale with surface area, not
  volume, or the ferment goes anaerobic incorrectly / overflows.
- **Curing time for meat**: scales with the *thickness* of the cut, not its weight — a formula
  the protocol should be able to flag as "do not auto-scale from batch multiplier" the same
  way bake time is flagged.

Recommendation: every `Duration` needs a `scaling_behavior` tag —
`linear_with_batch | invariant_to_batch | function_of(dimension)` (where dimension might be
`loaf_diameter`, `cut_thickness`, `surface_area`) — so the frontend's "rescale this recipe"
feature knows which numbers to touch and which to leave alone.

### 9. Yield, loss, and conversions

- Baking loss: 10–20% of dough weight lost to evaporation during baking+cooling (higher for
  hearth loaves/baguettes with more crust surface, lower for pan breads) —
  [Busby's Bakery, IREKS compendium](https://www.busbysbakery.com/bread-weight-lost-when-baked/).
  A recipe stating "makes 1.8kg dough" and "makes 2 × 900g loaves" are only consistent if the
  protocol accounts for ~10% loss (1.8kg dough → ~1.62–1.7kg baked, i.e. roughly 800–850g per
  loaf, not a clean 900g). The protocol needs an explicit `yield.dough_weight` distinct from
  `yield.baked_weight`, with the conversion factor stated or computable, so the UI never
  silently implies dough weight = eating weight.
- Fermentation weight loss: sauerkraut/kimchi lose some liquid to brine formation and CO2,
  meaning "yield" for a ferment is properly stated as a *range* against input vegetable
  weight, not a fixed number.
- Cure absorption/loss: gravlax loses weight (moisture drawn out by the salt/sugar cure) —
  finished weight is meaningfully less than starting fillet weight, relevant if a user wants
  to plan servings.

### 10. Safety-critical constraints (numeric, sourced)

These must be representable as **hard-bounded** quantities the app refuses to let scaling or
substitution silently violate — not just descriptive text:

| Constraint | Threshold | Source |
|---|---|---|
| Lacto-ferment brine salinity floor | do not go below **2%** salt (of water+veg weight); typical safe range 2–5% | [Fermenting for Foodies](https://www.fermentingforfoodies.com/fermentation-brine-salt-to-water-ratio-for-vegetables/) |
| Sauerkraut salt floor/ceiling | **2.0–2.5%** of trimmed cabbage weight (extension-service recommended) | [Frugal Organic Mama](https://www.frugalorganicmama.com/blog/how-to-make-sauerkraut/) |
| Fermented hot sauce (peppers, more mold-prone than cabbage) | **3–5%** brine, or 2–8% in a compressed mash; pH must reach **<4.6** for shelf stability, **<4.0** recommended home-safety margin | [Salamander Sauce](https://www.salamandersauce.com/salamander-hot-sauce-blog/how-to-ferment-hot-sauce), [Ferment Foundry](https://fermentfoundry.com/how-to-make-fermented-hot-sauce/) |
| Botulism / low-acid + anaerobic + temp danger zone (garlic-in-oil etc.) | pH **>4.6** AND anaerobic AND **40–120°F (4–49°C)** = unsafe combination; acidify to pH <4.6, ideally <4.0, or refrigerate <40°F and use within days | [CSIRO](https://www.csiro.au/en/research/health-medical/nutrition/vegetable-preservation) and botulism-condition sources above |
| Sodium nitrite (curing salt), by product category | **120 ppm** bacon; **156 ppm** frankfurters/cured sausage; **200 ppm** brine-cured/injected (ham, pastrami) and dry-cured bacon; **625 ppm** dry-cured whole-muscle products; Prague Powder #1 is only **6.25%** active nitrite, so dosing is a two-hop conversion (meat weight → curing-salt-product weight → ppm nitrite in final product) | [Charcuterie Handbook curing salts guide](https://charcuteriehandbook.com/guides/curing-salts-guide/), FDA/USDA limits cited therein |

Modelling implication: the protocol needs a `SafetyBound { min?, max?, unit: "%"|"ppm"|"pH", basis: BasisRef, consequence: string, source: citation }` attached directly to the relevant `Ratio`, and any UI feature that rescales a recipe (batch multiplier, ingredient
substitution) must check the *resulting resolved value* against the bound before allowing it —
e.g. halving a nitrite recipe by simple arithmetic is fine, but a user manually overriding
"curing salt" grams must be blocked or hard-warned if the resolved ppm exceeds the ceiling.
This is the one place in the whole domain where "just let the user type a number" is
actively dangerous.

### 11. Substitutions that change the method

| Substitution | Ratio / rule | Forces a method change? | Source |
|---|---|---|---|
| Whole wheat for white flour | typically +1–2 tbsp water per cup swapped (bran absorbs more), shorter/gentler bulk (bran cuts gluten strands) | **Yes** — hydration% and bulk duration both shift, not just the flour line | general baking knowledge, consistent across corpus recipes |
| Instant vs active dry vs fresh yeast | roughly 1 : 1.25 : 2 by weight (instant : active dry : fresh) | No (same method, different quantity + fresh yeast needs proofing in liquid first — a small step addition) | standard baking conversion |
| Commercial yeast vs sourdough starter | not a ratio substitution at all — timeline changes from ~2h to 8–24h+ and requires an entirely different preferment sub-recipe | **Yes, completely** — different technique tree, not a swap | corpus recipes #1 vs #2 |
| Table salt vs Morton kosher vs Diamond Crystal kosher | by **volume**: 1 tsp table ≈ 1.5 tsp Morton ≈ 2 tsp Diamond Crystal; by **weight** they are equal (1g = 1g regardless of type) | No method change, but a **unit-system trap** — recipes authored in volume for one salt brand are wrong if followed with another brand's salt at the same volume | [salt conversion sources above] |
| Xanthan gum vs psyllium husk (GF binder) | ~1.5 tsp xanthan ≈ 2 tbsp psyllium | **Yes** for bread specifically — psyllium forms a gel needing its own hydrate/rest sub-step and is preferred for doughs meant to be kneaded/shaped; xanthan suits batters. Swapping changes whether the recipe is dough-like or batter-like | [The Loopy Whisk psyllium 101](https://theloopywhisk.com/2021/10/23/psyllium-husk-101/) |
| Sugar substitutes in a ferment (e.g. honey/alt sweetener for kombucha's sucrose) | non-1:1 — yeast/bacteria in a SCOBY are adapted to feed on sucrose specifically; substituting can starve or alter the culture | **Yes** — can break the fermentation entirely, not just change flavor | general kombucha brewing knowledge, consistent with F1/F2 sources above |
| Gluten-free flour blend for wheat flour | not a substitution ratio at all — different binder, no gluten development possible, batter not dough, different shaping/pan method | **Yes, completely** | corpus recipe #9 |

The protocol needs substitutions to be able to declare `changes_method: boolean` and, when
true, point to an alternate step sequence/sub-recipe rather than just an alternate ingredient
— a straight ingredient-swap field cannot express "use gluten-free flour" honestly.

### 12. Equipment substitutions that change the method

Dutch oven vs baking stone+steam-injection vs plain sheet pan: all three can bake "the same"
bread, but each needs a different steam/heat strategy (Dutch oven traps its own steam and
needs lid-off timing; stone+steam needs an external steam source and often ice cubes/spritzing;
sheet pan needs an external steam pan and usually produces a different crust) — equipment
choice changes *which steps exist*, not just bake time. Fermentation vessel choice similarly
changes method: an open crock needs daily skimming/weighting, a mason jar with a solid lid
needs daily burping to release CO2 pressure, a vacuum-sealed bag needs neither but must be
"burped" differently (partial reseal) and has a different mold-exposure risk profile. The
protocol needs equipment listed as a first-class recipe input (like ingredients), with
alternate equipment mapped to alternate step sub-sequences, mirroring the ingredient
substitution shape in §11.

### 13. Sensory endpoints / doneness

Endpoints observed, each needing a different data shape:

- **Internal temperature** (objective, single number/range): bread crumb 190–210°F depending
  on enrichment; cured/cooked charcuterie has explicit safe-minimum internal temps.
- **Visual/color** (subjective but describable): "domed and jiggly," "golden brown," kimchi
  paste color once gochugaru is fully incorporated.
- **Sound** (hollow tap test on bottom crust — binary pass/fail, hard to make objective).
  **Poke/spring-back test** (bulk fermentation readiness): "springs back slowly, leaving a
  slight indent" — a described tactile test, genuinely hard to reduce to a number, arguably
  the single hardest thing in this corpus to encode faithfully as data rather than prose.
- **pH** (objective, measurable): fermented hot sauce target <4.6, home margin <4.0; this is
  the rare endpoint that doubles as a safety gate (§10).
- **Taste** (explicitly used as the *primary* gate in kombucha F1: "tart but not vinegary" —
  a professional/experienced-only test with no numeric proxy offered by any source found).
- **Smell** ("smells lactic/sour, not putrid or off" — used across all lacto-ferments as a
  spoilage check, again resistant to numeric encoding).
- **Float test** (used in sourdough starter readiness checks generally, not found explicitly
  in this corpus's sources but standard practice: a spoonful of ripe starter floats in water).

Recommendation: model doneness as `Endpoint = ObjectiveTest(metric, unit, threshold) | SensoryTest(sense: sight|touch|smell|taste|sound, description, media_ref?)`, and
allow a step to require *either* an objective test *or* a sensory test *or* both (e.g. hot
sauce needs pH AND taste). Sensory tests should be allowed — even encouraged — to carry a
media reference (§15), since "springs back slowly" is nearly impossible to teach in prose
alone.

### 14. Failure states and troubleshooting

Worth encoding as first-class, queryable data, not just narrative asides, because several are
safety-relevant (not just quality-relevant):

- Kahm yeast (harmless white film, cosmetic) vs mould (fuzzy, colored, discard-the-batch) on a
  ferment surface — a real forked decision point a user needs help making, ideally with
  reference photos.
- Over-proofed vs under-proofed bulk/final proof — visually similar failure directions
  (both "doesn't look right") with opposite corrective actions (under: wait longer;
  over: degas and reshape or accept a denser loaf) — worth a `FailureState { symptom,
  likely_cause, corrective_action }` linked from the relevant step's endpoint check.
- Under-developed gluten (windowpane test fails) vs over-mixed (dough tears, won't hold gas) —
  again opposite-direction failures from a similar symptom.
- Ferment gone anaerobic-wrong (off odors, discoloration) vs functioning as intended (mild
  sulfur/tang smell that resolves) — the "is this normal" question is one of the most common
  real failure points in fermentation specifically, and is exactly where a text-only recipe
  fails users hardest.

This argues for a `troubleshooting: FailureState[]` array attached to steps/endpoints,
distinct from the main happy-path step sequence, so the frontend can surface "this doesn't
look right — here's what might be wrong" without cluttering the primary instructions.

### 15. Media needs (photo/video per step)

Steps in this corpus that are essentially unteachable in text alone, confirming the project's
existing "media slot per step" design intent:

- Shaping/moldagem (regueifa braiding, boule/batard shaping, baguette rolling) — hand
  positions and motion, not describable step-by-step in words without becoming unusable.
- Windowpane test (stretch a small piece of dough thin enough to see light through without
  tearing) — a pass/fail visual test that is the *definition* of "correctly kneaded," useless
  without a reference image of what "thin enough" looks like.
- Lamination folds (letter vs book fold, aligning butter block edges) — sequence of physical
  folds where a single ambiguous instruction ruins the whole batch.
- "What healthy ferment bubbling looks like" (kimchi/kraut/hot sauce) vs the failure states in
  §14 — side-by-side reference photos are the only reliable way most home fermenters learn to
  distinguish kahm yeast from mould, or normal cloudiness from spoilage.
- Poke test / spring-back test (§13) — video is genuinely better than photo here since it's a
  *motion and response time* being demonstrated.
- Score/scoring cuts on a loaf before baking — angle and depth of the blade, blade type.

All of these support the parent project's existing decision to reserve a media slot per
step — this corpus is strong independent confirmation that it's necessary, not optional, for
at least shaping, windowpane, lamination, poke test, and "does my ferment look right" checks.

---

## Summary of hardest constructs to get right

1. **A general `Ratio { value, basis, unit }` type** where `basis` is a resolvable pointer
   into the recipe graph — not a hardcoded "percent of flour" field. Bread pivots on flour;
   sauerkraut pivots on trimmed vegetable weight with zero added water; pickles pivot on
   water+vegetable combined; miso pivots on total soybean+koji mass; cures pivot on protein
   weight with a two-hop conversion through an intermediate curing-salt product. One field
   name cannot serve all of these honestly.
2. **`SafetyBound` as a first-class, enforced attachment to a `Ratio`**, not prose — nitrite
   ppm ceilings (120–625 ppm depending on product), brine salinity floors (2%), and pH
   thresholds (<4.6, ideally <4.0) are real numbers from FDA/USDA and extension-service
   sources that a batch-rescale or ingredient-substitution feature could silently violate if
   the protocol treats them as ordinary scalable quantities.
3. **Recurring/decoupled processes** (starter maintenance, backslopping) that exist
   independent of any single bake or batch, plus **nested sub-recipes** whose *internal*
   composition (flour, water) must still resolve back into the parent's percentage math even
   though the parent only "sees" one ingredient line.
4. **Duration as range + condition + temperature-dependence**, where the stated number is
   only valid at a stated reference temperature and the app is expected to adjust it from
   ambient input — this needs an actual rate model, not just a display range.
5. **Non-linear scaling flags** on time/vessel-geometry values, distinguishing what a batch
   multiplier is allowed to touch (salt%, most ingredient weights) from what it must not touch
   naively (bake time, cure time, vessel headspace).
