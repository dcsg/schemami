# Product Discovery Kickoff — Universal Recipe Protocol (RCP)

> **ERRATUM (2026-08-02, post-review):** This analysis was fed the four
> personas (Tomás, Inês, Daniel, Marco) as if they were RCP personas. They are
> **Fornada-app personas**; no personas have been defined for RCP. Everything
> persona-anchored here is affected: the customer-segment framing, assumption
> A1's "existing users / diaspora" wording, and test AT-4 ("five diaspora
> interviews"). The structural conclusions stand (two-bet split, convergence
> core vs gated expansion, safety assumption A5), but **A1 and the test plan
> must be re-grounded after an RCP-specific ICP/persona exercise** (bok `icp`
> playbook is the natural tool). Until then, treat segments named here as
> placeholders, not research.

- **Playbook:** `product-discovery-kickoff` (team: product-researcher)
- **Run ID:** `019fc26f-a88c-7bb4-a950-104ece3659e1`
- **Date:** 2026-08-02
- **Status:** analysis complete — **NOT stored, NOT marked completed**. Awaiting Daniel's review (standing Step-4 gate).
- **Discovery question:** *Should we build the universal recipe protocol, and what must be true for it to be worth it?*

## KB grounding used

- **Continuous Discovery Habits** (Teresa Torres) — assumption categories (desirability, viability, feasibility, usability, **ethical**), story-map assumption generation, assumption mapping (David J. Bland's "leap of faith" prioritization: importance × evidence), "smallest assumption test the team will act on", success criteria defined upfront, past-behavior-not-future-intent question rule, OST structure (outcome → opportunities → solutions → assumption tests), parent/child/sibling opportunity rules, "show your work" stakeholder management.
- **Product-Led Onboarding** (Ramli John, on Christensen's JTBD) — customer jobs are solution-agnostic; functional/emotional/social components; four progress-making forces (push, pull, anxiety, inertia).
- Concept syntheses: `Opportunity Solution Tree`, `Continuous Discovery`, `Assumption Test`, `Job To Be Done`, `Prototype`.
- `get_prior_artifacts("recipe-protocol")` — none; this is the first analysis of this target.
- Project evidence: `FINDINGS.md`, `DECISIONS.md`, `README.md` (research spike, 6 tracks, strawman + validating schema).

A note on frame, before the frameworks: the discovery question as posed is
solution-first ("should we build the protocol?"). Torres's warning applies —
customers don't hire protocols. The analysis below therefore keeps two threads
separate throughout: **RCP-as-internal-architecture** (converging five recipe
representations — an engineering decision, judged on cost) and
**RCP-as-product-expansion** (non-bread categories, substitutions, import,
packs — a product bet, judged on customer evidence). The research spike is
excellent evidence for the first thread and contains **zero customer evidence**
for the second. That asymmetry drives everything that follows.

---

## 1. Four-risk assessment (plus Torres's fifth)

### Value / desirability — **HIGHEST RISK**

*Does anyone want it?*

- No user has asked for pastry, ferments, drinks or coffee from this product.
  The four canonical personas were built around bread; the research spike
  proves non-bread categories are *encodable*, not *wanted*. This is the
  classic gap Torres flags: strong feasibility evidence masquerading as a
  validated idea.
- The strongest desirability signal that *does* exist is indirect and
  heritage-shaped: **pastéis de nata** (already an example recipe) is a
  first-order Portuguese heritage item that the current bread-only model
  cannot hold at all — it forces core + profiles + cross-category
  composition. The honest desirability claim is not "users want a universal
  recipe app" but "the heritage archive is incomplete without doçaria
  conventual, broa companions, licores, conservas — and users who came for
  heritage want the rest of the table." That claim is plausible and untested.
- Substitution desirability is better supported by persona logic: Tomás and
  Marco *definitionally* lack Portuguese flours/ingredients abroad
  (memory: flour types always explicit — T65/T80/T130; those don't exist on
  a US or German shelf under those names). Method-changing substitution is a
  direct answer to their core job. Still persona logic, not evidence.
- Import-from-URL/screenshot desirability is unknown and sits awkwardly
  against the archive's verified-provenance ethos (imports land unverified).

### Usability — **HIGH RISK, and it's authoring, not cooking**

*Can they use it?*

Two distinct user surfaces:

1. **Authoring** (near-term users: Daniel, later contributors). Op-list
   substitution deltas anchored to step slugs, guards, options, DAG `after`
   edges, scaling tags — FINDINGS itself calls the variant explosion's "real
   cost: authoring discipline" and substitution deltas "the most novel, least
   battle-tested part of the whole idea." If authoring one honest recipe with
   two substitutions takes a day, the protocol dies of content starvation
   regardless of schema quality.
2. **Cooking.** Mostly de-risked in principle by design choices already made:
   DAG is opt-in (linear recipes stay numbered lists), sensory endpoint stays
   primary over Q10 time estimates, guided execution already exists for bread.
   Residual risks: rendering a method *delta* comprehensibly ("you chose agar:
   step 4 changes, step 5 is new"), and false-precision perception on
   temperature-adjusted times.

### Feasibility — **MEDIUM-LOW RISK (the spike's job, and it did it)**

*Can we build it?*

- The spike is genuinely strong here: 6 recipes across 5 categories validate
  against a real JSON Schema; the easy list (typed rows, basis ratios,
  duration windows, step→ingredient links, provenance, codegen) is
  battle-tested prior art (BeerJSON, Tandoor/Mealie convergence, SPEC-007/008
  already shipped in production).
- Residual feasibility risk concentrates in exactly three places: (1)
  method-changing substitutions surviving recipe edits + conflict detection —
  novel, nobody has shipped it; (2) non-linear scaling semantics — genuinely
  novel, every rule needs a domain expert; (3) ingredient-line parsing on
  import — mitigated by draft-status + preserved `raw` + human gate.
- Torres's wider feasibility framing ("what's feasible for our *business*")
  pulls in registry governance: FINDINGS marks it "a process problem, not a
  schema problem — unsolved."

### Viability — **HIGH RISK for the full vision, LOW for the convergence core**

*Should we build it? Does it return more than it costs?*

- The cost side is understated by the strawman's framing: RCP-full is not one
  deliverable but at least four ongoing products — the schema, the
  registries (with governance), the substitution catalog (FINDINGS: "a second
  product to maintain"), and per-category content authoring. For a solo
  builder also carrying Fornada hardening (approved plan, waves 0–5), the CMS
  migration, and the heritage archive, opportunity cost is the dominant term.
- The return side has one solid, quantifiable component: killing five
  independent recipe representations and three divergent baker's-percentage
  implementations. That return is captured by **core + bread profile alone**
  and does not depend on any non-bread desirability bet.
- Brand viability: memory rules say Fornada is a separate brand and the site
  is heritage-archive-voice only. "Universal recipe platform" fits neither
  cleanly. A heritage-scoped expansion (Portuguese doçaria, conservas,
  licores) fits the site; general cocktails/coffee fit at most Fornada.
  Category scope is a brand decision as much as a schema decision.
- Loss-leader framing (Torres allows it) is the honest one for RCP: the
  protocol earns nothing directly; it must be justified by maintenance cost
  reduction + heritage completeness + optioning future categories.

### Ethical / safety — **REAL AND UNUSUAL FOR A RECIPE APP**

Torres: most teams' blind spot. Here it is concrete and physical:

- A naive scaler or substituter can silently produce an **unsafe** ferment or
  cure: 2% minimum brine, nitrite 120–625 ppm by category, pH < 4.6/4.0,
  bottle-bomb pressure. These must be enforced, fail-closed data — DECISIONS
  #8's BE/CI-only validation posture covers published recipes, but scaling
  happens *client-side at cook time*, so safety bounds must ship inside the
  document and clamp in the renderer too.
- Q10 fermentation-time models oversold as precise mislead cooks — FINDINGS
  already takes the honest posture (estimate + sensory endpoint primary).
- Import: copyright of scraped recipes, and provenance integrity — an
  unverified imported draft must never visually pass as verified heritage
  (the site's `confidence`/`verified` model is the existing answer; RCP must
  carry it, and does).
- LLM-drafted substitutions shipping unreviewed is already forbidden by
  DECISIONS #9 — keep that line hard.

---

## 2. Customer segments

| Segment | Persona | Phase | Relationship to RCP |
|---|---|---|---|
| Diáspora heritage baker | **Tomás** | 1 (now) | Strongest substitution job (Portuguese ingredients unavailable abroad). Bread-first; non-bread heritage (nata, doçaria) plausibly wanted — untested. |
| Lisboa home baker | **Inês** | 1 (now) | Scaling-to-equipment + guided execution jobs, already partly served for bread. Marginal gain from "universal"; real gain from more Portuguese repertoire. |
| International enthusiast | **Marco** | 2 | Substitution + unit/regional translation jobs. Most likely to bring non-Portuguese recipes in (import). |
| Micro-padeiro | **Daniel-persona** | 3 | Batch scaling with non-linear semantics (fermentation doesn't scale with batch size), production packs. Furthest out; don't design v1 for him. |
| **Implied-but-unvalidated**: home fermenter, coffee/cocktail hobbyist | — | none | The "universal" categories serve segments the product has **no persona, no channel, and no evidence for**. Flag: building for them now is building for nobody in particular. |
| Founder-as-user | Daniel (real) | now | The archive-completeness job ("encode all of Portuguese food culture") is genuinely his. Legitimate — this is a mission-driven project — but must be labeled as founder vision, not customer demand. |

**Best-fit early segment** (Torres: filter opportunities by outcome-driving
segments): existing bread users (Tomás + Inês) extending into *adjacent
Portuguese heritage food* — not new categories for new audiences.

## 3. JTBD framing

Jobs are solution-agnostic; none of these mention a protocol.

- **Tomás (functional):** "When saudade hits and I can't buy Portuguese
  flour/ingredients where I live, help me faithfully reproduce the breads and
  sweets of home with what my local shop sells, without ruining them."
  *Emotional:* keep a living connection to home. *Social:* be the one who
  brings real Portuguese food to the table abroad. → hires **authored
  substitutions with method deltas** + explicit flour-class mapping.
- **Inês (functional):** "When I bake in a small Lisbon kitchen, fit the
  recipe to my pans, my schedule and my oven, and keep me on track
  mid-bake." → hires **scaling with correct semantics + guided execution**
  (bread version already exists; RCP generalizes it).
- **Marco (functional):** "When a Portuguese recipe assumes local units,
  ingredients and equipment, translate it to my context without dumbing it
  down." *Social:* credibility among enthusiast peers. → hires
  **substitution + equipment profiles + unit handling**.
- **Daniel-persona (functional, phase 3):** "When I scale a formula from 2 to
  40 loaves, keep the ferment honest and the timings real." → hires
  **non-linear scaling + production view**.
- **Founder job:** "Preserve Portuguese food heritage machine-readably, with
  provenance, before it's lost." → hires **the protocol itself**. The only
  job for which RCP is directly the hired product.

**Four forces on the expansion bet** (Ramli John/Christensen): push — recipes
for non-bread items live in books/screenshots with no scaling or guidance;
pull — one trusted place for the whole Portuguese table; anxiety — "will a
bread app do doçaria justice?"; inertia — existing books/blogs/YouTube are
good enough for occasional non-bread cooking. The inertia force is strong and
is exactly what a fake-door test measures.

## 4. Opportunity solution tree

**Root split** — two trees, deliberately, matching the two threads:

### Tree A — enabling/engineering outcome
**Outcome A: one validated recipe representation powers all three surfaces
(site, web, iOS), eliminating triple-implemented recipe math.**

- **O-A1** Five representations, three baker's-% implementations drift apart
  *(evidence: codebase inventory — strong)*
  - S-A1.1 RCP core schema + quicktype→TS/Swift codegen → AT: encode 3
    existing bread recipes, render in one surface with zero information loss
  - S-A1.2 Sanity emits RCP (vs Sanity-native shapes) → AT: model one recipe
    in a Sanity prototype, diff the emitted document
- **O-A2** Site provenance model is gold but trapped in site-only types
  - S-A2.1 provenance/confidence/verified as core RCP blocks (already in
    strawman) → AT: alentejano.rcp.yaml round-trip (done — passed)

### Tree B — product outcome
**Outcome B: existing users return more often because the product covers more
of their Portuguese food life than bread.** *(candidate metric: repeat
sessions/user/month on non-bread content among existing users)*

- **O-B1** "I can't make it faithfully — I can't get the ingredients here"
  (Tomás, Marco) *(evidence: persona logic, moderate)*
  - S-B1.1 Author-curated per-recipe substitutions with method deltas →
    AT-1 (below)
  - S-B1.2 Flour-class → local-equivalent mapping tables → AT: 5 diaspora
    interviews on actual past workarounds
- **O-B2** "The archive stops at bread; the Portuguese table doesn't" (nata,
  doçaria, conservas, licores) *(evidence: none — founder hypothesis)*
  - S-B2.1 Heritage packs (Doçaria Conventual, Conservas) → AT-2 fake door
  - S-B2.2 One real non-bread category shipped end-to-end (pastry profile)
    → gated on AT-2
- **O-B3** "Recipe quantities don't fit my pans/batch/equipment" (Inês)
  - S-B3.1 Scaling-basis + per-quantity scaling tags → AT: paper-prototype
    r² pan scaling with 5 users; do they trust/understand the adjusted time?
- **O-B4** "My non-archive recipes live in screenshots" (Marco strongest)
  - S-B4.1 URL/screenshot → unverified draft → AT: past-behavior survey
    ("last time you cooked from a screenshot?") before building anything
- **O-B5** "I lose track mid-cook on multi-component recipes" (nata = dough
  ∥ custard ∥ syrup)
  - S-B5.1 DAG-aware guided execution → AT: clickable prototype of nata
    execution, opt-in graph, linear default

Tree A is justified today. Tree B's O-B2 — the load-bearing expansion
opportunity — currently hangs from an evidence-free root and gets the first
test.

## 5. Prioritized assumption backlog

Bland/Torres mapping: priority = importance × (lack of) evidence.
**Leap-of-faith assumptions first** — the ones that kill the idea if false.

| # | Assumption | Category | Evidence today | Kills what if false | Test |
|---|---|---|---|---|---|
| A1 | Existing users (Tomás/Inês types) want non-bread Portuguese heritage content from *this* product enough to return for it | Desirability | **None** (founder hypothesis) | The entire expansion thread (Tree B / O-B2); RCP shrinks to internal refactor | AT-2 fake door + past-behavior survey |
| A2 | A competent author can encode a real recipe with 2–3 method-changing substitutions in hours, not days, and it survives an edit | Usability (authoring) + Feasibility | Schema validates; op-list design untested by any author | Substitution as a product capability; catalog dreams | AT-3 authoring dogfood |
| A3 | Rendered method deltas are followable mid-cook by a non-expert | Usability | None | S-B1.1 value delivery | AT-1 substitution walkthrough |
| A4 | Substitution is what diaspora users actually do (vs. suitcase imports, online Portuguese grocers, or just not baking) | Desirability | Persona logic only | O-B1 sizing | AT-4 five Mom-Test interviews on *past* workarounds |
| A5 | Safety bounds can be enforced fail-closed through scaling AND substitution in the client renderer, not only BE/CI | Ethical + Feasibility | Bounds encoded in examples; no clamp implementation | Ship-ability of ferments/cures categories at all | AT-5 engineering spike: adversarial scale/substitute a kraut + cure recipe |
| A6 | RCP core + codegen actually replaces (not joins) the five representations at acceptable migration cost | Viability (eng) | Strong spike evidence, unproven end-to-end | Tree A payback | AT-6 vertical-slice spike |
| A7 | Registry + substitution governance fits a solo maintainer (per-recipe subs only, no global catalog at v1) | Viability | FINDINGS flags unsolved | Long-term sustainability | Decision + 3-month authoring-load observation, not a test |
| A8 | Linear recipes stay dead-simple; DAG complexity invisible until needed | Usability | Design intent (`after` opt-in) | Everyday UX for 90% of recipes | Covered inside AT-1/AT-3 prototypes |
| A9 | Import-to-draft is wanted despite landing unverified (and doesn't pollute heritage trust) | Desirability + Ethical | None | O-B4 | Past-behavior survey first; build nothing yet |
| A10 | Non-linear scaling rules (r² pans, sublinear yeast, non-scaling ferment time) can be authored correctly per domain | Feasibility | Research-only; nobody has shipped | O-B3 depth (simple linear scaling still works without it) | Expert-review of 5 authored rules during AT-3 |

## 6. Prototype plan

Torres: smallest test the team will act on; success criteria agreed upfront;
5–10 users beats a big survey; simulate the experience, evaluate behavior.

| ID | What | Tests | Shape & effort | Success criteria (set now, before running) |
|---|---|---|---|---|
| **AT-2** | **Fake-door heritage pack** — "Doçaria Conventual" / "Conservas" teaser on /receituario + Fornada surface; plus one-question past-behavior survey to existing users ("What was the last non-bread Portuguese thing you cooked from a recipe?") | A1 | Days. Static tile + interest capture. No schema work needed. | ≥8% of unique visitors click through; ≥30% of survey answers name a concrete non-bread item cooked in the last month. Below both → the expansion waits; RCP proceeds as Tree A only. |
| **AT-3** | **Authoring dogfood** — extend the 6 example recipes to 12, deliberately including the worst cases (choux `to_consistency`, entremet DAG, backslopped ferment, batched cocktail dilution, one Bimby fork); Daniel + one non-author encode 3 each from prose | A2, A8, A10 | ~1 week, schema exists already | Median ≤3h/recipe with substitutions; 0 cases where an edit silently breaks a delta; non-author succeeds without schema-author help on ≥2 of 3. |
| **AT-1** | **Substitution walkthrough prototype** — clickable (spec-to-clickable-prototype playbook), Tomás scenario: "no T65 where you live" → swap → method delta rendered inline; unmoderated test, 5–8 diaspora/enthusiast bakers | A3, A8 | ~1 week after AT-3 stabilizes one recipe | ≥70% of testers correctly state, unprompted, what changed in the method; 0 testers miss that a step was inserted. |
| **AT-4** | **Five Mom-Test interviews** (customer-interview-guide playbook) with diaspora bakers — past workarounds for missing ingredients only; no pitching | A4 | Parallel, ongoing (Torres: 1 interview/week habit) | ≥3 of 5 describe a concrete recent substitution attempt or abandonment. |
| **AT-5** | **Safety clamp spike** — implement fail-closed bounds for one kraut + one cure recipe; adversarially scale ×10/÷10 and apply substitutions | A5 | 2–3 days | No path produces an out-of-bounds recipe rendered without a hard block. |
| **AT-6** | **Vertical-slice migration spike** — RCP doc → quicktype TS+Swift → render Pão Alentejano in web /calculador from RCP with zero information loss + identical math to current implementation | A6 | ~1 week | Pixel/valor-identical output vs. current implementation; type sync is generated, not hand-written. |

**Sequencing:** AT-2 + AT-4 start immediately (they gate the expansion thread
and cost almost nothing). AT-3 next (it gates everything substitution-shaped).
AT-1 after AT-3. AT-5/AT-6 are engineering spikes, parallel anytime.
Explicitly **not** proposed: building profiles for drinks/coffee, the global
substitution catalog, or import — all downstream of failed-or-passed gates
above.

## 7. Stakeholder map

Solo-builder project — the map is about hats and external authorities, not
org politics. Torres's "show your work" rule still applies to future-Daniel
and any future contributor: the OST + this backlog are the shareable
artifacts.

| Stakeholder | Stake in RCP | Risk if ignored |
|---|---|---|
| Daniel — product/vision | Heritage archive completeness; the founder job | Vision drives scope past evidence (A1 unguarded) |
| Daniel — engineering | Five-representations pain; Fornada hardening + CMS already queued | RCP becomes a sixth representation; opportunity cost sink |
| Daniel — content author | Bears 100% of authoring-discipline cost (variants, registries) | A2/A7 failure = content starvation |
| Personas (Tomás, Inês, Marco, micro-padeiro) | Proxy customers per phase | Designing for implied segments with no persona (fermenters, baristas) |
| Heritage source authorities (DGADR primary, regional tourism boards) | Provenance chain; archive credibility | Unverified imports diluting verified heritage |
| Brand surfaces: paodeportugal.pt vs Fornada | Different voice laws (memory: no bakery leakage; separate brands) | "Universal" categories landing on the wrong brand |
| Sanity CMS decision (planned) | RCP-as-content-model vs Sanity-emits-RCP (open decision 7) | Editor build churn if decided late |
| Future contributors | Registry governance (open decision 6) | Vocabulary rot or gatekeeping collapse |
| Recipe rights-holders (import sources) | Copyright, licence fields | Legal + ethical exposure on import |
| Cooks' physical safety | Brine/nitrite/pH/pressure bounds | The one stakeholder a bug can hospitalize |

## 8. Answer to the discovery question

**Build the convergence core now; gate the universal expansion on evidence.**

What must be true for RCP to be worth it, in order of how likely it is to be
false:

1. **A1** — existing users want non-bread heritage content from this product
  (or the founder-archive job is consciously accepted as sufficient
  justification for heritage categories, with metrics honesty).
2. **A2** — method-changing substitutions are authorable at sane cost by a
  human, and survive edits.
3. **A5** — safety bounds hold fail-closed through every scale/substitute
  path, client-side included.
4. **A6** — the core actually replaces the five representations instead of
  joining them.
5. **A7** — governance scope stays solo-sized: per-recipe substitutions
  first, global catalog deferred, registries curated by one person.

Points 4 and 5 align with FINDINGS' own recommendation (core + bread profile
first) and DECISIONS' still-open v1-scope item. Nothing in this analysis
contradicts the 10 locked decisions; it sequences them behind evidence.

---

## Ready to store (pending Daniel's approval — do not execute)

After review, complete the run with `store_artifact` followed by
`get_playbook_run(run_id, status="completed", artifact_ids=[...])`.
Field names below follow the observed playbook conventions
(`artifact_type` / `team` / `target`); verify against the live
`store_artifact` schema when executing.

```json
{
  "artifact_type": "product-discovery-kickoff",
  "team": "product-researcher",
  "target": "recipe-protocol",
  "title": "Product Discovery Kickoff — Universal Recipe Protocol (RCP)",
  "run_id": "019fc26f-a88c-7bb4-a950-104ece3659e1",
  "summary": "Discovery question: should we build the universal recipe protocol (RCP), and what must be true? Verdict: build the convergence core (RCP core + bread profile, replacing five independent recipe representations) now; gate the universal expansion (non-bread categories, substitution catalog, import, packs) on evidence. Riskiest assumptions, in order: (A1) existing users want non-bread heritage content from this product — zero customer evidence, founder hypothesis; (A2) method-changing substitutions are authorable at sane cost — most novel, least battle-tested part; (A5) safety bounds (brine %, nitrite ppm, pH, pressure) enforce fail-closed through client-side scaling and substitution; (A6) RCP replaces rather than joins the existing representations; (A7) registry/substitution governance fits a solo maintainer. First tests: AT-2 fake-door heritage pack + past-behavior one-question survey (days, gates the whole expansion thread), AT-4 five Mom-Test diaspora interviews on past substitution workarounds, AT-3 authoring dogfood extending the 6 example recipes to 12 worst-cases with a non-author encoding 3. Frameworks: Torres five-category risk assessment and assumption mapping (Bland), JTBD (Christensen via Product-Led Onboarding), dual opportunity solution tree (enabling/engineering outcome vs product outcome), prototype plan with upfront success criteria, stakeholder map. Full analysis: docs/product/research/recipe-protocol/reviews/bok-product-discovery.md",
  "syntheses_used": ["Opportunity Solution Tree", "Continuous Discovery", "Assumption Test", "Job To Be Done", "Prototype"]
}
```
