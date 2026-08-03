---
type: brainstorm
id: BRAIN-001
title: "Recipe identity across systems: scoped ids, collections, and what a fork points at"
status: draft
mode: grounded
created: 2026-08-03
participants: [user, claude]
agents_consulted: [architect]
produces: prd
---

# Recipe identity across systems

## Problem

RCP documents identify themselves with a bare slug (`pao-alentejano`), unique
only within one lint file set. Three consequences, all evidenced in research 09:

1. **Two systems holding `pao-alentejano` cannot tell whether it is the same
   recipe.** Identity has no namespace, no authority, no fingerprint (F9).
2. **Forks inherit the ambiguity.** `lineage.forked_from` / `variant_of` are
   bare slugs with no version — a fork cannot say which revision it forked
   from, while `componentRef` pins a version precisely because the
   brownie→ganache defect forced it (F1, F9).
3. **Variants are not machine-selectable.** `variant_label` is prose, so
   nothing in the protocol says *what distinguishes* two variants — the direct
   blocker on "which variation did I get?" (F2).

Daniel's framing: does the system need a globally unique ref id for
forks/variants, and does this point toward a distribution layer later ("kind of
a recipe npm")?

## Exploration

**Daniel's first move reframed the question.** Asked what *should* be true when
two systems hold the same slug, he rejected the premise: *"that's a system
problem — they should not have same id for two different recipes; we define the
protocol not how systems use them."* Consistent with DECISIONS #19/#21 (RCP is
a published language, not a platform domain model).

**The part the protocol cannot dodge.** RCP defines what a *reference* means.
When a document says `forked_from: pao-alentejano`, the protocol must state in
what scope that string resolves, or a document is not self-describing and two
systems exchanging documents share no rule. By #21's own boundary test — "what
is visible in the documents" — reference scope is a format fact even though id
allocation is not.

**Daniel's second move dissolved the collision problem.** Presented with the
architect's reject-vs-rewrite question (on merge, two `pao-alentejano`
documents land in one set while other documents' pointers still name that
slug), he proposed a third answer: *"if it comes from a collection the id is
unique within it? so on import a pack if an id is same they would show the pack
name they belong to."* — **collections do not flatten on import.** Both
documents survive, distinguished by their collection; pointers stay correct
because a reference resolves relative to its own collection. No rejection, no
rewriting, no silent misbinding: the collision is not one.

This is npm scopes / Java packages, arrived at from the recipe side — and it is
the seed of the distribution layer Daniel sensed. A "recipe npm" is a system
that publishes *collections* and lets you name one; the protocol supplies the
nameable collection, not the service.

**Prior art considered** (research 09, four verified tracks):

- Every mature domain separates version / variant / fork onto distinct,
  non-overloaded fields (STEP's three-level `product` → `formation` → `definition`;
  SAP's `Technical type` enum doing nothing but variant-vs-alternative;
  Gradle attributes; Maven classifier).
- Gradle's **capability** — "what role does this fill" as distinct from "which
  artifact is this" — is the concept RCP's `lineage.family` is groping at
  without a name.
- The recipe domain has solved none of this: microformats' `u-remix-of` is
  blocked for want of any publisher or consumer; Modernist Cuisine's parametric
  recipe (structurally the right answer) exists only as print layout.
- CSS is the proof case for the shape wanted: name a total precedence order,
  terminate it in a tiebreak that cannot fail, own no UI.
- npm's `version` / `resolved` / `integrity` split — which candidate, from
  where, same bytes — maps directly onto FR-PUB-001, plus `resolver_version`.

**The architect's decisive contribution** was to kill the compilation option on
constitutional rather than economic grounds: "compile variants from parent +
ops" is a *second execution semantics* beside the Recipe Calculus, would need
its own conformance vectors, and reads as formulas-in-data — a founding
non-goal. Whereas version-pinned lineage + staleness detection "falls out of
machinery you owe anyway" (`componentRef`'s pin shape + obligation #3's
resolver_version/content hashes). It also warned: put the distribution future
in the *qualifier's* value space, never by widening the `id` pattern — that is
the one change that forces a MODEL bump.

## Decisions

1. **Id allocation is a system concern; reference scope is a format fact.** The
   protocol never dictates how a system mints ids, and always says how a
   reference resolves.
2. **Ids are unique within a COLLECTION.** Unqualified references resolve
   within the referring document's own collection; a reference crossing into
   another collection must name it; merging collections never flattens them.
3. **A fork/variant is a NEW document with its own id**, carrying a
   version-pinned pointer to its parent — matching the settled position that
   variants are self-contained offline snapshots.
4. **Variant discriminators are machine-readable:** a typed axis (closed enum
   with a catch-all from day one, per decode-compat) plus a registry-resolvable
   value. `variant_label` stays as the human display string.
5. **Drift = detection, not compilation** (option A). Lineage pointers take
   `componentRef`'s shape; tooling reports staleness naming the variant.
   Compilation (`derived_from`/`apply`/`materialised_at`, research 06) is
   rejected for v0.4 on founding-non-goal grounds — recorded, not forgotten.
6. **Collection identity: both.** A manifest declares it authoritatively;
   documents MAY carry it for lone travellers (manifest wins on conflict).
7. **Pack FORMAT is in scope; pack SERVICES are not.** The manifest, its
   identifiers and cross-pack resolution semantics are protocol; hosting,
   publishing workflow and any registry server stay app-side (#19/#21).
8. **Scope: one big v0.4.** Daniel's call, with the size flagged: identity +
   trust + teaching together, roughly 2× the largest previous cut. The
   identity→teaching dependency (canonical links point at documents) is
   satisfied by ordering *within* the cut rather than across versions.

## Open Questions

- The axis enum's initial values (diet / equipment / region / season /
  technique / scale?) and the name of its catch-all.
- Do registry kinds for diet, region and season need seeding before the
  discriminator can resolve? The architect flagged "shipping a field that
  points at absent registries is the failure mode."
- How `import` and `provenance` relate to the new collection qualifier —
  research 02 D.4's warning stands: "don't conflate identity with provenance."
- Whether the qualifier is mandatory on cross-origin pointers (the architect's
  asymmetry point) or whether collection-relative resolution makes that moot.
- Document versioning remains unspecified (research 09 F9): when must a
  revision increment, is a published revision immutable, what signals that v2
  supersedes v1?

## Constraints

- **DECISIONS #19/#21** — users, ownership, collections-as-product-features and
  publishing are app concerns; the boundary test is "what is visible in the
  documents."
- **DECISIONS #23** — registry ids are kind-prefixed and immutable.
- **Decode-compatibility (#14)** — no new required field without a default;
  every enum needs a catch-all; widening the `id` value pattern would break
  v0.1-era readers and force a MODEL bump.
- **Offline self-containment** — variants are full snapshots, never computed
  diffs (proposal §D8c; DECISIONS #9).
- **No formulas in data / no runtime LLM** — founding non-goals; the reason
  compilation is rejected.
- **ADR-002** — the viewer's engine seam absorbs new capabilities without UI
  rewrites; identity work must not break it.

## Next

Reshapes **PRD-004** (currently draft, teaching + trust) into the full v0.4
cut: identity + trust + teaching. Research 09 is the evidence base; this
brainstorm supplies the decisions.
