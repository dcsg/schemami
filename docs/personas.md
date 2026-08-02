# RCP personas — canonical

> **Canonical since 2026-08-02** (approved by Daniel; promoted from the
> research folder's DRAFT). Full analysis and rationale:
> `docs/research/reviews/bok-icp-personas.md`
> (bok run `019fc287-6a45-79aa-a460-4feaabaf8795`).
> Scope: **RCP only** — the Fornada app has its own, separate personas.
> Evidence discipline: claims are tagged validated / n=1 dogfood /
> adjacent-evidence / hypothesis; hypotheses harden only via the AT tests.

> **COURSE CORRECTION (Daniel, 2026-08-02, applied):** heritage is a
> **nice-to-have, not the core** of RCP's ICP. Centre of gravity = practical
> cooking jobs (scaling, substitutions, guided execution, reliable results)
> plus **rich metadata** — origin, and asserted diet **patterns**
> (Mediterranean, Atlantic, plant-forward, …) as facets distinct from
> derived compatibility diets (vegan/GF). Heritage/origin is an optional
> flavour dimension some personas value; author/verifier actors are a
> supporting class. `rcp.cook.heritage-home` was renamed
> `rcp.cook.home-cook` under this correction.

> **COURSE CORRECTION 2 (Daniel, 2026-08-02, applied — larger):** for RCP,
> **Daniel is a consumer, not a creator** — "I am more on the consumer than
> on the creator. I can ingest recipes from books and that's it"; and "I am
> just the product owner." Applied: (1) **no founder persona exists** —
> Daniel is a **stakeholder** (product owner: vision holder, prioritiser)
> and, as a user, an **n=1 dogfood instance** of the general
> consumer/ingester personas; `rcp.author.founder-archivist` is removed.
> (2) **Ingestion is v1-core**: photo/book/link/screenshot → vision-LLM
> extraction → review/correct → unverified PRIVATE recipe is the primary v1
> content path — an explicit revision of the discovery verdict's import
> deferral (published import stays gated). (3) Hand-authoring YAML is
> site-context (paodeportugal.pt), not RCP-core; A2 demotes for v1, replaced
> by **A11: extraction quality + time-to-correct**; AT-3 becomes **ingestion
> dogfood**. (4) **Private vs published is first-class** — book recipes are
> ingestable for personal use only, never publishable; the editorial
> verifier owns the boundary.

Scope: **RCP (universal recipe protocol) only.** The four Fornada personas
(Tomás, Inês, Daniel micro-padeiro, Marco) remain Fornada-scoped and are
cited below only as adjacent evidence. Persona keys are stable identifiers
for use in specs, flow reviews, and board runs. Role-titled, not name-titled:
biographies are added only when validation earns them.

Evidence levels: **validated** (observable in repo/product, or a real person
doing the job today) · **n=1 dogfood** (product owner's own stated
behaviour/need — a real signal, not validation of a broader class) ·
**adjacent-evidence** (Fornada personas / shipped features / domain research
— suggestive, not confirmatory) · **pure hypothesis** (founder reasoning;
must be tested before it drives scope).

**Product-owner placement:** Daniel belongs in the **stakeholder map**
(product owner — vision, priorities, first dogfooder), not in the persona
set. Personas describe the broader user classes — "me and others".

## ICP

- **ICP-1 (infrastructure, validated):** the Pão de Portugal ecosystem itself
  — ≥3 shipping surfaces + planned CMS, 5 divergent recipe representations,
  verified-provenance editorial workflow, solo maintainer. One matching
  account exists, by design. RCP core + bread profile serves this ICP.
  **Primary v1 content path (correction 2): ingestion** — recipes
  photographed/imported from owned cookbooks into a private collection
  (n=1 dogfood evidence).
- **ICP-2 (expansion, pure hypothesis):** cooks already using the ecosystem
  for bread who want the same practical machinery — correct scaling,
  trustworthy substitutions, guided execution, reliable results — for more
  of what they cook, and who value recipes carrying rich metadata: origin,
  asserted diet pattern (Mediterranean, Atlantic, plant-forward), allergens,
  technique, equipment fit. Heritage/origin is one metadata dimension a
  subset cares about, not the segment definition. Diaspora sub-segment
  defined by the practical ingredient-availability problem. Gated on
  AT-2 / AT-4.
- **Non-ICP (explicit):** cooks with no practical job the machinery solves
  and no channel to reach them (cold-start hobbyist audiences); industrial
  production (founding principle: artisan only); import-everything
  recipe-app switchers.

## Personas

### Cook / executor

```yaml
- key: rcp.cook.home-cook   # renamed from rcp.cook.heritage-home (course correction)
  actor_class: cook-executor
  title: Home cook (practical-first, metadata-rich)
  definition: >
    Cooks at home from the ecosystem's surfaces; phone/iPad mid-task; wants
    guided execution, scaling to their pans/schedule, sensory endpoints over
    clock times, reliable repeatable results; values well-structured recipes
    with rich metadata (origin/provenance, asserted diet pattern, allergens,
    technique, equipment fit). Heritage/origin interest is one OPTIONAL
    motivation dimension a subset has — not the persona's identity. Linear
    recipes must stay dead-simple.
  hires_rcp_for: [guided-execution, scaling-semantics, duration-windows, per-step-media, asserted-and-derived-facets]
  evidence:
    bread: adjacent-evidence           # Fornada P1/P2 + shipped guided execution
    cook-from-ingested-books: n=1-dogfood  # product owner is an instance of this persona
    non-bread: pure-hypothesis         # this IS assumption A1 (re-framed)
    diet-pattern-seeking: pure-hypothesis
  phase: expansion-primary for the broad population (gated on AT-2); the
    ingest-and-cook instance is served in v1 via rcp.ingester.personal-collector
  discovery: {assumptions: [A1, A8], tests: [AT-2, AT-1]}
  notes: >
    A1 re-test wording (course correction): "users want non-bread recipes
    with rich metadata (origin, diet pattern)" — heritage is one optional
    variant arm of AT-2, alongside a practical/diet-pattern arm. Diet
    PATTERNS are asserted facets, distinct from derived compatibility diets
    (vegan/GF) — implies a small addition to DECISIONS #10's asserted list.

- key: rcp.cook.diaspora-substituter
  actor_class: cook-executor
  title: Diaspora cook (ingredient-availability substituter)
  definition: >
    Cook abroad who cannot buy the recipe's named ingredients locally (no
    T65/T80/T130 on foreign shelves); wants to faithfully reproduce the dish
    with local ingredients. A practical availability problem —
    method-changing substitution is the core job; identity/saudade is
    emotional colour a subset carries, not the segment definition (course
    correction). Their found-recipe import job (O-B4) is served by the
    v1-core ingestion pipeline (rcp.ingester.personal-collector); demand
    for this segment remains untested (A9-published stays gated).
  hires_rcp_for: [method-delta-substitutions, ingredient-class-mapping, unit-translation, import-to-draft]
  evidence:
    persona-logic: adjacent-evidence  # Fornada P1/P4; shipped international_equivalents (no usage data)
    substitution-as-actual-behaviour: pure-hypothesis  # this IS assumption A4
  phase: expansion-co-primary IF AT-4 confirms behaviour AND channel is reachable
  discovery: {assumptions: [A1, A3, A4, A9], tests: [AT-4, AT-1]}

- key: rcp.cook.production-scaler
  actor_class: cook-executor
  title: Micro-producer / batch scaler
  definition: >
    Scales household recipes to production quantities; needs non-linear
    scaling semantics (ferment time doesn't scale, r-squared pans, sublinear
    yeast) and is the persona most exposed to safety bounds (brine %,
    nitrite ppm, pH, pressure) clamping fail-closed through scaling.
  hires_rcp_for: [scaling-basis, per-quantity-scaling-tags, safety-guards, batch-views]
  evidence:
    persona: adjacent-evidence      # Fornada P3, itself Phase-3 hypothesis
    safety-need: validated          # domain research: real thresholds
  phase: explicitly last; do not design v1 for them
  discovery: {assumptions: [A5, A10], tests: [AT-5]}
```

### Ingester — v1-core (correction 2: promoted)

```yaml
- key: rcp.ingester.personal-collector
  actor_class: ingester
  title: Personal-collection ingester
  definition: >
    Cook-consumer whose recipes live in physical cookbooks, screenshots and
    links; brings them into RCP by photographing/importing -> vision-LLM
    extraction -> reviewing and correcting the draft -> saving as an
    UNVERIFIED PRIVATE personal recipe, then cooks from it with the full
    machinery (scaling, substitutions, guided execution, metadata). Usually
    the same human as rcp.cook.home-cook wearing the acquisition hat. The
    product owner is the first n=1 instance ("I can ingest recipes from
    books and that's it") — an instance, not a separate persona.
  hires_rcp_for: [ingestion-pipeline, raw-preserving-partial-schema, review-correct-ux, private-collection-status, personal-use-licence-posture]
  evidence:
    demand: n=1-dogfood             # product owner's stated primary path
    pipeline-feasibility: adjacent-evidence  # FINDINGS: scrapers/JSON-LD mature; vision-LLM + draft + human gate
    broader-population-demand: pure-hypothesis  # O-B4 past-behaviour survey still the honest test
  phase: v1-core — THE primary v1 content path (explicit revision of the
    discovery verdict's import deferral; published import stays gated)
  copyright: >
    Book recipes are ingestable for PERSONAL/PRIVATE use only, never
    publishable. Private-vs-published must be first-class in the document
    model; a private ingested recipe can never silently become published
    or visually pass as verified.
  discovery: {assumptions: [A11, A9], tests: [AT-3-ingestion-dogfood]}
  notes: >
    A11 (new, replaces A2 as v1 content gate): vision-LLM extraction
    quality + time-to-correct is acceptable. AT-3 re-framed: photograph N
    real recipes from owned cookbooks (varied layouts), measure extraction
    field accuracy, time-to-correct, and whether corrected recipes survive
    scaling/execution; success criteria set upfront at review. Compound
    risk with A5: extraction errors in safety-relevant quantities.
```

### Recipe author — supporting class, site-context (corrections 1+2)

Hand-authoring recipes is NOT an RCP-core job (correction 2): the
heritage-archive authoring path belongs to the paodeportugal.pt site
context and reaches RCP via the CMS (open decision 7). No founder persona
(correction 3) — the archivist role is currently staffed by the product
owner; that is staffing, not a persona.

```yaml
- key: rcp.author.heritage-archivist   # replaces removed rcp.author.founder-archivist
  actor_class: recipe-author
  title: Heritage archivist (site context)
  definition: >
    Whoever encodes the heritage archive's recipes with full rich metadata
    (provenance, origin, divergences, variants, substitutions, diet-pattern
    facets), bearing the authoring-discipline cost (op-list deltas, guards,
    options, scaling tags). A role, not a person; staffed today by the
    product owner.
  hires_rcp_for: [schema, registries, provenance-blocks, be-ci-validation, llm-drafted-human-reviewed-subs]
  evidence: validated-as-role       # authored heritage content exists; COST open (A2, demoted for v1)
  phase: site-context; active for RCP when the CMS migration emits RCP.
    NOT v1's primary user (correction 2 reversed the earlier framing).
  discovery: {assumptions: [A2-demoted, A8, A10], tests: []}  # authoring-cost dogfood deferred to CMS/site workstream

- key: rcp.author.contributor
  actor_class: recipe-author
  title: Future contributor (recipes + metadata)
  definition: >
    Competent non-founder authoring/amending recipes through the
    friction-free Sanity editor — never hand-writing YAML; cannot be assumed
    to understand step slugs, write-sets, or guard combinatorics. The CMS
    must project RCP's complexity away from them.
  hires_rcp_for: [cms-authoring-surface, per-recipe-substitution-authoring, draft-preview]
  evidence: pure-hypothesis         # zero contributors exist; CMS plan = intent, not people
  phase: post-v1; but open decision 7 (Sanity model vs emitter) is decided FOR them
  discovery: {assumptions: [A2, A7], tests: []}  # original AT-3 non-author test moved to CMS/site workstream
```

### Editorial verifier — supporting class (course correction)

```yaml
- key: rcp.verifier.editorial
  actor_class: editorial-verifier
  title: Editorial provenance verifier
  definition: >
    Runs the heritage verification workflow: checks sources against the
    source hierarchy (DGADR primary; regional tourism boards secondary;
    blogs context-only), records testemunhos/divergencias, sets
    confidence/verified, and gates what may visually present as verified
    heritage — including keeping unverified imports visibly unverified and
    OWNING THE PRIVATE->PUBLISHED BOUNDARY: an ingested private recipe may
    only cross into anything public through this gate (copyright +
    provenance trust). Today staffed by the product owner; distinct role
    with a distinct failure mode (approving one's own work).
  hires_rcp_for: [provenance-confidence-verified, licence-fields, private-vs-published-gate, llm-review-gates]
  evidence:
    role: validated                 # workflow shipped on site; generalizes as-is
    separate-person: pure-hypothesis
  discovery: {assumptions: [A9], tests: []}  # plus stakeholders: source authorities, rights-holders
```

### Registry steward

```yaml
- key: rcp.registry.steward
  actor_class: registry-steward
  title: Registry steward / future registry contributor
  definition: >
    Curates controlled vocabularies (ingredient classes, step primitives,
    equipment profiles): approves additions, prevents rot, says no. Today
    Daniel; the future-contributor variant is FINDINGS' unsolved "process
    problem, not a schema problem".
  hires_rcp_for: [registry-mechanism, versioning, enum-vs-registry-discipline]
  evidence:
    role-today: validated           # SPEC-007/008 registries shipped in iOS
    non-founder-steward: pure-hypothesis
  discovery: {assumptions: [A7], tests: []}  # 3-month authoring-load observation, not a test
```

### Surface engineer

```yaml
- key: rcp.dev.surface-engineer
  actor_class: surface-engineer
  title: Surface engineer / integrator
  definition: >
    Builds and maintains the consuming surfaces; wants generated decode
    types (quicktype -> Swift Codable + TS), never hand-synced models, no
    client-side validation obligations, stable versioning. Today Daniel;
    third-party integrators are out of scope. Owns reconciling the A5
    client-side safety-clamp requirement with DECISIONS #8's
    apps-never-validate posture.
  hires_rcp_for: [json-schema-codegen, version-pinning, be-ci-only-validation, snapshot-on-publish]
  evidence: validated               # five-representations pain documented in codebase inventory
  discovery: {assumptions: [A6, A5], tests: [AT-6, AT-5]}
```

## Structural result (updated after corrections 2–3)

Core side: **role-validated actors** (verifier, steward, surface engineer)
plus the **n=1-dogfood consumer/ingester path**
(`rcp.ingester.personal-collector` / `rcp.cook.home-cook` instance) — and
the core now **includes private-collection ingestion as v1 scope**, the one
explicit revision of the discovery verdict (which had deferred import).
Expansion side: all broader-population cook claims remain hypotheses behind
AT-2/AT-4. v1's primary user is the **ingesting consumer**, of which the
product owner is the first instance.

## Re-validation rule

Per Dunford (and the standing Fornada rule): cook/ingester personas are
hypotheses (or n=1 signals) until first-100-user validation once anything
ships; AT-2 respondent segmentation, AT-3 ingestion-dogfood results, and
AT-4's channel-reachability pre-stage are the first inputs. An unreachable
diaspora channel demotes `rcp.cook.diaspora-substituter` to parked. n=1
dogfood never upgrades itself: only external users move a claim to
validated.
