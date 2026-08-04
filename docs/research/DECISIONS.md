# Brainstorm decisions log

Running record of what has been *decided by Daniel* during the brainstorm,
versus what remains open. Anything not listed here that appears in the
strawman proposal is still a proposal.

## Decided (2026-08-02, interview rounds 1–2)

1. **One core protocol + per-category profiles** — not N protocols, not one
   mega-schema. Cross-category composition (nata, latte) requires the shared
   core.
2. **Enums/registries over free text** everywhere a machine reads the field;
   prose only for human-eye-only content.
3. **Equipment is first-class** — referenced profiles participating in the
   maths; 3-level variant rule (parameter shift / guarded branch / family
   fork, with Bimby as the canonical fork case).
4. **Substitution is 5-scope** — ingredient, equipment, steps, section,
   component.
5. **Optional steps select fully-authored paths** (options + guards +
   intermediate anchors), never runtime deletion.
6. **A recipe can be a group of recipes** — components inline or by
   reference; any published recipe referenceable (version-pinned, snapshot on
   publish); "base recipes" are curation, not a type.
7. **Nutrition is derived, never stored static** — catalog carries per-class
   nutrition; recipe nutrition computed from resolved quantities. Deferred
   feature, shape reserved now.
8. **Validation is two-layer and runs BE/CI-side only.** Layer 1: JSON
   Schema 2020-12 (shape). Layer 2: semantic checks, **CUE-flavoured** —
   declarative constraints in CUE where it fits (ratio bounds, field
   relations), with the graph checks (DAG connectivity per guard combination,
   reference cycles) remaining ordinary code. Apps never validate: iOS/web
   consume already-validated published documents and only need *decode types*,
   generated from the JSON Schema (quicktype → Swift Codable + TS). Accepted
   risk: CUE is niche tooling.
9. **Substitution mechanism: BOTH from day one** — typed op-lists (06's
   design: stable step-slug anchors, write-sets, conflict rules) for
   small/medium deltas, full variants (SPEC-006 snapshots) for large
   divergence, with the promotion rule deciding between them. LLM-at-authoring
   drafts either form; humans review; nothing LLM-generated ships unreviewed.
10. **Classification: asserted + derived facets.** Asserted: cuisine, region,
    course/occasion, difficulty, heritage status. Derived (computed, never
    stored in the doc): time, equipment, allergens, diets, techniques, main
    ingredients. `kind` stays separate as the behavioural switch. Shelves and
    packs are projection/curation documents outside recipes.

11. **RCP is consumer-first; ingestion is v1-core.** (2026-08-02, post-ICP
    review.) Daniel's role in RCP: **product owner + consumer** — he ingests
    recipes from his cookbooks and cooks from them; he is not the content
    author. No special founder persona: he sits in the stakeholder map as PO
    and dogfoods as one instance of the general consumer/ingester persona.
    Consequences: (a) the ingestion pipeline (book photo/link → vision-LLM
    extraction → review-and-correct UX → private unverified recipe) is
    **promoted from deferred-behind-gates to v1-core** — it is the primary
    content path; (b) hand-authoring ergonomics (YAML) demote — heritage
    authoring belongs to the paodeportugal.pt site context, not RCP's core;
    (c) the v1 quality bar shifts from authoring cost (old A2) to extraction
    accuracy + time-to-correct (AT-3 reframed as ingestion dogfood);
    (d) imported book recipes are **private/personal-use** — a
    private-collection vs published distinction enters the model (copyright:
    ingest for yourself, never publish).
12. **Heritage is optional metadata, not the product's core.** Origin and
    rich metadata carry the value — including `diet_pattern` (Mediterranean,
    Atlantic, plant-forward…) as an asserted facet, distinct from derived
    compatibility diets (vegan/GF) which stay computed from ingredients.

## Clarified (not a change, a correction of a misleading preview)

- The recipe aggregate is complete: ingredients (slots with quantity + roles
  + constraints, `item` referencing Registry IngredientClass), components,
  steps (DAG with primitives from the Registry), equipment refs, options,
  substitutions, execution modes, measurement *targets*, provenance, licence,
  scaling bases. What lives OUTSIDE the recipe: measurement *readings*,
  timers, actuals (Execution session doc), derived facets (index-time), and
  registry entries themselves.

13. **Recipe Calculus with cross-stack conformance vectors** (amends #8's
    "apps never validate"). Precise formulation: apps never *admit*
    documents — admission (schema + linter) stays BE/CI-side — but they
    *compute over* admitted documents at cook time: scaling, basis
    resolution, guard-path selection, constraint enforcement, duration
    re-estimation. That computation is one named library of pure functions
    over immutable RCP documents, specified once, with conformance test
    vectors shipped as part of the published language so the TS, Swift and
    Go implementations are proven equivalent. (Source: DDD review P1 +
    architecture review codegen findings, convergent.)
14. **Decode-compatibility contract for offline snapshots, CI-tested.**
    Readers tolerate unknown fields and preserve them on round-trip; every
    enum decodes with a catch-all case; no new required field without a
    default; bidirectional compatibility fixtures (old reader/new doc, new
    reader/old doc) run in CI. This is a protocol invariant, not an app
    detail — "data outlives code". (Source: architecture review, highest
    severity.)
15. **Client-side fail-closed safety clamps.** `severity: critical`
    constraints are enforced by the Recipe Calculus on-device at cook time —
    scaling, substitution or manual edits that would violate a bound are
    refused with the reason shown (and, per the UX review, at edit time with
    a safe alternative offered). Server/CI validation is necessary but not
    sufficient, because the violating transformation happens after admission.
    Doubly critical since decision #11: LLM-extracted quantities from book
    photos are exactly where a safety-relevant misread must be caught
    (A11×A5). (Source: product discovery A5 + DDD + UX reviews, convergent.)

## Impact of decisions 11–12 on the four bok reviews (2026-08-02)

- **Product discovery**: two-bet split survives; sequencing partially
  inverts — *import promotes to v1-core* (the PO's own content path) while
  the publishing/expansion thread stays gated. A2 (authoring cost) demotes;
  the new critical v1 assumption is extraction accuracy + time-to-correct
  (AT-3 = ingestion dogfood on Daniel's cookbooks). A5 safety *strengthens*:
  LLM mis-extraction of a safety-critical quantity is now a v1 threat the
  fail-closed bounds must catch.
- **DDD**: Ingestion context promotes to near-core (ImportDraft + extraction
  ACL + review workflow are v1 build items). Recipe lifecycle needs a
  *visibility* dimension (private recipes never enter Publishing). Recipe
  Calculus finding unchanged; heritage verification cleanly site-scoped.
- **Architecture**: snapshot compatibility contract still #1. The
  write-time-enforcement-point ADR gains urgency (content now enters from a
  phone camera, not just git/CMS); ingestion quality joins the critical
  path; the reference-resolution SPOF relaxes for private imports (no shared
  components initially).
- **UX flow**: cook-along findings stand (persona-independent). Gap opened:
  the reviewed flow starts too late — capture → extraction-review →
  correction is now the first v1 flow and is unreviewed; needs its own
  ux-flow-review once sketched.

## Still open

- **DDD boundary confirmation** — Execution as separate context with
  targets-in-recipe / readings-in-session: clarification given, awaiting
  confirmation; plus whether Registry is formally split from day one.
- **Global substitution catalog** vs per-recipe substitutions only at v1.
- **v1 build scope** (full core + bread profile first was recommended; not
  yet confirmed after the deep-dives).
- **Profile granularity** (7-as-strawman vs fewer/broader).
- **Registry governance** process once there are contributors.

*(All five resolved 2026-08-02 — see decisions 16–20 below.)*

## Decided (2026-08-02, interview round 3 — closes all open items)

16. **Execution boundary confirmed; Registry formally split from day one.**
    Execution is a separate bounded context: measurement *targets* live in
    the recipe document, *readings*/timers/actuals live in a separate
    execution session document (as clarified under #13). The Registry
    (ingredient classes, step primitives, equipment profiles) is its own
    formal context from day one — registry IDs are load-bearing in every
    recipe, so the boundary is never retrofitted.
17. **Global substitution catalog ships in v1**, alongside per-recipe
    substitutions (both mechanisms of #9 apply to catalog entries: typed
    op-lists and full variants, LLM-drafted, human-reviewed).
18. **v1 profile scope: spec all 7, harden 4.** All seven profiles (bread,
    pastry, fermentation, preserves, drinks, coffee, savoury) are *defined*
    in the v1 spec so the core is checked against the full roster. Four get
    the full treatment — semantic linter rules, safety bounds, Calculus
    conformance vectors, ingestion focus: **bread, fermentation, pastry,
    savoury**. Drinks, coffee and preserves ship as draft profiles — valid
    to author, not yet conformance-guaranteed. (Supersedes the narrower
    "core + bread profile first" recommendation.)
19. **Scope line: RCP is the protocol — documents only.** Users, identity,
    favorites, collections/shelves/packs as product features, and recipe
    ownership classes (user vs system vs pack recipes) are concerns of the
    consuming app, modeled outside this project (or as a separate project).
    This repo specifies document formats and the Calculus; it is a published
    language, not a platform domain model. (Consistent with #10's placement
    of shelves/packs as projection/curation documents outside recipes.)
20. **Registry governance: lightweight rules now.** A one-page policy
    (`docs/registry-governance.md`): additions via PR, naming conventions,
    required fields, append-only + versioned entries, Daniel as sole
    approver. Full multi-contributor governance is deferred until a second
    contributor actually exists.

21. **The protocol/implementation split is explicit and structures the
    spec.** (2026-08-02, sharpens #19.) RCP-the-protocol is the
    **normative** published language an independent party could implement
    with nothing else: the core schema, the profiles, the Recipe Calculus
    semantics + conformance vectors (#13), the decode-compatibility
    contract (#14), the registry vocabularies + their rules, the
    substitution model, and the validation rules (#8). Everything about
    persistence and infrastructure is **informative** implementation
    guidance owed by no implementer: Postgres edge projection (#7 is an
    implementation decision, not protocol), snapshot storage, the resolver
    service, index-time derived-facet computation, session storage, and
    the ingestion pipeline (a producer of RCP documents, never part of the
    language). Boundary cases resolve by asking what is visible in the
    documents: the targets-vs-readings split and the
    resolver_version/content-hash guarantee are protocol (facts of the
    formats); the services behind them are not. The DDD context map is a
    **reference architecture** for Daniel and future app implementations —
    descriptive, not normative. Consequence: SPEC-009 is structured as a
    normative core plus informative annexes along exactly this line.

22. **v0.1 protocol scope: core frozen + registry formats/seed + bread and
    pastry profiles + validation harness + minimal fail-closed clamp.**
    (2026-08-02.) Definition of done: a stranger could take the repo,
    validate a new bread or pastry recipe against core + profile with every
    registry reference resolving, and be refused with a reason when a
    safety bound is violated — without asking Daniel anything. The **dish**
    profile is written during the ingestion dogfood, forced by the first
    savoury recipe ingested; **ferment** stays in the hardened-four v1 set
    (#18) but is not required for v0.1. The clamp checker is explicitly
    throwaway — the Recipe Calculus with conformance vectors (#13) remains
    a v1 obligation, not a v0.1 deliverable. SPEC-009 prose comes after
    v0.1 is exercised, codifying what the dogfood taught.

23. **Registry slugs are kind-prefixed.** (2026-08-02, PRD-001 OQ-1.)
    Registry entry IDs and every recipe reference to them carry the kind
    namespace: `ingredient.flour.wheat.t65`, `primitive.mix`,
    `equipment.forno-lenha` — as `docs/guidelines/registry-governance.md`
    already prescribed. The six example recipes (which use bare slugs)
    are migrated as part of the v0.1 seed-registry work; the migration is
    a recorded, reviewed change validated green by the harness
    (PRD-001 AC-202-3), and the linter thereafter rejects bare slugs
    (AC-201-2). Chosen over bare-slugs-with-context because entry IDs
    should be self-describing independent of the referencing field, and
    this is the last moment renaming is possible — IDs never change once
    the registry exists.

24. **Taxonomy vocabulary is English-base.** (2026-08-02, during dogfood
    run #2.) Machine-read taxonomy slugs (category, subcategory, tags)
    are English — same rule as registry IDs ("identifiers in English");
    the six examples' Portuguese taxonomy slugs predated the rule being
    applied there and are migrated. Localized *display* of taxonomy (and
    everything else) is a translation layer over English bases
    (FEAT-I18N-001), mirroring the registry display_name pattern —
    English bases keep integrations simple; pt-PT culinary terms stay
    exact where they are content (names, notes, reasons).

25. **`technique.` is the fourth registry kind prefix.** (2026-08-02,
    PRD-002 OQ-1.) Extends #23's three (ingredient./primitive./
    equipment.) with governed technique entries (technique.refogado,
    technique.bulhao-pato, …) under identical governance: append-only,
    kind-prefixed ontology paths, one file per entry, steward-approved.
    Techniques earn registry status because they are load-bearing for
    substitution anchoring (research 06) and the derived technique facet
    (#10); the interim vocab list retires when PRD-002's FR-REG-003
    lands. Difficulty facet (same session): integer 1–5, source books'
    1–3 hat scales map in per-ingest with the mapping recorded.

26. **The ubiquitous language is binding** (2026-08-03). The domain
    vocabulary in `docs/ubiquitous-language.md` governs all project
    prose, PRDs, specs and identifiers-adjacent naming: the two-axis
    model (nature × consumption position, never a hard type boundary —
    the roux lesson, research 08 F4); industry-verified terms —
    sub-recipe (ERP-unanimous), preparation/prep, method (authored
    steps only, never a cooking technique), technique, schedule (of a
    method) as the Calculus derivation distinct from the kitchen's
    aggregated prep list / production schedule (app-side, like menu
    item); "Protocol" reserved for RCP itself — "the recipe's
    protocol" is banned. pt-PT display layer recorded (modo de
    preparação, confeção, técnica, ficha técnica). Terms bound after
    a four-track web-verified survey (formats, tradition, ontologies,
    industry terminology) and three rounds of Daniel's refinement.
    Changes to the vocabulary require a new decision entry.

27. **Book-derived media: private-local carve-out** (2026-08-03,
    amends the #11/SP-004 media boundary). Media derived from source
    books (page photographs, crops of their step photography) MAY exist
    in the gitignored private collection (`private/collection/media/`)
    for Daniel's personal use only — format-shifting of books he owns.
    ABSOLUTE and mechanically enforced remainder: such media never
    enters commits, dist, artifacts, conformance vectors, or any
    published/shared surface — the media attestation (binary + base64
    text scan) enforces the repo side; the never-serialized rule keeps
    it out of anything the viewer persists. Personal photos of Daniel's
    own cooking remain the only media class eligible beyond the local
    boundary. Supersedes the stricter never-reproduced reading recorded
    in FEAT-TOOL-002 (2026-08-03, same day).

28. **Stage-forked identity lives in BOTH homes** (2026-08-03, closes
    research 08 F6, the open modelling question carried into PRD-004).
    A preparation whose identity forks on a MEASURED CHECKPOINT —
    Escoffier's roux blanc/blond/brun differ only by cook time;
    Portugal's ~12 pontos de açúcar are temperature-indexed stages of
    ONE calda — is modelled as ONE class carrying its graded stage
    outcomes as bounded data (stage id + the checkpoint that defines
    it), and a recipe's endpoint MAY reference a stage by id, so the
    measurement and the name stay bound. One class with N graded stages
    beats N near-duplicate sibling classes. CONTRADICTION RULE: when a
    recipe's measured endpoint falls outside the referenced stage's
    class bounds, validation WARNS naming both values and the recipe's
    MEASUREMENT WINS — books name stages loosely and an author who
    measured did so deliberately. This is deliberately NOT the
    fail-closed posture used elsewhere: a stage label is a naming
    disagreement, not a safety bound. Severity-critical constraints
    remain governed fail-closed by the Calculus and are untouched by
    this rule. A STAGE is distinct from a VARIANT: same ingredients and
    a different endpoint is a stage; different inputs is a variant
    (recorded in `$defs/variantAxis`, v0.4).

29. **Compiled variants are rejected; drift is detected instead**
    (2026-08-03, closes the open question research 06 §6 left behind).
    Research 06 specified `derived_from`/`apply`/`materialised_at` — a
    variant GENERATED by resolving a parent plus substitution ops, then
    frozen — and named the alternative "the failure mode of every
    fork-based system". RCP nonetheless ships the fork-based shape, and
    this decision records WHY rather than leaving the contradiction
    silent. Grounds are constitutional, not economic: a compilation
    step would be a SECOND EXECUTION SEMANTICS sitting beside the
    Recipe Calculus, requiring its own conformance vectors, and it
    reads as formulas-in-data — both founding non-goals. It also fights
    offline self-containment (DECISIONS #9: variants are self-contained
    snapshots, never computed diffs), and it is only meaningful once
    the substitution catalog exists (FEAT-SUB-001, not in v0.4). What
    v0.4 ships instead is DETECTION: lineage pointers take
    componentRef's pin shape, and a parent that moves past the pin is
    reported as staleness naming both revisions. You are not saved from
    drift; you are guaranteed to find out. Revisit when FEAT-SUB-001
    lands.

### Reaffirmed (2026-08-02, post-interview)

- **#8 stands: the semantic layer stays CUE-flavoured.** Challenged on the
  grounds that #13/#15 make the Recipe Calculus a constraint engine anyway
  (risking dual implementations of the same bounds); Daniel reaffirmed CUE.
  Mitigation for the drift risk: constraint bounds remain declarative data
  in profiles, and the cross-stack conformance vectors (#13) are the proof
  that CUE-side admission and Calculus-side cook-time enforcement agree.

## Gates released (2026-08-02)

Daniel released all three held gates from CONCLUSIONS §7 step 1:

- **ICP bok artifact store** — explicitly approved and executed: artifact
  `019fc312-56e9-70d1-82f3-fb599a2dc5ab` stored (type `icp`, target
  "RCP — personas"), playbook run `019fc287-6a45-79aa-a460-4feaabaf8795`
  marked completed.
- **Personas promotion** — confirmed (already canonical at
  `docs/personas.md` since 2026-08-02).
- **The three DECISIONS corrections** — confirmed (Daniel's course
  corrections 1–3 from the ICP review, already captured as decisions
  #11–12 and applied in `docs/personas.md`).

## Decided (2026-08-04, during PRD-005 hosting research)

### #30 — The `$id` host is the protocol's own domain, never a consumer's

**Found:** every schema `$id` from v0.1 through v0.4 published as
`https://paodeportugal.pt/schema/rcp/{MODEL}/...` — Fornada's domain. That
is a *consumer* of the protocol lending its identity to the protocol
itself. Nothing broke, which is why it survived four tagged versions: no
document carries a schema URL (documents carry `rcp: <MODEL>`), every
`$ref` is local, and the frozen decode-compat surface never referenced it.
It was inert until the moment those URLs resolved — which the v0.5
documentation site was about to make happen.

**Decided:** the `$id` host is a domain belonging to the protocol. Daniel,
2026-08-04: *"It won't be paodeportugal for sure and it should not be in
the protocol."*

Shape chosen: **the protocol's own domain**, over a permanent-identifier
service (w3id.org / purl.org). The trade-off was stated and accepted — an
own domain means the protocol's identity depends on renewing it forever,
where a redirect service would let the identity outlive any host. Chosen
anyway for directness and because it matches what json-schema.org,
asyncapi.com and spec.commonmark.org all do.

**Interim state:** the protocol is not named yet, and the host follows the
name. Until then `$id`s use `rcp.invalid` — RFC 2606 reserved, guaranteed
never to resolve, so it cannot be mistaken for live or fetched by accident.
A non-resolving placeholder is the honest representation of an unpublished
identity. `schema/VERSIONING.md` says so in the normative text.

**Not a MODEL bump.** No previously-valid document stops validating; no
document referenced the host at all. Cheap *only while unpublished* — once
the URLs resolve and a reader pins them, the host joins the published
contract and may only change by the ADDITION/deprecation path.

**Enforced:** `accept.sh` ID-HOST — all `$id`s share one host, and that host
is not on the consumer denylist. Ships with an inverted proof (plant the old
domain, assert detection). The gate deliberately *accepts* `rcp.invalid`: a
gate that fails on the known-correct interim state gets muted, and a muted
gate protects nothing.

**Consequence:** OQ-1 (hosting) is blocked on naming the protocol. The
earlier analysis that narrowed hosting to Cloudflare-on-the-existing-zone or
the GitHub Pages user-site trick was built on serving `paodeportugal.pt/schema/*`
as a subpath, and is withdrawn — on the protocol's own domain a whole-hostname
binding is what you want, so Netlify, Vercel and a plain bucket all reopen.

### Governance gap found the same day (not a decision — a defect)

Decisions **#24–#29 are cited across the repo** — `accept.sh:60` cites #27,
`PLAN-rcp-v03.md` cites #27, `ROADMAP.md` cites #27, and #24/#25/#26/#28/#29
appear in plans and specs — **but none of them are recorded in this file.**
A gate script enforces a decision that the decisions log does not contain.
This entry is numbered #30 to preserve those existing references rather than
renumber them. Back-filling #24–#29 from the v0.3/v0.4 plans is outstanding.

## Back-filled 2026-08-04 — decisions #24–#29

These six were **made** during the v0.2–v0.4 cuts and have been load-bearing
ever since — cited by schemas, linter code, gate scripts, guidelines and
plans — but were never written into this file. The gap was found on
2026-08-04 while recording #30.

They are reconstructed here from the artifacts that cite and implement them,
not from memory. Each entry names its evidence so the reconstruction is
checkable. Where the original interview wording is not recoverable, the
substance is stated from the implementation and the citing prose; nothing is
invented to fill a gap. **Status is `recorded late`, not `newly decided`** —
the code has been enforcing these for two cuts.

### #24 — Registry identifiers are English-base; pt-PT is display only

Taxonomy identifiers use English-base slugs on an ontology path
(`equipment.oven.wood-fired`, not `equipment.forno-lenha`). Localized names
live in `display_name.{pt,en}`, never in the id. A named-style exception
exists for dishes/preparations whose name *is* the term
(`technique.bulhao-pato`).

Executed as a rename refactor 2026-08-02: superseded entries were **kept and
marked**, not deleted — `equipment.forno-lenha`,
`equipment.forno-alta-temperatura`, `equipment.forno-domestico-com-vapor`,
`equipment.batedeira-espiral` all still resolve and point at their
English-base successors, per the append-only registry rule.

*Evidence:* `registry/entries/equipment/equipment.oven.wood-fired.yaml:7`
("English-base successor of equipment.forno-lenha, DECISIONS #24 refactor,
2026-08-02"); `docs/ubiquitous-language.md:27`;
`docs/product/features.yaml:283,294`; `tools/rcplint/v02_equipment_refactor_test.go`;
PRD-002 sidecar trace.

### #25 — `technique` is the fourth governed registry kind

The interim `registry/vocab/techniques.yaml` list graduated to full per-entry
files under `registry/entries/technique/`, with its own schema
(`registry/schemas/technique.schema.json`). `execution_modes[].technique`
references full entry ids and the L2 linter validates them against entries;
the vocab file was **deleted**. Seed batch approved by Daniel 2026-08-02.

The rule this established is the *growth path*, and it is the reusable part:
a documented vocabulary graduates to a registry kind when it outgrows trivial
size or needs per-entry metadata — and each graduation takes a new DECISIONS
entry. Endpoint tests and temperature stages remain vocabularies under that
same path.

*Evidence:* `registry/entries/README.md:15-23`;
`docs/guidelines/registry-governance.md:4`; `tools/rcplint/lint.go:82,154`;
`tools/rcplint/v02_technique_test.go`; PRD-002 FR-REG-003; PLAN-rcp-v02
Phase 3.

### #26 — `docs/ubiquitous-language.md` is BINDING

The domain vocabulary is binding on all project prose, PRDs and specs;
changes require a new DECISIONS entry. Terms were aligned with industry usage
via a four-track research survey plus three refinement rounds with Daniel,
2026-08-03.

The founding confusion it exists to kill: *"is a roux a recipe or a
technique?"* — which is a **property of the source, not of the roux**.
Peterson files it as prose under Liaisons; Escoffier gives it batch
proportions. Both are right about their own document; the protocol needs one
answer about the thing.

*Evidence:* `docs/ubiquitous-language.md:3-10,102` (self-declared BINDING,
dated); `docs/ubiquitous-language.md:27` (cross-references #24).

### #27 — Book-derived media: local-private only, no exceptions

Media derived from source books or other copyrighted publications (page
photographs, scans, crops of printed step photos) **may exist only in a
local, git-ignored private collection** for the owner's personal use. Such
media **never enters commits, dist bundles, artifacts, conformance vectors,
or any published or shared surface. No exceptions.**

The asymmetry is deliberate and is the reasoning worth preserving: the
written word can be re-expressed under the ingestion rules; **photography
cannot** — republishing it is plain copyright infringement, and a "just this
crop" culture erodes the private-vs-published boundary the protocol treats as
first-class. Personal media — photos of the owner's *own* cooking — is the
only class eligible beyond that boundary.

*Evidence:* `schema/MEDIA.md` §"Prohibition: source-book media" (normative,
mandated anchor); `tools/rcplint/scripts/media-allowlist.txt:4`;
`accept.sh:60` and the media-attest gate + its inverted self-test;
PLAN-rcp-v03:28,57,206,212.

### #28 — Stage-forked identity: stages live in BOTH homes

One preparation class with N **graded stages** beats N near-duplicate sibling
recipes. The preparation/technique CLASS carries graded stage outcomes as
bounded data (stage id + the measured checkpoint — Escoffier's roux
blanc/blond/brun by cook time; the pontos de açúcar by temperature). A
recipe's endpoint MAY reference a stage by id. The class owns what the stage
*means*; the recipe names which one it wants.

**Contradiction rule:** a measurement outside the referenced stage's class
bounds **WARNS naming both values, and the MEASUREMENT WINS** — books name
stages loosely and the author measured deliberately. This is a *labelling*
disagreement, **not** a safety bound: severity-critical constraints stay
fail-closed under the Calculus, untouched.

*Evidence:* `tools/rcplint/stages.go:3,116`; `tools/rcplint/stages_test.go`;
`tools/rcplint/testdata/l2/stage-contradiction.rcp.yaml`;
`schema/rcp-core-v1.schema.json:990`;
`registry/schemas/technique.schema.json:104`; PLAN-rcp-v04:477-486, AC-7.2
PASS 2026-08-03.

### #29 — Compiled variants REJECTED; drift is detected, never compiled away

Compiled variants (`derived_from` / `apply` / `materialised_at`, research 06)
are rejected on founding-non-goal grounds: they would introduce a **second
execution semantics beside the Calculus**, and **formulas in data**.

Instead a variant is a self-contained snapshot and drift is *detected*: when a
target moves past a pinned revision, validation reports staleness naming both
revisions; when a pin names a revision the target does not declare, that is an
error. Nothing propagates automatically.

Recorded at the time specifically **so the rejection is explicit rather than
silent** — which is the part that makes writing it down here overdue rather
than optional.

*Evidence:* `tools/rcplint/lineage.go:5,110`;
`tools/rcplint/lineage_test.go:83`;
`tools/rcplint/testdata/l2/lineage-stale-pin.rcp.yaml:2`;
`schema/VERSIONING.md:106`; PLAN-rcp-v04:488-491.

### Why this happened, and what stops it recurring

The v0.2–v0.4 cuts recorded decisions **inside the plan that acted on them**
(`PLAN-rcp-v04.md:477` literally reads "record DECISIONS #28"), and the step
of writing them back to this file was never a gate. Plans are working
documents; this file is the record. A decision that lives only in a completed
plan is discoverable by grep and by nothing else.

`accept.sh` cited #27 to label a gate section while #27 did not exist here —
a gate enforcing an unwritten decision. That is the concrete failure mode.

**Closed in the same commit:** `accept.sh` DEC-RESOLVE now asserts that every
`DECISIONS #N` cited anywhere in the tracked tree resolves to an entry in this
file, with an inverted proof that plants a citation of a decision that cannot
exist and requires detection. It would have caught this on the first commit
that cited #24.

The direction is deliberate: it checks **citation → entry**, not the reverse. A
decision nobody cites is merely unused; a citation that resolves to nothing
means code claims authority from a record that cannot be read. Both entry
formats in this file count — the original numbered list and the `### #N`
headings used from #24 onward.

(An earlier draft of this entry said the gate belonged to a later cut, on the
grounds that it had never seen a real failure. That reasoning was wrong: the
repo's own discipline is that gates ship *with* an inverted proof, which is
exactly what answers it.)
