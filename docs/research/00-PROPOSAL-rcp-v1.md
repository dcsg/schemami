# RCP v1 — a universal recipe protocol

Status: **strawman for brainstorm — not a decision.** Read `FINDINGS.md` first
for the research findings and the open decisions this document takes a
position on. Choices the user made in conversation are marked; everything
else is proposed for reaction. · Date: 2026-08-02 · Branch: `research/recipe-protocol`

This document proposes **RCP** (Recipe Composition Protocol): one machine-readable
format able to encode any recipe — bread, pastry, fermentation, preserves, drinks,
coffee, savoury cooking — such that a single frontend can render it, rescale it,
substitute ingredients in it, and execute it step by step.

It is the synthesis of the research files alongside it:

| File | Track |
|---|---|
| `01-codebase-inventory.md` | What we model today (bread), and what must survive |
| `02-format-standards-research.md` | Prior art: schema.org, Cooklang, BeerJSON, Tandoor, Mealie… |
| `03-bread-fermentation-domain.md` | Baker + fermenter requirements |
| `04-pastry-savoury-domain.md` | Pastry chef + chef requirements |
| `05-drinks-domain.md` | Barista + bartender + brewer requirements |
| `06-substitution-model.md` | Ingredient substitution and method deltas |

---

## 1. The problem

Today the project models bread as a **fixed-field struct**. Verbatim, from
`site/src/calc/breadRecipes.ts:14`:

```ts
export interface BreadRecipe {
  slug: string; nome: string;
  blend: Record<string, number>;   // flour key → grams
  agua: number; azeite: number; banha: number;
  mv: number; mm: number; sal: number;
  extras?: Record<string, number>;
}
```

Water, olive oil, lard, massa velha, massa-mãe and salt are **named scalar
fields**. This is a good model of one domain and a fatal model of every other
one. A cocktail has no `banha`. A kimchi has no `blend`. A pour-over has no
`sal`. Every new food category under this design means a new bespoke struct —
which is exactly what already happened: `PizzaOpts`, `MMVariant` and
`OtherRecipe` are three parallel hand-rolled recipe shapes that share nothing.

Meanwhile the parts of the current system that are genuinely excellent —
SPEC-008's versioned `StepPrimitive` catalog, SPEC-007's flour class/product
split, and the site's heritage provenance model (`testemunhos`, `divergencias`,
`confidence`, `verified`) — are rare and worth generalizing rather than
rebuilding.

**RCP's job:** keep all of that, delete the fixed fields, and make the parts
that are bread-specific *expressible* rather than *hardcoded*.

---

## 2. Ten design decisions

### D1 — Author in YAML, interchange in JSON, validate with JSON Schema

Three surfaces, one contract:

- **Canonical form: JSON.** The normative, stored, validated artifact is JSON,
  in a versioned envelope (BeerJSON's pattern). This is what the API serves,
  what the iOS app persists, and what LLM extraction targets directly via
  structured output.
- **Authoring: `.rcp.yaml`, which compiles to that JSON.** A baker must be able
  to write a recipe by hand, and every format that ignored authoring
  ergonomics died — RecipeML needed 47 lines for a trivial recipe, found one
  adopting app, and was dead by 2002. So YAML is a supported *input*, compiled
  and validated in CI, not a second source of truth.

  This is a genuine trade-off and worth naming: YAML has real footguns (the
  Norway problem, ambiguous scalars, indentation errors) which is exactly why
  it should not be the canonical form. But for a git-tracked heritage archive
  where recipes are hand-written and reviewed in pull requests, plain JSON is
  a bad review surface. Compiling YAML → JSON in CI gets both.
- **Validation**: JSON Schema draft 2020-12 as the single source of truth,
  with generated TypeScript (web) and Swift (iOS) types. This matters
  concretely: the codebase currently keeps the same recipe shape hand-written
  in TS *and* Swift *and* SQL, and SPEC-008 already warns about keeping two
  mappings "in lockstep". Codegen from one schema removes that class of bug.
- **schema.org/Recipe JSON-LD is an export target, never storage.** It cannot
  express step→ingredient links, sub-recipes, substitutions, or scaling pivots,
  and its `recipeIngredient` is a bag of free-text strings. We emit it for SEO
  on paodeportugal.pt; we never read it as truth.

### D2 — There are no special ingredients. Everything is a quantity with roles.

`agua`, `sal`, `mm`, `banha` stop being fields and become rows:

```yaml
ingredients:
  - id: t65
    item: flour.wheat.t65        # canonical ingredient class
    amount: { value: 6000, unit: g }
    roles: [flour]
  - id: agua
    item: water
    amount: { ratio: 0.80, of: flour }
    roles: [hydration]
  - id: sal
    item: salt.sea.fine
    amount: { ratio: 0.02, of: flour }
    roles: [salt, flavour, fermentation-control]
  - id: mm
    item: culture.sourdough.centeio
    amount: { ratio: 0.25, of: flour }
    roles: [leaven]
    component: levain            # ← this ingredient is produced by a component
```

`roles` is the load-bearing addition. It is what lets generic math know that
`t65` counts toward the flour basis, that `agua` is hydration, and that `sal`
is safety-relevant in a ferment. It is also — per `06-substitution-model.md` —
the basis for substitution: swaps succeed or fail on whether the replacement
covers the same *functions*, which is why egg (binder + leavener + emulsifier +
moisture + colour) has no 1:1 replacement.

This also subsumes today's `extras` vs `inclusions` two-bucket hack, which is a
crude approximation of "does this ingredient participate in the hydration
maths". With roles, that question is answered per ingredient.

### D2b — Controlled vocabulary everywhere: enum, registry, or prose — nothing else

Anything that *can* be an enum should be one. Free text is data the app cannot
act on: it cannot filter, match, convert, warn, or translate it. But the
research surfaced a specific failure mode to avoid — Crouton structured its
quantities properly and then froze them in a closed 17-value enum, so adding a
regional unit requires a schema change and a client update. Closed-and-frozen
is as bad as free text, in the opposite direction.

So RCP recognises exactly **three** kinds of field, and every field must
declare which it is:

**1. Closed enum — fixed in the schema, changes only with a schema version.**
Use where the set is genuinely bounded and semantically load-bearing:

```
kind              bread | pastry | ferment | preserve | drink | dish | component
role              flour | hydration | leaven | salt | fat | sweetener | acid |
                  binder | emulsifier | thickener | aromatic | substrate |
                  preservative | colourant | enzyme | tenderiser | flavour
quantity.variant  fixed | ratio | parts | range | to_taste | as_needed | to_consistency
endpoint.kind     sensory | core-temperature | volume | pH | specific-gravity | visual
trigger.kind      at_elapsed | at_remaining | recurring | on_measurement
scaling           linear | fixed | sublinear | stepwise | area | formula
substitution.class direct | quantity-forcing | technique-forcing |
                  balance-forcing | computed | method-changing
severity          info | warn | critical
confidence        HIGH | MEDIUM-HIGH | MEDIUM | LOW
status            draft | unverified | published | archived
allergen          the EU FIC 14 — legally fixed, so closed is correct
```

**2. Registry-backed vocabulary — open for growth, closed to invention.**
Use where the set is unbounded in principle but must never be typed freehand:
ingredient classes (`flour.wheat.t65`), units, step primitives, equipment
profiles, techniques/gestures, sources. These live in **versioned catalog files
with stable IDs**. A recipe references an ID; it can never mint one inline.
Adding a value is a reviewed change to the registry, not a schema change and
not a free-text string. This is how the vocabulary grows for a hundred years
without either freezing or rotting.

The project already does this correctly in two places and should generalize
both: SPEC-008's `(primitiveId, version)` step catalog with its explicit "new
capability = new id, never repurpose" rule, and SPEC-007's flour class/product
split. Neither needs inventing — they need extending.

**3. Prose — genuinely human text, and only where nothing else will do.**
Names, notes, sensory cues, provenance claims, media captions. These carry the
`{pt, en}` locale shape.

**Why this matters more than it looks.** Four capabilities fall out of it, and
none are possible with free text:

- **Substitution actually works.** Matching happens on `roles`, not on names.
  This is the entire reason egg has no drop-in replacement — the engine can see
  it covers binder + leavener + emulsifier + moisture + colour simultaneously.
- **Safety checks are enforceable.** `severity: critical` on a bounded ratio is
  machine-checkable. "Careful with the salt" in a note is not.
- **Translation collapses.** `roles: [leaven]` is translated once, in the UI.
  "fermento natural" hand-written across forty recipes is translated forty
  times and drifts. For a bilingual archive this is the difference between i18n
  being a config and being a permanent tax.
- **Ingestion gets dramatically more reliable.** Constraining an LLM to emit an
  enum value — or `null` — is far more accurate than asking it for free text
  and parsing afterwards. Where it cannot resolve a value, it emits `null` and
  keeps `raw`, and a human resolves it later. It never invents.

The rule of thumb: if the renderer, the scaler, the substitution engine or the
safety checker would ever need to *read* a field, it is an enum or a registry
reference. Prose is only for fields whose sole consumer is a human eye.

### D3 — `basis` generalizes baker's percentage to every domain

The single most reusable idea in the proposal. Declare a named basis, then
express any quantity as a ratio of it:

```yaml
bases:
  flour:     { sum: ingredients, where: { roles: [flour] } }
  vegetable: { sum: ingredients, where: { roles: [substrate] } }
  coffee:    { ingredient: dose }
```

One mechanism, and the following all fall out of it:

| Domain | Conventional expression | RCP |
|---|---|---|
| Bread | hydration 80% of flour | `{ratio: 0.80, of: flour}` |
| Sauerkraut | salt 2% of trimmed vegetable | `{ratio: 0.02, of: vegetable}` |
| Brine pickles | 3.5% of water weight | `{ratio: 0.035, of: water}` |
| Cure | nitrite ppm of meat weight | `{ratio: 0.00015, of: meat}` |
| Coffee | brew ratio 1:16 | `{ratio: 16, of: coffee}` |
| Cocktail | 2:1:1 parts | `{parts: 2, of: spec}` |
| Ice cream | 16% sugar of total mix | `{ratio: 0.16, of: mix}` |
| Pastry | Ruhlman 3-2-1 | `{ratio: 0.5, of: flour}` |

Scaling then has one definition for all food: pick a basis, set a target,
everything derives. Today's `hidPct`/`mmPct` become computed views over this,
not stored fields — which is already the site's philosophy (`formula.ts`
derives percentages, never hand-types them).

### D4 — Steps are a DAG, not a list

Every domain track independently demanded this:

- a levain build must complete before the final mix (bread)
- a scald must cool below a threshold before it meets yeast (broa de milho)
- an entremet's inserts must be frozen before the mousse is piped (pastry)
- Italian meringue needs a sugar syrup and whipping whites to converge at one
  precise moment (a genuine concurrent join)
- kombucha F1 must finish before F2 begins (drinks)

So each step carries `id` and optional `after: [stepId]`. Omitting `after`
means "follows the previous step" — a linear recipe stays as simple to author
as a numbered list, and the DAG is opt-in complexity. Steps also declare
`uses: [ingredientId | componentId]` (generalizing Cooklang's inline linking,
and matching what recipe-flow-graph research treats as the canonical
representation of a procedure) and `produces: <componentId>` for intermediates
like "the poolish" or "the ganache" that later steps consume.

`uses` is cheap to add and unlocks two things: the highlight-the-ingredient-as-
you-read-this-step UX, and a validator that catches "you listed an ingredient
nobody uses".

### D4b — Optional steps reshape the recipe; options select authored paths

"If I skip the autolise, all the ingredients move into the mix step and the
mix step itself changes." Correct — and the design principle that makes this
tractable is: **an optional step is never a deletion; it is a selection
between fully-authored paths.** Deleting a step at runtime leaves its
neighbours silently wrong (the mix step would still expect autolysed dough).
Selecting between paths means every path was written, reviewed and is
individually testable.

Three pieces, working together:

1. **`options`** — the recipe declares its choices:
   `{id: autolise, kind: toggle, default: false}`. Choices, not just toggles:
   `{id: fermentacao, kind: choice, choices: [simples, dupla]}`.
2. **Guards on steps** — the autolise step carries `when: {option: autolise}`,
   and there are *two* mix steps: `misturar` (guard: not autolise) takes all
   ingredients for 15 min; `misturar-pos-autolise` (guard: autolise) takes the
   autolysed mass + leavens for 8 min. Different `uses`, different durations,
   different notes — because the mix genuinely is different.
3. **Intermediates anchor the DAG** — both mix variants declare
   `produces: massa-misturada`, and downstream steps depend on
   `after: [massa-misturada]`, not on a step id. Whichever variant is active
   satisfies the dependency; no dangling edges on either path.

This is the same guard mechanism used by substitutions, equipment branches
and execution modes — one selector model, five sources of variation
(`option`, `substitution`, `equipment`, `execution_mode`, `diet`). The
renderer resolves all active guards to a single flattened step list before
showing anything to the cook; the combinatorics live at authoring/validation
time, where a validator can walk every guard combination and check each
resolves to a complete, connected DAG. The worked autolise case is in
`examples/alentejano.rcp.yaml`.

### D5 — A recipe can be a group of recipes; components nest to any depth

Stated plainly, because it is a product requirement and not just a modelling
convenience: **a recipe may be composed of other recipes**, each element made
separately and joined by assembly steps. A levain, a 2:1 rich syrup, a pastry
cream, a spice paste, a stock, an espresso shot inside a latte: all the same
construct. A `component` is a full recipe (own ingredients, steps, yield,
even its own `kind` — a bread-profile dough inside a pastry) whose output is
referenceable as an ingredient of its parent, including partial draw ("makes
500 ml, use 20 ml per drink").

The composed dish is where the DAG (D4) earns its keep: an entremet is 5–7
component recipes progressing in parallel — some frozen, some baked — with an
assembly step whose `after` lists all of them, and a serve-time deadline that
schedules everything backwards. Pastéis de nata in the examples file is the
worked case: laminated dough + custard + syrup, three kinds, one recipe.

Components are also independently *reusable*: a stock or a massa-mãe is
authored once as its own document and referenced by many recipes, not
copy-pasted into each. Inline components suit one-off elements; referenced
components suit shared ones. Both are the same shape.

Scaling the parent must scale the children — with the explicit exception of
components with a minimum viable batch (you cannot build 3 g of levain), which
carry `min_batch`, and of `maintenance: true` cultures, which are drawn from,
not multiplied.

### D6 — Time is a window plus a condition, never a number

```yaml
- id: bulk
  primitive: { id: bulk-ferment, v: 1 }
  duration: { min: 4h, target: 5h, max: 6h }
  temperature: { target: 24, unit: C }
  until:
    - { kind: volume, change: +50% }
    - { kind: sensory, test: poke, expect: "springs back slowly" }
  scales_with: temperature      # renderer may re-estimate from ambient
```

Three separate findings force this shape:
- `min`/`target`/`max` as independent fields: lamination rests fail on *both*
  sides (under-rested butter cracks the layers; over-rested melts into them),
  as does pizza cold retard and macaron skinning.
- `until` as the primary gate with duration as fallback estimate: bulk
  fermentation, choux egg incorporation, macaronage.
- `scales_with: temperature`: fermentation time is a function of ambient
  temperature, so a fixed number is a lie in every kitchen but the author's.

### D7 — Safety-critical quantities are bounded, and bounds beat both scaling and substitution

```yaml
  - id: sal
    item: salt.sea.fine
    amount: { ratio: 0.025, of: vegetable }
    roles: [salt, preservative]
    constraints:
      - { min_ratio: 0.02, of: vegetable, severity: critical,
          reason: "below 2% brine, lacto-fermentation is not reliably safe" }
```

Neither the scaler nor the substitution engine may produce a document that
violates a `critical` constraint; it must refuse and explain. This is the one
place where the protocol is allowed to be opinionated rather than descriptive,
and it applies across curing nitrite limits, canning pH thresholds, and
minimum ferment salinity.

### D8 — Substitutions are layered; method deltas are the hard part

Two layers with clear precedence:
1. **Catalog** — global, reusable knowledge ("agar can replace gelatine").
2. **Recipe** — author overrides for this recipe, which always win.

And — important — **five scopes**, because substitution is not only an
ingredient-level concept:

| Scope | Example |
|---|---|
| `ingredient` | banha → azeite |
| `equipment` | forno a lenha → domestic oven + steam |
| `steps` | hand-knead → machine-knead (same intermediate, different technique) |
| `section` | a whole named method section: single vs double fermentation; steam vs bake |
| `component` | the entire levain sub-recipe → a commercial-yeast prep |

Method-level swaps (`steps`/`section`) carry `with_steps` — full replacement
steps — under one invariant: the replacement must `produce` the same
intermediate as what it replaces, so every downstream step still resolves.
Steps carry an optional `section` label precisely so a section can be
addressed and replaced wholesale.

A substitution that only changes a quantity is easy. The requirement that makes
this protocol novel is the user's: *"the recipe protocol/method can also be
changed if certain ingredients change."* Gelatine → agar is not a ratio; agar
must be **boiled**, which inserts a step. Yeast → levain does not change a
number; it grafts an entire multi-day subtree onto the DAG.

Of the 18 sourced substitutions the research tabulated, **15 require a method
or parameter delta** and 6 insert or delete a step — the empirical case
against a ratio-only model.

**The chosen delta mechanism** (full evaluation in `06-substitution-model.md`,
which weighed JSON Patch, inline conditionals, full variants, and a rules
engine):

- **A closed, typed op list** (~10 ops: `set_param`, `adjust_param`,
  `insert_step`, `remove_step`, `replace_step`, `set_technique`,
  `set_quantity`, `add_ingredient`, `remove_ingredient`, plus equipment ops),
  colocated inside the substitution record — so "the agar substitution" is one
  reviewable, versionable, citable, testable object, not consequences
  scattered across the step array.
- **Anchored to author-assigned step slugs, never array positions.** JSON
  Patch (RFC 6902) fails precisely here: `/steps/3` silently retargets the
  moment anyone inserts a step — it still applies, just to the wrong step. A
  broken slug anchor fails loudly instead.
- **Every op declares a write-set**, making two-substitutions-at-once
  mechanical: disjoint write-sets commute; `adjust_param` collisions fold
  multiplicatively; `set_param` collisions are refused unless an explicit
  combined-substitutions record exists. A rules engine was rejected outright:
  expressive, untestable, unexplainable.
- **Role vectors close the loop**: ingredient slots declare
  `{role, weight, critical}`, so the engine can refuse "this swap removes the
  only aerating step but the slot declares mechanical leavening as critical" —
  which is how one catalog rule can be valid in a brownie and refused in a
  génoise with no per-recipe authoring.
- **Order of operations: substitute at authored yield, then scale**, made
  commutative by requiring every substitution-introduced quantity to declare
  its scaling basis. Safety guards run after *every* transform and fail
  closed — a 50% salt cut that lands a ferment at 1% salinity is refused, and
  so is the equivalent trick done via scaling.
- **Promotion rule**: when the delta grows past the recipe (a vegan version
  rewriting most steps), it stops being a substitution and becomes a derived
  variant with shared `lineage.family` — the same rule as equipment variants
  in D8c.

### D8b — Equipment is a referenced profile, and it participates in the maths

Equipment came up independently in three domain tracks as something a naive
model gets wrong by treating it as a text list ("you will need: a bowl, an
oven"). It is actually four different things, and they need separating:

1. **A feasibility gate.** Brioche at 50–80% butter is genuinely impractical
   by hand; Italian meringue needs a stand mixer because one hand is pouring
   hot syrup. This is "you cannot really do this without X", not a preference.
2. **A method branch.** Naan in a tandoor (slapped on the wall) versus a
   skillet is a different *technique*, not a slower one. Same for still-frozen
   versus churned ice cream, and dutch oven versus stone-and-steam.
3. **A parameter shift.** Convection runs ~20 °C below conventional. An air
   fryer and a pressure cooker each rewrite times. A wood-fired oven at 240 °C
   is not a domestic oven at 240 °C, because thermal mass and steam differ.
4. **An input to the scaler.** Pan and mould geometry is the clearest case:
   moving a cake from a 20 cm round to a 23 cm round is an *area* calculation
   (r², so ~1.32×, not 1.15×), and bake time and temperature must change with
   it. Equipment here is not metadata at all — it is a variable in the formula.

So equipment gets the BeerJSON treatment: **named, reusable profiles stored as
their own documents**, referenced by recipes, never copy-pasted into them.

```yaml
# equipment/forno-lenha.eq.yaml
id: forno-lenha
kind: oven
name: { pt: Forno a lenha, en: Wood-fired oven }
parameters:
  max_temperature: { value: 350, unit: C }
  thermal_mass: high
  steam: native            # the oven's own moisture, no tray needed
  heat: falling            # temperature drops through the bake, by design
```

```yaml
# in the recipe
equipment:
  - ref: forno-lenha
    role: primary
    substitutes: [forno-domestico-com-vapor]   # ← triggers a method delta
  - ref: alguidar
    role: vessel
    note: { pt: Barro, tradicional., en: Earthenware, traditional. }
```

Two consequences worth stating plainly:

- **Equipment substitution uses the same delta mechanism as ingredient
  substitution.** Swapping a wood-fired oven for a domestic one changes the
  bake step's temperature curve and adds a steam step. That is structurally
  identical to swapping gelatine for agar. One mechanism serves both, which is
  a strong argument that the mechanism is the right one.
- **Profiles let the app know what the user owns.** Once equipment is a
  referenced entity rather than prose, "recipes I can actually make tonight"
  and "translate this to my oven" both become queries rather than features.

Per-category profiles own their equipment vocabulary: `oven`, `mixer`, `vessel`,
`mould` (with geometry) for bread and pastry; `grinder`, `brewer`, `water`
profiles for coffee; `shaker`, `ice`, `glassware` for cocktails; `crock`,
`airlock`, `fermentation-vessel` for ferments. Grind settings are explicitly
**not portable** across grinders — "24 clicks" is meaningless on another
machine — so a recipe authored against one profile must warn when rendered
against a different one rather than silently pretending the number transfers.

### D8c — Equipment-driven variants: one recipe or two? A decision rule

"French fries in oil vs air fryer", "the Bimby version", "the slow-cooker
version" — these all look like the same question but resolve to **three
different mechanisms**, and picking the wrong one is how recipe collections
rot. The rule:

**Level 1 — parameter shift → equipment profile conversion. Zero authoring.**
When only numbers change and the steps survive intact, the *profile* owns the
conversion and no recipe mentions it: convection = conventional −20 °C;
pressure cooker ≈ stovetop time ÷ 3 at high pressure; slow cooker low ≈ 2–2.5×
cover-and-simmer time. Authored once per equipment kind, applied to every
recipe automatically. A recipe should never hand-encode "if convection,
subtract 20 degrees".

**Level 2 — method branch → guards on steps, one recipe.** When some steps
differ but the recipe's identity holds. Fries is the canonical case: potato
prep, cut, soak and seasoning are shared; then `when: {equipment: deep-fryer}`
gives a two-stage oil fry (140 °C blanch, 190 °C crisp) while
`when: {equipment: air-fryer}` gives a toss-in-1-tbsp-oil step and a
200 °C/15 min shake-halfway step — and note the ingredient change rides along:
oil goes from `{value: 2, unit: l}` (mostly reclaimed) to
`{value: 15, unit: g}`. The guard mechanism already handles ingredients as
well as steps, and this is the same machinery substitutions and execution
modes use. One document, one identity, N equipment paths.

**Level 3 — different method universe → variant recipe, shared family.**
When the encoding itself changes, forcing it into guards produces an
unreadable document. **Bimby/Thermomix is the type specimen**: a guided
appliance whose steps are natively expressed as (speed / temperature / time /
reverse / turbo) tuples — "3 min / 37 °C / vel 2" — often collapsing several
conventional steps into one bowl operation and reordering the rest. That is
not a branch of the conventional recipe; it is a parallel method for the same
dish. It becomes its own document:

```yaml
id: frango-caril-bimby
kind: dish
lineage: { family: frango-caril, variant_of: frango-caril, variant_label: { pt: Bimby TM6 } }
equipment: [{ ref: bimby-tm6, role: primary, required: true }]
steps:
  - id: refogar
    primitive: { id: appliance-program, v: 1 }
    params: { speed: 1, reverse: false }
    temperature: { target: 120, unit: C }
    duration: { target: 3m }
```

The appliance step-primitive is generic (`appliance-program` with `params`
validated by the equipment profile's ParamSpec), so Monsieur Cuisine, Companion
and future guided appliances are new equipment profiles, not new schema. This
mirrors SPEC-006's existing product rule exactly: variants are full,
self-contained snapshots — never computed diffs — because a cook following the
Bimby version offline must not need the parent to render.

**The tie-breaker between 2 and 3**: if the shared steps outnumber the
branched ones, guard it (fries). If a reader following one path would skip
more than they read, fork it (Bimby). Slow cooker usually lands in level 1–2
(same braise, longer and wetter — cut liquid ~⅓ since nothing evaporates);
Bimby always lands in 3.

One consequence worth making explicit for search and packs: family groups all
of these, so the app shows *one* "Frango de Caril" card with equipment badges
(fogão / Bimby / slow cooker), not three near-duplicate results.

### D9 — Media attaches to steps, and carries its licence

Today `ProtocolStage` has **no media field at all** — recipe photos live in a
separate per-bread map. That is a real gap, not just a migration concern:
lamination, shaping/moldagem, the ribbon stage, latte art and "what healthy
kimchi bubbling looks like" are unteachable in prose.

```yaml
  media:
    - role: technique
      type: video
      uri: media/moldagem-alentejano.mp4
      licence: "© all rights reserved"
```

Licence is required per asset, because this project deliberately runs two
tiers: written heritage under CC BY 4.0, and video/photo/tutorials all rights
reserved. A media model without a licence field would quietly erase that.

### D10 — Provenance is first-class, and disagreement is data

The site's `RecipeContent` already models something almost nobody else does:
`sources[]`, `testemunhos[]` (named witnesses), `divergencias[]` (recorded
disagreements between sources, deliberately left unresolved), `confidence`
(HIGH…LOW) and `verified` (named human sign-off). For a heritage archive this
is the whole point, and it generalizes cleanly. RCP promotes it to a
`provenance` block on every recipe *and* on individual steps, so a single
imported recipe can honestly say "this step is attested by two sources that
disagree".

This is also what keeps ingested recipes honest — see §4.

---

## 2b. One protocol or one per category?

The question was raised directly: would it be simpler to define a separate
protocol per category? The research answers this fairly decisively, and the
answer is a middle path — **one small core, plus a tightly-specified profile
per category**.

**Why not N independent protocols.** Recipes do not respect category
boundaries, and the corpus is full of counter-examples:

- Pastéis de nata = laminated dough (bread technique) + custard (pastry) +
  a sugar syrup cooked to a named temperature stage (confectionery).
- A latte contains an espresso; a coffee cocktail contains both an espresso
  and a syrup. An espresso is a whole recipe in its own right.
- Kombucha F1 is a fermentation whose output is the input to F2, a drink.
- Broa de milho contains a scald — structurally identical to a rye Brühstück.
- A cocktail contains an oleo saccharum; a braise contains a stock.

Every one of those is a **component of one category nested inside a recipe of
another**. With separate protocols, that nesting is inexpressible, and you
would also need a separate renderer, scaler, substitution engine, importer and
validator per category — five engines to maintain instead of one, all of which
still have to interoperate at the seams.

**Why not one flat mega-schema.** Equally right to avoid. A single schema
carrying `hop_alpha_acid`, `bakers_hydration`, `tempering_curve`, `dilution_pct`
and `nitrite_ppm` as sibling optional fields is unvalidatable, unteachable, and
lets nonsense through — nothing stops a bread recipe declaring a glassware.

**The middle path.** A recipe declares `kind`, and validation is
`core schema ∧ profile[kind] schema`:

| Layer | Contents | Size |
|---|---|---|
| **Core** | identity, ingredients+roles, bases/ratios, step DAG, components, durations, media, provenance, taxonomy, substitutions, constraints | ~15 concepts, stable, rarely changes |
| **Profile** | category-specific extension block, the step-primitive subset that category may use, category-specific derived maths, extra validation rules | one per `kind`, independently versioned |

Concretely: the **bread** profile owns baker's-percentage defaults, DDT and the
water-temperature formula, preferment conventions and MM refresh maths. The
**drink** profile owns dilution, ABV/OG/FG, glassware and garnish. The
**coffee** profile owns dose/yield/extraction-yield and grinder profiles. The
**ferment** profile owns brine salinity floors, pH gates and burping schedules.
Each is small enough to specify properly — which is exactly the "well defined"
bar being asked for, and much easier to hit per profile than for one monolith.

Three things make this work rather than being a compromise:

1. **Profiles are additive, never subtractive.** A profile may add fields and
   tighten constraints. It may never remove or redefine a core field. So any
   consumer that understands only core can render *any* RCP recipe, degraded
   but correct — a coffee recipe still shows its ingredients and steps to a
   reader that has never heard of extraction yield.
2. **Components may cross profiles.** A `kind: drink` recipe may contain a
   `kind: component` syrup and a `kind: coffee` espresso. This is the whole
   reason the core has to be shared.
3. **New categories cost a profile, not a protocol.** Adding charcuterie or
   cheese later is a new profile file plus some step primitives — no change to
   core, no migration of existing recipes.

This is also the architecture the codebase already voted for: SPEC-008's
`RecipeKindProfile` protocol is precisely this seam, and it deliberately kept
method composition kind-neutral while leaving scaling maths kind-specific. RCP
generalizes a decision that is already made and shipped, rather than
introducing a new one.

---

## 2c. The core type system

Most of the protocol's expressive power lives in about nine primitive types.
Getting these right is what stops each new category needing new syntax.

**`Quantity` — a tagged union, not a number.** Every domain produced quantities
that a `number` field cannot hold honestly:

| Variant | Example | Scaling behaviour |
|---|---|---|
| `fixed` | `{value: 6000, unit: g}` | multiply |
| `ratio` | `{ratio: 0.80, of: flour}` | derived from basis, never multiplied |
| `parts` | `{parts: 2}` | dimensionless until instantiated (Negroni 1:1:1) |
| `range` | `{min: 2, max: 3, unit: clove}` | multiply both bounds, then round |
| `to_taste` | seasoning, "a pinch" | never scales |
| `as_needed` | "enough to cover", dusting flour | never scales |
| `to_consistency` | choux egg, "add until it ribbons" | never scales; carries a *guide* range and a sensory endpoint |

`to_consistency` is the sharp one: in choux, the amount of egg genuinely is not
knowable in advance, because it depends on how much water was driven off in the
panade. The recipe must be able to say "about 4–5 eggs, but the real answer is
the V-drop test" without lying that it is 4.

**`Unit` — two tiers.** A closed set of *convertible* units (g, kg, ml, l, °C,
plus the unavoidable US cup/tbsp/tsp) that map to UCUM and support exact
arithmetic; and an open set of *discrete* units (clove, pinch, dash, barspoon,
"large egg", can) that are only ever multiplied, never converted. Crouton's
closed 17-value enum is the cautionary tale — it cannot express a regional unit
without a schema change.

Weight↔volume conversion is **per ingredient, in the catalog, never in the
recipe**: a cup of sugar is 198 g, a cup of water is 237 g, and 2:1 rich syrup
is denser than 1:1 (which is why you use *less* of it when substituting, not
the same volume). Tandoor and Grocy independently converged on food-scoped
conversion, which is good evidence it is the right home for it.

**`Duration` — `{min, target, max}`.** Never a bare number. Lamination rests,
pizza cold retard and macaron skinning all fail on *both* sides.

**`Temperature` — four shapes.** A scalar (`bake at 240 °C`); a ceiling with a
sensory test (crème anglaise: 82–84 °C *and* nappe, where 86 °C is scrambled);
a **named stage** referencing a shared vocabulary (sugar work: soft-ball,
hard-crack — with fuzzy, source-dependent boundaries and an altitude
correction); and a **curve** of waypoints (chocolate tempering: melt → cool →
rework, three targets that all differ by chocolate type). Sous-vide adds a
fifth: a genuine 2D lookup of thickness × doneness → temperature × time.

**`Endpoint` (the `until` clause).** `sensory` | `core-temperature` | `volume`
| `pH` | `specific-gravity` | `visual`. Multiple endpoints may coexist; the
renderer shows all of them, because "96 °C core *or* hollow when tapped" is how
people actually bake. This is where per-step media earns its place — "smells
lactic, not putrid" and "kahm yeast versus mould" resist numeric encoding
entirely, and a photo is the only honest representation.

**`Trigger` — when a scheduled event fires.** Four shapes, one union:
`{at_elapsed}` (V60 pour at 0:45 to a cumulative 300 g), `{at_remaining}` (hop
addition at 20 minutes before boil-end), `{recurring}` (fold every 30 min × 4;
burp daily for 7 days; gongfu steep N = N−1 + 10 s until exhausted), and
`{on_measurement}` (rack when SG < 1.005 — no calendar date at all).

**`Constraint` — bounded quantities with severity.** `critical` constraints may
not be violated by scaling or substitution; the engine refuses and explains.
Real thresholds exist and are sourced: nitrite ceilings of 120–625 ppm by
product category, minimum 2% brine for reliable lacto-fermentation, pH < 4.6
for shelf stability and < 4.0 as a home safety margin.

**`Measurement` — readings recorded during execution.** `{type, value, unit,
recorded_at, instrument, step_ref}`. This is the spine that feeds derived
computations (OG/FG → ABV; dose/yield/TDS → extraction yield; actual bulk time
→ next bake's DDT calibration) and adjustment rules. The current `BakeSession`
already records actuals to calibrate the next bake — this generalizes it.

**`ScalingBehaviour` — per quantity and per step.** `linear` (default),
`fixed` (never scales), `sublinear` (yeast at large batch; spices), `stepwise`,
`area` (pan geometry: r², so 20 cm → 23 cm is ~1.32×, not 1.15×), and
`formula`. Non-linear scaling was flagged by every domain track independently;
a single global multiplier is wrong in all of them.

**`Expression` — a closed arithmetic grammar, never `eval`.** Roast time is
genuinely `12 min/lb + 12`, and bake time genuinely varies with loaf size. That
needs computation in the data. It must be a small, closed, non-Turing-complete
arithmetic grammar over declared variables (or a bracketed lookup table) —
never an embedded scripting language. Recipes will be imported from the
internet; an `eval` in the renderer is a remote code execution bug waiting to
happen.

---

## 3. Taxonomy, categories and packs

The goal of "recipes divided by categories, sub-categories, packs" resolves
into three *separate* mechanisms, deliberately not one:

- **`kind`** — a closed discriminator (`bread`, `pastry`, `ferment`, `preserve`,
  `drink`, `dish`, `component`). Drives which domain extension block is valid
  and which step primitives are offered. Extends today's `RecipeKind` enum,
  which exists but drives almost no behaviour.
- **`taxonomy`** — `category` + `subcategory[]`, a curated tree for browsing.
- **`tags[]`** — open, flat, non-hierarchical.
- **Packs / collections** — *separate documents* that reference recipe IDs.
  Never embedded in the recipe. A recipe belongs to many packs; a pack is
  independently authored, versioned, licensed and shipped. This is what makes
  "Pão do Alentejo pack" or "Fermentos de Inverno" a product surface rather
  than a query.

---

## 4. Ingestion — screenshot or URL → RCP

The pipeline that turns a link or a photo into a recipe, in the order things
actually work:

1. **URL** → look for schema.org JSON-LD; fall back to Microdata/RDFa; fall
   back to OpenGraph; fall back to per-site selectors. This is what
   `recipe-scrapers` does across ~650 domains and it is a solved problem.
2. **Screenshot** → vision-LLM directly to structured JSON. As of 2025–26 the
   OCR-then-parse pipeline has been superseded by multimodal models emitting
   the target schema in one pass.
3. **Both paths converge on the same weakness**: ingredient lines arrive as
   free text (`"3/4 cup packed light brown sugar"`), because that is what
   schema.org actually carries in the wild.

So RCP requires two things of itself to be a good extraction target:

- **`raw` is preserved on every ingredient.** Capture loosely, resolve
  canonically later, never block ingestion on perfect identity resolution.
  `item` may be unresolved; `raw` always survives for audit and re-parsing.
- **Only `name` and `ingredients[].raw` are truly required.** An LLM must never
  have to invent a cook time to satisfy a `required` array. Everything else is
  optional with null semantics.

Plus a hard rule for this project specifically: ingested recipes land with
`provenance.confidence: LOW` and `status: unverified`. Given the heritage
archive's standards, an imported recipe is a *lead*, not a publication.

---

## 5. Migration — what happens to the bread we have

RCP is additive. Nothing gets deleted:

- `BreadRecipe` → a deterministic mapping into `ingredients[]` with roles
  (`blend.*` → `roles: [flour]`, `agua` → `[hydration]`, `mm` → `[leaven]`,
  `mv` → `[leaven, flavour]`, `sal` → `[salt]`, `azeite`/`banha` → `[fat]`).
  This is mechanical and testable both directions.
- Baker's maths (`hidPct`, `mmPct`, DDT, MM refresh, flour redistribution)
  stays as a **bread profile** over the generic model, exactly as SPEC-008
  deliberately kept scaling maths kind-specific behind `RecipeKindProfile`.
  These formulas are load-bearing and digit-exact tested; they move, they
  don't get rewritten.
- SPEC-008's `(primitiveId, version)` step primitives become RCP's step
  primitives unchanged. The catalog grows beyond dough vocabulary.
- SPEC-007's flour class/product split generalizes to ingredient
  class/product. Recipes reference the **class** (`flour.wheat.t65`); the
  shopping layer resolves to a **product** (Paulino Horta T65 Saloia).
- `forked_from`, `recipe_family_id`, `variant_of_recipe_id`, `system_no` all
  map onto RCP identity/lineage fields.

---

## 6. Open questions

*(to be closed once the remaining research tracks land)*

- The method-delta mechanism for substitutions (D8).
- Whether formula-valued quantities (roast time = f(weight)) need a real
  expression language, and if so how to keep it safe and non-Turing-complete.
- Whether execution state (`BakeSession`, timers, measurements) belongs in RCP
  or stays a separate runtime document. **Current lean: separate.** RCP
  describes the recipe; a session references it. Mixing them would make every
  recipe file mutable.
