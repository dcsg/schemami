# RCP ubiquitous language — the domain vocabulary

**Status:** working draft (2026-08-03, Daniel + research 08 evidence).
Feeds PRD-004 / FEAT-REG-006 modeling. Becomes binding via a DECISIONS
entry once the model lands; until then this is the vocabulary we argue in.

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

| Term | Definition | Nature | Consumption | Protocol home |
|---|---|---|---|---|
| **Technique** | A named way of transforming — fold, sear, refogar-as-gesture, bulhão-pato-as-style. May have a *teaching recipe* demonstrating it, but the technique itself has no yield; you cannot store "two jars of folding". | gesture | n/a (not consumed) | `technique.` registry entry; optional link to a teaching recipe (FEAT-REG-006) |
| **Preparation** | A named yielded output whose reason to exist is consumption by other recipes — roux, stock, refogado-as-output, calda, chile paste, massa velha. Batchable and storable; carries net yield; professionally managed with par levels and holding windows (operational attributes, not definitional ones). | yielded output | intermediate | `ingredient.preparation.*` (or other ingredient classes) registry entry; optional link to a canonical recipe |
| **Component recipe** | The independent document describing how to produce a preparation — own id, method, provenance, yield, version; referenceable by any consumer. Escoffier's roux "proportions pour un kilogramme" is this. | document | (describes an intermediate) | `kind: component` document + `componentRef` |
| **Dish** | A terminal consumable — eaten as itself. | yielded output | terminal | terminal `kind` values (dish, bread, pastry, drink, …) |
| **Recipe (document)** | The protocol's unit of description. ANY concept above may have one: a technique's teaching recipe, a preparation's batch recipe, a dish's recipe. "Has a recipe" therefore distinguishes NOTHING — consumption position and nature do. | document | — | any RCP document |

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
| **Method** | The *authored* steps of a recipe document — the step list/DAG exactly as written (title, primitives, uses, until). What Peterson's prose and Escoffier's proportions both describe. | RCP; a derived ordering |
| **Execution plan / Schedule** | The *derived* projection of a method: reading order, interleaved tracks, time-anchored schedule — Calculus output (FEAT-CALC-002), computed, never stored. | the authored method |
| **Session** | A live run of a method: execution state, checked-off steps, actual times, deviations — separate session documents, never inside the recipe (DECISIONS #7). | the recipe or its method |
| **Document** | One RCP file: a recipe, a component recipe, a registry entry. | the Protocol as a whole |

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

*Working draft — argue with it, then bind it via DECISIONS when PRD-004
models FEAT-REG-006.*
