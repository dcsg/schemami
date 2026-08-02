# ICP & Persona Builder — RCP (Universal Recipe Protocol)

- **Playbook:** `icp` (team: product-researcher), audit mode — "audit what the
  product already targets", grounded in project files, not a blank brief.
- **Run ID:** `019fc287-6a45-79aa-a460-4feaabaf8795`
- **Date:** 2026-08-02
- **Status:** analysis complete — **NOT stored, NOT marked completed**.
  Awaiting Daniel's review (standing Step-4 gate).
- **Trigger:** erratum on discovery run `019fc26f-a88c-7bb4-a950-104ece3659e1`
  — the four project personas (Tomás, Inês, Daniel micro-padeiro, Marco) are
  **Fornada-app personas**, not RCP personas. RCP had no actor set defined.
  This run builds it.

> **COURSE CORRECTION (Daniel, 2026-08-02, applied mid-run):** heritage is a
> **nice-to-have, not the core** of RCP's ICP framing. The centre of gravity
> is **practical cooking jobs** — scaling, substitutions, guided execution,
> reliable results, dietary needs/patterns (e.g. Mediterranean diet) — with
> **origin and rich metadata generally** as interesting attributes of recipes
> and of what users seek; heritage/origin is an optional flavour dimension
> some personas value. Consequences applied throughout: (1) cook personas are
> motivated by practical jobs first; (2) the heritage-archive author/verifier
> actors remain but as a **supporting actor class**, not the centre;
> (3) assumption A1 is re-framed from "users want non-bread *heritage*
> content" to the broader "users want non-bread recipes with rich metadata
> (origin, diet pattern)", with heritage as one optional variant arm of the
> test. Additionally: diet **patterns** (Mediterranean, Atlantic,
> plant-forward, …) are **asserted** facets — distinct from **derived**
> compatibility diets (vegan/GF, computed from ingredients per DECISIONS
> #10). Sections below reflect the corrected framing; the persona formerly
> keyed `rcp.cook.heritage-home` is now `rcp.cook.home-cook`.

> **COURSE CORRECTION 2 (Daniel, 2026-08-02, applied mid-run — larger than
> the first):** for RCP, **Daniel is a consumer, not a creator** — his words:
> *"I am more on the consumer than on the creator. I can ingest recipes from
> books and that's it,"* and, clarifying: *"I am just the product owner, I
> have a pretty good idea how this can help me and others."* Consequences
> applied throughout:
> (1) **No founder persona exists.** Daniel appears in the **stakeholder
> map** as product owner (vision holder, prioritiser); as a user he is one
> **n=1 dogfood instance** of the general consumer/ingester persona — not a
> distinct persona key. `rcp.author.founder-archivist` is removed.
> (2) **Ingestion is promoted to v1-core** — the pipeline
> photo/book-page/link/screenshot → vision-LLM extraction → review-and-
> correct UX → **unverified private personal recipe** is the primary v1
> content path. This is an explicit **revision of the discovery verdict**,
> which had deferred import behind AT-2/AT-4 gates ("build nothing yet");
> private-collection ingestion no longer waits. Published/verified import
> remains gated.
> (3) Hand-authoring YAML recipes is **not an RCP-core job**; the
> heritage-archive authoring path belongs to the **paodeportugal.pt site
> context** (supporting, adjacent), staffed today by the product owner.
> (4) **A2 (authoring cost) demotes for v1.** The analogous v1 assumption is
> **A11: extraction quality + correction cost**; AT-3 is re-framed from
> authoring dogfood to **ingestion dogfood** (photograph N real recipes from
> owned cookbooks; measure extraction accuracy and time-to-correct).
> (5) **Private-collection vs published is a load-bearing distinction** —
> copyright: book recipes may be ingested for personal use but must never be
> publishable; ingested recipes are private by default and can never
> silently become published/verified.
> A new evidence level **n=1 dogfood** is added below: founder self-evidence
> is a real signal but not validation of a broader class.

## Grounding used

- **Prior artifacts** (`get_prior_artifacts` on "RCP — product discovery" /
  "rcp-product-discovery"): product-discovery-kickoff + its erratum. Structural
  conclusions carried forward: two-bet split (convergence core vs gated
  expansion), assumption backlog A1–A10, tests AT-1…AT-6.
- **Project evidence:** `FINDINGS.md`, `DECISIONS.md`, `README.md`,
  `reviews/bok-product-discovery.md`; Fornada persona memory
  (`project_personas_jtbd.md`, scope-corrected 2026-08-02) cited strictly as
  **adjacent evidence**.
- **KB (Dunford, *Obviously Awesome*):** actionable segmentation goes beyond
  demographics — it lists the identifiable characteristics that make someone
  *care a lot*; target as narrowly as near-term objectives allow; and the
  gate that dominates this whole exercise: *"This positioning process assumes
  you have enough happy customers to see a pattern… Until you can see that,
  you will want to hold off on tightening up your positioning."* RCP has zero
  external customers → every external ICP claim below is provisional by
  method, not by accident.
- **KB (Ramli John / Steli Efti, *Product-Led Onboarding*):** ICP = a list of
  specific attributes an account needs to *succeed* with the product (size,
  role, maturity, goal, current workaround, #1 blocker, #1 buy trigger).
- **KB (Torres, *Continuous Discovery Habits*):** research findings are
  evidence, not truths; ask about specific past behaviour, never future
  intent; assumption mapping = importance × evidence; provisional personas
  are legitimate **only** when labeled as hypotheses with a validation path.
- Concept syntheses available in this KB for `Persona` and `Job To Be Done`
  are thin (engineering-library slant); the passage-level Dunford/Torres/John
  material above is the real grounding.

## Frame: a protocol has actor classes, not one customer

RCP is not a consumer product; it is infrastructure consumed by four surfaces
(paodeportugal.pt, /calculador, Fornada iOS, planned Sanity CMS) and operated
by people in distinct roles. Auditing "what the product already targets"
therefore yields a **two-part ICP** (who the protocol serves as
infrastructure; who the expanded product would serve) and a persona set
organized by **actor class**: cook/executor, **ingester** (v1-core, per
correction 2), editorial verifier, recipe author (site-context supporting),
registry steward, surface engineer. The Fornada personas cover fragments of
exactly one class (cooks, bread only); every other class was previously
implicit.

**Product-owner placement (correction 2/3):** Daniel is a **stakeholder**,
not a persona — product owner: vision holder, prioritiser, first dogfooder.
Where he uses the product, he is an n=1 instance of the general
consumer/ingester personas below. Personas describe "me **and others**" —
the broader user classes.

Evidence vocabulary used throughout (per the erratum's requirement):

- **validated** — observable in the repo/product today, or a real person
  doing the job today.
- **n=1 dogfood** — the product owner's own stated behaviour/need; a real
  signal ("if I have this problem, others have it" is already project
  precedent) but not validation of the broader class.
- **adjacent-evidence** — supported by Fornada-scope personas/features or by
  the research spike's domain findings; suggestive, not confirmatory for RCP.
- **pure hypothesis** — no evidence; founder reasoning; must not drive scope
  until tested.

---

## 1. ICP definitions

### ICP-1 — Infrastructure ICP (the convergence bet) — **validated**

*The ideal "account" for RCP-as-protocol:* a multi-surface food-content
ecosystem that (attributes, per Efti's list):

| Attribute | Value here | Evidence |
|---|---|---|
| Surfaces consuming recipes | ≥3 shipping (site, web, iOS) + 1 planned (CMS) | validated (codebase) |
| Current representations | 5 independent, zero shared types; baker's-% implemented 3× | validated (01-codebase-inventory) |
| Editorial model | verified-provenance heritage workflow (sources/testemunhos/divergencias/confidence/verified) | validated (shipped on site) |
| Team size | solo maintainer, competing priorities (Fornada hardening, CMS) | validated |
| Content store | git + YAML today; Sanity planned | validated |
| Primary v1 content path | **ingestion**: photograph/import recipes from owned cookbooks → vision-LLM extraction → review/correct → private unverified recipe (correction 2 — promoted to v1-core) | n=1 dogfood (product owner's stated behaviour) |
| Goal (what "success" means) | one validated representation, codegen'd types, zero client-side validation; a usable private collection ingested from books | validated (DECISIONS #8) + n=1 dogfood |
| #1 blocker (v1) | opportunity cost + **extraction quality / time-to-correct (A11)**; authoring discipline (A2) demoted to the site-context authoring path | validated concern, unresolved |
| #1 buy trigger | pain of triple-maintained recipe math; recipes trapped in physical books | validated / n=1 dogfood |

There is exactly **one** account matching ICP-1 today: this project. That is
not a defect — it is the honest statement of who RCP v1 is for. Dunford's
best-fit test ("who loves it, buys fast, never churns") is satisfied
internally: the ecosystem's own surfaces are the raving-fan customer of the
convergence core. Any future "RCP as open standard for third parties" ICP is
**pure hypothesis** and deliberately out of scope here.

### ICP-2 — Expansion ICP (the product bet) — **pure hypothesis, pending AT-2/AT-4**

*(Re-framed per the course correction: practical jobs are the core;
origin/heritage is one metadata dimension, not the motivation.)*

*The best-fit cook segment if the universal expansion proceeds:* **cooks
already using the ecosystem for bread who want the same practical machinery
— correct scaling, trustworthy substitutions, guided execution, reliable
results — for more of what they cook, and who value recipes carrying rich
metadata: origin, diet pattern (e.g. Mediterranean diet), allergens,
technique, equipment fit.** NOT "everyone who cooks", NOT new categories for
new audiences. Identifiable "cares-a-lot" characteristics (Dunford:
characteristics, not demographics):

- already returns to the site//calculador/Fornada for bread (the only
  observable behaviour we have) — i.e. has demonstrated they value
  precision/guidance machinery over plain recipe text;
- hits at least one practical blocker the machinery solves: quantities that
  don't fit pans/batch, missing ingredients needing substitution, dietary
  constraints or a diet pattern they cook within, multi-component recipes
  they lose track of mid-cook;
- values rich, queryable metadata on recipes — origin and heritage
  provenance being one such dimension that a *subset* cares about
  (optional flavour, per the correction), diet **patterns** (Mediterranean,
  Atlantic, plant-forward) being another. Note for DECISIONS #10: diet
  patterns belong with the **asserted** facets (like cuisine/region),
  distinct from the **derived** compatibility diets (vegan/GF) already
  listed there — a small facet-taxonomy addition this correction implies;
- for the diaspora sub-segment: cannot buy Portuguese-named ingredients
  locally (T65/T80/T130 don't exist abroad under those names) — a
  *practical availability problem* for which method-changing substitution is
  definitionally the job; the identity/saudade angle is emotional colour,
  not the segment definition.

Evidence status: **zero customer evidence** (discovery finding A1, carried
forward unchanged). Adjacent evidence only: Fornada P1/P2/P4 exist as
*bread* personas; `international_equivalents` shipped on the glossary (a
substitution-shaped feature exists; usage data not cited anywhere in the
research). ICP-2 must be treated as the thing AT-2 + AT-4 exist to test, not
as a targeting decision already made.

**Explicit non-ICP (disqualifiers):** cooks with no practical job the
machinery solves and no connection to the ecosystem (e.g. cold-start
cocktail/coffee hobbyist audiences the product has no channel to);
industrial/commercial food production (founding principle: artisan only);
recipe-app switchers seeking an import-everything manager. The discovery review already flagged these as
"segments the product has no persona, no channel, and no evidence for" —
this run confirms they stay out of the persona set entirely rather than
getting aspirational personas.

---

## 2. Stable-keyed personas block

Keys are stable identifiers (`rcp.<actor-class>.<slug>`) intended to be
referenced from specs, flow reviews, and future board runs. Role-titled, not
name-titled: inventing biographies for untested segments would violate the
no-invented-facts rule; names can be added when validation earns them.
Canonical file (gated as DRAFT pending review):
`docs/product/research/recipe-protocol/reviews/rcp-personas-DRAFT.md`.

### Actor class: cook / executor

#### `rcp.cook.home-cook` — Home cook (practical-first, metadata-rich)
*(renamed from `rcp.cook.heritage-home` per the course correction)*

- **Definition:** cooks at home from the ecosystem's surfaces; phone/iPad
  mid-task; wants guided execution, correct scaling to their pans/batch,
  sensory endpoints over clock times, reliable repeatable results — and
  values well-structured recipes carrying rich metadata: origin/provenance,
  asserted diet pattern (Mediterranean, Atlantic, plant-forward), allergens,
  technique, equipment fit. Heritage/origin interest is **one optional
  motivation dimension** a subset of this persona has — not the persona's
  identity. Linear recipes must stay dead-simple (A8).
- **RCP capabilities hired:** guided execution (DAG opt-in), scaling with
  correct semantics, duration windows + sensory conditions, per-step media,
  asserted + derived facets (diet pattern, allergens) for finding what fits
  how they eat.
- **Evidence:** **adjacent-evidence** for bread (Fornada P1/P2 + shipped
  guided execution + mobile-first bake memory); **n=1 dogfood** for the
  cook-from-ingested-books path (the product owner is an instance of this
  persona, per correction 2/3 — not a separate persona); **pure hypothesis**
  for the broader non-bread population and for the diet-pattern-seeking
  facet — this is exactly assumption A1 (re-framed, see §3).
- **Phase:** the expansion bet's primary persona; v1 already serves the
  instance that ingests-and-cooks (see `rcp.ingester.personal-collector`);
  broader population gated on AT-2.
- **Discovery mapping:** A1 (kills Tree B if false), A8; tests AT-2 (fake
  door), AT-1 (walkthrough).

#### `rcp.cook.diaspora-substituter` — Diaspora cook (ingredient-availability substituter)

- **Definition:** cook abroad who cannot buy the recipe's named ingredients
  locally (Portuguese-named flours being the documented case: T65/T80/T130
  don't exist abroad under those names); wants to faithfully reproduce the
  dish with what the local shop sells, without ruining it. A **practical
  availability problem** — the one persona for whom **method-changing
  substitution** is the core job, not a nice-to-have. The identity/saudade
  angle is emotional colour a subset carries, not the segment definition
  (course correction). Their found-recipe import job (screenshots, URLs —
  O-B4) is now served by the v1-core ingestion pipeline via
  `rcp.ingester.personal-collector`; desirability for this *segment*
  remains untested (A9-published half stays gated).
- **RCP capabilities hired:** authored substitutions with method deltas,
  flour-class/ingredient-class mapping, unit/regional translation,
  import-to-draft (unverified).
- **Evidence:** **adjacent-evidence** (Fornada P1/P4 logic; explicit-flour
  -type memory; shipped `international_equivalents`); **pure hypothesis**
  that substitution is what they actually *do* versus suitcase imports,
  online Portuguese grocers, or not cooking — that is assumption A4 verbatim.
- **Phase:** co-primary for expansion IF AT-4 confirms the behaviour and a
  reachable channel exists.
- **Discovery mapping:** A1, A3, A4, A9; tests AT-4 (Mom-Test interviews),
  AT-1 (delta walkthrough).

#### `rcp.cook.production-scaler` — Micro-producer / batch scaler

- **Definition:** scales recipes from household to production quantities
  (2 → 40 loaves; batched cocktails; fermentation vats); needs non-linear
  scaling semantics (ferment time does NOT scale, r² pans, sublinear yeast)
  and is the persona most exposed to **safety bounds** (brine %, nitrite
  ppm, pH, pressure) clamping fail-closed through scaling.
- **RCP capabilities hired:** scaling-basis + per-quantity scaling tags,
  safety guards in-document, production/batch views.
- **Evidence:** **adjacent-evidence** (Fornada P3 micro-padeiro exists as a
  bread hypothesis, itself Phase 3 and founder-mirror); **pure hypothesis**
  for non-bread production. Safety *need* is **validated as a domain fact**
  (03/05 research: real thresholds) even though the persona is not.
- **Phase:** explicitly last; do not design v1 for them (discovery already
  ruled this).
- **Discovery mapping:** A5 (safety — ethical/feasibility), A10; tests AT-5
  (safety clamp spike — runs regardless of persona validation, because the
  stakeholder "cooks' physical safety" is not optional).

### Actor class: ingester — **v1-core (correction 2: promoted)**

#### `rcp.ingester.personal-collector` — Personal-collection ingester

- **Definition:** a cook-consumer whose recipes live in physical cookbooks,
  screenshots, and links; brings them into RCP by photographing/importing →
  vision-LLM extraction → reviewing and correcting the draft → saving as an
  **unverified private personal recipe** they then cook from with the full
  machinery (scaling, substitutions, guided execution, metadata). Usually
  the same human as `rcp.cook.home-cook` wearing a different hat — ingestion
  is the acquisition job, cooking is the consumption job. **The product
  owner is the first n=1 instance of this persona** ("I can ingest recipes
  from books and that's it"), not a separate persona.
- **RCP capabilities hired:** ingestion pipeline (photo/URL/screenshot →
  draft), required-fields-minimal schema tolerance + preserved `raw` per
  ingredient line, review/correct UX, private-collection status, licence/
  copyright posture (personal use only, never publishable).
- **Evidence:** **n=1 dogfood** (product owner's stated primary path);
  **adjacent-evidence** that the pipeline is technically mature
  (FINDINGS: recipe-scrapers/JSON-LD solved; vision-LLM for screenshots;
  draft + human gate is what makes extraction reliable); **pure hypothesis**
  for the broader population's demand (the O-B4 past-behaviour survey
  remains the honest test before generalizing).
- **Phase:** **v1-core — the primary v1 content path.** This is an explicit
  revision of the discovery verdict, which deferred import behind gates;
  private-collection ingestion is promoted because it is the founder's own
  consumption path and costs no published-content trust. Published import
  stays gated.
- **Copyright boundary (load-bearing):** book recipes may be ingested for
  **personal/private use** only; the private-vs-published distinction must
  be first-class in the document model, and a private ingested recipe must
  never silently become published or visually pass as verified.
- **Discovery mapping:** **A11 (new): extraction quality + time-to-correct
  is acceptable** — replaces A2 as the v1-gating content assumption; A9
  (published half only remains open); test **AT-3 re-framed: ingestion
  dogfood** (see §3).

### Actor class: recipe author — *supporting class, site-context (corrections 1+2)*

*Per correction 2, hand-authoring recipes (YAML/CMS) is **not an RCP-core
job**: the heritage-archive authoring path belongs to the paodeportugal.pt
site context. The class remains in the actor set because site content will
eventually flow through RCP (via Sanity), but it is supporting and
post-v1-gating. No founder persona exists (correction 3) — the archivist
role is currently staffed by the product owner, which is a staffing fact,
not a persona.*

#### `rcp.author.heritage-archivist` — Heritage archivist (site context)
*(replaces the removed `rcp.author.founder-archivist` per correction 3)*

- **Definition:** whoever encodes the heritage archive's recipes with full
  rich metadata — provenance, origin, divergences, variants, substitutions,
  diet-pattern facets — bearing the authoring-discipline cost the research
  flags (op-list deltas on step slugs, guards, options, scaling tags).
  A role, not a person; staffed today by the product owner.
- **RCP capabilities hired:** the schema, registries, provenance blocks,
  BE/CI validation, LLM-drafted-human-reviewed substitutions.
- **Evidence:** **validated as a role** (the site's authored heritage
  content exists and the workload is documented); the cost question
  (hours vs days per recipe) is open — assumption A2, now scoped to the
  site-context path rather than gating RCP v1.
- **Phase:** site-context; becomes active for RCP when the CMS migration
  emits RCP (open decision 7). Not v1's primary user (correction 2 reversed
  the earlier framing).
- **Discovery mapping:** A2 (demoted for v1), A8, A10; authoring-cost
  dogfood deferred to the CMS/site workstream.

#### `rcp.author.contributor` — Future contributor (recipes + metadata)

- **Definition:** a competent non-founder (home cook with heritage knowledge,
  regional informant, future collaborator) authoring or amending recipes
  through the friction-free Sanity editor — never hand-writing YAML. Cannot
  be assumed to understand step slugs, write-sets, or guard combinatorics;
  the CMS must project RCP's complexity away from them.
- **RCP capabilities hired:** CMS authoring surface, per-recipe substitution
  authoring, draft/preview.
- **Evidence:** **pure hypothesis** — zero contributors exist; the CMS plan
  is evidence of *intent* to serve them, not of the people.
- **Phase:** post-v1; but open decision 7 (Sanity as content model vs
  emitter) is decided *for* this persona and lands earlier than they do.
- **Discovery mapping:** A2, A7. (The original AT-3 non-author-encoder test
  was this persona's proxy; with AT-3 re-framed as ingestion dogfood
  (correction 2), the authoring-cost test moves to the CMS/site workstream.)

### Actor class: editorial verifier — *supporting class (course correction)*

#### `rcp.verifier.editorial` — Editorial provenance verifier

- **Definition:** runs the heritage verification workflow: checks sources
  against the source hierarchy (DGADR primary, regional tourism boards
  secondary, blogs context-only), records testemunhos and divergências, sets
  `confidence`/`verified`, and gates what may visually present as verified
  heritage — including keeping unverified imports visibly unverified (A9's
  ethical half) and **owning the private→published boundary**: an ingested
  private recipe (v1-core path) may only cross into anything public through
  this role's gate, for both copyright and provenance-trust reasons. Today
  staffed by the product owner; a distinct role with a distinct failure
  mode: approving one's own work.
- **RCP capabilities hired:** provenance/confidence/verified blocks,
  licence fields, draft-vs-published status, review gates for LLM-drafted
  content (DECISIONS #9's hard line).
- **Evidence:** **validated as a role** (the workflow and model shipped on
  the site and generalize as-is per FINDINGS); **pure hypothesis as a
  separate person**.
- **Discovery mapping:** A9 (imports must not pollute heritage trust);
  stakeholder rows "heritage source authorities" and "recipe rights-holders"
  from the discovery map both land on this persona's desk.

### Actor class: registry steward

#### `rcp.registry.steward` — Registry steward / future registry contributor

- **Definition:** curates the controlled vocabularies (ingredient classes,
  step primitives, equipment profiles): approves additions, prevents rot,
  says no. Today Daniel; the future-contributor variant is the actor FINDINGS
  marks as the unsolved "process problem, not a schema problem".
- **RCP capabilities hired:** registry mechanism (open for growth, closed to
  invention), versioning, enum-vs-registry discipline.
- **Evidence:** **validated as a role today** (SPEC-007/008 registries are
  shipped precedent in iOS); **pure hypothesis as anyone other than the
  founder** — A7 says governance must stay solo-sized until contributors are
  real.
- **Discovery mapping:** A7; not a test but a 3-month authoring-load
  observation (per discovery plan).

### Actor class: surface engineer

#### `rcp.dev.surface-engineer` — Surface engineer / integrator

- **Definition:** builds and maintains the consuming surfaces; wants
  generated decode types (quicktype → Swift Codable + TS), never
  hand-synced models, no client-side validation obligations, stable
  versioning so published documents don't break renderers. Today Daniel;
  hypothetically a third-party dev only if RCP ever opens — out of scope.
- **RCP capabilities hired:** JSON Schema → codegen, version pinning,
  BE/CI-only validation posture (DECISIONS #8), snapshot-on-publish.
- **Evidence:** **validated** — the five-representations pain is this
  persona's pain, fully documented in the codebase inventory.
- **Discovery mapping:** A6 (replace, not join — a sixth representation is
  strictly worse); test AT-6 (vertical-slice migration spike). Also the
  client-side safety-clamp tension inside A5 lands here: DECISIONS #8 says
  apps never validate, A5 says safety bounds must clamp in the renderer at
  cook time — this persona owns reconciling that.

---

## 3. Persona ↔ discovery re-grounding (what the erratum demanded)

The erratum invalidated persona-anchored wording in A1 and AT-4/AT-2. Re-grounded:

| Item | Old (Fornada-contaminated) framing | Re-grounded framing |
|---|---|---|
| **A1** | "Existing users (Tomás/Inês types) want non-bread heritage content" | Re-framed twice (erratum + course correction): "Cooks matching `rcp.cook.home-cook` — operationally: *actual current users of the three surfaces, whoever they turn out to be* — return for **non-bread recipes with rich metadata (origin, diet pattern)**", with heritage as **one optional variant arm** of the test, not the test itself. The persona is the hypothesis; AT-2's respondents are the first data about who these people actually are. |
| **AT-2** | Fake door + survey aimed at implicitly-diaspora "existing users", heritage-pack-only teaser | Mechanics unchanged, arms broadened per the course correction: run the fake door with **variant tiles** — a heritage/origin-framed pack (e.g. Doçaria Conventual) AND at least one practical/metadata-framed arm (e.g. a diet-pattern collection such as Mediterranean) — so the test separates "wants more recipes with rich metadata" from "wants heritage specifically". Sharpened readout: segment responses (PT-resident vs abroad; bread-only vs broader cooking) to seed validation/kill of `rcp.cook.home-cook` vs `rcp.cook.diaspora-substituter`. Success criteria stay as set (≥8% CTR, ≥30% concrete non-bread item in last month), applied per arm. |
| **A4 / AT-4** | "Five diaspora interviews" — presumed a reachable diaspora segment exists | Two-stage: (1) channel check — can five people matching `rcp.cook.diaspora-substituter`'s screener (cooked Portuguese food abroad in the last month AND hit an ingredient-availability problem) be recruited from real channels at all? Failure to recruit is itself a result: the segment is unreachable and the persona demotes to parked. (2) If reachable, Mom-Test past-workaround interviews as designed (≥3 of 5 describe a concrete recent substitution attempt or abandonment). |
| **A2 / AT-3** | A2 = authoring cost gates everything; AT-3 = "authoring dogfood: Daniel + one non-author encode recipes from prose" | **Correction 2 re-frame.** A2 demotes for v1 (hand-authoring is the site-context path, not RCP-core). The v1-gating content assumption becomes **A11: vision-LLM extraction quality + time-to-correct is acceptable** for the ingestion pipeline. **AT-3 becomes ingestion dogfood**: photograph N real recipes from the product owner's own cookbooks (deliberately spanning layouts: dense prose, tables, multi-column, handwritten margin notes if present); run extraction → review/correct → cook-ready private recipe. Measure per recipe: extraction field accuracy, time-to-correct, and whether the corrected recipe survives scaling/execution. Success criteria to set upfront before running (Torres rule), e.g. median time-to-correct threshold and zero silent quantity errors — exact numbers are Daniel's call at review. The original authoring-cost test moves to the CMS/site workstream. |
| **A9 / import (O-B4)** | Discovery verdict: import deferred behind gates, "build nothing yet" | **Correction 2 revision, explicit:** ingestion for the **private personal collection** (books/links/screenshots → unverified private recipe) is **promoted to v1-core** — it is the primary v1 content path (n=1 dogfood: the product owner's stated behaviour). What remains gated: import feeding anything **published** (copyright + provenance trust), and generalizing ingestion demand beyond n=1 (the past-behaviour survey stands for that). The private-vs-published distinction becomes a first-class document property; `rcp.verifier.editorial` owns the boundary. |
| **AT-5 / A5** | Safety spike, unassigned | Owned jointly by `rcp.cook.production-scaler` (exposure) and `rcp.dev.surface-engineer` (the client-side clamp vs DECISIONS #8 tension). Runs regardless of expansion-gate outcomes. Note: ingested recipes now also enter the safety surface — extraction errors in safety-relevant quantities (salt %, cure ppm) are an A11×A5 compound risk AT-3 should watch for. |
| **AT-6 / A6** | Migration spike | `rcp.dev.surface-engineer`'s acceptance test, unchanged. |

Standing conclusions of the discovery run, updated after corrections 2–3:
the **two-bet split survives but re-shaped** — the convergence core is
justified today (verifier/steward/engineer roles and the shipped surfaces
are its evidence), and the core now **includes private-collection
ingestion** as v1 scope, which the discovery verdict had deferred; that is
the one explicit revision. The expansion bet (non-bread packs for a broader
population, published import, substitution catalog) stays hypothesis-grade
behind AT-2/AT-4. The evidence split is now: **role-validated actors
(verifier, steward, surface engineer) + one n=1-dogfood consumer/ingester
path on the core side; all broader-population cook claims on the expansion
side as hypotheses.** v1's primary user is the ingesting consumer
(`rcp.ingester.personal-collector` / `rcp.cook.home-cook`), of which the
product owner is the first instance.

## 4. Honest limits of this exercise

- Per Dunford, real ICP tightening needs a pattern among *happy customers*;
  ICP-2 and all cook personas are pre-pattern. First-100-user re-validation
  (already the standing rule for the Fornada personas) applies to RCP cook
  personas identically once anything ships.
- Per Torres, nothing here is "validated" in the scientific sense — the
  validated tier above means "observable in repo/product or a real person
  doing the job", the strongest evidence available without users. The
  **n=1 dogfood** tier (product owner's own behaviour) is deliberately kept
  separate from validation: it justifies building his path first, not
  claims about a market.
- No demographic, biographic, or market-size claims are made anywhere above,
  deliberately: none exist in the source material.

---

## Ready to store (pending Daniel's approval — do not execute)

After review: `store_artifact` below, then
`get_playbook_run("019fc287-6a45-79aa-a460-4feaabaf8795", status="completed",
artifact_ids=[...])`, and promote `rcp-personas-DRAFT.md` to its canonical
location. Field names follow observed playbook conventions
(`artifact_type` / `team` / `target`); verify against the live
`store_artifact` schema when executing.

```json
{
  "artifact_type": "icp",
  "team": "product-researcher",
  "target": "RCP — personas",
  "title": "ICP & Personas — Universal Recipe Protocol (RCP)",
  "run_id": "019fc287-6a45-79aa-a460-4feaabaf8795",
  "summary": "Audit-mode ICP/persona exercise for RCP, fixing the erratum on discovery run 019fc26f (Fornada personas wrongly used as RCP personas). Revised mid-run per two course corrections from Daniel (2026-08-02). Correction 1: heritage is a nice-to-have, not the core — the ICP centres on practical cooking jobs (scaling, substitutions, guided execution, reliable results) plus rich metadata (origin; asserted diet patterns like Mediterranean/Atlantic, distinct from derived compatibility diets); heritage/origin is an optional flavour dimension. Correction 2/3: for RCP Daniel is a consumer, not a creator, and just the product owner — no founder persona exists; he sits in the stakeholder map (vision holder, prioritiser) and is an n=1 dogfood instance of the general consumer/ingester persona. Consequences: ingestion (photo/book/link/screenshot -> vision-LLM extraction -> review/correct -> unverified PRIVATE recipe) is promoted to v1-core as the primary content path — an explicit revision of the discovery verdict's import deferral; hand-authoring YAML is site-context (paodeportugal.pt), not RCP-core; A2 (authoring cost) demotes for v1 and is replaced by A11 (extraction quality + time-to-correct); AT-3 re-framed from authoring dogfood to ingestion dogfood (photograph N real recipes from owned cookbooks, measure extraction accuracy and correction time); private-vs-published becomes a first-class distinction (copyright: book recipes ingestable for personal use, never publishable), boundary owned by the editorial verifier. Two-part ICP: ICP-1 infrastructure (validated — the ecosystem itself: 4 surfaces, 5 divergent representations, solo maintainer; primary v1 content path = ingestion, n=1 dogfood) and ICP-2 expansion (pure hypothesis — cooks wanting the practical machinery for more of what they cook, valuing metadata-rich recipes; gated on AT-2/AT-4). Stable-keyed personas across six actor classes: rcp.cook.home-cook (adjacent-evidence for bread, n=1 dogfood for cook-from-ingested-books, hypothesis beyond — A1), rcp.cook.diaspora-substituter (adjacent-evidence; A4; import job served by ingestion pipeline), rcp.cook.production-scaler (hypothesis persona, validated safety need — A5/A10), rcp.ingester.personal-collector (NEW, v1-core primary persona; n=1 dogfood + technically-mature pipeline; A11/A9), rcp.author.heritage-archivist (replaces removed founder-archivist; site-context supporting role — A2 demoted), rcp.author.contributor (hypothesis; decides Sanity editor requirements), rcp.verifier.editorial (validated as role; owns private->published boundary — A9), rcp.registry.steward (validated as role today — A7), rcp.dev.surface-engineer (validated — A6/AT-6; owns A5-vs-DECISIONS#8 clamp tension). Structural result (updated): core side = role-validated actors + the n=1-dogfood ingester/cook path (now including v1 ingestion); expansion side = all broader-population hypotheses. A1 re-framed to 'users want non-bread recipes with rich metadata (origin, diet pattern)' with heritage one optional AT-2 arm; AT-2 gains a practical/diet-pattern arm and respondent segmentation; AT-4 gains a channel-reachability pre-stage. Non-ICP: cold-start hobbyist audiences with no channel, industrial production, import-everything switchers. Full analysis: docs/product/research/recipe-protocol/reviews/bok-icp-personas.md; personas block: reviews/rcp-personas-DRAFT.md (pending promotion).",
  "syntheses_used": ["Persona", "Job To Be Done"]
}
```
