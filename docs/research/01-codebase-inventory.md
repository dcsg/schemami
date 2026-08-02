# Recipe protocol — codebase inventory (as of 2026-08-02)

Evidence-based inventory of how recipes, ingredients, baker's math, preferments,
method/steps, and bake-execution state are modelled **today**, across every
surface: the editorial site (`site/`), the web calculator (`web/`), the iOS app
(`mobile/ios/Fornada/`), and the Go/Postgres backend (`api/`, `db/`). Written to
ground a future universal recipe protocol (bread, pastry, fermentation/pickles,
drinks, savoury, coffee) in what actually exists, not assumption.

No claim below is invented. Where something doesn't exist, that is stated
explicitly. File paths are repo-root-relative unless noted; line numbers are
from the cited commit at time of writing and may drift.

**Headline finding**: this generalization effort is not starting from zero —
it is already underway, independently, on two fronts that don't yet talk to
each other:
- **iOS**: `PRD-003-fornada-execution-model.md` + `SPEC-008` (status: accepted,
  2026-07-24) design an open, kind-aware `StepPrimitive`/`RecipeMethod`/
  `RecipeKindProfile` model explicitly to cover bread **and** granola/pastry/
  discard — but it is scoped to the local-first Swift/SQLite app only and
  states plainly it makes **zero** backend/API changes.
- **Editorial site**: a `CMS-MIGRATION-PLAN.md` (Sanity-led, prototype-gated,
  not yet executed) plans to move all content — including recipes — into a
  headless CMS serving web + native apps from one source.

Neither touches the Go API / Postgres schema, which remains two parallel,
independently-typed tables (`padaria.recipes` for bread, `padaria.other_recipes`
as a looser non-bread escape hatch) with no shared abstraction.

---

## 1. Every recipe data structure

There are **five independent recipe representations** in this codebase today,
each with a different shape, none sharing a type:

| Surface | File | Type | Bread-shaped? |
|---|---|---|---|
| Web calc engine | `web/src/calc/types.ts` | `Recipe` | Yes, entirely |
| Web content/prose | `web/src/content/recipes.ts` | `RecipeContent` | Mostly (prose) |
| Web "other" recipes | `web/src/lib/api.ts` | `OtherRecipe` | No — flat/free-text |
| iOS domain | `.../Domain/BreadRecipeFormulaSnapshot.swift` | `BreadRecipeFormulaSnapshot` | Yes, entirely |
| Editorial site | `site/src/calc/breadRecipes.ts` | `BreadRecipe` | Yes, entirely |
| Editorial site prose | `site/src/data/recipeContent.ts` | `RecipeContent` | Mostly (prose) |
| Postgres | `api/migrations/0002_recipes.up.sql` | `padaria.recipes` | Yes, entirely |
| Postgres (escape hatch) | `api/migrations/0007_other_recipes.up.sql` | `padaria.other_recipes` | No — flat/free-text |

### 1.1 Web calculator — `web/src/calc/types.ts` (the operational core)

```ts
export interface Recipe {
  id: string; user_id: string | null; nome: string;
  blend: Blend;                 // Record<flourKey, grams>
  agua: number; azeite: number; banha: number; mv: number; mm: number; sal: number;
  extras?: Record<string, number>;       // non-flour, non-first-class (batata_doce, ovos, manteiga…)
  inclusions?: Record<string, number>;   // fold-ins (sementes, passas, nozes, azeitonas)
  mm_type?: MMVariantId;                 // 'branca'|'mista'|'centeio'|'integral'|'trigo_duro'
  source: 'system' | 'user'; system_no: number | null; forked_from: string | null;
  origin_country?: string | null; origin_region?: string | null; tags?: string[];
  created_at: string; updated_at: string;
}
```

`Recipe` is **flat and entirely bread-shaped** — hydration/MM/MV/blend/salt are
hardcoded top-level numeric fields, not a generic ingredient list. There is
**no `steps`/`method` field on `Recipe` at all** — protocol prose lives
separately in `content/recipes.ts`. The type also defines `BreadOpts`/
`BreadResult` (the computed output of scaling — see §3), `PizzaOpts`/
`PizzaResult`/`PizzaStyle` (a parallel, separate calculator), and MM-specific
scheduling types.

### 1.2 Web "other recipes" — `web/src/lib/api.ts`

```ts
export type OtherRecipeCategory = 'granola'|'discard'|'pastelaria_tradicional'|'kitchen_daily'|'outras';
export interface OtherRecipeVariant { id, nome: string; steps: string; oven_c?: number|null; oven_min?: number|null; notas?: string; }
export interface OtherRecipe {
  id: string; user_id: string | null; source: 'system'|'user'; category: OtherRecipeCategory; nome: string;
  ingredients: Ingredient[];             // { nome, qty, unit, notas? } — flat free-text list, no baker's-% math
  variants: OtherRecipeVariant[];        // steps is a single PROSE STRING, not structured steps
  yield_amount: number | null; yield_unit: string | null;
  origin_country: string | null; origin_region: string | null;
  params: Record<string, unknown>;       // "Forward-compat field for future calculators"
  forked_from: string | null; tags: string[]; created_at, updated_at: string;
}
```

Comment at `api.ts:241-242`: *"Non-bread recipe: granola, sourdough discard
dishes, etc. The bread calc never touches these — they're display + edit
only."* This is the closest existing precedent to a "universal recipe": no
baker's-percentage math, a flat ingredient list (`Ingredient{nome,qty,unit,notas}`),
and a **prose `steps: string`** per variant — strictly less structured than
bread's `ProtocoloStep[]` (§5).

### 1.3 iOS — `Domain/BreadRecipeFormulaSnapshot.swift`

```swift
public struct BreadRecipeFormulaSnapshot: Codable, Equatable, Sendable {
    public let source: String
    public let sourceRecipeId: String
    public let sourceRecipeVersion: String?
    public let recipeFamilyId: String?          // SPEC-006 recipe variants
    public let variantOfRecipeId: String?
    public let variantLabel: String?
    public let name: String
    public let kind: String                     // plain string, not RecipeKind enum
    public let systemNo: Int?
    public let blend: [String: Int]              // flour blend, grams
    public let agua: Int
    public let azeite: Int                       // olive oil
    public let banha: Int                        // lard
    public let mv: Int                           // massa velha (old dough)
    public let mm: Int                           // massa mãe (starter)
    public let sal: Int
    public let freshYeastPercent: Double?
    public let dryYeastPercent: Double?
    public let extras: [String: Int]
    public let inclusions: [String: Int]
    public let mmType: String
    public let defaultUnitWeightGrams: Int?
    public let defaultUnitCount: Int?
    public let minUnitWeightGrams: Int?
    public let minBatchWeightGrams: Int?
    public let protocolSteps: [RecipeProtocolStepSnapshot]
    public let capturedAtUTC: Date?
}
```

Entirely bread-shaped: named fields for flour blend, water, oil, lard,
old-dough, starter, salt (Portuguese names throughout). `flourGrams`,
`hydrationPercent`, `mmPercent`, `canonicalMassGrams` are all computed
properties derived from these named fields. This struct is the payload
decoded out of the kind-agnostic envelope `RecipeSnapshot`
(`FornadaModels.swift:94-133`: `localId, serverId, workspaceLocalId,
sourceRecipeId, sourceRecipeVersion, name, kind: RecipeKind, payloadJSON:
String, syncStatus, capturedAtUTC`) — so the **envelope is kind-agnostic but
the only decoder that exists is bread-only**.

### 1.4 iOS — `RecipeKind` enum (the existing category concept)

```swift
enum RecipeKind: String, Codable, CaseIterable { case bread, pastry, discard, granola, other }
```
(`FornadaModels.swift:3-9`). This enum already spans bread and non-bread
categories, but per §9 below it drives **zero behaviour** beyond bread today —
`StaticStepPrimitiveRegistry.primitives(for:)` returns `[]` for every case
except `.bread`.

### 1.5 Editorial site — `site/src/calc/breadRecipes.ts`

```ts
export interface BreadRecipe {
  slug: string;
  nome: string;
  blend: Record<string, number>;   // flour key → grams
  agua: number;
  azeite: number;
  banha: number;
  mv: number;   // Massa velha (yesterday's dough / isco) in grams.
  mm: number;   // Massa-mãe (sourdough starter) in grams.
  sal: number;
  extras?: Record<string, number>; // Non-flour, non-leaven ingredients (e.g. batata doce). Grams.
}
```

File header (`breadRecipes.ts:1-10`) states this is *"Ported verbatim from the
calculador's seeded system recipes
(`web/src/calc/__fixtures__/recipes.ts`, `system_no` 1–17)"* — i.e. the site
and the web calculator deliberately share the same canonical batch numbers,
but via manual porting, not a shared type or module. 42 breads are defined
(`BREAD_RECIPES`, `breadRecipes.ts:32-87`), most flagged `draft: true`
("em investigação") in the parallel `Bread` catalog (`site/src/data/content.ts`).

### 1.6 Postgres — `padaria.recipes` (`api/migrations/0002_recipes.up.sql`)

```sql
CREATE TABLE padaria.recipes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES padaria.users(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  blend        JSONB NOT NULL,
  agua         INTEGER NOT NULL,
  azeite       INTEGER NOT NULL DEFAULT 0,
  banha        INTEGER NOT NULL DEFAULT 0,
  mv           INTEGER NOT NULL DEFAULT 0,
  mm           INTEGER NOT NULL,
  sal          INTEGER NOT NULL,
  source       TEXT NOT NULL CHECK (source IN ('system', 'user')),
  system_no    INTEGER,
  forked_from  UUID REFERENCES padaria.recipes(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
Every column is bread-specific and `agua`/`mm`/`sal` are `NOT NULL`; `blend` is
a flour-only JSONB map. Later migrations add `mm_type` (0010, `NOT NULL
DEFAULT 'branca'` — assumes every recipe has a starter type), `origin_country`/
`origin_region` (0006, free-form strings, explicitly not normalized to ISO
codes as "premature" at this scale), `tags TEXT[]` (0008, genuinely
kind-agnostic), `extras`/`inclusions` JSONB (0012/0015 — stretches the
*ingredient* vocabulary for regional breads like Bolo do Caco, but not the
*process/step* model), and `workspace_id` tenancy (0021).

### 1.7 Postgres escape hatch — `padaria.other_recipes` (`0007_other_recipes.up.sql`)

```sql
CREATE TABLE padaria.other_recipes (
  id, user_id, source TEXT CHECK (source IN ('system','user')) DEFAULT 'user',
  category TEXT NOT NULL CHECK (category IN ('granola', 'discard', 'outras')),  -- widened in 0011
  nome TEXT NOT NULL,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps TEXT NOT NULL DEFAULT '',           -- replaced by `variants` JSONB in 0009
  oven_c INTEGER, oven_min INTEGER,
  yield_amount INTEGER, yield_unit TEXT,
  origin_country TEXT, origin_region TEXT,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  forked_from UUID REFERENCES padaria.other_recipes(id) ON DELETE SET NULL,
  created_at, updated_at
);
```
Comment: *"Non-bread recipes: granola, sourdough discard, and any free-form
category that doesn't fit the bread calculator's blend/agua/MM model."*
`params` is explicitly *"reserved for future calculators… without needing
another migration."* Migration 0009 replaces flat `steps`/`oven_c`/`oven_min`
with `variants JSONB` (`{id, nome, steps, oven_c?, oven_min?, notas?}`),
letting one row hold multiple method variants (Tradicional/Rápida/Discard).
Migration 0011 widens `category` to `granola, discard,
pastelaria_tradicional, kitchen_daily, outras` — still a closed enum, not
free-form; **new kinds require a migration each time**.

This table is architecturally **parallel to, not unified with**,
`padaria.recipes` — a second, looser, independently-typed schema, not a shared
recipe abstraction. There is no shared base table and no `kind` discriminator
column joining the two.

### 1.8 Go store structs (`api/internal/store/`)

`store.go` `Recipe` and `other_recipes.go` `OtherRecipe` are 1:1 Go mirrors of
the two Postgres tables above (same field names, same split). REST routes
(`api/internal/api/api.go`) are two independent resource families:
`/recipes` and `/other-recipes`, not a unified `/recipes?kind=...` contract.

---

## 2. The ingredient model

**There is no single, canonical "Ingredient" catalog entity anywhere in this
codebase today that spans web + mobile + API.** What exists is scattered and
mostly recent/in-progress:

- **Web calc — no catalog.** `web/src/calc/flour.ts::FLOUR_META` is a
  **static, hardcoded** two-tier flour type→brand registry (100% "Paulino
  Horta"-branded today), each brand entry carrying `hid_target`, alveograph
  `w`, full nutrition, and cross-country grade equivalents. No user editing,
  no favorites, no multi-provider browsing. `web/src/calc/ingredients.ts::
  INGREDIENT_NUTRITION` is a similarly static ~35-entry free-text nutrition
  lookup for non-flour ingredients (oats, fats, nuts, dairy, dried fruit),
  matched via fuzzy alias/substring search — used to label `OtherRecipe`
  ingredients and extras/inclusions. `lib/api.ts::Ingredient{nome,qty,unit,
  notas}` is the wire-level flat row used by `OtherRecipe.ingredients` — no
  catalog linkage, no provider/brand/favorite fields.
- **The "Ingredient catalog: provider-first browsing" work (recent git log
  commits `12bb3ec`, `e87fb26`, `7b21ebc`) is entirely in the iOS Swift
  codebase, not `web/`.** Confirmed via `git show --stat` on each commit —
  they touch `FornadaKit/Application/Services/KnownIngredientCatalog.swift`,
  `ShoppingIngredientPickerSheet.swift`, and `MobileUserProfile`. Grepping
  `web/src` for `provider|catalog|favorite|shopping` turns up only unrelated
  hits (React `Provider` components, i18n, the Fornada shopping-list =
  ingredient grand-totals feature). **There is no `Ingredient` entity with
  `provider`/`brand`/`favorite` fields anywhere in `web/src` today.**
- **iOS — `KnownIngredientCatalog` (`Application/Services/`)** groups
  ingredients by provider name, country, and mill type, with a `baseTypeId`
  for generic-vs-branded rows. `IngredientUsageStat`
  (`MobileProfileModels.swift`) tracks per-user usage counts / favorites.
  `ShoppingListItem` also lives in `MobileProfileModels.swift`. This is real
  prior art for a catalog entity, but it is scoped to the iOS local SQLite
  store and has no counterpart in `web/` or the Postgres API.
- **Flour identity is separately specced** (`SPEC-007-flour-identity-and-
  supplier-catalog/spec.md`, accepted-but-not-fully-implemented, 2026-06-05):
  a two-layer model — **flour class** (stable recipe key, e.g. `trigo_t65`,
  `trigo_preto_amarelo_t80` — generic keys like bare `centeio` are explicitly
  "unresolved recipe data, not… canonical identity") vs. **flour product**
  (supplier/catalog metadata: `supplier`, `supplier_product_id`, `source_url`,
  `grain`, `type`, `variant`, `organic`, `origin`, `w_range`, full nutrition).
  Recipes keep using flour *classes*; a user may later map a class to a
  concrete product for shopping-list purposes, "without rewriting the recipe
  formula." Also defines non-1:1 **substitution families** (e.g. `trigo_rijo`
  → review-only alternatives `trigo_duro`, `trigo_preto_amarelo_t80` — "do
  not assume 1:1 substitution behaviour… until validated by bake notes").
  States: *"The current iOS app already supports several typed flour class
  keys and legacy aliases in the visual/catalog layer. It does not yet have a
  first-class flour product table or supplier catalog UI."* The report this
  spec cites (`docs/product/reports/2026-06-05-paulino-horta-flour-catalog.md`)
  **does not exist in the repo** — a broken/unresolved citation, not
  fabricated content.

---

## 3. Baker's percentages & scaling

Three independent implementations of "scale a bread recipe" exist
(`web/src/calc/bread.ts`, `mobile/.../BakerMath.swift`, `site/src/calc/
formula.ts`), with **subtly different pivot semantics** — this is a real
divergence a universal protocol needs to reconcile, not just document.

### 3.1 Web — `computeBread()`, `web/src/calc/bread.ts:24-165`

Two-stage pivot, not a single flour-anchor:
1. Scale the **whole recipe** (including MV, extras, inclusions) by total-batch-mass
   ratio `(n×peso)/batchTotal(r)`.
2. Optionally decompose MV into flour/water/salt if `!hasMV`.
3. **Re-derive `agua` and `mm` from the post-decomposition flour subtotal**
   using hydration%/MM% targets: `agua = farinhaPre * (hidTarget/100)`
   (`bread.ts:75`) — this is the literal "flour = 100%, everything else is a
   % of it" baker's-math step.
4. Uniformly rescale the whole mix to hit the exact requested `n×peso` mass.
5. Redistribute unavailable flours proportionally.

Extras/inclusions are explicitly kept **outside** the %-of-flour math
(`bread.ts:46-57` comments) — they scale linearly with the batch but don't
participate in hydration/MM redistribution.

### 3.2 iOS — `BakerMath.scaleRecipe`, `Domain/BakerMath.swift:178-297`

**Different pivot**: the scaling input is `targetTotal = quantity ×
unitWeightGrams` (total finished-dough weight), not flour weight — everything
is uniformly rescaled by `scale = targetTotal / currentSum`
(`BakerMath.swift:237-247`) so the *sum* hits the target. Flour weight is a
derived **output**, not the scaling input. The **baker's-percentage view**
(`BreadScaleResult.bakerPercentages`, lines 56-71) is still flour-pivoted
(divides everything by `flourGrams`) — so the display convention matches web's,
but the underlying scale algorithm's pivot does not.

### 3.3 Editorial site — `site/src/calc/formula.ts:169-194`

`breadFormula()` anchors at a fixed 1000 g of blend flour by default (the
"baker-standard formula anchor"); `breadFormulaScaled()` scales to a real
yield (`loaves × pieceGrams`) by computing `target / dough` where `dough =
canonicalDough(eff)` (total mass). Percentages are always `pctOf(g) =
round1((g / blendFlour) * 100)` — genuinely flour-pivoted for display,
matching the web app's convention exactly (explicit design goal, per the file
header: *"matching the calculador's `recipeHidPct`/`recipeMMPct` convention
so the two surfaces agree to the gram"*).

### 3.4 Common assumptions across all three

- Massa-mãe (MM) is assumed **100% hydration** → half its mass is flour, half
  water, when decomposed/converted (`site/src/calc/formula.ts:66`; mirrored
  in `web/src/calc/bread.ts`).
- Massa velha (MV) is decomposed via a **hardcoded 60% flour / 38% water / 2%
  salt** ratio when disabled (`site/src/calc/formula.ts:76-80`; iOS
  `BakerMath.swift:212-224` comment: *"never renormalized away"*). This ratio
  is not derived from any preferment-composition model — it's a fixed
  constant baked into the scaling math itself.
- Commercial-yeast conversion: fresh yeast 2.0% / dry yeast 0.7% of the
  post-MM-removal flour total (`formula.ts:86`).

---

## 4. Preferments / multi-stage fermentation

**There is no unifying "Preferment" type anywhere.** Massa-mãe (starter),
massa velha (old dough), isco, and poolish are each represented differently
depending on context — always as **flat numeric fields or a parallel,
decoupled lookup table**, never as a nested sub-recipe:

- **On the recipe itself**: `mm: number` and `mv: number` are flat scalar
  gram fields on `Recipe`/`BreadRecipe`/`BreadRecipeFormulaSnapshot`/
  `padaria.recipes` — the grams of finished starter or old dough in the
  canonical batch. Nothing about the starter's *own* composition (its flour
  blend, its hydration) lives on the recipe.
- **MM's internal composition is a separate, decoupled entity**:
  `MMVariant` (`web/src/calc/mm.ts`; mirrored in `padaria.mm_variants`,
  `api/migrations/0005`) — `blend_pct`, `hid_pct` (default 100), `hid_options`,
  `why/value/behavior/use_for`, `peak_ref_h`. A recipe points at one via
  `mm_type: MMVariantId` (5 hardcoded system variants: branca, mista,
  centeio, integral, trigo_duro). So "which starter" and "how much starter"
  are two different data paths only reconciled at compute time.
- **MV has no variant concept at all** — always the single hardcoded
  60/38/2 decomposition (§3.4). "Massa velha" and "isco" are used
  inconsistently in sources: `notes/isco-research.md` documents that
  traditional Portuguese usage treats isco/massa-mãe/massa velha as
  **synonyms** (Priberam dictionary, regional sources), and that the
  project's hard technical distinction (isco/massa-mãe = fed living starter
  vs. massa velha = yesterday's finished dough) is "a modern-baking
  convention, not the traditional meaning" — the site's own code comment
  (`site/src/calc/formula.ts:111-112`) cross-references this: *"Massa velha
  = old dough (pâte fermentée). NOT 'isco' (isco is a starter, closer to
  massa-mãe)."*
- **iOS additionally has a per-bake prep-plan struct**, `MassaMaePrepPlan`
  (`FornadaModels.swift:185-215`, on `Fornada.mmPrepPlans: [String:
  MassaMaePrepPlan]?`): `mmType, targetGrams, foodRatio, hydrationPercent,
  temperatureC, refreshAtUTC, peakAtUTC, confirmedAtUTC` — starter-refresh
  scheduling for a specific bake.
- **iOS also has a standalone, recipe-independent user entity**,
  `StarterCultureProfile` (`MobileProfileModels.swift:213-277`, its own
  SQLite table `starter_cultures`): `type, name, hydrationPercent,
  currentAmountGrams, lastFeedingRatio, lastFedAtUTC, …` — "I own and
  maintain this starter culture" as a persistent object independent of any
  specific bake or recipe.
- **As method/step catalog entries**: preferments (`mm`, `massavelha`,
  `poolish`, `biga`, `escaldao`) are ordinary rows in the flat `StepCatalog`
  (`Domain/StepCatalog.swift`), distinguished only by `prep: true`/
  `vespera: true` (overnight) scheduling flags, not by a distinct
  "Preferment" domain type.
- **iOS empirical scheduling math is bespoke and separate**:
  `FornadaBatchCalculator.mmPeakHoursForRatio` (`base = 2.5×ratio + 2`,
  adjusted by hydration/temperature/activity factors) is independent of
  `BakerMath`.

**Summary**: preferments today are (a) grams-in-the-batch, (b) a separate
starter-composition lookup, (c) a per-bake refresh-timing plan, and (d) a
user-owned "my starter" profile — four separate representations, none nested
inside the recipe as a sub-recipe/child-formula.

---

## 5. The method/steps model

### 5.1 Web — two parallel systems, both bread-only, neither on `Recipe`

`Recipe` (`calc/types.ts`) has **no `steps` field at all** — pure numeric
formula. Editorial steps live entirely in `content/recipes.ts::ProtocoloStep`:

```ts
export interface ProtocoloStep {
  titulo: string;
  duracao?: string;                // free-text label, e.g. "20-30 min" — NOT numeric/typed
  detalhe: string;                 // required prose, doubles as source-citation carrier
  acoes?: readonly SubAction[];    // ordered imperative sub-actions: { verbo, corpo } — corpo is still prose
  cues?: readonly SensoryCue[];    // conditional "if X then Y" checkpoints: { condicao, acao }
  sub_table?: 'levain'|'scald'|'autolyse'|'soaker'|'mix'|'inclusions';
  gestos?: readonly GestureRef[];  // cross-refs into a shared gesture glossary (gestos.ts)
}
```

Even the "structured" `acoes`/`cues` form has **no typed duration or
temperature field** — temps/durations are embedded as bold-markdown text
inside prose (`corpo`), e.g. "240–250 °C", not queryable data. `cues` and
`gestos` are the only genuinely structured, cross-referenceable sub-parts.
**No media/photo/video slot exists anywhere on this type.**
`gestos.ts::GestoContent` is a real shared "method step library" pattern
(canonical reusable gestures like bassinage, escaldão, picar-com-garfo,
forma-cabeçuda), but scoped entirely to bread gestures.

The non-bread `OtherRecipe.variants[].steps` (§1.2) is a **single
unstructured prose string** — strictly less structured than bread's
`ProtocoloStep[]`.

### 5.2 Editorial site — `site/src/data/recipes.ts:320-329`

```ts
export interface Vitals { yield: L; time: L; level: L }
export interface PlanStep { when: L; what: L }
export interface Ingredient { n: L; pct: string; g: string }
export interface MethodStep { dur: string; t: L; b: L; sig?: L }
export interface Protocol {
  vitals: Vitals; present: L; plan: PlanStep[]; ingredients: Ingredient[];
  equipment: L[]; steps: MethodStep[]; tips: L[]; notes: { pt: string[]; en: string[] };
  gestures: string[]; sources: string[];
}
```
`MethodStep.dur` is a free-text duration string; `sig` carries an IF/THEN
sensory cue as prose (e.g. *"SE a massa rejeita a água… ENTÃO…"*). Only one
bread (Mafra) has a fully bakeable `Protocol` today — others have the richer,
separately-typed `RecipeContent.protocolo: ProtocolStage[]` (see §8) but not
the ingredients/equipment/plan scaffold. **No media slot** on either type.

### 5.3 iOS — three layers, one legacy + two in-flight generalizations

**Legacy (live in production)**: `StepCatalog.StepType`
(`Domain/StepCatalog.swift`) — 17 hardcoded entries covering only bread steps
(preferments: mm/massavelha/poolish/biga/escaldao/autolise; dough:
mistura/combinar/envolver/folds/repouso/forma/proof; heat:
cozer/tostar/cozinhar; finishing: juntar/arrefecer):
```swift
public struct StepType: Sendable {
    public let id: String
    public let tone: StepTone
    public let uiKind: String
    public let dur: Int          // minutes
    public let gap: Int          // minutes of slack before
    public let prep: Bool
    public let overnight: Bool
    public let vespera: Bool
    public let params: [ParamSpec]
}
```
`ParamSpec { key, labelKey, kind: ParamKind, def, minValue, maxValue, step,
unit, options }`, `ParamKind = {num, temp, pct, min, select}` — temperature
and duration ARE representable as typed params, but only via this closed,
string-keyed catalog. `RecipeProtocolStepSnapshot` (embedded per-step in
`BreadRecipeFormulaSnapshot`) carries `stepType: String, title,
durationMinutes, timerPolicy, timerMinutes, timerPrompt, parameters:
[String: Double]` — duration is a first-class field; temperature rides
inside the generic `parameters` dict.

**In-flight generalization #1** — `Domain/RecipeMethod.swift`, whose header
explicitly states it is *"the kind-neutral, ubiquitous-language replacement
for 'protocol'/'protocolSteps'"* (citing SPEC-008 §1 / PRD-003 §8b):
```swift
public struct RecipeMethodStep: Codable, Equatable, Sendable {
    public let primitiveId: String
    public let primitiveVersion: Int
    public let position: Int
    public let paramValues: [String: Double]
    public let schemaVersionAtCapture: Int
}
public typealias RecipeMethod = [RecipeMethodStep]
```
Steps are references to a `StepPrimitive` (id+version) plus a generic
`[String: Double]` param bag — not typed duration/temp/media fields directly.
A compatibility mapper converts legacy protocol steps into this shape via a
hand-duplicated, still bread-specific `stepType → primitiveId` table.

**In-flight generalization #2** — `Domain/StepPrimitive.swift`:
```swift
public struct StepPrimitive: Equatable, Sendable {
    public let id: String
    public let version: Int
    public let paramSpecs: [ParamSpec]
    public let hasTiming: Bool
    public let hasTechniqueMedia: Bool     // discoverability flag, not an embedded media reference
    public let isPrepTrack: Bool
    public let isOvernight: Bool
    public let compositionBehavior: StepCompositionBehavior?  // e.g. one step expands into N phases
}
```
Capability-flag-based rather than kind-typed. `hasTechniqueMedia` is a
**marker that external content exists**, not an embedded media slot on the
step. **No media/photo/video reference field exists on any step type in
either app.** The only adapter today, `StaticStepPrimitiveRegistry`, still
wraps `StepCatalog.types` 1:1 for `.bread` and returns `[]` for every other
`RecipeKind` — the generalization is a proven seam with **one real
conformance**, not a working multi-kind system; per its own header comment it
deliberately defers generalizing the math because "forcing a kind-neutral
signature now would mean guessing at a shape for kinds that don't exist yet"
(explicitly flagged as a prior "premature-abstraction" correction).
`MethodComposer` (the newest layer, `Application/Services/`) resolves
`RecipeMethodStep`s against the registry and expands composition behaviors —
but its own header states it is **not yet wired into the live
fornada-creation path**; `CreateFornadaCommand`/`AddRecipeCommand` still use
the legacy `protocolSteps` + `FornadaExecutionStepScheduler`.

### 5.4 Design intent for the generalized method model — PRD-003 / SPEC-008

`docs/product/prds/PRD-003-fornada-execution-model.md` (status: "v0.4 —
domain model locked", 2026-07-24) and `docs/product/specs/SPEC-008-fornada-
execution-model/spec.md` (status: accepted) are the most directly relevant
existing documents to a universal recipe protocol, and are worth quoting at
length because they pre-empt several of this task's questions:

> "Methods vary enormously across products — escaldão, additions, toasting,
> stovetop cooking — and **granola does not follow bread's patterns**. So the
> model must define **primitives that recipes compose from**, never a closed
> step list." (PRD-003 §4.2)

Three layers are specified: **Step primitive** (reusable typed building
block: id, typed `ParamSpec` schema, declared facets — timing? technique/media
slot? prep-track/overnight?), **Method** (a recipe's ordered composition of
primitive *instances* with parameter values — "owned by the recipe"), and
**Kind-awareness** (each `RecipeKind` has a relevant primitive subset and
default composition; worked contrast given: bread's `mm(vespera) → autolise?
→ mistura → folds(method,n,interval) → bulk(mode) → forma → proof → cozer`
vs. granola's `combinar → envolver → tostar(temp,dur,stir) → arrefecer →
juntar(fruta)` — "No leaven, no folds, no proof, oven step is `tostar` not
`cozer`."). A step's **facets** are explicitly named as *timing (always),
parameters, technique/media* (PRD-003 §4.1) — technique/media is called out
as *"a general step facet — available to any step… not shaping-only"* (§4.5),
resolved as a **hybrid**: generic reference as the floor + the baker's own
captured media layered on top where it exists, tied to the project's
process-media goal (own moldagem video per bread).

SPEC-008's domain-model section (§8b, from a DDD/architecture review) names
the load-bearing structural change explicitly: *"`BakerMath`/
`FornadaBatchCalculator`/scheduler currently **are** bread… Extract a
kind-neutral Method/Fornada core; make bread one `RecipeKindProfile` strategy…
No `if kind == .bread` branching."* — and states the snapshot-per-Fornada
pattern (copy-don't-mutate) is intentional so *"a Fornada is a self-contained
aggregate — it never needs the Recipe or the live registry to execute/render,
and old fornadas + synced events stay decodable as primitives evolve."*

**Critical scope caveat, stated in the spec itself**: SPEC-008's own "## API"
section reads *"None. This is fully local-first… no backend endpoints
change"* — this generalization work is iOS/SQLite-only. It has not touched,
and does not plan to touch, the Postgres schema or Go API documented in §1.6–1.8.
Explicit non-goal: *"Building a second `RecipeKindProfile` (granola/pastry) —
no implementation or data exists to validate one against."*

---

## 6. Session/execution state (BakeSession lifecycle)

Two independent state machines exist — web and iOS — that are conceptually
aligned (planning → measuring → concluding) but **structurally different in
scope** (per-session vs. per-item).

### 6.1 Web — `web/src/calc/bakeSession.ts` (canonical, per project memory)

```ts
export type BakePhase = 'planeamento' | 'medicoes' | 'conclusao' | 'completa';
export type BakeStatus = 'planeada' | 'em-curso' | 'pausada' | 'completa' | 'arquivada';
export type BakeOutcome = 'sucesso' | 'aprendizagem' | 'falhou';
export type LeaveningType = 'mm' | 'fresco' | 'seco';

export interface BakeSession {
  id: string; schema_version: 1; recipe_id: string | null; recipe_nome: string;
  based_on_bake_id: string | null; fornada_id: string | null;
  phase: BakePhase; status: BakeStatus;
  planeamento: PlaneamentoInputs;   // n, peso_per, bake_at, mm_pct_override, mm_prep, leavening
  medicoes: MedicoesInputs;         // temps {flour_c,kitchen_c,starter_c,friction_c}, ddt_target_c, started_at
  conclusao: ConclusaoInputs;       // actuals, outcome, rating, notes, observations
  created_at, updated_at: string; completed_at: string | null;
}
```
State machine functions (`bakeSession.ts:191-288`): `canAdvancePhase`,
`advancePhase` (forward-only, immutable, walks `PHASE_ORDER`),
`revertToPhase` (backward re-edit, resets status to `'em-curso'`),
`pauseBake`/`resumeBake`/`archiveBake`. `BakeSession` is one bake of **one**
recipe — its own 3-phase lifecycle scoped per session.

`Fornada` (`calc/fornadaEntity.ts`) is a **separate, higher-level entity**: a
multi-bake day plan grouping several `BakeSession`s, owning `compensation_pct`
(shopping-list loss margin), `mm_prep_plans` (shared starter refresh across
bakes), and `items: FornadaItem[]`. Notably:
```ts
export interface FornadaItem {
  id, recipe_id: string; recipe_kind: 'bread' | 'other'; recipe_name: string;
  quantity: number; unit_weight_g: number | null; bake_at: string | null;
  position: number; bake_session_id: string | null;
}
```
`recipe_kind: 'bread' | 'other'` — the codebase **already anticipates
non-bread items in a fornada**, though `aggregateFornadaItems()`
(`fornada.ts:176-224`) only computes `BreadResult` for `recipe_kind ===
'bread'`; `'other'` items are listed but not baker's-math-computed.

### 6.2 iOS — split across two enums at two different scopes

- `FornadaStatus` (`FornadaModels.swift:11-21`): `draft, planned, preparing,
  executing, completed, cancelled` — the top-level session lifecycle, doesn't
  literally name a "Planeamento" phase.
- `BakeOperationalPhase` (`FornadaModels.swift:37-41`): `measurements,
  conclusion, completed` — the Medições→Conclusão split **does** exist, but
  lives inside `BakeOperationalRecord.phase`, scoped **per-`FornadaItem`**
  (one bake-record per recipe-item within a Fornada), not per-Fornada. Gated
  by `canAdvance(usesMassaMae:)` on temperature-capture completeness
  (measurements→conclusion) and `outcome != nil && rating != nil`
  (conclusion→completed).

This is a **structural mismatch** a universal protocol needs to reconcile:
web's Planeamento/Medições/Conclusão is per-*session* (one recipe, one bake);
iOS's Medições/Conclusão is per-*item* inside a multi-recipe Fornada, with
overall Fornada status tracked by a separate, coarser enum.

### 6.3 What gets recorded during execution

Web: `MedicoesInputs` (flour/kitchen/starter/friction temps, DDT target,
started_at), `ConclusaoInputs` (actuals, outcome, rating, notes,
observations). iOS: `BakeMeasurementRecord` (`flourTemperatureC,
kitchenTemperatureC, starterTemperatureC, targetDoughTemperatureC,
frictionTemperatureC, startedAtUTC`, plus a `waterTemperatureC(usesMassaMae:)`
helper calling `BakerMath.targetWaterTemperatureC`), `BakeActualRecord`
(`flourActualGrams, waterActualGrams, massaMaeActualGrams, kitchenActualC,
bulkActualHours, coldProofActualHours` — bread-specific field names throughout),
`BakeConclusionRecord` (`actuals, outcome, rating, notes, observations,
reservedMassaVelhaGrams`).

Timers: iOS `TimerRecord`/`TimerService` (arm/complete/restore-active) plus
`NotificationScheduler` port; an append-only `LocalEvent`/`LocalEventType`
event-sourcing log underlies sync (`massaMaePrepChanged`, `stepSkipped`,
`stepDoNow`, etc.). Web has an equivalent local-only session model but no
description of a comparable notification/timer subsystem was found in the
web calc layer (timers appear to be a bake-page/UI concern, not part of
`bakeSession.ts` itself).

---

## 7. Persistence & serialization

### 7.1 Web — localStorage, no backend for sessions

`web/src/lib/storage.ts`: versioned `localStorage` wrapper, key prefix
`paodeportugal:v1:`. Used for `BakeSession`/`Fornada` (per a comment in
`bakeSession.ts:15-17`, the server has **no** bake-session/fornada endpoint
yet — confirmed independently by the API route list in §1.8, which has no
`/bake-sessions` or `/fornadas` routes).

`web/src/lib/portability.ts`: versioned JSON export/import:
```ts
export interface ExportV1 { version: 1; exported_at: string; recipes: Recipe[]; mm_variants: MMVariantCustom[]; bakes: Bake[]; }
```
**Gap**: covers only `Recipe`, `mm_variants`, `bakes` — does **not** include
`BakeSession`, `Fornada`, or `OtherRecipe`.

`web/src/lib/api.ts`: real backend calls (`fetch` + `X-User-Id` header,
RFC7807 Problem+JSON errors) against `/api/recipes`, `/api/bakes`,
`/api/mm-variants`, `/api/other-recipes`.

### 7.2 iOS — raw SQLite, opaque-JSON-payload pattern

`Adapters/Persistence/SQLiteFornadaStore.swift` (41 KB) — raw `sqlite3` C API,
**not** Core Data or SwiftData. Every domain entity is serialized whole into
a `payload_json TEXT` column, with a handful of indexed columns pulled out
for querying:
```sql
CREATE TABLE IF NOT EXISTS recipe_snapshots (
  local_id TEXT PRIMARY KEY, workspace_local_id TEXT NOT NULL,
  name TEXT NOT NULL, captured_at_utc REAL NOT NULL, payload_json TEXT NOT NULL
)
CREATE TABLE IF NOT EXISTS fornadas (
  local_id TEXT PRIMARY KEY, status TEXT NOT NULL,
  updated_at_utc REAL NOT NULL, payload_json TEXT NOT NULL
)
```
Because recipe/formula content lives in `payload_json`, **the iOS storage
layer is already kind-agnostic at the DB-schema level** — adding new recipe
kinds needs no migration, only new JSON shapes and decode logic (with
`payload_schema` version columns for forward-compatible decoding). This is
the single most extensibility-friendly layer found in the whole codebase.

`Adapters/API/MobileAPIDTOs.swift`: `RecipeSummaryResponseDTO` (bread-shaped,
mirrors the Go API's `Recipe`) plus a **separate**
`OtherRecipeSummaryResponseDTO { id, name, category }` — a minimal, existing
non-bread wire stub with **no** formula/ingredient/step data at all.

### 7.3 Postgres — see §1.6–1.8. No JSONB-payload pattern; explicit columns.

Unlike iOS, the Postgres schema uses explicit typed columns for the bread
formula (not an opaque payload), which is why every schema change to the
bread shape (extras, inclusions, mm_type, origins) required a migration.
`other_recipes` uses JSONB for its free-form parts (`ingredients`,
`variants`, `params`) specifically to avoid that migration cost for the
non-bread path.

### 7.4 db/init.sql — stale placeholder, not the real schema

`db/init.sql` is **not** a rolled-up dump of the migrations. It is a stale
23-line placeholder predating migration 0002, self-described: *"Placeholder
schema. The actual tables land with the API service that will own this
database"* — and it names tables (`recipe_overrides`, `mm_variants_custom`)
that were never built that way. Its only executable statement is `SELECT
'padaria database ready' AS status;`.

### 7.5 Headless CMS direction — Sanity, planned but not executed

`site/CMS-MIGRATION-PLAN.md` (present, substantial, not yet acted on):

> "Move the heritage content from typed TypeScript files into a headless CMS…
> served to web + future iOS/Android apps from one source of truth."

Decision: **API-based headless CMS, lead Sanity, alternative Payload** —
git/file-based CMSs (Keystatic, Tina) are explicitly ruled out because they
"can't serve native apps." Architecture: CMS owns *content* (breads, recipes,
história, flours, gestures, sources, media); the baker's-percentage engine
stays code, to be extracted into a shared `@pao/formula` package consumed by
web, native apps, **and** the CMS editor's live preview. Content model
mapping (seeds → CMS document types): `breads.json → bread` (base + `recipe`
object + `piece` + `content` + `protocol` + `image` + `status`, referencing
flours/gestures/sources), `flours.json → flour`, `gestures.json → gesture`,
`sources.json → source`, `outras.json → outra`, `chain.json → chainStep`,
`regions.json → region`. Field-level i18n is a named requirement (content is
`{pt,en}` today; CMS must make adding a language additive, not a parallel
document tree). A friction-free **custom recipe editor** (live baker's-%,
dough-piece weights, a protocol step builder, side-by-side pt/en) is called
"the single most important thing the prototype must prove." The plan defines
a **Phase-0 prototype gate** (round-trip two breads, draft→preview→publish,
Zod-parse at the fetch boundary) that decides Sanity vs. Payload — **this
gate has not been run**; the site still builds from TS source of truth
(`site/src/data/*`), and `site/seeds/*.json` are a generated,
CMS-import-shaped **snapshot** of that TS data (regenerated via `bun run
seeds`), not a live CMS. No Sanity SDK/config/schema files exist in the repo.

---

## 8. Content/editorial layer (`/receituario`)

Recipes on the editorial site are **TypeScript object literals, not
markdown-with-frontmatter**. No markdown recipe files exist under `site/`.

### 8.1 The heritage catalog entity — `site/src/data/content.ts:128-137`

```ts
export interface Bread {
  num: number; name: string; slug: string; region: L; grain: string; flour: string;
  hyd: number; mae: number; total: number; blend: number; map: { x: number; y: number }; blurb: L;
  hist?: L; story?: L; places?: Place[];
  /** Em investigação: present in the data but hidden from every public surface
   *  (map, index, region lists, search, sitemap) until verified. */
  draft?: boolean;
}
```
`L = { pt: string; en: string }` is the bilingual-field convention used
throughout every content type on the site. `Place { name: string; note: L }`
captures where a bread is still baked/sold — the closest thing to producer
attribution at the catalog-entry level (paired with `notes/producers.md`,
the project's dedicated producer-tracking file, per project memory).

### 8.2 The richer editorial layer — `site/src/data/recipeContent.ts:14-63`

```ts
export interface SourceLink { label: string; url: string }
export interface SubAction { verbo: L; corpo: L }
export interface SensoryCue { condicao: L; acao: L }
export interface GestureRef { slug: string; label?: L }
export interface ProtocolStage {
  titulo: L; duracao?: string;
  fonte?: L;                          // source caption under the stage, markdown links honoured
  acoes?: SubAction[];
  cues?: SensoryCue[];
  gestos?: GestureRef[];
  starterOnly?: boolean;              // dropped from método when baker swaps to commercial yeast
}
export type Confidence = 'HIGH' | 'MEDIUM-HIGH' | 'MEDIUM' | 'LOW';

export interface RecipeContent {
  alsoKnownAs?: string[]; region?: L;
  historico?: L[]; sensorial?: L[]; farinhasNote?: L[]; metodo?: L[]; acompanhar?: L[];
  protocolo?: ProtocolStage[];
  vitais?: { internalTempC?: number; coolingMin?: number };
  confidence?: Confidence; draft?: boolean; notes?: L[]; sources?: SourceLink[];
  verified?: { by: string; role?: L; local?: string; date?: string };
  // —— Provenance (source-of-truth layer). Plural; may conflict; variants allowed. ——
  testemunhos?: { nome: string; papel?: L; local?: string; citacao?: L; fonte?: string }[];
  divergencias?: { tema: L; versoes: { afirmacao: L; fonte?: string }[] }[];
  variantes?: { nome: L; local?: string; descricao: L; fonte?: string }[];
}
```

This is the richest provenance model in the whole codebase: `confidence`
(HIGH/MEDIUM-HIGH/MEDIUM/LOW), `sources: SourceLink[]` (per-claim citation),
`verified: { by, role, local, date }` (named-person verification, flips the
page from an "under research" banner to a verification seal),
`testemunhos` (named people/communities holding the knowledge, with a direct
quote and source), `divergencias` (where sources disagree, recorded
side-by-side rather than resolved), and `variantes` (documented regional
variations). Every text field is `{pt, en}`. A recipe fact sheet's authoring
process is itself documented in `notes/c2-recipe-research.md` — DGADR
(official) as primary source, regional tourism boards as secondary, blogs as
context-only, every claim URL-cited, fields marked "unverified — needs
source" rather than inferred. `notes/a-data-reconciliation.md` is a live
prose-vs-calc discrepancy audit (11 of 17 breads have ≥1 conflict between the
editorial prose and the calculator's canonical numbers — mostly flour-grade
drift), confirming the editorial and calc layers are hand-synced, not
generated from one source, and can and do drift.

### 8.3 The bakeable-protocol layer — `site/src/data/recipes.ts:320-329`

See §5.2 — `Vitals`/`PlanStep`/`Ingredient`/`MethodStep`/`Protocol`. Only one
bread (Mafra) has a full `Protocol` today.

### 8.4 The non-bread escape hatch — `site/src/data/outras.ts`

```ts
export interface OutraCategory { id: string; orn: string; nome: L; descricao: L }
export interface OutraEntry {
  slug: string; category: string; nome: string; regiao?: L; resumo: L;
  porque: L;    // "Why it belongs in the archive" — its tie to the bread tradition
  draft?: boolean;
}
```
File header: *"'Outras' (non-bread recipes adjacent to the bakery)… This
surface holds only pastelaria, sourdough discard, granola/cereals and other
bakery-adjacent things — no savoury dishes. Protocols are deliberately left
'em escrita' (not invented)."* Every current entry (`Pão-de-ló`, `Broas de
mel`, `Bolachas de massa-mãe`, `Granola caseira`) is `draft: true` with only
a `resumo`/`porque` prose pair — **no ingredients, no structured protocol at
all**. This is the editorial-site mirror of the API's `padaria.other_recipes`
escape hatch, similarly unstructured and similarly bounded away from savoury
dishes by explicit editorial policy.

### 8.5 Register split — editorial vs. operational

`site/PRODUCT.md` states the governing design rule explicitly: *"Method-
first, story-before-numbers. On a recipe: history → sensory → method →
vitals. The story comes before the formula."* — and `PRODUCT.md` (root,
covering the app) states the inverse for the calculator: *"Bread math is
first-class… must remain visible where they affect decisions."* These are
two different registers by design (per project memory: "Two-surface
architecture — /receituario (editorial cookbook) + /calculador (working
app). Same brand, different UX laws."), and any universal protocol needs to
serve both without collapsing one into the other.

---

## 9. Existing docs about direction

- **`docs/product/prds/PRD-003-fornada-execution-model.md`** and
  **`docs/product/specs/SPEC-008-fornada-execution-model/spec.md`** — see §5.4.
  The most substantive existing generalization design; iOS/local-first only,
  explicitly makes zero backend changes.
- **`docs/product/specs/SPEC-006-recipe-variants/spec.md`** (accepted,
  2026-06-05) — recipe families/variants (`recipe_family_id`,
  `variant_of_recipe_id`, `variant_label`), living inside
  `BreadRecipeFormulaSnapshot` payload JSON (iOS local SQLite), not the
  Postgres schema. First case: `Lagoinha Sementes` as a variant of
  `Lagoinha`. Explicit product rule: *"Do not remove `massa velha` or `banha`
  just because a newer table has blank cells"* — variant overrides must stay
  complete enough for offline use, not sparse diffs.
- **`docs/product/specs/SPEC-007-flour-identity-and-supplier-catalog/spec.md`**
  — see §2.
- **`docs/product/prds/PRD-001-fornada-v1.md`** — establishes the
  foundational split between **Pão de Portugal** (curated, read-only,
  editorial) and **Fornada** (operational, private, per-workspace). Entities:
  `Workspace/Cozinha`, `EditorialRecipe` (curated, public, read-only),
  `UserRecipe` (private, workspace-owned, copyable from an `EditorialRecipe`
  carrying `source_editorial_recipe_id` + `source_editorial_version`),
  `Fornada`, `FornadaItem`, `BakeSession` — establishing **recipe
  provenance/versioning as a first-class future-format concern**,
  independent of the SPEC-008 primitive model.
- **`site/CMS-MIGRATION-PLAN.md`** — see §7.5.
- **`.dof/` directory**: does not exist in this repository. No ADR/Invariant
  directory under the Architecture-First workflow was found.
- **`docs/product/reports/`**: does not exist. `docs/product/research/
  recipe-protocol/` existed but was empty prior to this document — this
  appears to be the first substantive research artifact in that location.
- **`mobile/PRODUCT.md`**: does not exist. Only `/PRODUCT.md` (root, covers
  the Fornada app generally, framed entirely in bread/baking terms — no
  mention of pastry, drinks, fermentation, or savoury) and `/site/PRODUCT.md`
  exist.

---

## 10. i18n / localization

**Two separate, non-shared i18n mechanisms**, one per product:

- **Web app UI strings** (`web/src/i18n/locales/en.yml`,
  `web/src/i18n/locales/pt-PT.yml`, 55 lines each) — a conventional keyed
  locale-file pair via `i18n.ts`/`I18nProvider.tsx`/`generated.ts`. Two
  locales only (pt-PT, en) but genuine infrastructure, not pt-PT-only.
- **Editorial site content** — inline per-field bilingual objects (`type L =
  { pt: string; en: string }`) embedded directly in every content type
  (`Bread`, `RecipeContent`, `Protocol`, `GestoContent`, etc. — see §8).
  Adding a third language today means adding a third key to every `L`
  object across the entire content corpus — not additive in the way the
  CMS plan's "field-level localization" requirement (§7.5) is designed to fix.

No hits for locales beyond pt-PT/en anywhere in the repo.

---

## WHAT A UNIVERSAL PROTOCOL MUST PRESERVE

Concepts that are load-bearing today and must survive generalization, with
where they currently live:

1. **Baker's-percentage math, flour-pivoted for display** — three
   implementations agree that the *displayed* percentage is always
   grams-of-ingredient ÷ grams-of-blend-flour × 100 (§3), even though the
   underlying *scaling* pivot differs (web/site: rebuild water/MM from flour
   after mass-scaling; iOS: uniform rescale to target total, percentages
   derived after).
2. **Hydration, salt%, and pre-fermented-flour% as first-class computed
   facts** — `VitaisBox.tsx` (web) renders exactly these plus rendimento;
   `formula.ts`'s `preFermentedPct` (site) explicitly accounts for flour
   locked inside MM (50%) and MV (60%) toward a "true" hydration/fermentation
   picture. Any universal formula engine needs an equivalent "what fraction
   of total flour is pre-fermented" computation that generalizes past MM/MV
   specifically.
3. **DDT (desired dough temperature) math** — `breadDDT()` (web),
   `targetWaterTemperatureC()` (iOS `BakerMath`) — flour/water/preferment/
   friction energy-balance formulas, tied to `MedicoesInputs`/
   `BakeMeasurementRecord` capture during execution. This is bread-specific
   physics but the *pattern* (a target-state calculation feeding a live
   measurement-capture phase) generalizes to fermentation temperature targets
   for other kinds.
4. **Preferment chains as a distinct, separately-composable concept** — even
   though today's implementation is fragmented (§4), the *domain need* (a
   starter/culture with its own composition, refresh schedule, and
   ratio-to-recipe) is real and load-bearing across bread, and will recur for
   any fermentation/pickle/drink kind (kombucha SCOBY, kefir grains, levain
   for pastry, etc.) — a universal protocol should unify what's currently
   four separate representations, not multiply a fifth.
5. **Heritage provenance/sourcing model** — `RecipeContent`'s `confidence`,
   `sources`, `verified`, `testemunhos`, `divergencias`, `variantes` (§8.2)
   is the most sophisticated part of the whole codebase and has no
   operational-app counterpart at all. A universal protocol that only
   generalizes the *calculator* side while dropping this provenance layer
   would regress the editorial site's core value proposition ("a trusted,
   citable, bilingual reference").
6. **Producer/place attribution** — `Place[]` on `Bread` (where a bread is
   still baked/sold) and the dedicated `notes/producers.md` tracking file
   (per project memory: capture bakery/oven/miller names referenced in
   sources) — currently informal/manual, not a typed entity, but consistently
   present across bread entries and should be a first-class reference type
   (not free text) in a universal model.
7. **Media slots per step — as a declared intent, not yet built.** No step
   type anywhere in the codebase has an actual embedded media reference
   field today (§5.3 confirms `hasTechniqueMedia` is a discoverability flag,
   not a slot). But PRD-003 §4.5 explicitly designs for this ("technique/media
   is a general step facet — available to any step"), tied to the project's
   stated media goal (own video/photos of each bread's process, especially
   moldagem — project memory `project_process_media.md`). A universal
   protocol should build the slot PRD-003 already specified, generalized past
   bread technique.
8. **Recipe family/variant relationships** — `recipe_family_id`/
   `variant_of_recipe_id`/`variant_label` (SPEC-006) and the editorial/
   operational provenance link (`source_editorial_recipe_id`/
   `source_editorial_version`, PRD-001) — both explicitly designed to keep
   variant formulas *complete*, not sparse diffs against a base, for
   offline-use reasons. This constraint (no partial/inherited recipes at
   the storage layer) should carry into a universal protocol.
9. **Explicit flour typing (T-grade) as a naming discipline** — a hard
   project rule (project memory `feedback_explicit_flour_types.md`;
   `site/PRODUCT.md` design principle 6: *"Explicit flour types everywhere…
   never just 'centeio'"*) that SPEC-007's flour-class/flour-product split
   (§2) is designed to formalize and extend to other grains/ingredients.
10. **Kind-aware step composition** (bread's fermentation arc vs. granola's
    toast-and-cool arc, PRD-003 §4.2) as an *open, extensible primitive
    library* rather than a closed per-kind step enum — this is the single
    piece of prior architectural thinking in this codebase most directly
    applicable to the target task, and should be treated as the starting
    design, not reinvented.
11. **Copy-don't-mutate execution snapshots** — both web (`BakeSession`
    doesn't reference a live `Recipe`, it snapshots inputs) and iOS
    (`FornadaItem.processSnapshotJSON`, explicitly justified in SPEC-008 §8b
    as the DDD PROTOTYPE pattern so old bakes stay decodable as the recipe/
    primitive definitions evolve) agree on this pattern. A universal protocol
    must preserve snapshot-at-creation semantics for any executed instance.

---

## WHERE TODAY'S MODEL BREAKS

Concrete places where the current bread-only model would not extend to
pastry, drinks, fermentation/pickles, or savoury cooking without real
redesign — not just relabeling:

1. **The `Recipe`/`BreadRecipe`/`BreadRecipeFormulaSnapshot`/
   `padaria.recipes` formula shape is flat, named, and closed.**
   `blend/agua/azeite/banha/mv/mm/sal` are hardcoded top-level fields in
   *four independent implementations* (web, iOS, site, Postgres). There is
   no generic `ingredients: [{role, key, grams, ...}]` list anywhere in the
   "real" (non-`other`) recipe types — every non-bread ingredient has to be
   force-fit into `extras`/`inclusions` (both added *after the fact*, by
   migration, specifically to stretch the bread model for regional
   exceptions like Bolo do Caco's sweet potato). Drinks, pickles, and savoury
   dishes have no analogous "role" vocabulary (no water/fat/leaven/salt
   equivalent) to hang onto this shape at all.
2. **Baker's-percentage math assumes a single dominant mass (flour) that
   every other ingredient is a percentage of.** This has no meaning for a
   pickle brine (percentage of what — vegetable weight? liquid weight?), a
   coffee recipe (ratio is water:coffee, inverted from bread's convention),
   or many pastry formulas (percentage-of-flour still applies to some
   pastries but breaks for custards, curds, ganache, syrups). The math
   engine (`bread.ts`/`BakerMath.swift`/`formula.ts`) is not a generic
   ratio/pivot engine — it's bread arithmetic with bread-named variables
   baked into the function bodies (`computeBread`, not `compute`/`scale`;
   iOS's function is literally named `computeBread`).
3. **Preferment folding is a hardcoded constant, not a model.** The 60/38/2
   massa-velha decomposition and the "MM is always 100% hydration" assumption
   (§3.4, §4) are correct for this project's specific breads but are
   arbitrary constants with no general "preferment composition" abstraction
   behind them. A poolish (100% hydration, standard), a biga (50-60%
   hydration), a levain for a pastry, or a fermentation starter for kombucha
   each have genuinely different composition math that this hardcoding
   cannot express without new hardcoded constants per kind.
4. **`RecipeKind` (bread/pastry/discard/granola/other) exists but is
   behaviorally inert beyond bread.** `StaticStepPrimitiveRegistry.
   primitives(for:)` returns `[]` for every non-bread case; no
   `PastryRecipeKindProfile` or equivalent exists; the API's
   `OtherRecipeSummaryResponseDTO` carries only `id/name/category`, no
   formula data at all. The seam is real (§5.3/§5.4) but nothing has been
   built on it — "universal" is a design intent stated in PRD-003, not a
   working system.
5. **Two backend tables, no shared abstraction.** `padaria.recipes` (bread,
   rigid columns) and `padaria.other_recipes` (everything else, JSONB
   free-form) are architecturally parallel with **no `kind` discriminator
   joining them**, no shared base table, and independent REST route
   namespaces (`/recipes` vs `/other-recipes`). A universal protocol that
   wants one queryable "recipe" surface across kinds has to unify or bridge
   two tables that were deliberately kept separate to avoid touching the
   bread schema.
6. **The generalization work that exists (iOS StepPrimitive/RecipeMethod)
   has explicitly not touched the API/DB layer**, and per its own spec
   ("## API: None… no backend endpoints change") does not plan to. Any
   universal protocol spanning web + iOS + API has to either extend this
   iOS-only design to the backend, or design fresh with the iOS work as
   informative prior art rather than a foundation to build directly on.
7. **Steps have no first-class temperature or media field anywhere.**
   Duration is typed in some places (`durationMinutes` on the legacy iOS
   step snapshot); temperature is always embedded in a generic param dict or
   in prose. This matters more once "kind" expands: coffee and fermentation
   both live and die by precise temperature, and prose-embedded temperature
   ("240–250 °C" inside a markdown string) cannot be validated, compared
   across a bake, or driven into a timer/alert the way a typed field could.
8. **Non-bread content today is deliberately left unstructured, not just
   incomplete.** `site/src/data/outras.ts`'s own header states protocols are
   "deliberately left 'em escrita' (not invented)" and every entry is
   `draft: true` with only summary prose — there is genuinely no existing
   structured non-bread recipe content anywhere in the editorial corpus to
   generalize *from*; a universal model will be validated against zero real
   non-bread examples until some are authored.
9. **Editorial policy currently excludes savoury dishes outright** ("no
   savoury dishes" — `outras.ts` header) and the API's `other_recipes.category`
   CHECK constraint is a closed enum (`granola, discard,
   pastelaria_tradicional, kitchen_daily, outras`) requiring a migration to
   add a category — both are explicit, current boundaries that the requested
   scope (drinks, savoury cooking, coffee) would need a deliberate decision
   to lift, not just a data-model change.
10. **BakeSession/execution phase ownership differs by platform** (§6): web
    scopes Planeamento/Medições/Conclusão per-session (one recipe); iOS
    scopes Medições/Conclusão per-item inside a multi-recipe Fornada. A
    universal protocol that wants one execution model across both platforms
    has to resolve this ownership mismatch, not just rename phases.
11. **i18n is field-duplicated, not field-localized**, on the content side
    (§10) — every new language means touching every `{pt, en}` object across
    the entire corpus. This scales acceptably at 2 languages and ~50 breads;
    it will not scale gracefully to a multi-kind, multi-language universal
    corpus without the CMS's planned field-level localization actually
    landing.
