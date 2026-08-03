---
type: spec
id: SPEC-004
title: RCP v0.4 implementation — identity, trust and teaching
status: draft
author: Daniel Gomes
implements: PRD-004
source_prd: PRD-004
source_brainstorm: null
source_prompt: null
created_at: 2026-08-03T16:50:00Z
references:
  adrs: [ADR-002]
  invariants: []
---

# SPEC-004: RCP v0.4 implementation — identity, trust and teaching

**Implements:** PRD-004
**Date:** 2026-08-03
**Author:** Daniel Gomes

---

## Summary

Three layers, built in dependency order. **Identity** makes every reference
unambiguous: ids scope to a collection, cross-collection pointers must be
qualified, and a pack manifest names the collection. **Trust** makes resolved
references verifiable: a resolution record carrying `resolver_version` and a
content hash, with a verifier that fails loudly on a changed or missing
target. **Teaching** then rests on both: canonical links from registry classes
to the documents that teach them, an extraction rule the linter enforces, a
see-the-method affordance in the viewer, and time-addressable media.

The design principle throughout is *reuse the pin*. `componentRef` already
pairs a target-declared `version` with a reference-site pin; lineage pointers
take the same shape with different semantics, and drift detection falls out of
machinery engineering obligation 3 already owes.

## Context

Research 09 established that RCP's `lineage` block is an undesigned port of a
consuming app's columns — four fields, no descriptions, no decision entry, zero
uses across twelve documents — and that `variant_label` is prose, so nothing
machine-readable says what distinguishes two variants. BRAIN-001 resolved the
modelling: collections do not flatten on merge, so an id collision between two
collections is not an error but a qualification question.

The `componentRef` version pin exists because the brownie→ganache defect forced
it; the same defect class is currently unaddressed on the lineage edge, and the
linter's pin check verifies only that the target declares *some* version, never
that it matches. Both gaps close here.

## Existing Architecture

Documents are YAML validated in three layers (`make validate`): L1 JSON Schema
(`schema/rcp-core-v1.schema.json` + `schema/profiles/*`), L2 semantic lint
(`tools/rcplint/lint.go`), CUE bounds (`schema/constraints/bounds.cue`). The
Recipe Calculus (`calculus/`) is normative with 21 frozen vectors replayed by
two implementations. The viewer (`tools/viewer/`) consumes documents behind the
ADR-002 engine seam, whose `capabilities` map lets new abilities light up
without UI rewrites. Registry entries live in `registry/entries/<kind>/` across
four kinds today: ingredient (61), primitive (24), technique (13), equipment
(10).

## Proposed Design

### Layer 1 — Identity

**Collection scope.** A *collection* is the document set a consumer loads
together. Ids are unique within it. An unqualified reference — `ref:`,
`forked_from:`, `variant_of:`, `family:`, a canonical link — resolves inside
the referring document's own collection, always. A reference into another
collection MUST carry that collection's identifier; unqualified cross-collection
resolution is not attempted, so misbinding is impossible by construction.
Merging collections never rewrites an id and never flattens: two documents
sharing an id from different collections both remain resolvable.

**Pack manifest.** A separate file (`rcp-pack.yaml`) beside the documents, with
its own small schema — deliberately *not* a `kind:` value on the recipe core,
so the `kind` enum and the decode-compat surface stay untouched. It declares
the collection identifier authoritatively, plus optional publisher, licence and
version. A document MAY carry the same identifier for lone travel; the manifest
wins on conflict and the conflict is reported.

**Qualifier value space.** The collection identifier is an opaque string in its
own field. The recipe `id` pattern MUST NOT widen — a document id stays a bare
slug. This is what keeps a future distribution layer (domains, URIs) possible
without a MODEL bump.

### Layer 2 — Lineage, variants and revisions

**Lineage described and pinned.** Every `lineage` field gains a schema
description and a pinned-revision form mirroring `componentRef`
(target-declared `version` + reference-site pin), optionally qualified by
collection. A fork remains a new document with its own id and a full
self-contained body; `family` is the capability-style grouping slug ("these
documents fill the same role").

**Variant discriminator.** A variant declares `axis` (closed enum + catch-all)
and `value`. Value resolution is **per axis**, against what already exists
rather than four newly-empty registries:

| Axis | Value resolves against | Status today |
|---|---|---|
| `equipment` | `equipment.*` registry | exists (10 entries) |
| `technique` | `technique.*` registry | exists (13 entries) |
| `diet` | closed enum seeded from schema.org `RestrictedDiet` (verified prior art, research 09) | new enum, no registry needed |
| `region` | ISO 3166-1 alpha-2, optionally with ISO 3166-2 subdivision — the encoding `origin.country` already uses | reuses existing precedent |
| `season` | closed enum (four seasons) | new enum, naturally closed |
| `scale` | closed enum (batch context: domestic / professional) — SAP's multiple-BOM "different lot-size ranges" is the verified analogue | new enum |
| `other` | catch-all; `variant_label` carries the human explanation | always valid |

No axis ships pointing at an absent registry: an axis either resolves against a
registry that exists, an external standard already used by the core, or a
closed enum defined in this spec.

**Document revisions (closes PRD OQ-5).** `schema/VERSIONING.md` gains a
document-revision section stating: when `version` MUST increment (any change to
ingredients, steps, constraints, yields or lineage of a *published* document);
that a published `(collection, id, version)` triple is immutable — a correction
is a new revision, never an edit in place; and that supersession is signalled
by the successor revision alone (there is no separate supersession pointer in
MODEL 1 — recorded as a deliberate minimalism, revisitable).

### Layer 3 — Trust

The resolution record follows npm's verified shape plus the field npm lacks:

```yaml
resolved:
  target: { collection: <id>, id: <slug>, version: <n> }   # which candidate
  source: <opaque locator>                                  # from where
  content_hash: "sha256:<hex>"                              # same bytes
  resolver_version: <string>                                # who resolved it
```

Hashing is over the **canonical JSON serialisation** of the resolved document,
computed with the Go standard library only (dependency freeze). The claim being
made is explicitly *content*-addressing ("these exact bytes"), not
input-addressing — stated in the spec text because the two are routinely
conflated.

Two modes over the same corpus, mirroring `npm install` / `npm ci`: **reconcile**
(compute and write records) and **frozen** (verify only; any divergence is a
failure, nothing is rewritten). Frozen mode is the fail-closed posture the
project already applies everywhere else.

### Layer 4 — Teaching

**Canonical links.** A `technique.*` or preparation-class registry entry MAY
carry `canonical_recipe: {collection?, id, version}` — the document that
teaches the method. Optional forever; curation, not essence.

**Extraction rule + linter.** Binding: a sub-preparation whose method the
source gives becomes an inline component; one named without a method becomes a
class reference; prose is never invented and never silently dropped. The linter
warns when step prose contains a registry-known preparation or technique term
that nothing in the document anchors, and — per Daniel's choice — also flags
authored patterns (`faça um X`, `prepare um X`, `make a X`) where X is unknown
to the registry, from a maintained pt/en pattern list.

**See-the-method.** The viewer gains a capability-gated affordance: from a
linked mention, load and render the linked method without losing the parent,
and place it in the schedule before its consuming step via the existing
two-stage Calculus schedule.

**Media fragments.** `schema/MEDIA.md` blesses W3C Media Fragments (`#t=s,e`)
on any media `uri`; renderers pass the fragment through to playback. Whether
structured `start`/`end` fields ALSO enter core is settled here: **they do
not** — the fragment is the sole normative encoding in MODEL 1, because a
second encoding for one fact invites divergence and the fragment already
round-trips through every renderer that handles URLs. (Closes PRD OQ-1.)

## Components

| Component | Path | Change |
|---|---|---|
| Core schema | `schema/rcp-core-v1.schema.json` | lineage descriptions + pinned form; variant `axis`/`value`; optional collection qualifier fields; **no `id` pattern change, no new required field** |
| Pack schema | `schema/rcp-pack-v1.schema.json` | NEW — manifest format |
| Versioning doc | `schema/VERSIONING.md` | NEW section: document revisions, immutability, supersession |
| Media doc | `schema/MEDIA.md` | NEW section: temporal fragments |
| Linter | `tools/rcplint/lint.go` (+ new files) | scope resolution; qualified-ref enforcement; staleness; hardened pin compare; mention detection |
| Resolver/verifier | `tools/rcplint/resolve/` | NEW — record shape, canonical JSON, hashing, reconcile/frozen modes |
| Registry | `registry/entries/`, registry schema | `canonical_recipe` field; axis enums |
| Viewer | `tools/viewer/src/` | see-the-method affordance; fragment passthrough; capability additions behind ADR-002 |
| Examples | `examples/` | documents exercising lineage, variants, a second collection, and a stage fork |

## Non-Goals

- **Pack services** — hosting, publishing workflow, a registry server. Format
  only (PRD SP-007, DECISIONS #19/#21).
- **Compiled variants** (`derived_from`/`apply`) — rejected: a second execution
  semantics beside the Calculus, and formulas-in-data.
- **Global identity** — no UUIDs, no URIs, no content-addressed *recipe*
  identity. Content hashes identify *revisions*, never recipes (research 02
  D.4: a typo fix must not mint a new recipe).
- **Automatic resolution of mentions** — which roux a mention means stays
  authored/curated; no runtime LLM.
- **Widening the `id` pattern** — the one change that would force a MODEL bump.

## Alternatives Considered

### Global identity (UUID or URI per recipe)
- **Pros:** unambiguous everywhere with no scope rules; survives any merge.
- **Cons:** unreadable ids in an authoring format; forces id allocation into
  the protocol, which Daniel explicitly placed with systems; widening the
  pattern breaks v0.1 readers.
- **Rejected because:** scoping achieves the same guarantee inside the boundary
  that matters, and keeps allocation a system concern.

### Reject-on-collision (the architect's first framing)
- **Pros:** simple, fail-closed, no new fields.
- **Cons:** makes importing two independently-authored packs an error the user
  cannot fix without editing someone else's documents.
- **Rejected because:** Daniel's collection-scoping makes the collision a
  non-event — strictly better than failing on it.

### Compiled variants (research 06's `derived_from`/`apply`)
- **Pros:** a parent fix propagates; no drift by construction.
- **Cons:** second execution semantics needing its own conformance vectors;
  formulas-in-data; fights offline self-containment; needs FEAT-SUB-001.
- **Rejected because:** founding non-goals, on the architect's constitutional
  argument. Detection delivers the practical benefit at a fraction of the cost.

### Structured `start`/`end` beside `#t=` fragments
- **Pros:** machine-readable without URI parsing; validatable bounds.
- **Cons:** two encodings for one fact; divergence when they disagree.
- **Rejected because:** the fragment already works end-to-end in renderers and
  round-trips as part of the URI.

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation | Rollback |
|---|---|---|---|---|
| Cut size (~2× v0.3) stalls before a tag | High | Medium | Strict layer ordering; each layer ends green and committable | Tag after any completed layer |
| Full axis enum ships values nothing uses | Medium | Medium | Per-axis resolution table — every axis backed by an existing registry, external standard, or closed enum defined here; example documents exercise each shipped axis | Axis values are additive; unused ones deprecate |
| Qualified-reference requirement breaks existing documents | High | Low | Single-collection corpora are unqualified by definition and unaffected; enforcement triggers only when >1 collection loads | Enforcement is a lint rule, disableable |
| Document-revision rules invalidate existing examples | Medium | Low | Rules bind published documents; the corpus's `provenance.status` is mostly draft/unverified | Section is documentation + lint, not schema |
| Hash pins go stale in normal authoring | Medium | Medium | Records exist only for published/resolved corpora; authoring references stay unpinned (`version` "omit only in authoring" already) | Frozen mode is opt-in |

## Security Considerations

Hashing uses `crypto/sha256` from the standard library — no new dependency
(PRD SP-005). Verification is fail-closed: a missing target, a changed hash, or
an unknown `resolver_version` is a failure, never a silent pass. The pack
manifest introduces no network behaviour; resolution is over locally loaded
collections only. Media fragments carry no new egress — the CSP's
`media-src data: blob:` remains exact and unchanged.

## Performance Approach

Standard patterns sufficient. Resolution and hashing are O(documents) per run
in a corpus of tens of documents. The viewer's see-the-method loads an
already-parsed document from the loaded collection — no fetch.

## Acceptance Criteria

PRD ACs pass through unchanged in the sidecar. Spec-added architectural
criteria:

- **SAC-PACK-001**: The recipe `id` pattern in `schema/rcp-core-v1.schema.json` is
  byte-identical to its v0.1 form — Verify: diff the `slug`/`id` definitions
  against `git show <rcp-v0.1 pin>`.
- **SAC-PR-001**: No new REQUIRED field anywhere in core; the frozen v0.1 reader
  still decodes every current document — Verify: `go test -run TestDecodeCompat ./...`.
- **SAC-REG-001**: Every shipped axis enum value resolves against an existing
  registry kind, a named external standard, or an enum defined in this spec —
  and at least one example document exercises each — Verify: registry/axis
  coverage test.
- **SAC-PUB-001**: Frozen mode fails on a mutated target and passes on an intact
  corpus (inverted proof ships with the gate) — Verify: resolver test suite.
- **SAC-CALC-001**: Calculus vectors are byte-identical after the cut; `make calculus`
  green in both implementations — Verify: `make calculus` + `git diff --stat calculus/vectors/`.
- **SAC-TOOL-001**: The viewer bundle stays under 500 KB with the CSP string
  unchanged — Verify: existing `accept.sh` CSP-EXACT check.

## Testing Strategy

Layer 1 needs a **second collection fixture** — the first time the corpus has
one — with a deliberate id collision against `examples/`, proving both resolve
and neither rewrites. Layer 2 tests lineage pins (matching, stale, missing) and
axis resolution per axis. Layer 3 tests reconcile→frozen round-trip plus the
mutation inverted proof. Layer 4 extends the existing viewer suites (bun) for
see-the-method and fragment passthrough, and the linter fixtures for extraction
warnings, one fixture per rule as the L2 suite already demands.

Hard to test: whether curation *scales* (PRD's riskiest assumption) — no test
can prove it; the mention-detection warning is the closest proxy, since a rising
count of anchorless mentions is the early signal.

## Dependencies

ADR-002 (engine seam) constrains viewer changes to capability additions.
DECISIONS #4 (enum/registry/prose), #14 (decode-compat), #19/#21 (scope line),
#23 (registry ids immutable), #26 (vocabulary), #27 (media boundary). Research
02, 06, 08, 09 and BRAIN-001 are the evidence base. No new external
dependencies — hashing is stdlib.

## Open Questions

- NEEDS CLARIFICATION: the exact `diet` enum value set — schema.org's
  `RestrictedDiet` has 11 values; whether RCP ships all 11 or the subset its
  corpus exercises is a curation call to make during Layer 2.
- NEEDS CLARIFICATION: whether `family` grouping should be validated for
  agreement (all members of a family declaring the same family slug) or left
  unvalidated in MODEL 1.

---

*Generated by edikt:spec — 2026-08-03*
