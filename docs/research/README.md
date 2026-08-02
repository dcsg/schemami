# Recipe protocol research — index

A research spike on extending the project beyond bread: designing **RCP**, one
machine-readable recipe protocol able to encode bread, pastry, fermentation,
preserves, drinks, coffee and savoury cooking, renderable by a single frontend
that can rescale quantities, substitute ingredients, and guide execution.

Originated on branch `research/recipe-protocol` of the Calculador PAo repo
(commit history lives there); now the founding research of this standalone
repo. `schema/` and `examples/` referenced below live at the repo root.

## Read in this order

| File | What it is |
|---|---|
| **`FINDINGS.md`** | **Start here.** What the research found, what's easy / hard / not possible, and the decisions that are still open for brainstorm. |
| `00-PROPOSAL-rcp-v1.md` | A **strawman** assembled from the findings — one candidate protocol shape to react to, not a decision. |
| `examples/alentejano.rcp.yaml` | Pão Alentejano encoded in RCP, from the repo's real data — zero information loss, plus what the current struct cannot hold. |
| `examples/other-categories.rcp.yaml` | A cocktail, a sauerkraut, and pastéis de nata — proving profiles and cross-category composition. |

## Research tracks

| File | Track | Headline finding |
|---|---|---|
| `01-codebase-inventory.md` | What we model today | **Five** independent recipe representations with no shared type; all bread-shaped. Generalization already half-started in SPEC-008. |
| `02-format-standards-research.md` | Prior art — ~20 formats | schema.org is an SEO export, not storage. BeerJSON is the best-designed precedent. Tandoor and Mealie independently converged on Food/Unit/Amount. |
| `03-bread-fermentation-domain.md` | Baker + fermenter | Every domain pivots percentages on a *different* basis. Safety thresholds must be enforced data, not prose. |
| `04-pastry-savoury-domain.md` | Pastry chef + chef | Quantity cannot be a number (`to_consistency`). An entremet is a DAG. Temperature has at least four shapes. |
| `05-drinks-domain.md` | Barista + bartender + brewer | Dilution is a phantom ingredient. Ratio-first recipes have no absolute quantities. Four incompatible timeline shapes. |
| `06-substitution-model.md` | Substitution + method deltas | 15 of 18 sourced substitutions require a method/parameter delta. Chosen design: typed op list anchored to step slugs, role vectors, fail-closed guards. |
| `schema/rcp-core-v1.schema.json` | Executable core schema | JSON Schema 2020-12. All four example recipes validate against it (ajv). |

## The five findings that shaped the design

1. **Fixed ingredient fields are the core defect.** `agua`/`azeite`/`banha`/
   `mv`/`mm`/`sal` as named scalars models one domain well and every other one
   not at all. Everything becomes a row with functional `roles`.
2. **"Percentage of what" is the one mechanism that generalizes.** Baker's
   percentage, brine salinity, cure ppm, brew ratio, cocktail parts and ice
   cream balance are all the same `basis` construct.
3. **Recipes are graphs, not lists.** Preferment chains, entremet assembly and
   Italian meringue's syrup-meets-whites join are all DAGs. Linear stays easy;
   the graph is opt-in.
4. **Time is a window plus a condition, and depends on temperature.** A bare
   duration is a lie in every kitchen but the author's.
5. **Substitution is the novel part, and it changes the method.** Gelatine→agar
   must be boiled. Yeast→levain grafts a multi-day subtree. Equipment swaps do
   the same thing, which is good evidence one mechanism serves both.

## Decisions from the conversation (2026-08-02)

- **One core + per-category profiles**, not N protocols — composition across
  categories (nata = dough + custard + syrup; latte contains espresso) makes
  separate protocols inexpressible. Profiles keep each category small and
  well defined.
- **Enums over free text everywhere feasible** — three field classes: closed
  enum, registry-backed vocabulary (open for growth, closed to invention),
  and prose only where the sole consumer is a human eye.
- **Equipment is first-class**: referenced profiles that participate in the
  maths; a three-level rule decides parameter-shift vs guarded method branch
  (fries: oil vs air fryer) vs full variant (Bimby/Thermomix, which gets its
  own document in the recipe family).
- **A recipe can be a group of recipes** — components are full recipes,
  possibly of different kinds, joined by assembly steps in the DAG.

## Open questions

- Whether execution state (sessions, timers, measurements) lives in RCP or
  stays a separate runtime document. Current lean: separate.
- Registry governance: who reviews additions to the ingredient-class,
  primitive, and equipment vocabularies once contributors exist.
