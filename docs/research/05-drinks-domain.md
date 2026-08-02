# Drinks Domain — Stress-Testing the Universal Recipe Protocol

Panel: barista, bartender, beverage fermenter. Goal: verify the protocol can honestly express coffee, cocktails, beer/cider/kombucha/tea/water-kefir without lying about ratios, dilution, equipment, or process timing.

## Part 1 — Corpus (18 recipes/specs)

| # | Recipe/spec | Source | What it breaks in a naive "ingredients list + numbered steps" model |
|---|---|---|---|
| 1 | Espresso dial-in, 18g→36g, 25–30s, 91–93°C | [Espresso of Interest](https://espressoofinterest.com/insights/dial-in-espresso), [Rancilio](https://www.ranciliogroupna.com/dialing-in-espresso-guide/), [iCoffee](https://icoffeeapp.com/en/recipes/espresso-icoffee) | The "recipe" is a **ratio + time target** (1:2, 25–30s), not a fixed quantity. Grind size isn't a quantity, it's an equipment-setting parameter you iterate against a target output, not a step you follow once. |
| 2 | V60 pourover, Hoffmann recipe: 30g coffee : 500g water (1:15), pours at 0:00 (60g bloom), 0:45 (→300g), 1:15 (→500g) | [timer.coffee](https://www.timer.coffee/recipes/v60/james-hoffman-v60-recipe/), [Honest Coffee Guide](https://honestcoffeeguide.com/brew-recipes/james-hoffmann-v60/) | A **timeline of scheduled pour events**, each with an absolute cumulative-weight target, not a discrete ingredient amount. Rescaling must scale every pour's target weight proportionally, not just a total. |
| 3 | Cold brew concentrate, 1:8 (125g:1L), steep 12–24h (fridge, 14–16h typical) | [Coffee Gear Hub](https://www.coffeegearhub.com/how-to-make-cold-brew-coffee-at-home/), [myhomebarista](https://myhomebarista.com/guides/cold-brew-ratio/) | Long unattended steep as a **duration range with a taste-quality gradient**, not a fixed step time. Output is a *concentrate* meant to be diluted again at serving — a sub-recipe with its own draw ratio. |
| 4 | Aeropress: 1:12–1:18 for a cup, 1:6–1:8 for a concentrate | [myhomebarista](https://myhomebarista.com/guides/cold-brew-ratio/) (brew ratio guide) | Same "recipe" name maps to *two different ratio bands* depending on intended serving style (straight vs. over-ice/milk) — ratio choice is itself a variant, not a constant. |
| 5 | French press: 1:12 (strong) to 1:17 (mild) | Coffee Gear Hub brew-ratio guide | Ratio is a **user taste dial along one axis**; the protocol needs a way to express "recipe defined as a ratio range with a strength slider," not one fixed number. |
| 6 | Moka pot: 1:7–1:12 | Coffee Gear Hub brew-ratio guide | Equipment (fixed-volume basket) caps how the ratio can be hit — dose is constrained by chamber geometry, not freely scalable like pourover. |
| 7 | Cappuccino: 1oz (30ml) espresso : 1/3 steamed milk : 1/3 foam in a 150–180ml cup, milk steamed to 150–160°F | [Bean Box](https://beanbox.com/blog/how-to-make-a-cappuccino), Stone Creek Coffee | **Sub-recipe composition**: espresso shot (recipe #1) is an ingredient inside this recipe. Milk "texturing" is a technique/process, not a quantity — foam volume and microfoam quality aren't expressible as a static amount. |
| 8 | Espresso tonic: 1:2–1:3 espresso:tonic, tonic poured first over ice, then espresso floated on top | [Methodical Coffee](https://methodicalcoffee.com/blogs/coffee-culture/the-perfect-at-home-espresso-tonic-recipe-with-variations), [coffeeness.de](https://www.coffeeness.de/en/espresso-tonic/) | **Sequence-sensitive assembly**: pour order isn't cosmetic, it changes the outcome (carbonation loss if reversed). A protocol that treats ingredients as an unordered set loses this constraint. |
| 9 | Negroni: 1:1:1 gin:Campari:sweet vermouth (30ml each), stirred 30–40 rotations to ~-3 to -5°C, ~15–20% dilution | [Wikipedia](https://en.wikipedia.org/wiki/Negroni), [tastingtable](https://www.tastingtable.com/1134364/reasons-you-may-want-to-consider-diluting-your-negroni/), [thetastingedge](https://thetastingedge.com/negroni-guide/) | Pure ratio recipe with **no absolute quantities in the "true" definition** — 1:1:1 scales to any glass/batch size. Water from ice is an unlisted but essential "ingredient" that must be modeled explicitly to batch correctly. |
| 10 | Whiskey Sour: 2oz whiskey : 3/4oz lemon : 3/4oz syrup (or 3:2:1 spirit:citrus:sweet "golden ratio" for the whole sour family), optional 1/2oz egg white, dry shake then wet shake | [Diffords](https://www.diffordsguide.com/cocktails/recipe/2083/whiskey-sour-diffords-recipe), Absolut Drinks | **Two-phase technique** (dry shake for emulsion, wet shake for dilution/chill) — a single "shake" step is insufficient; needs phase-differentiated parameters (with-ice vs without). Also a *ratio template* (3:2:1) reused across a whole cocktail family, with the base spirit swappable. |
| 11 | Batched Negroni/Manhattan-style cocktail for a crowd: add ~18–25% of total spirit volume as water pre-batch to replace shaking/stirring dilution | [Jeffrey Morgenthaler calculator](https://jeffreymorgenthaler.com/the-batch-cocktail-calculator/), [cocktailsandbars.com](https://cocktailsandbars.com/how-to-calculate-dilution-for-pre-batched-cocktails/) | **Dilution must become an explicit added ingredient** at batch scale — it doesn't happen "for free" from ice contact like a single served drink. This is the sharpest real protocol problem: an ingredient (water) exists in one execution mode and not another, same recipe. |
| 12 | Oleo saccharum: citrus peels + sugar ~1:1 by weight (or 2oz sugar : 1 lemon), rest 1–24h, strain — used as a sub-ingredient in punches | [Advanced Mixology](https://advancedmixology.com/blogs/art-of-mixology/how-to-make-oleo-saccharum), [Food52](https://food52.com/recipes/75812-oleo-saccharum) | **Sub-recipe with yield-and-draw semantics**: makes an indeterminate yield (depends on citrus juiciness) consumed in small measured amounts by other recipes — no fixed "makes N servings." |
| 13 | Clarified milk punch: acid+spirit mix curdles milk, rests 20–60 min, gravity-strains through cheesecloth over hours/days, best after resting 2–3 days, fridge life ~2 weeks | [Campari Academy](https://www.campariacademy.com/en-us/training/tools-techniques/milk-punch-guide-and-recipes/), [Boston Shaker](https://www.thebostonshaker.com/clarified-milk-punch-recipe/) | **Multi-day process with irreversible destructive steps** (curdle → discard curds) and a maturation window that changes flavor after "completion." No naive single-serving model captures a process spanning days with a shelf-life-bound end product. |
| 14 | Zombie (tiki): 8 components (2 rums + overproof rum, lime, falernum, grenadine, Pernod dash, bitters dash, Don's mix), 6oz crushed ice, flash-blended 5s | [Beachbum Berry](https://beachbumberry.com/recipe-zombie.html), [Punch](https://punchdrink.com/recipes/smugglers-cove-zombie/) | High component count with **sub-dash-level precision** (drops, dashes) mixed with full-ounce measures in the same recipe — the unit system must span 6+ orders of granularity without forcing everything into the smallest unit. Crushed-ice blending is a distinct dilution regime from shaking or stirring. |
| 15 | Fog Cutter (tiki): rum, brandy, gin, lemon, orange juice, orgeat, shaken, then a **sherry float** poured last, served over crushed ice | [VinePair](https://vinepair.com/cocktail-recipe/fog-cutter/), [Robb Report](https://robbreport.com/food-drink/spirits/best-fog-cutter-recipe-classic-tiki-cocktail-1234857362/) | "Float" is a technique-tagged ingredient that must NOT be mixed in — order and mixing-method vary *per ingredient within one recipe*, not just per recipe. |
| 16 | Homebrew IPA: grain bill (9lb Vienna + 4lb Munich malt etc.), mash 64–68°C/60min, 60-min boil, hop additions at 60/20/10/0 min + whirlpool/dry-hop, OG 1.070→FG 1.016, IBU 34, ABV 7% | [blog.homebrewing.org](https://blog.homebrewing.org/german-ipa-beer-recipe-all-grain-partial-mash/), [Hazy and Hoppy](https://hazyandhoppy.com/i-brewed-nate-laniers-tree-house-style-ipa/), [BeerXML](https://beerxml.com/beerxml.htm) | Canonical **event timeline keyed to a process clock that runs backward from a fixed endpoint** (minutes remaining in boil), plus derived/computed fields (ABV from OG/FG) that the app should calculate, not the user. |
| 17 | Cider: OG 1.060–1.070 → FG 0.994–1.002 (7.5–9.5% ABV), primary ferment 1–2 weeks, rack at SG <1.005, secondary up to 30 days, rack again before bottling at SG 0.998–1.004 | [DIY Hard Cider](https://diyhardcider.com/how-to-make-hard-cider/), [Northern Brewer forum](https://forum.northernbrewer.com/t/when-should-i-rack-it/9034), [Jasper's/boomchugalug](https://boomchugalug.com/pages/traditional-new-england-farmhouse-cider) | **Conditional/gravity-triggered steps**, not calendar-triggered: "rack when SG < 1.005," not "rack on day 14." The protocol needs measurement-triggered branching, and racking is destructive (leaves sediment behind — mass changes each transfer). |
| 18 | Kombucha F1 (1–2 cups starter : 1 gal sweet tea, SCOBY, 7–14 days) → F2 (¼–⅓ cup fruit puree per 16oz bottle, 1–3 days room temp, daily "burping," then ≥4h fridge) | [thefermentguide.com](https://thefermentguide.com/blog/how-long-does-kombucha-ferment), [kombucha.com F1](https://kombucha.com/blogs/tutorials/primary-fermentation-f1-brewing-instructions), [kombucha.com F2](https://kombucha.com/blogs/tutorials/secondary-fermentation-f2-brewing-instructions) | **Two chained sub-recipes** where F2 consumes F1's output as its base "ingredient," each with independent taste-driven stopping conditions and a safety-critical monitoring step (burping to prevent bottle bombs) that isn't optional. |
| 19 | Water kefir: 1 tbsp grains : 1 cup sugar-water (≈1:16–1:24 grains:water for active culture), ferment 24–48h room temp | [kombuchakamp](https://www.kombuchakamp.com/water-kefir-recipe), [kefirgrains.eu](https://www.kefirgrains.eu/waterkefir/sugar-to-water-ratio-making-kefir/) | The "ingredient" (grains) is a **living culture that is removed and reused**, not consumed — quantity present affects fermentation rate but isn't part of the final drink's ingredient list. Needs a "starter/culture" ingredient class distinct from consumed ingredients. |
| 20 | Shrub (drinking vinegar): 1:1:1 fruit:sugar:vinegar by volume (or 1lb fruit : 2 cups sugar : 2 cups vinegar cold-process) | [food52](https://food52.com/story/13831-how-to-make-shrubs-aka-drinking-vinegars-without-a-recipe), [The Kitchn](https://www.thekitchn.com/how-to-make-a-fruit-shrub-syrup-174072) | Ratio recipe mixing **volume and weight in the same triad** depending on cold vs. hot method — the same named recipe has two structurally different unit systems depending on a chosen variant. |
| 21 | Gongfu tea: ~1g leaf per 15ml vessel (5–8g in 120–150ml gaiwan), infusion 1 at 15–30s, +10–15s per subsequent infusion, 8–12 infusions total | [white2tea](https://white2tea.com/blogs/blog/how-to-brew-gongfu-style-an-expert-guide-to-making-tea), [Steep Atlas](https://steepatlas.com/learn/gongfu-brewing/) | **Recurring/generative timeline**: not N discrete steps but a rule ("steep N+1 = steep N + 10–15s") applied until the leaf exhausts — a procedural pour schedule, not an enumerable one. |
| 22 | SCA brewing water recipe: per 1L RO water, 0.17g Epsom salt (MgSO4·7H2O) + 0.10g sodium bicarbonate → ~70ppm hardness, ~50ppm alkalinity; SCA target 150±/-  75–250ppm TDS, pH 6.5–7.5 | [thirdwavewater.eu](https://thirdwavewater.eu/blogs/news/what-is-sca-water-standard-complete-guide-to-coffee-brewing-water-quality), [Ionic Brews](https://ionicbrews.com/sca-coffee-water-standards-home-brewers-guide) | Water itself is a **sub-recipe with a chemistry spec** (mineral additions in milligrams to a liter) — it's an "equipment input" masquerading as an ingredient, sitting outside every other recipe as a shared precondition. |

## Part 2 — Modelling Requirements

### 1. Ratio-first recipes

Most drinks (Negroni 1:1:1, cold brew 1:8, sours 3:2:1, syrups 1:1 or 2:1, gongfu 1:15) are *defined* as ratios and only *instantiated* as absolute quantities at serving time. The protocol needs a distinct recipe-definition mode:

```
recipe.definition = {
  mode: "ratio",
  parts: [
    { ingredient: "gin",            parts: 1 },
    { ingredient: "campari",        parts: 1 },
    { ingredient: "sweet_vermouth", parts: 1 }
  ],
  unit_per_part: { default: "30ml" }   // the "part" size, overridable
}
```

Instantiation is a separate operation: `instantiate(recipe, target)` where `target` is one of:
- `{ type: "single_serving", part_size: "30ml" }`
- `{ type: "container_volume", volume_ml: 700 }` (bottle) — solve for part size = volume / total_parts
- `{ type: "servings", count: 20, per_serving_volume_ml: 90 }` — batch

This is different from an absolute-quantity recipe (`{ ingredient: "flour", amount: "500g" }`) which has no free variable. A ratio recipe's parts are dimensionless until a target resolves them, and derived-water-for-dilution (Requirement 3) must be added *after* instantiation, not baked into the ratio.

### 2. Volume vs weight vs count

Baristas insist on weight because espresso is a fast, small-mass, high-precision extraction where a 1g dosing error is a ~5% ratio error and volume is unreliable (crema, bubbles, meniscus). Bartenders use volume because cocktail components are liquids measured fast, under service pressure, with tools (jiggers) calibrated in volume, and because classical ratios (1:1:1) are unit-agnostic by design.

Real conversions to hardcode as protocol-level unit definitions, not user input:
- 1 fl oz (US) = 29.57 ml
- 1 jigger = 1.5 oz = 44.36 ml; 1 pony = 1 oz = 29.57 ml
- 1 barspoon ≈ 5 ml (~1/6 oz; some sources say 3.7 ml/⅛oz — the protocol should store *both* a "bar spoon" and "teaspoon" unit since bartenders don't agree, and flag the ambiguity rather than silently picking one)
- 1 dash ≈ 0.6–1 ml (no formal standard; commonly modeled as 1/32 oz ≈ 0.92 ml)
- 1 splash ≈ 1/4 oz ≈ 7.4 ml
- "1 part" = unit-less, resolved only at instantiation (Requirement 1)

Density matters for syrups and must be modeled per-ingredient, not assumed 1g=1ml: a 2:1 rich simple syrup is *denser* than 1:1, and 1 cup sugar (≈7oz/198g) is not 1 cup water (8oz/237g) by weight — recipes that specify sugar "by cup" and water "by cup" are not actually 1:1 by mass. The protocol's ingredient model needs an optional `density_g_per_ml` field so weight↔volume conversion is per-ingredient, and a recipe should declare which unit family (weight/volume/count) it was authored in, converting only for display, not silently re-deriving.

### 3. Dilution as a first-class quantity

Real numbers, multiple independently sourced:
- Stirred cocktail: ~15–25% dilution (Wikipedia Negroni entry cites 15–20%; Cocktail College/VinePair sources cite 20–25%; converges ~20%)
- Shaken cocktail: ~25–30%, up to 35% with high-surface-area ice (cookingissues.com / Dave Arnold)
- Batch presets used by professional tools (Morgenthaler calculator): 0% (shake/stir to order), 18% (spirit-forward, stirred), 25% (shaken, juice/dairy/egg)
- Tiki flash-blend with 6oz crushed ice over a full shaken build: dilution regime distinct from both shake and stir

Model dilution as a **derived ingredient**, not a step annotation:

```
recipe.execution_modes = [
  { serving: "single", technique: "stir", ice: "large_cube", dilution_pct: 20, note: "chilled in-glass, water not pre-added" },
  { serving: "batch",  technique: "none", ice: "none_pre_service", dilution_pct: 20,
    added_ingredient: { name: "water", amount_pct_of_spirit_volume: 20 } }
]
```

The key invariant: **the same recipe, same final ABV/flavor, requires water to be an explicit measured ingredient in one execution mode and an implicit byproduct of technique in another.** A protocol that only lets "ingredients" be things poured from a bottle will silently produce over-strong batches.

### 4. ABV / strength calculation

Fermentation ABV (homebrew standard, moderate accuracy): `ABV = (OG − FG) × 131.25` — e.g., OG 1.070, FG 1.016 → ABV = 7.09%. More accurate at higher ABV: `ABV = (76.08 × (OG−FG) / (1.775−OG)) × (FG / 0.794)` (source: brewersfriend.com, homebrewacademy.com).

Mixed-drink ABV from components + dilution — this is a straightforward weighted computation the app should own, not the user:
`final_ABV = Σ(component_volume_i × component_ABV_i) / total_volume_after_dilution`
where `total_volume_after_dilution = Σ(component_volumes) × (1 + dilution_pct)`.

Extraction/strength for coffee (SCA Brewing Control Chart, [Podium Coffee Club](https://podiumcoffeeclub.com/blogs/blog/sca-brewing-control-chart)):
- `Extraction Yield % = (Beverage Weight × TDS%) / Coffee Dose × 100`
- Target window: TDS 1.15–1.35%, EY 18–22%; espresso TDS is far higher, 8–13%.

Spec inputs the app needs recorded/entered: dose weight, beverage weight, TDS% (refractometer reading) → EY is fully derivable. For fermented drinks: OG and FG (hydrometer/refractometer readings) → ABV is fully derivable. These are measurement→computation pairs (see Requirement 8), not free-text notes.

### 5. Equipment as a recipe parameter

BeerXML/BeerJSON's `equipment` record ([beerxml.com](https://beerxml.com/beerxml.htm), [beerjson GitHub](https://github.com/beerjson/beerjson)) is the strongest existing precedent: it captures batch volume, boil-off rate, mash-tun thermal loss, and hop utilization factors as a *reusable, named profile* referenced by many recipes, not duplicated per recipe. Coffee needs the analogous concept:

```
equipment_profile = {
  id: "hario-v60-02",
  category: "pourover_dripper",
  parameters: { cone_angle_deg: 60, hole_count: 1, flow_rate_class: "fast" }
}
grinder_profile = { id: "comandante-c40", setting_units: "clicks", setting: 24 }
water_profile = { id: "sca-standard", tds_ppm: 150, hardness_caco3_ppm: 70, alkalinity_caco3_ppm: 50, ph: 7.0 }
```

Changing dripper model, grinder, or water changes downstream parameters (grind setting units aren't portable across grinders — "24 clicks" on a Comandante means nothing on a different grinder). The protocol should treat equipment as a **referenced profile that recipe parameters are relative to**, and flag when a recipe's grind/dose parameters were authored against a different profile than the one selected (portability warning), same pattern BeerJSON uses for equipment-scoped boil-off/thermal-loss values. For cocktails: shaker type (Boston vs cobbler — affects seal/dilution speed), ice type (cube/crushed/sphere/clear — directly changes dilution rate and rate of chill), and glassware (affects perceived dilution via surface area) are equally equipment parameters, not garnish-tier metadata.

### 6. Process timelines with scheduled events

Four distinct timeline shapes appeared in the corpus, and one model must cover all of them:

1. **Absolute-clock, cumulative-target** (V60): events at t=0:00, 0:45, 1:15 each specifying a *cumulative* weight target (60g, 300g, 500g), not a delta.
2. **Countdown-clock** (beer boil): hop additions "at 60 min," "at 10 min," "at 0 min" — time-remaining-until-boil-end, which only resolves once total boil duration is fixed.
3. **Generative/recurring** (gongfu tea): steep N = steep N-1 + fixed increment, repeated until a stopping condition (leaf exhaustion), not enumerated up front.
4. **Condition-triggered, not time-triggered** (cider racking): "rack when SG < 1.005" — the event fires off a measurement reading, with no fixed calendar time, only an expected range ("~2–3 weeks," but authoritative trigger is the gravity reading).

A single `event` schema needs a `trigger` union type: `{ at_elapsed: duration }`, `{ at_remaining: duration, anchor: "process_end" }`, `{ recurring: { first: duration, increment: duration, until: condition } }`, `{ on_measurement: { field: "specific_gravity", op: "<", value: 1.005 } }`. Each event also carries a parameterised action (pour amount, hop addition + AA%, racking).

### 7. Feedback loops and dial-in — take a position

**Yes, encode troubleshooting as data, not prose.** Espresso dial-in is not a one-shot recipe — "if it ran fast (shot time below target, or yield too high for the time), grind finer next time" is a deterministic, machine-checkable rule given two recorded measurements (actual time, actual yield) against two targets. Model it as a recipe-attached rule set, separate from the base recipe:

```
adjustment_rules = [
  { if: { measured: "shot_time_s", vs: "target_shot_time_s", cmp: "below" },
    then: { adjust: "grind_setting", direction: "finer" } },
  { if: { measured: "shot_time_s", vs: "target_shot_time_s", cmp: "above" },
    then: { adjust: "grind_setting", direction: "coarser" } }
]
```
This lets the app *suggest* the next iteration automatically from a logged measurement, turning dial-in into a guided loop instead of tribal knowledge in a paragraph. The same shape applies to fermentation ("if FG stalls above target for 3 days, add yeast nutrient / raise temp") and to gravity-triggered racking. The counter-position — leave it as free-text notes — fails the stated goal (an app that "renders" and helps the user follow along); a rendered troubleshooting rule is the single highest-leverage feature separating this protocol from a static ingredient list.

### 8. Measurement readings as recorded data

Every fermented/extracted drink in the corpus produces readings the app should capture during execution, not just display targets for. Common schema:

```
measurement = {
  type: "specific_gravity" | "tds_pct" | "ph" | "temperature_c" | "elapsed_time_s" | "beverage_weight_g",
  value: number,
  unit: string,
  recorded_at: timestamp,
  instrument: "hydrometer" | "refractometer" | "thermometer" | "scale" | "timer",
  stage_ref: string   // which recipe stage/event this reading belongs to
}
```
Espresso needs `shot_time_s` + `beverage_weight_g` (yield) against dose; pourover/filter needs `tds_pct` + `beverage_weight_g` → EY; fermentation needs `specific_gravity` at OG and FG timestamps → ABV; kombucha F2 needs a subjective/measured carbonation level plus a safety-relevant elapsed-time-at-temperature reading. Readings feed both the derived computations in Requirement 4 and the adjustment rules in Requirement 7 — they are the single data spine both depend on.

### 9. Sub-recipes

Confirmed pattern across coffee (espresso-inside-cappuccino, cold brew concentrate), cocktails (oleo saccharum, rich syrup, milk punch base, Don's mix inside a Zombie), and fermentation (F1-inside-F2 kombucha, SCA water recipe as an input to every coffee recipe). Required shape: a sub-recipe declares a `yield` (with the caveat that yield can be indeterminate — oleo saccharum's is fruit-dependent) and consuming recipes reference it by a **draw amount**, not a duplicate ingredient list:

```
sub_recipe: { id: "rich-syrup-2-1", yields: { amount: "500ml", variable: false } }
consuming_recipe.ingredients: [
  { ref: "rich-syrup-2-1", draw_amount: "20ml" }
]
```
This also must support the *culture/starter* variant (water kefir grains, kombucha SCOBY, sourdough-style massa velha analog): an "ingredient" that is present during the process, imparts quantity-independent effect on rate, and is *removed* rather than consumed — it should not appear in the final ingredient/nutrition list.

### 10. Substitutions and their consequences

Substitution must be modeled as more than "ingredient A → ingredient B"; each swap has a **consequence class** that the protocol should tag so the app knows what else to recompute or warn about:

| Substitution | Real ratio/rule | Consequence class |
|---|---|---|
| Egg white → aquafaba | 1 egg white ≈ 1 fl oz (2 tbsp) aquafaba; dry-shake 10–12s vs 6s for egg white | **method change** (shake duration), not just ingredient swap |
| Simple syrup 1:1 → 2:1 rich | Use *less* of 2:1 (roughly half, by sweetness-equivalence, since 2:1 has ~33% more sugar by mass per unit volume than 1:1) | **quantity-forcing**: swapping density-different syrups changes the amount required, not just the label |
| Dairy milk → oat milk (barista) | Protein ~8g/8oz (dairy) vs ~3–4g/8oz (oat); steam oat to 60°C max vs 65°C dairy; gentler steam | **technique-forcing**: temperature and agitation parameters must change, not just the ingredient |
| Lime → lemon | Both ~5–6% citric-family acid but different flavor/acid profile; not a 1:1 flavor-neutral swap | **balance-forcing**: downstream sweetener ratio may need retuning, flagged not auto-corrected |
| Gin → genever/mezcal (Negroni-style) | Same volume, radically different flavor category (malty/smoky vs. botanical) | **category swap**: ratio holds, sensory identity doesn't — protocol shouldn't claim equivalence |
| NA spirit substitute | Needs added acid (citric/lemon) + tannin (tea, wine-tannin powder, hibiscus) + dilution correction since NA spirits often lack the body alcohol provides | **compensation-forcing**: one swap requires 2–3 correlated additions, not a 1:1 replace |
| Hop substitution by alpha-acid | `AAU = oz × %AA`; solve target hop's weight so `AAU_sub = AAU_original` (e.g., 2oz @ 6% AA = 12 AAU ⇒ 1.5oz @ 8% AA = 12 AAU) | **computed-quantity substitution**: a real formula, not a lookup table — the protocol needs a substitution type that re-solves a quantity from an equivalence formula |
| Coffee origin/roast swap | Darker roast → typically needs coarser grind + lower temp to avoid over-extraction bitterness | **parameter-forcing**: swap changes grind/temp targets, tagged to the adjustment-rule mechanism (Requirement 7) |

The protocol needs at least these substitution tags: `direct` (drop-in), `quantity-forcing` (recompute amount), `technique-forcing` (recompute a process parameter), `balance-forcing` (flag for manual retune), `computed` (apply a formula to solve a new quantity).

### 11. Serving spec as data

Structured, not prose: `glassware` (type + volume), `ice` (type: cube/crushed/sphere/clear — tag as a dilution-rate modifier per Requirement 3/5), `garnish` (`{ item, prep_method }`, e.g., "lime wheel, expressed peel then dropped in" — prep method matters, garnish isn't just a noun), `temperature_c` (serve temp, distinct from process temp), `storage` (`{ shelf_life_days, container, refrigerated: bool }` — used by batch cocktails, milk punch, cold brew concentrate, kombucha), `carbonation_level` (kombucha F2 — qualitative or PSI-estimated).

### 12. Safety/legal

Flag as **bounded, safety-critical quantities** requiring the app to refuse or hard-warn outside range, not just display:
- **ABV disclosure**: any recipe producing/serving alcohol should carry a computed final ABV (Requirement 4) for legal labeling on batch/bottled output.
- **Methanol risk in home distilling**: out of scope for this protocol (no distillation modeling planned), but flag explicitly so future scope decisions don't silently wander into it.
- **Pasteurization**: relevant to shrubs/cordials/bottled batches with extended shelf life — a `pasteurized: bool` + temp/time pair, since unpasteurized bottled products have a materially shorter safe shelf life.
- **Over-carbonation / bottle-bomb risk (kombucha F2, any bottle-conditioned ferment)**: bottles need pressure ratings ≥60 PSI per home-brew guidance; over-sugared F2 in warm rooms is the dominant failure mode. This is exactly the kind of measurement-triggered safety event Requirement 6 covers: `on_measurement: { field: "days_at_room_temp", op: ">", value: 3 }` → forced "burp/refrigerate" prompt, not optional.
- **Raw egg white**: salmonella risk is real but low with fresh pasteurized eggs; the protocol should carry an `allergen_risk`/`raw_ingredient` tag (egg, dairy) surfaced at serving-spec level for guest-facing use, and note aquafaba as the standard risk-eliminating substitution (Requirement 10).

### 13. Media needs

Steps that are much better shown than described, i.e. should carry a `media_slot` reference in the schema: espresso tamping/leveling and shot-pulling; latte-art milk pouring and the steaming/texturing technique itself (visibly different for oat vs. dairy per Requirement 10); pourover pour technique (agitation vs. gentle circular pour changes extraction); cocktail shaking technique (dry shake vs. wet shake motion, whip-shake for citrus); cocktail stirring technique (rotation count/speed); clarification straining (gravity-only, don't press curds — a step that's easy to get wrong from text alone); expressing citrus oils over a drink; tiki flash-blending. This mirrors the project's existing "método step layout reserves a media slot per step" convention already used for bread.

## Hardest requirements, ranked

1. **Dilution as a phantom ingredient** (Requirement 3) — the same recipe needs water to be implicit in one execution mode and an explicit measured quantity in another (batching). This is the single most protocol-breaking finding: no naive ingredient list survives it.
2. **Ratio-first definition with deferred instantiation** (Requirement 1) — recipes with zero absolute quantities until a target (serving/bottle/batch) is chosen.
3. **Four distinct timeline trigger shapes in one event schema** (Requirement 6) — absolute-cumulative, countdown, generative/recurring, and measurement-triggered, all needing to coexist.
4. **Computed substitutions** (Requirement 10, hop AAU) — a real formula-driven equivalence, not a lookup table, is the sharpest case of "substitution changes quantity."
