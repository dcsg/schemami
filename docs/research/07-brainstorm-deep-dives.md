# Brainstorm deep-dives — the four questions behind the open decisions

Date: 2026-08-02. Follow-up to `FINDINGS.md` §5, triggered by review: before
picking options we analyse (A) how validation should work and which format
fits *us*, (B) whether the hard problems even need protocol encoding — or can
be attacked with other technology, (C) what classification really requires,
(D) the domain model, in DDD terms, for the whole system.

---

## A. Validation & format — what actually fits this project

### Our constraints (the ones that decide this)

1. **Three consumer stacks**: TypeScript (web + site), Swift (iOS), Go/Postgres
   (API). Any contract must reach all three or we recreate today's problem —
   the same shape hand-maintained three times, already drifted.
2. **A git-reviewed heritage archive**: recipes are content someone reviews in
   PRs, bilingual, with provenance. Reviewability of diffs matters.
3. **A planned CMS (Sanity)** whose migration plan already commits to "Zod at
   the fetch boundary".
4. **LLM ingestion**: the schema doubles as an extraction target for
   structured output.
5. **Offline-first mobile**: documents must be self-contained and decodable
   with zero server help, years after capture (SPEC-008's "data outlives
   code").

### The validation-technology options

| Option | Reach (TS/Swift/Go) | Human authoring | LLM target | Verdict for us |
|---|---|---|---|---|
| **JSON Schema 2020-12** | ✅/✅ via codegen/✅ | via YAML front-end | ✅ native (structured output accepts it) | **Fits.** Language-neutral contract; ajv (TS), quicktype→Swift Codable, Go validators. BeerJSON proves the pattern at production quality |
| **Zod-first** (schema in TS) | ✅/❌/❌ | n/a | partial | TS-only source of truth recreates the drift problem for iOS/Go. Use Zod, but *generated from* the schema, not as the source |
| **TypeSpec** | emits JSON Schema/OpenAPI | good | via emitted schema | Nice authoring layer *over* JSON Schema; young ecosystem. Optional later; adds a dependency now |
| **Protobuf** | ✅/✅/✅ | ❌ (binary-first, field numbers) | ❌ | Wrong genre — built for RPC payloads, not human-reviewed content documents. Loses YAML/git story entirely |
| **CUE** | validates YAML directly, exports JSON Schema | ✅ elegant constraints | via export | Technically lovely (could express "sum of flour ratios = 100%"), but niche tooling, no Swift path, high bus-factor for a solo project |

### The key realisation: validation is two layers, and the schema is only layer 1

No schema language can check the things that actually make a recipe *work*:

- every `after:` resolves to a step, component, or produced intermediate
- every guard combination yields a **complete, connected DAG** (the autolise
  path AND the non-autolise path both terminate)
- every `of:` points at a declared basis; every `uses:` at a real ingredient
- component references: exist, are published, no cycles
- safety constraints are satisfiable at the authored yield
- registry references (items, primitives, equipment) exist in the catalogs

So the real stack is:

```
Layer 1 — JSON Schema 2020-12          → shape, enums, required fields
Layer 2 — semantic linter (~500 LOC)   → DAG, references, guards, safety
```

Layer 2 is ordinary code, shared as a small library (TS first, the web/site
already run node tooling), run in CI on YAML sources and at API write time.
This is the same split every serious format ends up with (BeerJSON validates
shape in schema and semantics in libraries).

### Format fit — resolved by *who writes where*, not by taste

| Surface | Writes | Form |
|---|---|---|
| Heritage archive (git) | a human, reviewed in PRs | **YAML**, compiled + linted in CI |
| CMS (Sanity, later) | editor UI | native CMS docs → **emits canonical JSON** |
| Apps / API / iOS store | machines | **JSON** in the versioned envelope |
| Imports (URL/screenshot) | LLM | **JSON** directly against the schema |
| SEO / interop | build step | JSON-LD / Cooklang **export only** |

Nobody hand-writes JSON; no machine round-trips YAML. Each side gets its
natural form, and there is exactly one contract (the schema + linter) that
everything must pass. The pipeline we already ran in this spike — ajv +
YAML-parse + validate, which caught 8 real bugs in my own examples — is
literally layer 1 of this design working.

**Recommendation**: JSON Schema 2020-12 as the single contract, semantic
linter beside it, YAML as the human authoring surface compiled in CI,
quicktype-generated Swift + TS types (and a generated Zod validator for the
CMS boundary, which its plan already expects).

---

## B. The hard things, from all angles — protocol, LLM, service, or don't

The question asked: *can the hard problems be solved without protocol
encoding? Can other technology carry them?* Honest answer per problem, with
the full option space each time.

### The general insight first: LLMs change the economics of authoring, not of execution

Every hard problem below has a cheap-looking LLM answer. The pattern that
survives scrutiny is always the same:

- **LLM at authoring time** (drafts data that a human reviews, stored as
  ordinary protocol data) → *changes everything*. Encodings that were "too
  expensive to author by hand" become affordable.
- **LLM at runtime** (generates the answer when the cook taps the button) →
  fails our constraints almost everywhere: offline-first mobile breaks, output
  is unreviewable (heritage archive integrity), safety cannot be guaranteed,
  cost per render, non-reproducible (same tap, different recipe tomorrow).

So the protocol still has to *store* the results — but it can store **simpler
representations** than we assumed, because generation is cheap and review is
the bottleneck. That reframes several decisions below.

### B1. Method-changing substitutions

| Angle | How it works | Verdict |
|---|---|---|
| (a) Encoded op-list (strawman `06`) | typed ops on step slugs, write-sets for conflicts | Deterministic, minimal storage, testable. Cost: highest authoring effort and the most novel machinery — nobody has shipped this |
| (b) **LLM-drafted, human-reviewed, stored as full variants** | author clicks "add oil version"; LLM generates the complete alternative recipe/section; human edits; stored as a normal variant with `lineage.family` | No new machinery at all — variants already exist (SPEC-006, self-contained snapshots). Combinatorics disappear (each variant is just a recipe). Cost: content duplication → drift risk when the base is edited |
| (c) LLM at runtime | "make it vegan" button calls a model | Breaks offline, unreviewable, unsafe, non-reproducible. **No** as the base mechanism; conceivable as an online-only *assistant* that proposes a draft the user saves |
| (d) Rules engine | generic condition/action language | Rejected in `06` with evidence: untestable, unexplainable |
| (e) Don't encode; prose notes | "you can use oil instead" as text | This is the status quo everywhere, and it's why no app can actually *do* anything with substitutions |

**The real trade-off is (a) vs (b)**, and it's authoring-effort vs drift:

- op-lists keep one source of truth and compose (two swaps at once), but each
  op-list is hand-crafted logic;
- LLM-drafted variants are near-free to produce and trivially renderable, but
  a base-recipe edit must propagate to N variants (mitigable: CI diff-alarm
  "base changed, 3 variants unreviewed since").

A defensible middle: **variants for big divergence, quantity-only
substitutions encoded, and op-lists deferred** until we've authored enough
variants to know whether drift actually hurts. That de-risks the most novel
part of the strawman. Safety constraints stay in the protocol *regardless* of
mechanism — they gate human, LLM and scaler output alike.

### B2. Non-linear scaling

| Angle | Verdict |
|---|---|
| Per-quantity scaling tags (`fixed`, `sublinear`, `area`) | Cheap, honest, already designed. Ship |
| Formula grammar (`12min/lb + 12`) | Real but rare; defer until a profile actually needs it (roasts) |
| Physics/heat-transfer service | Over-engineering; even pro bakers use rules of thumb |
| LLM at runtime | Same failures as B1c |
| **Warn instead of solve** | Underrated: "this recipe is untested beyond 2×; bake time will not scale linearly" is truthful and cheap — and matches how the domain actually works |

**Verdict**: tags + honest warnings now; formulas later; nothing else.

### B3. Temperature-aware fermentation timing

| Angle | Verdict |
|---|---|
| Q10/rate model in app | Approximation sold as precision — misleads exactly the novice it's meant to help |
| **Checkpoint-driven re-estimation** | The app already records actuals (BakeSession). "At 2h you reported +30% volume → revised finish ~5h" needs *no model of dough*, just interpolation against the recipe's declared endpoint. Works offline. This is the espresso dial-in pattern generalised |
| Bluetooth sensors | Later, additive, doesn't change the data model (a Measurement is a Measurement) |
| Protocol encoding needed | Only: reference temperature on durations + endpoints as data — both already in the strawman |

**Verdict**: sensory endpoints primary, checkpoint re-estimation secondary,
no fermentation model. The protocol change required is zero beyond what exists.

### B4. Import parsing — solved outside the protocol

This one genuinely lives in other technology: JSON-LD extraction + vision-LLM
→ structured output. The protocol's *only* jobs are tolerance (minimal
required fields, `raw` preserved, `null` over invention) and the unverified
status gate. Nothing more to design.

### B5. Variant/guard combinatorics

Tooling, not schema: the linter enumerates guard combinations (bounded — a
recipe with 2 options × 2 equipment branches = 8 paths, trivially checkable);
the authoring UI previews each path; a soft cap ("max 3 options per recipe")
keeps authors sane. If B1 lands on "variants instead of op-lists", this
problem mostly evaporates — each variant is one path by construction.

### B6. Registry governance

No technology solves "who says yes". But tech shrinks the cost: registries as
YAML files in git (PRs = review process, history = audit log), LLM-assisted
dedup ("`flour.wheat.T65` already exists, you typed `flour.t65-wheat`").
Single-maintainer approval is fine at current scale; revisit at contributors.

---

## C. Classification — what the data actually needs to support

The strawman's `taxonomy: {category, subcategory}` is too thin, and the
review instinct ("can even be another thing or name") is right. Classification
serves five different jobs, and conflating them is how recipe sites end up
with one mushy "category" field:

1. **Behaviour** — which maths/renderer/validation applies → `kind`
2. **Browsing** — shelves and filters in the app/site
3. **Reference** — packs, cross-links, "recipes using this ingredient"
4. **Presentation** — what the card shows (time, difficulty, badges)
5. **Heritage** — region, tradition, official status (DGADR)

### The load-bearing decision: asserted vs derived metadata

Because RCP is structured, **most classification metadata should be computed
from recipe content, not hand-typed**:

| Metadata | Source | How |
|---|---|---|
| main ingredients | derived | roles + basis (the flour blend, the substrate, the spirit) |
| equipment needed | derived | steps' equipment refs (site's `equipmentFor()` already does this from blends!) |
| active / passive / total time | derived | sum step durations by track; `overnight`/`day-before` flags give the calendar span |
| allergens | derived | ingredient classes × EU-FIC catalog data |
| diet compatibility | derived | roles + classes (vegan = no animal-class items) — with an asserted override for edge cases |
| technique badges | derived | step primitives used (laminated, fermented, sous-vide) |
| difficulty | **asserted** | genuinely a judgment |
| cuisine/region/tradition | **asserted** | cultural facts |
| course/occasion/season | **asserted** | usage conventions |
| official/heritage status | **asserted** + sourced | DGADR etc. |

Derived metadata can never drift from the recipe (it *is* the recipe), needs
no authoring, and improves retroactively when the deriver improves. Every
hand-typed field is a future inconsistency. This is the strongest payoff of
the enums-over-free-text rule.

### Proposed shape: `facets`, not `taxonomy`

```yaml
kind: bread            # behavioural — stays top-level, selects the profile
facets:                # everything below is browse/filter/presentation
  origin:              # asserted — country/region provenance of the dish
    country: PT
    region: alentejo
  cuisine: pt          # asserted, registry-backed
  diet_pattern: [mediterranean]   # asserted — dietary TRADITIONS/patterns
                       # (mediterranean, atlantic, nordic, plant-forward…);
                       # distinct from derived compatibility diets below
  course: [bread]      # asserted
  occasion: []         # asserted
  difficulty: 2        # asserted, 1–5
  heritage:            # OPTIONAL, nice-to-have — most recipes won't have it;
    status: documented # only meaningful for the documented-tradition subset
    register: dgadr    # (per review 2026-08-02: heritage is flavour, not core)
# derived at index time, never stored in the document:
#   time: {active: 45m, passive: 6h, span: same-day}
#   equipment: [forno, alguidar]
#   allergens: [gluten]
#   diets: [vegetarian]          ← compatibility (computable from ingredients)
#   techniques: [sourdough, double-ferment]
#   main_ingredients: [trigo, centeio]
```

Note the deliberate split inside "diet": **`diet_pattern`** (Mediterranean,
Atlantic, plant-forward…) is a cultural/nutritional *tradition* — asserted,
because no algorithm can decide a dish "is Mediterranean"; while
**compatibility diets** (vegan, vegetarian, gluten-free) remain *derived*,
because they are mechanical facts of the ingredient list. Conflating those
two kinds of "diet" is a common tagging mistake in recipe sites; keeping them
in different lanes preserves the asserted/derived integrity rule. Heritage is
explicitly an **optional** facet block — valuable for the documented-tradition
subset (DGADR breads), absent without penalty everywhere else.

**Presentation trees** (the shelves the app shows — "Pães do Alentejo",
"Fermentados de Inverno") are *projections over facets plus curation*, stored
as pack/collection documents that query or enumerate — never as fields inside
recipes. Renaming a shelf then touches zero recipes. This also answers
"categories, sub-categories, packs" from the original brief: categories are
facet queries; packs are curated documents; neither lives in the recipe.

---

## D. The DDD model — execution *is* a separate subdomain, and so are others

Modelling the whole product in DDD terms, with the existing code mapped in:

### Bounded contexts

```
┌─────────────────────┐   published    ┌──────────────────────┐
│  RECIPE CATALOG      │──recipes────▶│  EXECUTION (Kitchen)  │
│  (core domain)       │   (RCP)       │  (core domain)        │
│                      │               │                       │
│  Recipe (AR, vers.)  │               │  CookingSession (AR)  │
│  Variant/lineage     │               │  Timer, Measurement   │
│  VOs: Quantity,      │               │  ActualsRecord        │
│   Basis, Duration,   │               │  ═ today: BakeSession,│
│   Endpoint, Guard    │               │    ExecutionStep,     │
└──────┬──────────────┘                │    TimerRecord        │
       │ references                    └──────────┬───────────┘
       ▼                                          │ actuals feed
┌─────────────────────┐               ┌──────────▼───────────┐
│  REGISTRY            │               │  PLANNING             │
│  (supporting)        │               │  (supporting)         │
│  IngredientClass /   │               │  Fornada (AR),        │
│   Product (SPEC-007) │               │  ShoppingList,        │
│  StepPrimitive       │               │  MM prep aggregation  │
│   (SPEC-008)         │               │  ═ today: Fornada/    │
│  EquipmentProfile    │               │    FornadaItem        │
│  Units, Stages       │               └──────────────────────┘
└─────────────────────┘
┌─────────────────────┐               ┌──────────────────────┐
│  INGESTION           │──drafts────▶ │  PUBLISHING/HERITAGE  │
│  (supporting)        │   (ACL)      │  (core for the site)  │
│  ImportDraft (AR)    │              │  Provenance, sources, │
│  extractor pipeline  │              │  verification workflow,│
└─────────────────────┘              │  packs, CMS           │
                                      └──────────────────────┘
```

### The boundaries that answer the open questions

- **Execution is its own bounded context — confirmed by DDD reasoning, not
  preference.** Recipe (Catalog) and CookingSession (Execution) have
  different lifecycles (immutable-versioned vs append-only), different
  invariants (structural validity vs "one active timer per step"), different
  consistency needs (eventual vs local-now), different ubiquitous language
  (ingredient/step/basis vs reading/actual/phase). Two aggregates in
  different contexts ⇒ separate documents. The strawman's "current lean:
  separate" stops being a lean; it falls out of the model.
- **RCP is precisely the Published Language** (DDD pattern) between Catalog
  and every downstream context. That's the correct DDD name for what we're
  designing — not the internal model of any app, but the contract they share.
- **The existing iOS `RecipeSnapshot` (copy-on-reference, `payloadJSON`) is
  an Anti-Corruption Layer that already exists.** Execution never mutates
  Catalog recipes; it snapshots them at plan time. The architecture we'd
  design from scratch is the one SPEC-002/ADR-004 already built — strong
  evidence the boundaries are real.
- **Registry is upstream of everything** and changes on a slower clock —
  which is exactly why registry-backed vocabularies (open for growth, closed
  to invention) work: they're a separate context with their own review cycle.
- **Ingestion → Catalog crosses through an explicit ACL**: external formats
  (schema.org, screenshots) are translated into ImportDrafts and quarantined
  (`status: unverified`) until Publishing's verification workflow promotes
  them. The heritage archive's trust model *is* this context boundary.
- **Domain events** fall out naturally and are already half-implemented
  (iOS `LocalEvent` append-log): `RecipePublished`, `VariantForked`,
  `SessionStarted`, `ReadingRecorded`, `SessionCompleted` (→ Planning's
  calibration), `DraftImported`, `RecipeVerified`.

### What this changes in the strawman

1. Rename the effort: RCP is the **published language of the Recipe Catalog
   context** — one artifact among several, not the whole system's data model.
2. Execution documents (sessions/timers/measurements) get their own schema,
   versioned independently, referencing `recipe id + version`. The
   Measurement VO from the drinks research lives *there*, with only
   measurement *targets* in RCP (the hybrid from the earlier question —
   targets in the recipe, readings in the session).
3. Registries are documents of their own contexts with their own governance
   cadence — not appendices of the recipe schema.
4. The CMS question re-frames: Sanity is infrastructure of the
   Publishing/Heritage context, which **emits** the published language, and
   RCP need not be Sanity's internal model. That answers open decision 7
   structurally rather than by preference.

---

## E. Graphs and graph databases — think in graphs, store in documents, project the edges

Raised in review: *"would a graph DB make sense here, or thinking of it as
graphs?"* Splitting that into its three actually-different questions:

### E1. Is the domain graph-shaped? Yes — in at least seven places

| Graph | Nodes / edges | Where it lives today |
|---|---|---|
| Step DAG | steps/intermediates → `after` edges | inside one recipe document |
| Composition | recipe → component refs (version-pinned) | across documents |
| Lineage | recipe → `forked_from` / `variant_of` / family | across documents |
| Ingredient taxonomy | class hierarchy (`flour.wheat.t65`), class→product | Registry |
| Substitution relations | ingredient↔ingredient, gated by roles/context | Registry + per-recipe |
| Registry usage | recipe-version → every registry ref it uses | nowhere yet — the architecture review's missing reverse-index |
| Facet/pack membership | recipe ↔ facets ↔ packs | derived + curation docs |

So *thinking* in graphs is not optional — the model already is one, and the
academic prior art (SIMMR, recipe flow-graph corpora) treats a recipe as a DAG
outright. The design question is only about **storage and query**.

### E2. Should a graph database be the system of record? No

Four reasons, each sufficient alone:

1. **The unit of truth is the self-contained document.** Offline-first iOS
   requires a recipe that decodes with zero server help years later
   ("data outlives code"). A graph DB's value is *connected* data; our
   published artifact is deliberately *disconnected* — references resolved and
   embedded at publish time. Storing truth as a graph would mean
   re-materializing documents on every sync, inverting the architecture for
   no gain.
2. **Intra-recipe graphs are tiny.** A step DAG has dozens of nodes. Guard
   resolution, cycle checks and topological ordering are in-memory operations
   over one parsed document — microseconds in the Recipe Calculus, no query
   engine involved.
3. **Cross-recipe queries are modest and bounded.** Hundreds-to-thousands of
   recipes, lineage chains of depth <10, component nesting capped anyway (the
   architecture review recommends a depth cap). Postgres recursive CTEs over
   an edges table handle this scale trivially; we already run Postgres.
4. **Solo-maintainer ops.** Neo4j/Memgraph is a second database to run, back
   up, sync and learn a query language for — the same bus-factor argument
   that just made us narrow CUE's scope, applied to a much heavier dependency.

### E3. The right pattern: edges as a derived projection

DDD gives the clean answer: the graph is a **read model**, not the system of
record. On every `RecipePublished`/registry change, a projector extracts the
edges into one boring table:

```sql
CREATE TABLE rcp_edges (
  src_type text, src_id text, src_version int,
  edge     text,  -- 'uses-class' | 'component-of' | 'variant-of' |
                  -- 'forked-from' | 'substitutes' | 'in-pack' | 'uses-equipment'
  dst_type text, dst_id text, dst_version int
);
```

Because it is derived from immutable published documents, it can always be
rebuilt from scratch — no dual-write consistency problem. And it answers, in
plain SQL, every graph question the reviews raised:

- the **registry-usage reverse-index** (architecture review, P-medium): "which
  published recipes reference `flour.wheat.t65@v2`?" — one indexed lookup;
- blast radius of a registry correction — recursive CTE over `component-of`;
- lineage/family trees for the variant-drift CI alarm (`variant-of` closure);
- "recipes you can make with what you own" — join `uses-equipment`/`uses-class`
  against the user's profile;
- pack integrity — every `in-pack` target exists and is published.

The projector is ~100 lines; the table doubles as the DAG the CI linter walks
for cross-document cycle detection (in-document cycles stay in the Calculus).

### E4. Where a real graph engine could earn its keep — later, one context

The **substitution-knowledge / discovery** direction (FlavorGraph-style
ingredient embeddings, pairing suggestions, "what can I make with X")
is genuinely graph-native at a scale and query pattern where a dedicated
engine or graph library pays. Two things make deferral free:

- product discovery already gates that whole thread behind demand evidence
  (AT-2/AT-4);
- it would be a **separate supporting context** consuming published documents
  — so bolting a graph engine on *later* touches nothing in the core.

**Verdict:** model as graphs (already done — DAG, refs, lineage are the
schema), store as documents (the offline/published-language architecture
requires it), project edges into Postgres for every cross-recipe query
(solves the reverse-index gap as a side effect), and reserve graph engines
for the deferred discovery context if it ever earns its way in.
