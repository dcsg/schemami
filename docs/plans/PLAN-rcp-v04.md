---
type: plan
id: PLAN-rcp-v04
model: claude-sonnet-4-6
implements: SPEC-004
phases:
  - id: 1
  - id: 2
    model: claude-opus-4-6
  - id: 3
  - id: 4
  - id: 5
  - id: 6
    model: claude-opus-4-6
  - id: 7
  - id: 8
    model: claude-opus-4-6
  - id: 9
    model: claude-opus-4-6
  - id: 10
  - id: 11
  - id: 12
---

# Plan: RCP v0.4 build — identity, trust and teaching

## Overview

**Task:** Implement SPEC-004 — collections and pack manifests, lineage pins and
machine-readable variants, a published resolution order, a Calculus extension
for referenced preparations, verified resolution records, canonical links and
the teaching surfaces. Tag `rcp-v0.4`.
**Total Phases:** 12 (strictly serial; four layers, each independently taggable)
**Estimated Cost:** ~$3.40
**Created:** 2026-08-03
**Execution mode:** autonomous run-through; a full gate run and a TAG
OPPORTUNITY at each layer boundary (SSP-002). One human gate at the end.

## Progress

| Phase | Status | Attempt | Updated |
|-------|--------|---------|---------|
| 1     | pending | 0/5 | — |
| 2     | pending | 0/5 | — |
| 3     | pending | 0/5 | — |
| 4     | pending | 0/5 | — |
| 5     | pending | 0/5 | — |
| 6     | pending | 0/5 | — |
| 7     | pending | 0/5 | — |
| 8     | pending | 0/5 | — |
| 9     | pending | 0/5 | — |
| 10    | pending | 0/5 | — |
| 11    | pending | 0/5 | — |
| 12    | pending | 0/5 | — |

**IMPORTANT:** update as phases complete — persistent state across compaction.

## Layers and tag points

| Layer | Phases | Ends with |
|---|---|---|
| 1 — Identity | 1–3 | collections real corpus-wide; **tag opportunity** |
| 2 — Lineage, variants, resolution order | 4–7 | **tag opportunity** |
| 3 — Calculus extension + trust | 8–9 | **tag opportunity** |
| 4 — Teaching | 10–11 | **tag opportunity** |
| Ship | 12 | `rcp-v0.4` |

## Standing rules (EVERY phase)

- **Gates green:** `make validate` + `make conformance` + `make calculus` +
  `make accept`; `go -C tools/rcplint test -count=1 ./...`; `bun test` in the
  viewer. A phase is not complete until all are green.
- **Vector discipline:** `calculus/vectors/` is frozen. Phase 8 is the ONLY
  phase permitted to change it, and only inside a `calculus/SPEC.md`-change
  commit (DS-CALC-002). Any other vector edit is a defect.
- **Decode-compat (SP-002):** no new REQUIRED field without a default; the
  frozen v0.1 reader gate stays green both directions; qualifiers and manifests
  ride in on optional fields.
- **The id pattern is frozen (SP-006):** `$defs/slug` and `recipe.id` must stay
  byte-identical to their v0.1 form. Phase 2 adds a TEST for this, not a habit.
- **Dependency freeze (SP-005):** stdlib only for hashing; viewer stays at
  exactly `yaml` + `@cfworker/json-schema`.
- **Privacy:** `private/collection/` never enters commits, dist, artifacts,
  vectors or records. The attestation stays green. Any new corpus content is
  authored from own or public-domain sources — never copied out of the private
  collection (pre-flight security #3).
- **Vocabulary:** DECISIONS #26 binding; #27 media boundary in force.
- **Public-normative purity (SP-003):** `calculus/SPEC.md` gains no project ids.
- Commit small, cite SR/AC ids, `git -c commit.gpgsign=false commit`.
  `docs/research/` is append-only. pt-PT culinary terms exact.

## Decisions folded in from the pre-flight review

| Finding | Resolution (Daniel, 2026-08-03) |
|---|---|
| 🔴 second collection invisible to gates until L4 | **Moved to Layer 1 (P3)** — discovery is L1 loader work; P4–P9 are written against the corpus they must hold for |
| 🔴 resolution order orphaned across layers | **Own phase (P6) in Layer 2**; the `canonical_recipe` SCHEMA moves forward to P6, leaving only registry AUTHORING in L4 |
| 🔴 linked prep not schedulable — Calculus skips refs | **Extend the Calculus (P8)**: new edge class, new vectors, both implementations. The viewer then consumes it |
| 🟡 P1/P2 inverted — scope consumes the manifest's identifier | **Swapped**: manifest first (P1), scope resolution on top (P2) |
| 🔴 canonical JSON undefined / forgeable | P9 pins **RFC 8785 (JCS)** explicitly, hashes the generic parsed map (not a typed struct), and hashes `target ‖ document` so records can't be transplanted |
| 🔴 frozen mode fail-open on untested paths | P9 enumerates every failure path as a test: no records, zero verified, unparseable, empty/absent hash, wrong algorithm prefix, duplicate records, missing target |
| 🔴 new corpus/records are prose leak paths | P3 authoring rule + provenance check; P9 source locators are collection-root-relative and refuse anything under `private/` |
| 🟡 fixture roots mix pass and must-fail | P2 splits pass-corpus from negative fixtures into separate roots (repo precedent: `testdata/l1`, `testdata/l2`) |
| 🟡 hardened pin check under-instrumented | P4 keeps `unversioned-pin` passing with its exact existing message AND adds mismatch + pin-ahead fixtures |
| 🟡 see-the-method fails open in a poorer engine | P11 renders an explicit omission notice — silence is wrong for a *plan* even though it is right for a *control* |
| 🟡 dist can ship stale | P11 rebuilds and asserts `git diff --exit-code tools/viewer/dist/` |
| 🟡 two phases could mint the same DECISIONS number | Allocated here: **#28** stage-forked identity (P7), **#29** compiled-variants rejection (P7) |

## Model Assignment

| Phase | Task | Model | Reasoning | Est. |
|---|---|---|---|---|
| 1 | Pack manifest format + loader | sonnet | new schema, mechanical | $0.20 |
| 2 | Collection scope + discovery + qualified refs | **opus** | touches every loader; the id-pattern freeze | $0.55 |
| 3 | Ship second collection in examples/ | sonnet | authoring + assertion updates | $0.20 |
| 4 | Lineage pins + family + hardened pin compare | sonnet | localized linter work | $0.25 |
| 5 | Variant discriminator + axis backing | sonnet | schema + registry | $0.25 |
| 6 | Canonical link schema + resolution order | **opus** | a published total order with a failing tiebreak | $0.50 |
| 7 | Document revisions + stages + 2 DECISIONS | sonnet | documentation + schema | $0.25 |
| 8 | Calculus ref-inlining + vectors | **opus** | normative semantics, two implementations | $0.55 |
| 9 | Resolution records + frozen mode | **opus** | security-critical, RFC 8785 | $0.50 |
| 10 | Canonical authoring + extraction linter | sonnet | rules + fixtures | $0.25 |
| 11 | Viewer see-the-method + fragments | sonnet | UI behind the seam | $0.30 |
| 12 | Acceptance, ledger, tag | sonnet | sweep | $0.15 |

## Execution Strategy

Strictly serial: 1 → 2 → 3 → **[L1 GATE]** → 4 → 5 → 6 → 7 → **[L2 GATE]** →
8 → 9 → **[L3 GATE]** → 10 → 11 → **[L4 GATE]** → 12.

No parallel waves: every phase touches the loader, the linter or the schema,
and the v0.3 run proved serialization costs nothing here.

## Artifact Flow

| Producing Phase | Artifact | Consuming Phase(s) |
|---|---|---|
| 1 | `schema/rcp-pack-v1.schema.json`, manifest loader | 2, 3, 6, 9 |
| 2 | collection-aware discovery; qualified-ref resolution | 3–11 |
| 3 | second published collection in `examples/` | 4, 6, 9, 12 |
| 4 | lineage pins, hardened pin compare | 6, 9 |
| 5 | variant `axis`/`value` | 10, 11 |
| 6 | `canonical_recipe` schema + resolution order | 8, 10, 11 |
| 7 | document-revision rules, stage model, DECISIONS #28/#29 | 9, 11 |
| 8 | Calculus ref-inlining + vectors | 11 |
| 9 | resolution records + frozen verifier | 12 |
| 10 | canonical entries + extraction linter | 11, 12 |
| 11 | viewer surfaces + rebuilt dist | 12 |

---

## Phase 1 — Pack manifest: the collection becomes nameable

**Objective:** A collection can declare its identity authoritatively (SR-PACK-003).
**Model:** `sonnet` · **Max Iterations:** 5 · **Evaluate:** true · **Dependencies:** none
**Completion Promise:** `PHASE 1 COMPLETE MANIFEST FORMAT`

**Context needed:**
- `docs/product/specs/SPEC-004-rcp-v04-implementation/spec.md` — §Layer 1
- `schema/rcp-core-v1.schema.json` — the shape conventions to mirror
- `tools/rcplint/validate.go:114-150` — how registry schemas are compiled + applied
- `tools/rcplint/documents.go:13-24` — the Document struct and loader

**Prompt:**
```
Create schema/rcp-pack-v1.schema.json — a SEPARATE file format, NOT a kind:
value on the recipe core (the kind enum and the decode-compat surface stay
untouched). Fields: collection identifier (required; an opaque string in its
own value space so a future distribution layer can put domains or URIs there
WITHOUT widening the recipe id pattern), plus optional publisher, licence,
version, description.

Add manifest loading to tools/rcplint: given a directory, find rcp-pack.yaml
and return its declared identifier. A document MAY carry the same identifier
for lone travel; when both exist and disagree, THE MANIFEST WINS and the
conflict is REPORTED (not silently resolved).

Add the optional per-document collection field to the core schema — optional,
no default needed, decode-compat safe.

Write the L1 fixtures under a NEW negative root (do not mix must-pass and
must-fail documents in one directory — repo precedent is testdata/l1 and
testdata/l2 sitting outside every corpus glob): a valid manifest, a manifest
missing its identifier, and a document/manifest identifier conflict.

Standing gates green. When complete, output: PHASE 1 COMPLETE MANIFEST FORMAT
```

**Acceptance criteria:**
- [ ] AC-1.1: `schema/rcp-pack-v1.schema.json` exists and validates a manifest declaring only the collection identifier — Verify: `cd tools/rcplint && go test -run TestPackManifest ./...`
- [ ] AC-1.2: A manifest/document identifier conflict is reported and the MANIFEST value is the one used — Verify: `cd tools/rcplint && go test -run TestPackManifestConflict ./...`
- [ ] AC-1.3: `kind` enum is unchanged and no new required field entered core — Verify: `cd tools/rcplint && go test -count=1 -run TestDecodeCompat ./...`
- [ ] AC-1.4: Standing gates green — Verify: `make validate && make accept`

---

## Phase 2 — Collection scope: discovery, and references that cannot misbind (opus)

**Objective:** Ids are unique within a collection; unqualified references resolve
in their own collection only; the corpus loader learns collections (SR-PACK-001/002).
**Model:** `opus` — touches every loader and the frozen id pattern
**Max Iterations:** 5 · **Evaluate:** true · **Dependencies:** 1
**Completion Promise:** `PHASE 2 COMPLETE SCOPE ENFORCED`

**Context needed:**
- `tools/rcplint/validate.go:37`, `tools/rcplint/lint.go:611`, `tools/rcplint/facts.go:52` — the three `examples/*.rcp.yaml` globs that must become collection-aware
- `tools/rcplint/lint.go:611-627` — the flat `siblings` map (id collisions overwrite SILENTLY today — this is the bug this phase fixes)
- `tools/rcplint/vectors.go:23`, `tools/rcplint/vectors_calc.go:24` — the two hard-coded allowlists
- `tools/rcplint/main_test.go:49` — asserts EXACTLY 6 documents
- `docs/product/specs/SPEC-004-rcp-v04-implementation/fixtures.yaml` — scenarios 1–3

**Prompt:**
```
Make the corpus collection-aware. Replace the three flat `examples/*.rcp.yaml`
globs (validate.go:37, lint.go:611, facts.go:52) with discovery that walks
collection roots — a directory with an rcp-pack.yaml is a collection; the
existing examples/ root remains one collection whether or not it has a manifest
yet (P3 gives it one).

Replace the flat siblings map (lint.go:611-627) with a collection-scoped one.
An id collision ACROSS collections is NOT an error and MUST NOT overwrite —
both documents stay resolvable. An id collision WITHIN one collection IS an
error (today it silently overwrites: that is the defect).

Resolution rule: an unqualified reference (ref, forked_from, variant_of,
family, canonical links later) resolves ONLY within the referring document's
own collection. A reference into another collection MUST be qualified. An
unqualified reference with no target in its own collection FAILS naming the
reference — it MUST NOT fall back to searching other collections.

Extend the two vector allowlists to the new collection roots deliberately (they
are hard-coded on purpose; widening them is a reviewed change) and keep the
private/ refusal intact.

Add the ID-PATTERN FREEZE TEST (SAC-PACK-001): assert $defs/slug and
recipe.id are byte-identical to `git show 25f31f62260450ed961c67e39ff1c7efd9b53755:schema/rcp-core-v1.schema.json`.
This is a test, not a review habit.

Extend testdata/compat/v01/ coverage so the frozen v0.1 reader is proven to
tolerate documents carrying collection qualifiers.

Keep must-pass and must-fail fixtures in SEPARATE roots.

Standing gates green. When complete, output: PHASE 2 COMPLETE SCOPE ENFORCED
```

**Acceptance criteria:**
- [ ] AC-2.1: Two collections each holding an id `pao-alentejano` both load and both resolve; no id is rewritten — Verify: `cd tools/rcplint && go test -run TestCollectionCollision ./...`
- [ ] AC-2.2: An unqualified reference resolves in its own collection; the same reference with no local target FAILS naming it, and never binds to the other collection — Verify: `cd tools/rcplint && go test -run TestUnqualifiedScope ./...`
- [ ] AC-2.3: An id collision WITHIN one collection is an error — Verify: `cd tools/rcplint && go test -run TestIntraCollectionCollision ./...`
- [ ] AC-2.4: The recipe id pattern is byte-identical to the v0.1 pin — Verify: `cd tools/rcplint && go test -run TestIdPatternFrozen ./...`
- [ ] AC-2.5: Decode-compat green both directions with qualifiers present — Verify: `cd tools/rcplint && go test -count=1 -run TestDecodeCompat ./...`
- [ ] AC-2.6: Standing gates green — Verify: `make validate && make conformance && make accept`

---

## Phase 3 — Ship a second collection in the published corpus

**Objective:** The shipped corpus demonstrates collections, and every gate walks
two of them (pre-flight architect #1 / qa #2).
**Model:** `sonnet` · **Max Iterations:** 5 · **Evaluate:** true · **Dependencies:** 2
**Completion Promise:** `PHASE 3 COMPLETE TWO COLLECTIONS SHIPPED`

**Context needed:**
- `tools/rcplint/main_test.go:49` — the exactly-6 assertion to update
- `tools/rcplint/scripts/accept.sh:26` — the stale "6 docs" description string
- `schema/VERSIONING.md:71-72` — the stale "six example documents" prose
- `examples/` — the existing documents, which become collection one

**Prompt:**
```
Give examples/ a manifest (it is collection one), then add a SECOND published
collection alongside it, with its own manifest and 2-3 documents — including
one whose id deliberately collides with an existing example id, so the shipped
corpus itself proves collections do not flatten.

AUTHORING RULE (pre-flight security #3, binding): the new documents are
authored from your own recipes or public-domain sources. NEVER copy text out of
private/collection/ — book-derived prose in examples/ would pass every existing
gate (they scan for binary media and paths, not prose). Add a check that no
examples/** document names a provenance source that appears only in the private
corpus.

Update the assertions this makes stale: main_test.go's exactly-6 becomes a
per-collection assertion; accept.sh:26's description; VERSIONING.md's closing
"six example documents" sentence.

Standing gates green — and they now walk both collections.
When complete, output: PHASE 3 COMPLETE TWO COLLECTIONS SHIPPED
```

**Acceptance criteria:**
- [ ] AC-3.1: `examples/` contains two collections, each with a manifest, and one id appears in both — Verify: `cd tools/rcplint && go run . validate ../.. | grep -c 'collection'`
- [ ] AC-3.2: `make validate` walks both collections and is green — Verify: `make validate`
- [ ] AC-3.3: No document in `examples/` names a provenance source unique to the private corpus — Verify: `python3 tools/rcplint/scripts/corpus-provenance-check.py .`
- [ ] AC-3.4: Media attestation and privacy checks still green — Verify: `make accept`
- [ ] **LAYER 1 GATE:** all gates green, worktree clean, tag opportunity — Verify: `make validate && make conformance && make calculus && make accept`

---

## Phase 4 — Lineage: described, pinned, and the pin check hardened

**Objective:** Lineage gains semantics and version pins; the componentRef pin
check compares versions (SR-CORE-001, SR-VAL-003).
**Model:** `sonnet` · **Max Iterations:** 5 · **Evaluate:** true · **Dependencies:** 3
**Completion Promise:** `PHASE 4 COMPLETE LINEAGE PINNED`

**Context needed:**
- `schema/rcp-core-v1.schema.json:331-348` — the lineage block with ZERO descriptions
- `tools/rcplint/lint.go:165-174` — the presence-only pin check to harden
- `tools/rcplint/testdata/l2/unversioned-pin.rcp.yaml` + `lint_test.go:49` — the existing verdict that must NOT change
- `docs/research/09-variant-identity-and-selection.md` — F1, F3, F9

**Prompt:**
```
Give every lineage field a schema description, and give forked_from/variant_of
a pinned-revision form in componentRef's shape (target-declared version +
reference-site pin, optionally collection-qualified). `family` is documented as
the capability-style grouping slug.

HARDEN the pin check (lint.go:165-174): it currently verifies only that the
target declares SOME version. It must now compare the pinned version to the
target's declared version and FAIL on mismatch.

This is a behaviour change, so prove it as a PAIR (pre-flight qa #4):
(a) a new componentref-pin-mismatch fixture FAILS hard, AND
(b) testdata/l2/unversioned-pin.rcp.yaml still yields EXACTLY its existing
    verdict — lint_test.go:49 asserts the string "declares no version" — so the
    two paths provably did not collapse into one.
Also add lineage-pin-ahead (pin ahead of target → FAIL, distinct from
staleness) and the both-on-one-edge case: a stale pin and a mismatch on the
same edge produce one warning AND one failure, with the failure not masked.

Family validation within a collection: same-family documents must agree on the
slug; a family with exactly one member WARNS (usual cause: a typo). Silent
across collections, where membership is not visible.

Blast-radius note: examples/other-categories.rcp.yaml pins ganache version 1
against a target declaring version 1, so the hardening should not red the
existing corpus — assert that explicitly.

Standing gates green. When complete, output: PHASE 4 COMPLETE LINEAGE PINNED
```

**Acceptance criteria:**
- [ ] AC-4.1: Every lineage field carries a schema description — Verify: `cd tools/rcplint && go test -run TestLineageDescribed ./...`
- [ ] AC-4.2: A mismatched componentRef pin FAILS, and `unversioned-pin` still produces its exact existing "declares no version" verdict — Verify: `cd tools/rcplint && go test -run 'TestL2FixturesOneRuleEach|TestPinMismatch'`
- [ ] AC-4.3: Stale pin + mismatch on one edge → one warning and one failure, failure unmasked — Verify: `cd tools/rcplint && go test -run TestPinStaleAndMismatch ./...`
- [ ] AC-4.4: Same-family disagreement errors; single-member family warns; cross-collection silent — Verify: `cd tools/rcplint && go test -run TestFamilyValidation ./...`
- [ ] AC-4.5: Standing gates green — Verify: `make validate && make accept`

---

## Phase 5 — Variant discriminator: machine-readable at last

**Objective:** A variant says what makes it a variant (SR-CORE-002, SR-REG-003).
**Model:** `sonnet` · **Max Iterations:** 5 · **Evaluate:** true · **Dependencies:** 4
**Completion Promise:** `PHASE 5 COMPLETE VARIANTS DISCRIMINATED`

**Context needed:**
- `docs/product/specs/SPEC-004-rcp-v04-implementation/spec.md` — the per-axis resolution table
- `docs/research/10-diet-vocabulary-authority.md` — why there is NO diet axis
- `tools/rcplint/lint.go:31,34` — `Registry.Equipment` and `Registry.Techniques`, the two live sets
- `schema/rcp-core-v1.schema.json` — `origin.country` is the ISO 3166 precedent the region axis reuses

**Prompt:**
```
Add the variant discriminator: `axis` (closed enum WITH an `other` catch-all
from day one — decode-compat requires it) + `value`. Optional: a document
without a discriminator stays valid. variant_label remains human-only and is
never machine-read (decision #4).

Per-axis value resolution — every axis backed by something that EXISTS:
  equipment  → the equipment.* registry (10 entries today)
  technique  → the technique.* registry (13 entries today)
  region     → ISO 3166-1 alpha-2, optional ISO 3166-2 subdivision (the same
               encoding origin.country already uses)
  season     → a closed enum defined in this phase
  scale      → a closed enum (batch context) defined in this phase
  other      → catch-all; variant_label carries the human explanation

There is NO diet axis. It was dropped — no authoritative vocabulary exists
(research 10). Add a NEGATIVE ASSERTION that `diet` never appears in the
shipped enum: spec.yaml's revision history is append-only and still contains
the entry that adopted it, so a future reader could reintroduce it.

Add the axis-backing mechanical check: every non-catch-all enum value has a
live registry kind, a named external standard, or an enum defined here — and at
least one example document exercises each shipped axis.

Standing gates green. When complete, output: PHASE 5 COMPLETE VARIANTS DISCRIMINATED
```

**Acceptance criteria:**
- [ ] AC-5.1: Two sibling variants differing on a declared axis are machine-distinguishable without reading prose — Verify: `cd tools/rcplint && go test -run TestVariantDiscriminator ./...`
- [ ] AC-5.2: An unknown axis decodes into the catch-all rather than failing; a document without a discriminator stays valid — Verify: `cd tools/rcplint && go test -run TestAxisCatchAll ./...`
- [ ] AC-5.3: Every shipped axis value has live backing and ≥1 exercising example — Verify: `cd tools/rcplint && go test -run TestAxisBacking ./...`
- [ ] AC-5.4: `diet` does not appear in the axis enum — Verify: `cd tools/rcplint && go test -run TestNoDietAxis ./...`
- [ ] AC-5.5: Standing gates green — Verify: `make validate && make accept`

---

## Phase 6 — Canonical links and the published resolution order (opus)

**Objective:** When several candidates answer a mention, the protocol says which
one wins — and a tie fails loudly (SR-REG-001, SR-CORE-006).
**Model:** `opus` — a total order with an unfailable tiebreak is exactly where
subtle wrongness hides
**Max Iterations:** 5 · **Evaluate:** true · **Dependencies:** 5
**Completion Promise:** `PHASE 6 COMPLETE ORDER PUBLISHED`

**Context needed:**
- `registry/schemas/technique.schema.json` — `additionalProperties: false`, so adding `canonical_recipe` is a required schema edit; note the existing `teaches` array as the nearest neighbour
- `docs/research/09-variant-identity-and-selection.md` — F6 (CSS's split: name the order, own no UI)
- `docs/product/specs/SPEC-004-rcp-v04-implementation/fixtures.yaml` — the three-way and genuine-tie fixtures

**Prompt:**
```
Add `canonical_recipe: {collection?, id, version}` to the technique and
preparation-class registry schemas — OPTIONAL forever; an entry without it stays
valid. (Registry AUTHORING — which entries actually point where — is Phase 10.
This phase ships the schema and the resolution.)

Implement and DOCUMENT the total resolution order, highest precedence first:
  1. an explicit pinned reference
  2. a matching document in the consumer's OWN collection
  3. the class's canonical link
Within a tier, the QUALIFIED reference wins. If candidates remain tied,
resolution FAILS naming EVERY candidate — the tiebreak must never silently
pick. Note the direction deliberately: user above author, which is the
correction ld.so had to make after shipping it backwards.

The protocol specifies NO UI. But it MUST define what an explanation contains:
the candidate set, the winner, and the criterion that decided. A surface renders
that however it likes.

Build the fixtures the test strategy names: a three-way case (pin +
own-collection + canonical all answering one mention) and a genuine-tie case
that must fail with every candidate named.

Standing gates green. When complete, output: PHASE 6 COMPLETE ORDER PUBLISHED
```

**Acceptance criteria:**
- [ ] AC-6.1: `canonical_recipe` validates on a registry entry and its absence keeps the entry valid — Verify: `cd tools/rcplint && go test -run TestCanonicalLinkSchema ./...`
- [ ] AC-6.2: Pin beats own-collection beats canonical, across the full matrix — Verify: `cd tools/rcplint && go test -run TestResolutionOrder ./...`
- [ ] AC-6.3: A genuine tie FAILS naming every candidate — Verify: `cd tools/rcplint && go test -run TestResolutionTieFails ./...`
- [ ] AC-6.4: An explanation carries candidate set, winner and deciding criterion — Verify: `cd tools/rcplint && go test -run TestResolutionExplanation ./...`
- [ ] AC-6.5: Standing gates green — Verify: `make validate && make accept`

---

## Phase 7 — Document revisions, stages, and two recorded decisions

**Objective:** "What is a revision" becomes load-bearing prose; stage identity is
settled (SR-CORE-003, SR-CORE-005; closes PRD OQ-5).
**Model:** `sonnet` · **Max Iterations:** 5 · **Evaluate:** true · **Dependencies:** 6
**Completion Promise:** `PHASE 7 COMPLETE REVISIONS AND STAGES`

**Context needed:**
- `schema/VERSIONING.md` — insert the document-revision section between `## Change rules` (ends :48) and `## Decode-compatibility contract` (:50); do NOT rename existing anchors (accept.sh:49 greps them)
- `docs/research/08-implicit-subrecipes.md` — F6, stage-forked identity
- `docs/research/DECISIONS.md` — currently ends at #27

**Prompt:**
```
Add the document-revision section to schema/VERSIONING.md (which today covers
SCHEMA evolution end to end and says nothing about document `version`):
- when `version` MUST increment: any change to ingredients, steps, constraints,
  yields or lineage of a PUBLISHED document
- a published (collection, id, version) triple is IMMUTABLE — a correction is a
  new revision, never an edit in place
- supersession is signalled by the successor revision alone (no separate
  pointer in MODEL 1 — a deliberate minimalism, revisitable)
Do not rename existing H2 anchors; accept.sh greps them.

Stage-forked identity — record DECISIONS #28: stages live in BOTH homes. The
preparation/technique CLASS carries graded stage outcomes as bounded data
(stage id + the measured checkpoint: Escoffier's roux blanc/blond/brun by cook
time; the pontos de açúcar by temperature). A recipe's endpoint MAY reference a
stage by id. One class with N graded stages beats N near-duplicate siblings.
CONTRADICTION RULE: a measurement outside the referenced stage's class bounds
WARNS naming both values and the MEASUREMENT WINS — books name stages loosely
and the author measured deliberately. This is a labelling disagreement, NOT a
safety bound: severity-critical constraints stay fail-closed under the Calculus,
untouched.

Record DECISIONS #29: compiled variants (derived_from/apply/materialised_at,
research 06) are REJECTED for v0.4 on founding-non-goal grounds — a second
execution semantics beside the Calculus, and formulas-in-data. Drift is
detected instead (Phase 4). Recorded so the rejection is explicit, not silent.

Add the schema support for stages and endpoint stage references, plus two
validating example documents demonstrating both sides of the identity line.

Standing gates green. When complete, output: PHASE 7 COMPLETE REVISIONS AND STAGES
```

**Acceptance criteria:**
- [ ] AC-7.1: VERSIONING.md carries the document-revision section and every pre-existing H2 anchor is unchanged — Verify: `grep -q 'SchemaVer' schema/VERSIONING.md && grep -qi 'decode' schema/VERSIONING.md && grep -q 'revision' schema/VERSIONING.md`
- [ ] AC-7.2: DECISIONS #28 and #29 exist with their stated grounds — Verify: `grep -q '^### 28' docs/research/DECISIONS.md && grep -q '^### 29' docs/research/DECISIONS.md`
- [ ] AC-7.3: A measurement outside its stage bounds WARNS with measurement authoritative, while a severity-critical constraint in the same document still REFUSES — Verify: `cd tools/rcplint && go test -run TestStageContradiction ./...`
- [ ] AC-7.4: Two example documents demonstrate both sides of the identity line and both validate — Verify: `make validate`
- [ ] **LAYER 2 GATE:** all gates green, tag opportunity — Verify: `make validate && make conformance && make calculus && make accept`

---

## Phase 8 — Calculus: referenced preparations become schedulable (opus)

**Objective:** Extend `fn: schedule` so a REFERENCED preparation can be placed
before its consuming step — the change the pre-flight proved is unavoidable.
**Model:** `opus` — normative semantics + two implementations + frozen vectors
**Max Iterations:** 5 · **Evaluate:** true · **Dependencies:** 7
**Completion Promise:** `PHASE 8 COMPLETE CALCULUS PLACES REFS`

**Context needed:**
- `calculus/SPEC.md` — `## fn: schedule`, R-SCHED-1..4, the `rcp-edge-classes` fence
- `tools/rcplint/calc/timeline.go:439-491` — the Go two-stage schedule; refs are skipped
- `tools/viewer/src/calc/index.ts:601` — `if ("ref" in cm) continue;` — the TS mirror
- `calculus/vectors/schedule.json` — frozen; this phase is the ONLY one allowed to change it

**Prompt:**
```
THE VECTOR FREEZE PERMITS THIS PHASE because the change ships inside a
calculus/SPEC.md-change commit (DS-CALC-002). No other phase may touch vectors.

Today both implementations skip reference components in schedule()
(timeline.go's Schedule; calc/index.ts:601), so a referenced preparation is
placed nowhere. Extend the SPEC:
- add a rule (next R-SCHED-n) placing a REFERENCED preparation before its
  consuming step, exactly as an inline component is placed today: the reference
  contributes the referenced document's total duration window, and placement is
  the consumer's start minus that total by R-SCHED-2's conservative interval
  subtraction
- state precisely what happens when the referenced document is NOT resolvable
  in the loaded collections: the Calculus is fail-closed everywhere else, so
  this must refuse with a normative uncertainty string, not guess a zero
- add a worked example (WE-SCHED-n) with real numbers
- add the edge class to the rcp-edge-classes fence so the coverage gate demands
  vectors for it

Then: implement in the Go reference, regenerate vectors, replay in TS. The two
implementations must agree — a disagreement is a bug in the replayer unless the
SPEC is wrong.

calculus/SPEC.md stays PUBLIC-NORMATIVE: no project ids, no internal references.

Standing gates green, including the coverage gate and its inverted proof.
When complete, output: PHASE 8 COMPLETE CALCULUS PLACES REFS
```

**Acceptance criteria:**
- [ ] AC-8.1: `calculus/SPEC.md` gains the rule, a worked example and an edge class; no project ids entered it — Verify: `cd tools/rcplint && go test -run 'TestSpecCompleteness|TestCalcCoverage' ./...`
- [ ] AC-8.2: A referenced preparation is placed before its consuming step, matching the worked example's numbers, in BOTH implementations — Verify: `make calculus`
- [ ] AC-8.3: An unresolvable reference REFUSES with the normative uncertainty string rather than placing at zero — Verify: `cd tools/rcplint && go test -run TestScheduleRefUnresolvable ./calc/`
- [ ] AC-8.4: Vectors changed ONLY in this commit, alongside the SPEC change — Verify: `git show --stat HEAD | grep -q 'calculus/SPEC.md'`
- [ ] AC-8.5: Standing gates green — Verify: `make validate && make conformance && make calculus && make accept`

---

## Phase 9 — Resolution records: verifiable, and fail-closed on every path (opus)

**Objective:** A resolved reference proves what it resolved to (SR-PUB-001/002).
**Model:** `opus` — security-critical; the pre-flight found the naive version forgeable
**Max Iterations:** 5 · **Evaluate:** true · **Dependencies:** 8
**Completion Promise:** `PHASE 9 COMPLETE RECORDS VERIFY`

**Context needed:**
- `docs/product/specs/SPEC-004-rcp-v04-implementation/spec.md` — §Layer 3
- `docs/research/09-variant-identity-and-selection.md` — F7 (npm's three-field split; reconcile vs frozen)
- `tools/rcplint/scripts/accept.sh` — the `check` helper suppresses stdout; a gate that greps stdout passes vacuously
- `tools/rcplint/compat/reader_v01.go` — the stdlib-only precedent

**Prompt:**
```
Implement the resolution record and its verifier. The pre-flight security
review found the naive design forgeable — these five points are REQUIREMENTS,
not suggestions:

1. CANONICAL JSON IS RFC 8785 (JCS), stated normatively. Go's encoding/json is
   NOT a canonicalisation: it HTML-escapes < > & by default and its float
   formatting is Go-specific. Implement JCS with the standard library only
   (~100 lines) and pin the rule in writing.
2. HASH THE GENERIC PARSED MAP (map[string]any), never a typed struct. Decode
   compatibility means a typed struct silently EXCLUDES unknown fields — an
   attacker appends fields a newer reader honours and the hash still matches.
3. HASH target ‖ document, not the document alone. Otherwise a record can be
   transplanted between collections: with a relabelled pack manifest, a
   shadowing document in tier 2 of the resolution order would still verify.
4. STATE THE CLAIM HONESTLY. The corpus is YAML; the preimage is a
   re-serialisation of the parsed tree, so anchors/aliases and merge keys
   collapse and number spellings normalise. Either hash raw file bytes, or say
   "the same parsed document" and add a lint rule forbidding aliases and merge
   keys in published documents. Do not claim byte-identity you do not have.
5. SOURCE LOCATORS ARE COLLECTION-ROOT-RELATIVE, and the writer REFUSES to emit
   a record whose source resolves under private/ or outside the loaded
   collection root — an absolute path would leak the private corpus's structure
   into committed files.

Two modes: RECONCILE (compute and write records) and FROZEN (verify only; write
nothing). Frozen must FAIL on every one of these, each with a test:
   no record file at all · a resolvable reference with no matching record ·
   ZERO records verified (a vacuous green is the classic bug) · an unparseable
   record · content_hash absent, empty, null, or missing the sha256: prefix ·
   an algorithm prefix other than sha256: · two records for one
   (collection,id,version) · a record whose target no longer exists
Plus the inverted proof: a mutated target FAILS.

accept.sh wiring: FROZEN only, reading committed records. Reconcile belongs in
make, never in the acceptance sweep — a self-healing gate verifies nothing. And
because accept.sh's check helper suppresses stdout, the check must assert on
EXIT CODE plus a nonzero verified count, not on greppable text.

Add the hash-determinism golden and the stdlib-only import allowlist test.

Standing gates green. When complete, output: PHASE 9 COMPLETE RECORDS VERIFY
```

**Acceptance criteria:**
- [ ] AC-9.1: Records carry target, source, content_hash and resolver_version; hashing is JCS over the generic map, covering target ‖ document — Verify: `cd tools/rcplint && go test -run TestResolutionRecordShape ./...`
- [ ] AC-9.2: Frozen mode FAILS on every enumerated path (no records, zero verified, unparseable, empty/absent hash, wrong prefix, duplicate, missing target) — Verify: `cd tools/rcplint && go test -run TestFrozenFailClosed ./...`
- [ ] AC-9.3: Inverted proof — a mutated target FAILS, an intact corpus passes — Verify: `cd tools/rcplint && go test -run TestFrozenInvertedProof ./...`
- [ ] AC-9.4: The writer refuses a source locator under `private/` or outside the collection root — Verify: `cd tools/rcplint && go test -run TestRecordSourceRefusesPrivate ./...`
- [ ] AC-9.5: Hashing imports stdlib only; hash output is deterministic across runs — Verify: `cd tools/rcplint && go test -run 'TestHashDeterminism|TestHashImportAllowlist' ./...`
- [ ] **LAYER 3 GATE:** all gates green + frozen wired into accept.sh, tag opportunity — Verify: `make validate && make conformance && make calculus && make accept`

---

## Phase 10 — Canonical authoring and the extraction linter

**Objective:** Mentions stop dead-ending (SR-REG-001 authoring half, SR-REG-002).
**Model:** `sonnet` · **Max Iterations:** 5 · **Evaluate:** true · **Dependencies:** 9
**Completion Promise:** `PHASE 10 COMPLETE MENTIONS ANCHORED`

**Context needed:**
- `tools/rcplint/lint.go:37-106` — registry loading; `lint_test.go:37` — the one-rule-per-fixture discipline
- `docs/research/08-implicit-subrecipes.md` — the roux problem, three layers
- `registry/entries/technique/` — 13 entries; the `teaches` array already exists

**Prompt:**
```
Author the canonical links: for the techniques and preparation classes that
HAVE a teaching document in the corpus, point canonical_recipe at it. Curation,
not completeness — an entry without a link stays valid forever.

Document the extraction rule as BINDING and enforce it: a sub-preparation whose
method the source gives becomes an inline component; one named without a method
becomes a class reference; prose is never invented and never silently dropped.

Linter rules (one fixture per rule, per the existing L2 discipline —
lint_test.go:37 fails if any OTHER rule fires on a fixture):
(a) step prose contains a registry-known preparation or technique term that
    nothing in the document anchors → WARN naming the mention
(b) an authored pattern (`faça um X`, `prepare um X`, `make a X`) where X is
    unknown to the registry → WARN, from a maintained pt/en pattern list

Standing gates green. When complete, output: PHASE 10 COMPLETE MENTIONS ANCHORED
```

**Acceptance criteria:**
- [ ] AC-10.1: A sub-preparation with its method ingests as an inline component; one without becomes a class reference with no invented steps — Verify: `cd tools/rcplint && go test -run TestExtractionRule ./...`
- [ ] AC-10.2: An unanchored registry-known term WARNS naming it — Verify: `cd tools/rcplint && go test -run TestL2WarningFixtures ./...`
- [ ] AC-10.3: An authored pattern with an unknown X WARNS — Verify: `cd tools/rcplint && go test -run TestMentionPattern ./...`
- [ ] AC-10.4: At least one canonical link is authored and resolves under the scope rule — Verify: `cd tools/rcplint && go test -run TestCanonicalResolves ./...`
- [ ] AC-10.5: Standing gates green — Verify: `make validate && make accept`

---

## Phase 11 — Viewer: see the method, seek the moment

**Objective:** The teaching surfaces reach the screen (SR-TOOL-001, SR-CORE-004).
**Model:** `sonnet` · **Max Iterations:** 5 · **Evaluate:** true · **Dependencies:** 10
**Completion Promise:** `PHASE 11 COMPLETE VIEWER TEACHES`

**Context needed:**
- `tools/viewer/src/engine.ts:23-29` — the Capabilities enum; `:86-94` — the reserved-member rule
- `tools/viewer/src/app.ts:83-91` — the capability-gated slot pattern to mirror
- `tools/viewer/src/render.ts:217-219` — the basename split that swallows `#t=` today
- `tools/viewer/build.ts:34` — projects only `id → display_name`; canonical links need a new projection
- `tools/rcplint/scripts/accept.sh:61-70` — the CSP assertion is a REGEX with hash placeholders; the source list is frozen, the hashes are free to change

**Prompt:**
```
(a) SEE-THE-METHOD. Add a NEW optional engine member plus a NEW Capabilities
flag, mirroring clamp↔scale and timeline↔schedule (the pairing is pinned by
engine.test.ts:22). Do NOT widen schedule()'s signature — a future WASM engine
written against v1 would ignore the extra argument and return a silently wrong
plan. Engine version stays 1.

FAIL LOUD, NOT SILENT (pre-flight frontend #2): today's degradation pattern is
that a control vanishes, which is right for a CONTROL and dangerous for a PLAN.
An engine with `timeline` but without the link capability must NOT emit a
kitchen plan that silently omits a linked 12-hour ferment — render an explicit
"N preparações ligadas omitidas" notice.

Render the linked method via renderDocument (NOT renderDocumentBlock — that
would emit duplicate .doc-block[data-doc=N] and duplicate scale-input ids, and
app.ts:62/73 use first-match-wins querySelector). Pass an id prefix and a
heading level so the outline stays correct.

State carve-out, recorded deliberately: app.ts already holds `factors`; it now
also holds an `expanded` set plus focus restoration, because input events
re-render on every keystroke (app.ts:194) and outerHTML replacement (app.ts:72)
would collapse an open method and drop focus to body. That is more than
"assignment-only glue" — record it rather than letting the grep-enforced rule be
quietly reinterpreted.

Add the canonical-link projection to build.ts (today only display_name
survives) and a NEW RenderContext field — do not smuggle it into `names`, which
is typed and consumed as a locale map.

(b) MEDIA FRAGMENTS. Strip the fragment (and query) BEFORE basename matching —
today `media/x.mp4#t=10,20` yields the key `x.mp4#t=10,20`, misses the store and
collapses to the absent state. Re-append the fragment to the OBJECT URL:
src="${objectURL}#t=10,25". Two ranges of one asset then work for free.
Validate the fragment against the W3C temporal grammar as an ALLOWLIST and drop
anything else silently — never fall back to the raw uri as src, which would put
an author-supplied string into <video src> with only CSP as backstop.
Write the AC as "playback starts at start" — honouring the END boundary varies
by engine.

Extend media.test.ts with a fragment-bearing uri, and keep the never-serialized
assertion honest: the document's uri must still round-trip with no blob:/data:.

REBUILD dist and assert freshness: `git diff --exit-code tools/viewer/dist/`
after rebuilding. Today dist is committed and built by hand, so the viewer work
could otherwise pass every gate while being absent from the shipped bundle.

Standing gates green. When complete, output: PHASE 11 COMPLETE VIEWER TEACHES
```

**Acceptance criteria:**
- [ ] AC-11.1: A new capability + paired member exist; engine version stays 1; the pairing test passes both directions — Verify: `cd tools/viewer && bun test src/engine-js/engine.test.ts`
- [ ] AC-11.2: The linked method renders without losing the parent, with no duplicate ids — Verify: `cd tools/viewer && bun test src/see-the-method.test.ts`
- [ ] AC-11.3: An engine lacking the capability renders an explicit omission notice, never a silently incomplete plan — Verify: `cd tools/viewer && bun test src/see-the-method.test.ts -t omission`
- [ ] AC-11.4: A `#t=` uri resolves its asset and the fragment reaches the element; two ranges of one asset render independently; an invalid fragment is dropped — Verify: `cd tools/viewer && bun test src/media.test.ts`
- [ ] AC-11.5: dist is rebuilt and matches src — Verify: `cd tools/viewer && mise exec -- bun run build.ts && git diff --exit-code tools/viewer/dist/`
- [ ] **LAYER 4 GATE:** all gates green — Verify: `make validate && make conformance && make calculus && make accept`

---

## Phase 12 — Acceptance, ledger, ship

**Objective:** Sweep extended, corpus proven from clean, ledger truthful, tag.
**Model:** `sonnet` · **Max Iterations:** 5 · **Evaluate:** true · **Dependencies:** 11
**Completion Promise:** `PHASE 12 COMPLETE V04 SHIPPED TAGGED`

**Context needed:**
- `tools/rcplint/scripts/accept.sh` — every check names its AC
- `docs/product/features.yaml`, `docs/product/ROADMAP.md` — the ledger
- `tools/rcplint/scripts/i18n-coverage.py` — degrades to SKIP-WITH-NOTICE without private/, so a clean clone covers LESS than a local run

**Prompt:**
```
Finalize accept.sh: every new gate named by its AC — collection scope, id-pattern
freeze, lineage pins, axis backing, resolution order, frozen records, extraction
warnings, CSP + dist freshness.

CLEAN-CLONE PROOF, defined: clone to a temp dir, mise install, frozen bun
install, then validate + conformance + calculus + accept. State explicitly what
green means there — i18n-coverage.py degrades to SKIP-WITH-NOTICE without
private/, so the clean clone covers LESS than a local run and the proof must say so.

Ledger: mark the v0.4 features shipped with realized_by tracing to PRD-004 FRs;
ROADMAP gains a v0.4 SHIPPED section. Extend ledger-check.py to assert it.

Ship PRD-004's FRs and SPEC-004; run edikt verify.

Daniel's manual checklist: read the two new DECISIONS entries; open the viewer
and follow a canonical link; check a schedule with a linked preparation reads
right; confirm the second published collection looks like something he'd want
in the repo.

After his green: tag rcp-v0.4 with `git -c tag.gpgsign=false`.
When complete, output: PHASE 12 COMPLETE V04 SHIPPED TAGGED
```

**Acceptance criteria:**
- [ ] AC-12.1: `make accept` green with every new gate named by its AC — Verify: `make accept`
- [ ] AC-12.2: Clean-clone run green, with its reduced coverage stated — Verify: `bash tools/rcplint/scripts/clean-clone-proof.sh`
- [ ] AC-12.3: Ledger and roadmap truthful — Verify: `python3 tools/rcplint/scripts/ledger-check.py`
- [ ] AC-12.4: Daniel's acceptance recorded (operational)
- [ ] AC-12.5: Tag `rcp-v0.4` exists — Verify: `test "$(git cat-file -t rcp-v0.4)" = tag`

---

## Known Risks

- **Cut size** — 12 phases, ~2× v0.3. Mitigated by four independent tag points;
  a stall never loses a layer.
- **Phase 2 blast radius** — every loader changes at once. Mitigated by the
  id-pattern freeze test and decode-compat running in the same phase.
- **Phase 8 touches frozen vectors** — the only phase permitted to. If the SPEC
  change proves larger than expected, the fallback is to cut AC-TOOL-004-2 and
  ship see-the-method rendering without schedule placement (the option Daniel
  declined at pre-flight, retained here as the escape hatch).
- **Phase 9 canonicalisation** — RFC 8785 in stdlib is the riskiest single
  implementation. Golden-vector tested; a divergence is caught by determinism.
- **Curation scales** (PRD's riskiest assumption) — untestable. The anchorless
  mention warning count from Phase 10 is the early-warning proxy.

## Verify evidence

<!-- `AC-N.M: PASS — <date>` appended as gates pass. Layer gates:
     `LAYER N GATE: GREEN — <date>`. -->
