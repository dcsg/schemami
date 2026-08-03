# RCP ubiquitous language — the domain vocabulary

**Status:** BINDING — DECISIONS #26 (2026-08-03). Terms aligned with
industry usage per the four-track research survey and Daniel's three
refinement rounds. Governs all project prose, PRDs and specs. Changes
require a new DECISIONS entry.

The founding confusion this document kills: "is a roux a recipe or a
technique?" is a **property of the source, not of the roux** (Peterson
files it under Liaisons as prose; Escoffier gives it batch proportions
per kilogram). The model therefore never hard-codes that boundary — it
names concepts by two orthogonal axes and lets sources disagree.

## The two axes

1. **Nature** — what kind of thing is it?
   - a *gesture*: a named way of transforming (no yield of its own)
   - a *yielded output*: a storable, measurable product
2. **Consumption position** — when it exists, what is it for?
   - *terminal*: consumed as itself (a dish, a loaf, a drink)
   - *intermediate*: exists to be consumed by other recipes
   - position is a **spectrum observed in use, never a hard type**

## The terms

Each term carries its verified industry currency and pt-PT display term
(identifiers stay English-base per DECISIONS #24; pt-PT is display).

| Term | Definition | Industry currency | pt-PT | Protocol home |
|---|---|---|---|---|
| **Technique** | A named way of transforming — fold, sear, refogar-as-gesture, bulhão-pato-as-style. May have a *teaching recipe*, but the technique itself has no yield; you cannot store "two jars of folding". | Confirmed native: culinary schools teach "techniques" (Escoffier School; Turismo de Portugal "Técnicas de Cozinha"). NEVER say "method" for this — trade usage overloads "cooking method" (braise/roast). | técnica | `technique.` registry entry; optional teaching-recipe link (FEAT-REG-006) |
| **Preparation (prep)** | A named yielded output whose reason to exist is consumption by other recipes — roux, stock, refogado-as-output, calda, massa velha. Batchable, storable, carries net yield. Inventory-state qualifiers when needed: *semi-finished*, *stockable* (Apicbase's exact words — never invent a state name). | Kitchen floor says "prep"; MarketMan lists "Preparations"; pt tradition says preparação — the EN/pt pair holds. | preparação | `ingredient.preparation.*` (or other classes) registry entry; optional canonical-recipe link |
| **Sub-recipe** | The independent document describing how to produce a preparation — own id, method, provenance, NET yield, version; referenceable by any consumer with scaling across the boundary. Escoffier's roux "proportions pour un kilogramme" is one. (Was "component recipe" in draft v1 — renamed: "sub-recipe" is UNANIMOUS across professional ERPs: meez, Apicbase, Galley, MarketMan, xtraCHEF.) | The industry's own word, verbatim, everywhere costing happens. | sub-receita / ficha técnica de preparação | `kind: component` document + `componentRef` (schema kind name unchanged — this is prose vocabulary) |
| **Dish** | A terminal consumable — eaten as itself. ERPs distinguish the *sellable* (**menu item**) from its recipe — that split is app-side vocabulary RCP acknowledges but does not model (DECISIONS #19). | "Menu item / sellable" verified (Galley, MarketMan, xtraCHEF). | prato | terminal `kind` values |
| **Recipe (document)** | The protocol's unit of description. ANY concept may have one — a technique's teaching recipe, a preparation's sub-recipe, a dish's recipe. "Has a recipe" distinguishes NOTHING; nature and consumption position do. Institutional foodservice's **standardized recipe** (current per USDA/Penn State) ≈ a yield-and-portion-controlled recipe — pt-PT: **ficha técnica**. | — | receita / ficha técnica | any RCP document |

## The clarifying cases (the spectrum, with names)

- **Stock** — Daniel's anchor case: produced *standalone as a production
  act* (a stock day; batched, stored, par-levelled) yet *always
  intermediate in consumption* — you make it to store, but you store it
  to use. Standalone-production ≠ terminal-consumption; the model must
  keep those apart.
- **Refogado** — dual-natured by name: the gesture (`technique.saute.refogado`)
  and its yielded output (a batchable, freezable base) share one word.
  Both registry entries may legitimately exist; the bridge links each to
  the method.
- **Roux** — the boundary case that started this: a preparation whose
  identity *forks on a measured checkpoint* (blanc/blond/brun by cook
  time; pontos de açúcar are the same shape ×12 stages). One preparation
  with graded stage outcomes, not N near-duplicate concepts.
- **Ganache** — an intermediate that can turn terminal (truffle centres
  eaten as-is). Position is observed per use, which is why it is data.
- **Bulhão Pato** — a named style (gesture) whose output is terminal;
  techniques are not always intermediate-serving.
- **Massa velha** — an intermediate that is literally a *previous
  execution's output* (inter-batch dependency; `carried_over` in core).
  The extreme proof that preparations outlive single recipes.

## "Protocol" is reserved (the naming collision)

The word *protocol* is overloaded in kitchen speech ("follow the
protocol" = do the steps) and would poison every design conversation.
Reserved meanings, binding in all project prose and identifiers:

| Term | Means | Never means |
|---|---|---|
| **The Protocol / RCP** | This project's specification: core schema, profiles, registry, Calculus, vocabularies, versioning rules. The thing integrators implement. | the steps of a recipe |
| **Method** | The *authored* steps of a recipe document — the step list/DAG exactly as written. Verified as THE professional steps-section header (Great British Chefs, BBC Food; pt-PT: **modo de preparação**, Teleculinária-verified). Reserved strictly for the authored steps — a braise/roast is a *technique* or *cooking method* in trade speech, never "the method" in ours. | RCP; a derived ordering; a cooking technique |
| **Schedule (of a method)** | The *derived* projection of ONE method: reading order, interleaved tracks, time-anchored start offsets — Calculus output (FEAT-CALC-002), computed, never stored. Includes **prerequisite placement** across sub-recipe references (stock the day before; beans overnight). Single-document scope by definition. (Draft v1 said "execution plan" — software language no kitchen source uses; draft v2 borrowed "prep list/production schedule" — WRONG, see next row.) | the authored method; the kitchen's aggregated artifacts |
| **Prep list · Production schedule** | The kitchen's real artifacts — and they are AGGREGATIONS: a prep list is tasks across MANY dishes for a shift; a production schedule spans many recipes over days, with par levels and batch sizes. Built FROM schedules-of-methods plus menu and pars — which makes them app-side vocabulary RCP acknowledges but does not model (DECISIONS #19), exactly like menu item. A protocol that called its single-method derivation a "prep list" would misuse the industry's word while claiming to speak it. | the derivation of one method |
| **Session (guided cooking)** | A live run of a method: execution state, checked-off steps, actual times, deviations — separate session documents, never inside the recipe (DECISIONS #7). Surface language for apps: **guided cooking / cook mode** (the app industry's own category terms). Professional "service" means the whole nightly operation, never one recipe's run — do not borrow it. pt-PT for the act of cooking a recipe: **confeção**. | the recipe or its method; the restaurant's nightly service |
| **Document** | One RCP file: a recipe, a sub-recipe, a registry entry. | the Protocol as a whole |

Usage rule: "the recipe's protocol" is banned; say **method** (authored)
or **execution plan** (derived) or **session** (live). "Protocol
change" always means an RCP specification change and nothing else.

## The modeling consequences (what this vocabulary buys)

1. **Never encode the recipe-vs-technique boundary in a type** — sources
   disagree (Peterson vs Escoffier); the same name may exist as a
   technique entry, a preparation class, and one or more independent
   recipes, bridged by canonical-recipe links (FEAT-REG-006).
2. **Consumption position is data** — derivable (is this document ever
   referenced by a componentRef / its class by an item?) and assertable,
   never a schema class. `kind: component` marks intended-intermediate;
   it does not forbid eating the ganache.
3. **Canonical is curation, not essence** — many recipes may teach one
   preparation; the steward picks the link target; a user's own recipe
   may shadow it at render time.
4. **Stage-forked identity deserves first-class treatment** — roux
   colours and pontos de açúcar argue for one preparation with bounded,
   named stage outcomes rather than sibling near-duplicates (open design
   question for PRD-004).
5. **Operational attributes stay out of definitions** — par levels,
   batch sizes, holding windows belong to execution/app-side concerns
   (DECISIONS #19), not to the preparation's identity.

---

*Bound by DECISIONS #26, 2026-08-03.*
