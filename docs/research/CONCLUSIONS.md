# Conclusions — the recipe protocol brainstorm

Date: 2026-08-02. The capstone of the RCP brainstorm: six research tracks, a
strawman + executable schema, five deep-dives, five bok expert reviews, and
twelve confirmed decisions. This is what it all adds up to.

## 1. Build it — as two bets, only one on faith

- **RCP-as-convergence** (one published language replacing five recipe
  representations and three divergent baker's-% implementations) is justified
  by internal evidence alone. It pays even if nothing beyond bread ships.
- **RCP-as-expansion** (published non-bread content, packs, substitution
  catalog) is a founder hypothesis with zero customer evidence — kept, gated
  behind cheap tests (fake-door pack, past-behaviour interviews).

Every review that touched this split independently confirmed it.

## 2. The fundamentals are settled and survived expert attack

The load-bearing five of the twelve decisions in `DECISIONS.md`:

1. **Ingredients are rows with functional roles**, never named struct fields.
   Roles are what make substitution, safety checks and translation computable.
2. **`basis`** generalizes baker's percentage to every domain — flour %,
   brine %, cure ppm, brew ratio, cocktail parts are one mechanism.
3. **Steps form an opt-in DAG anchored on produced intermediates** — linear
   recipes stay a numbered list; preferment chains, entremet assembly and
   optional paths (autolise) become expressible.
4. **Enum/registry/prose field discipline** — anything a machine reads is a
   closed enum or a registry reference; prose only for human eyes.
5. **Safety-critical quantities are bounded data**, enforced fail-closed
   client-side at cook time — scaling and substitution may not violate them.

Confirmed boundaries: one small core + per-category profiles (cross-category
composition demands the shared core); documents as system of record with
edges projected to Postgres (no graph DB); execution state in separate
session documents (targets in the recipe, readings in the session); RCP as
the Published Language of the Recipe Catalog context; JSON canonical, YAML
authoring, JSON Schema + semantic linter validating BE/CI-side only.

## 3. v1 shape — changed by the consumer reframe

**v1 = core schema + bread profile + ingestion pipeline + private collection.**

Daniel is product owner + consumer: he ingests recipes from his cookbooks and
cooks from them. Ingestion (book photo → LLM extraction → review-and-correct
→ private unverified recipe → cook with full machinery) was deferred in the
original discovery verdict and is now the primary v1 content path. Authoring
ergonomics belong to the site/CMS context. Heritage is optional metadata;
origin and `diet_pattern` carry the value. Imported book recipes are
personal-use only — the private-vs-published boundary is first-class.

## 4. Three engineering obligations before real code

1. **Recipe Calculus** — scale, basis resolution, guard-path selection,
   constraint enforcement, re-estimation as pure functions specified once,
   with cross-stack conformance test vectors shipped in the published
   language. Without it, TS/Swift/Go each hand-write the logic and drift —
   the disease RCP exists to cure.
2. **Decode-compatibility contract** for offline snapshots, CI-tested:
   unknown-field tolerance, enum catch-alls, no new required fields without
   defaults. The one bug class unfixable after the fact.
3. **Verified publish-time reference resolution** (resolver_version +
   content hashes): a resolver bug ships silently into immutable offline
   documents with no repair path.

## 5. The critical v1 risk: A11 × A5

Extraction quality meets safety bounds. An LLM misreading a salt quantity
from a book photo is exactly the failure the fail-closed constraints must
catch. First real-world test: the **ingestion dogfood** — photograph recipes
from Daniel's actual books, measure extraction accuracy and time-to-correct,
verify that errors on safety-relevant quantities are refused.

## 6. Deliberate non-goals

No runtime LLM (breaks offline, unreviewable, unsafe). No automatic
substitution (authored/curated only; LLM drafts, humans review). No numeric
encoding of sensory judgment (per-step media is the honest answer). No
Turing-complete formulas in data. No publishing of imported book content.

## 7. Natural next steps

1. Daniel reads the four bok reviews → releases the held gates (ICP store,
   personas promotion, the three DECISIONS corrections).
2. Turn strawman + decisions into SPEC-009 + ADRs (validation stack, Recipe
   Calculus, compatibility contract, enforcement point).
3. Run the ingestion dogfood (AT-3) before building much — it tests the
   riskiest assumption for the least money.
4. Prototype the renderer + Calculus against the six validated example
   recipes.
