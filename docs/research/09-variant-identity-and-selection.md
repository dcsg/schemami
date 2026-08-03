# 09 — Variant identity and selection: which one did I actually get?

**Date:** 2026-08-03 · **Trigger:** Daniel, during PRD-004 scoping — *"what I
think can happen most is selecting a variation of the recipe instead of the
original that has slightly different methods/ingredients."*

Four parallel investigations: cross-domain prior art (packages, VCS, ERP BOM,
STEP), the recipe domain specifically, resolution/selection semantics, and an
internal sweep of what RCP already says. Every external claim is cited in the
agent reports; unverified items are marked as such below. Append-only per
repo convention.

---

## F1 — RCP already has a lineage block. It was never designed, never
## described, and never used.

`schema/rcp-core-v1.schema.json:331-348`:

```json
"lineage": {
  "type": "object",
  "properties": {
    "forked_from":   { "$ref": "#/$defs/slug" },
    "family":        { "$ref": "#/$defs/slug" },
    "variant_of":    { "$ref": "#/$defs/slug" },
    "variant_label": { "$ref": "#/$defs/text" }
  },
  "additionalProperties": false
}
```

Four fields, **zero descriptions** — the only block of this weight in a schema
that describes everything else. No DECISIONS entry governs it; the word
"lineage" does not appear in `DECISIONS.md` at all. It has **zero uses across
all twelve documents** (six public examples, six private collection). Its
origin is traceable: `00-PROPOSAL §5` maps Fornada's SPEC-006 columns
(`forked_from`, `recipe_family_id`, `variant_of_recipe_id`, `system_no`) onto
"RCP identity/lineage fields" — the block is a **direct port of an app's
columns**, not a designed protocol feature.

Consequence: everything the repo has settled about forking — the D8c
three-level rule, research 06's six-trigger promotion rule — is settled **in
prose only**. The regression suite proves none of it.

## F2 — The distinguishing axis is not machine-readable. This is the blocker.

`variant_label` is `$ref: text`, and `text` is defined (`:412-420`) as
permitted "ONLY where the sole consumer is a human eye". Under decision #4
(enum/registry/prose discipline) a renderer may not legitimately read it to
make a choice.

So RCP can currently say *that* two documents are variants of one family, and
can print a human label — but **nothing in the protocol says what
distinguishes them in machine-readable form**. A surface cannot filter, group,
or explain the choice. This single gap is what makes "which variation did I
get?" unanswerable today.

The recipe domain at large has the same hole (F5), so this is not a catch-up
item — it is open ground.

## F3 — Every mature domain separates version / variant / fork onto distinct,
## non-overloaded fields.

Observed across four domains (full citations in the prior-art report):

| Concept | Question | Encoding observed |
|---|---|---|
| **Version** | Which point in time? | Ordered id scoped to the parent (STEP `product_definition_formation.id` with `UNIQUE (id, of_product)`; semver; SAP `Revision level`) + optional validity window |
| **Variant** | Which parallel form, now? | Discriminator **attributes matched by predicate** (Maven `classifier`, Gradle attributes, SAP selection conditions, STEP `product_concept_feature`) — never part of the primary key |
| **Fork** | Is this still the same thing? | New identity in the identity tuple (new repo, new source id, new derivation) **+ lineage metadata pointing home** |

The sharpest single artifact is SAP's **`Technical type`**, a dedicated enum
whose only job is to answer "do these parallel BOMs represent *product
variants* or *production alternatives*?" — orthogonal to both `Alternative`
and `Revision level`. SAP found that distinction load-bearing enough to spend
a field on it.

Recurring patterns worth importing:

- **Three-level hierarchy** — enduring thing → version → variant/view (STEP,
  Gradle, Maven, SAP). The middle level is always temporal, the bottom always
  parallel; they are never the same field.
- **Variants as predicate over a superset**, not enumerated documents (SAP
  super BOM's selection conditions, STEP's `concept_feature_relationship_with_condition`,
  Odoo's `Apply on Variants`, Gradle attribute matching). RCP's settled
  position is the *opposite* — self-contained snapshots (proposal `:533-535`),
  chosen deliberately for offline completeness. Worth stating as a conscious
  divergence rather than an oversight.
- **A declared uniqueness constraint on the discriminator set** (Gradle: "two
  variants cannot have the exact same attributes and capabilities"; STEP's
  `UNIQUE` clauses). The discriminator is treated as a composite key.
- **Fork = new identity + retained lineage pointer, content unchanged**
  (GitHub forks share bit-identical objects; Nix `overrideAttrs` produces a
  new derivation from the original; Cargo's source-in-the-ID rule).

## F4 — Gradle's *capability* is the concept RCP is missing a name for.

Gradle separates *which artifact* (coordinates) from *what role it fills*
(capability, expressed `group:name:version`). Variants differ in attributes
but **share a capability**; reimplementations differ in coordinates but
**collide** on capability — and that collision is a hard error requiring
explicit human resolution ("It's illegal for Gradle to include more than one
component providing the same capability in a single dependency graph").

Mapped onto recipes: "this document *is a roux*" is a capability claim; the
classic, the gluten-free and the family roux all provide it. RCP's
`lineage.family` is the nearest existing field — an unnamed, undescribed
capability slug. Naming it properly is most of the modelling work.

## F5 — The recipe domain has not solved this. At all.

- **No consumer format has a machine-readable derived-from edge.** ORF,
  Cooklang, MealMaster, KRecipes, BeerXML: nothing. schema.org has generic
  `isBasedOn`, absent from Google's supported Recipe properties, so unpublished
  in practice.
- **The strongest single datum:** microformats' `u-remix-of` is stuck in
  *proposed* status, blocked on the process requirement of real-world
  publishers and at least one consuming implementation. The community defined
  the property and could not find anyone using it.
- **RecipeML 0.5 (2000) touched all three senses and linked none of them**:
  `<version>` (DTD comment: "which refinement of the recipe is this?" — a
  variant label, not a format version), `div type="variation"` (in-document
  section), `alt-ing` (ingredient substitution). No pointer to a parent
  recipe anywhere. Format abandoned c. 2002.
- **Industrial systems solve lineage vertically, not horizontally.** BatchML's
  `DerivedFromID` (the one explicit recipe-lineage pointer found anywhere in
  food) expresses *abstraction descent* (general → site recipe), carries no
  reason or differentiator, and exists only in the general/site schema —
  `MasterRecipeType` and `ControlRecipeType` lack it. ISA-88 answers "which
  abstraction level is this", never "which of several equally valid versions".
- **Variant identity does not survive execution in any consumer format.**
  BatchML batch records bind a batch to `RecipeID` + `RecipeVersion` (plus
  element-level versions); a shared `.cook`/`.mmf`/JSON-LD file has no answer
  to "which version did you actually make". Cooklang's answer is git branches,
  which live outside the file and do not travel with it.
- **Editorial practice has the richest model and zero encoding.** Master
  recipe + variations (Child's *Mastering the Art*, where "a special sign
  precedes those which are followed by variations"; Schmidt's *Master
  Recipes*; Cook's Illustrated's "Recipe Update"). Modernist Cuisine's
  **parametric recipe** — a shared base plus a table whose rows are variants
  and whose columns are the parameters that differ — is structurally the
  answer, and exists only as page layout.

## F6 — Selection: name a total order, terminate it in a tiebreak that cannot
## fail, and let the surface make the choice.

CSS is the proof case for the shape RCP wants (protocol names the order, owns
no UI): six criteria in descending precedence — origin/importance, context,
element-attached styles, layers, specificity, **order of appearance** — where
the last criterion makes ties structurally impossible. Browsers independently
converged on showing losers struck through, with no spec text about
presentation.

Corroborating rules from other systems:

- **Direction matters and is easy to get wrong.** `ld.so` searches `DT_RPATH`
  *above* the user's `LD_LIBRARY_PATH`; `DT_RUNPATH` was introduced precisely
  to move the author's declaration *below* the user's override — and the
  compatibility shim ("RPATH applies only if RUNPATH is absent") is the most
  misunderstood part of the order. Helm and CSS both put the invoker above the
  author. **Get author-vs-user right the first time.**
- **Distinguish override from amend, per field.** `resolv.conf`: `LOCALDOMAIN`
  *overrides* `search`; `RES_OPTIONS` *amends* `options`. "The overlay wins"
  does not say whether a list is replaced or merged.
- **Say the tiebreak out loud.** `resolv.conf`: "If there are multiple
  **search** directives, only the search list from the last instance is used."
- **Sequence ≠ precedence.** kustomize specifies application order and never
  states which value wins on conflict; it gets away with it only because
  re-rendering is free. 12-factor, despite the folklore, defines no precedence
  between config sources at all.

## F7 — What a resolution record must carry (directly usable by FR-PUB-001).

npm's lockfile splits three questions that RCP's current single `version` pin
conflates:

- `version` — **which candidate**
- `resolved` — **from where**
- `integrity` — **are these the same bytes**

Add `resolver_version` (npm's known weakness: different npm versions produce
different trees) and the record matches what engineering obligation #3 already
demands.

Three further lessons:

1. **Two documents, never one:** intent (hand-written, ranges) vs record
   (machine-written, hand-*read*). Every reproducible system has the pair —
   `package.json`/`package-lock.json`, `flake.nix`/`flake.lock`,
   channel spec/`guix describe`. Systems without the second document (CSS,
   resolv.conf, ld.so) accepted that outcomes are not auditable afterwards.
2. **Make the record a valid input.** Guix's `--format=channels` emits a
   record that can be fed back in to reproduce the exact revision. A record
   that can only be inspected is much weaker than one that replays.
3. **Two modes over the same pair: reconcile and frozen.** `npm install` may
   rewrite the record; `npm ci` "will exit with an error, instead of updating
   the package lock" and never writes. This maps exactly onto RCP's
   fail-closed posture: a surface should be able to demand that a document
   resolve as recorded and **fail** rather than silently re-resolve.
4. **Third-party verifiability is the real prize.** `guix challenge` compares
   independent builds and names each disagreeing party by hash. Integrity
   fields prove the resolver got what it recorded; content hashes plus
   independent re-resolution prove the *resolver was honest*.
5. **Be precise about which claim the hash makes.** Nix's default is
   *input*-addressing ("same inputs → same path"), not content-addressing
   ("same bytes → same path"). Only the second survives a hostile source.
   RCP should say which it means.

## F8 — "Variants are compiled, not forked" was specified here in 2026 and
## never built.

`06-substitution-model.md:236-245` gives working YAML —

```yaml
derived_from:
  recipe: rcp.pao-de-lo
  apply: [sub.butter-to-oil, sub.wheat-to-gf]
  materialised_at: 2026-08-02
```

— and names the alternative as *"the failure mode of every fork-based
system"*, because a parent fix then surfaces as "this variant is stale"
instead of drifting silently. What shipped is `lineage.forked_from`: a bare
parent pointer with no version, i.e. the named failure mode. The compensating
drift alarm (research 07 `:414`; the DDD review's `VariantDriftDetected`)
exists in no tool, feature or PRD.

This is not a new idea to invent — it is a specified idea to implement or
consciously reject.

## F9 — Adjacent gaps the sweep surfaced (real, and worth naming now).

- **Document versioning is unspecified.** `schema/VERSIONING.md` covers schema
  evolution end-to-end and never mentions the document `version` field: no
  rule for when to increment, no immutability guarantee at a revision, no
  supersession pointer, no reader rule for holding two revisions of one `id`.
  The DDD review asked directly: "what signals that v2 supersedes v1?" —
  unanswered.
- **Lineage links carry no version.** `forked_from: pao-alentejano` cannot say
  which revision. `componentRef` pins a version *because the brownie→ganache
  defect forced it*; the same defect class is unaddressed on the lineage edge.
  Research 02 D.4 specified the fix ("`basedOn` carrying the parent's id +
  optional version") and it was not implemented.
- **Two documented reference rules are unenforced.** The schema asserts "only
  `published` recipes may be referenced — a draft ref is a validation warning"
  (`:375`); no such check exists in the linter (and an architecture review
  credits it as existing). Separately the version-pin check verifies only that
  the target *declares some* version, never that it **matches** the pin
  (`lint.go:165-174`) — a stale pin is silently accepted today.
- **Recipe identity is a bare slug in an unspecified namespace**, unique only
  within one lint file set — while research 08 F2 cites "Mealie's slug-based
  identity collapses across groups" as negative proof. Research 02 D.4's
  UUID-identity + hash-revision + source-url-as-dedupe-hint recommendation
  (all three verified against shipping apps) is unimplemented.
- **A real dogfood case is already parked in prose.**
  `private/collection/easy-cream-biscuits.rcp.yaml:8-12` carries a book's
  "VARIATION (Cream Scones)" as optional ingredients with a note that a proper
  additive-variant op-list is FEAT-SUB-001 territory. A real variant, from a
  real book, that the protocol had no place to put.

---

## Design implications for PRD-004

1. **Variant selection is a protocol concern to the extent that the
   *discriminator* is a format fact.** Which variant a surface shows is a
   surface choice (settled, DECISIONS #19/#21). But *what distinguishes the
   candidates* must be machine-readable, or no surface can choose, filter or
   explain. F2 is the gap; F3/F4 give the shape.
2. **Name the three axes separately and describe them** — RCP has the fields
   (F1) and none of the semantics. SAP's `Technical type` is the precedent for
   an explicit discriminator between "parallel product" and "parallel method".
3. **Keep self-contained snapshots** (settled) while adopting the
   *predicate/attribute* idea for the discriminator only — attributes describe
   *what kind of variant this is*, they do not reconstitute the document.
4. **Publish a total resolution order with an unfailable tiebreak** (F6), and
   define what an explanation must contain (candidate set, winner, deciding
   criterion) without specifying UI — CSS's proven split.
5. **FR-PUB-001's record follows the npm shape plus `resolver_version`** (F7),
   with the reconcile/frozen mode split and an explicit statement of which
   hashing claim is being made.
6. **Decide F8 explicitly** — implement `derived_from`/`apply` compilation, or
   record a decision that RCP forks and accepts drift with a detection gate.
   Silence is the one unacceptable outcome, because the failure mode is
   already documented in this repo.
