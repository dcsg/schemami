---
type: artifact
artifact_type: test-strategy
spec: SPEC-004
status: draft
created_at: 2026-08-03T17:50:00Z
reviewed_by: qa
---

# Test Strategy — RCP v0.4 implementation

v0.4 changes what "the corpus" means. Every gate up to v0.3 ran over a
single implicit collection, so scope was never observable; from this cut
the harness carries **two** collections with a deliberate id collision,
and most identity behaviour is only testable because the second one
exists. The standing principles are unchanged — the frozen corpus is the
regression suite, private content never enters fixtures or vectors, every
gate that can fail must prove it can fail — with one addition specific to
this cut: two rules here **tighten** existing behaviour (the componentRef
pin compare, unqualified cross-collection resolution), so each needs a
regression test asserting the *old* permissive behaviour is gone, not just
that the new rule fires.

Layer ordering is binding (SSP-001, SSP-002): a layer's suite must be
green, and the four standing gates green, before the next layer starts.

## Unit Tests (tools/rcplint, Go) — Layer 1, Identity

| Component | What to test | Priority |
|---|---|---|
| Collection scope (SR-PACK-001) | two collections each holding `pao-alentejano` both load and both stay resolvable; no id is rewritten; each document's pointers bind inside its own collection (AC-PACK-001-1/2) | high |
| Qualified-ref enforcement (SR-PACK-002) | an unqualified ref with no target in its own collection FAILS naming the reference — and an **inverted test** asserts no fallback search happens even when the other loaded collection holds an exact id match | high |
| Pack schema (SR-PACK-003) | `schema/rcp-pack-v1.schema.json` accepts identifier + optional publisher/licence/version; rejects a manifest missing the identifier; `kind` enum in core is untouched | high |
| Manifest precedence (SR-PACK-003) | manifest identifier wins over a document self-declaration and the conflict is REPORTED (not silently swallowed); a lone document with no manifest self-describes and stays valid (AC-PACK-002-1) | high |
| Id-pattern freeze (SAC-PACK-001, SP-006) | the `slug`/`id` definitions diff byte-identical against the `rcp-v0.1` pin — a test, not a review habit | high |

## Unit Tests (tools/rcplint, Go) — Layer 2, Lineage / variants / stages

| Component | What to test | Priority |
|---|---|---|
| Lineage pins (SR-CORE-001) | matching pin passes; every `lineage` field carries a schema description; pin form validates in componentRef's shape, optionally qualified by collection (AC-PR-007-1) | high |
| Staleness (SR-VAL-001) | variant pinned to parent revision N, parent declares N+1 → WARNING naming the variant, the pinned revision and the current one (AC-VAL-003-1) | high |
| Hardened pin compare (SR-VAL-001) | a `componentRef` whose pin ≠ the target's declared version now **FAILS**. Regression: `testdata/l2/unversioned-pin.rcp.yaml` today only asserts "target declares no version" — the old presence-only check must be provably gone, so the suite carries a fixture where the target declares a version and the pin disagrees, and asserts a hard failure rather than the previous pass | high |
| Variant axis (SR-CORE-002) | one document per shipped axis resolves: `equipment` → `equipment.*`, `technique` → `technique.*`, `region` → ISO 3166-1 alpha-2 (`PT`, optional subdivision), `season` → four-season enum, `scale` → domestic/professional enum, `other` → always valid. Unknown axis decodes into the catch-all rather than failing; a document with **no** discriminator stays valid (AC-PR-008-1) | high |
| Axis backing coverage (SR-REG-003, SAC-REG-001) | mechanical check: every non-catch-all enum value has a live registry kind, a named external standard, or a spec-defined enum — and ≥1 example exercises it. **No `diet` axis** — a test asserts the enum does not contain it, so the dropped axis cannot creep back in | high |
| Family validation (SR-VAL-003) | same-`family` documents inside one collection must agree on the slug; a family with exactly one member WARNS naming it; membership checks stay SILENT across collections (never warn on a family whose siblings live in a collection that is not loaded) | high |
| Stage contradiction (SR-CORE-005, SAC-CORE-001) | a recipe endpoint outside the referenced stage's class bounds WARNS naming both values and the document stays valid with the **measurement authoritative**; in the *same document* a severity-critical constraint still refuses fail-closed. This pair is the load-bearing test of the cut — it is the only place where "warn" and "refuse" must coexist without either leaking into the other | high |
| Resolution order (SR-CORE-006, SAC-CORE-002) | matrix over {pin present/absent} × {own-collection candidate present/absent} × {canonical link present/absent}: pin wins, then own collection, then canonical; within a tier the qualified reference wins; a genuine tie FAILS naming **every** candidate. The failure message content is asserted, not just the exit code | high |
| Revision rules (SR-CORE-003) | `schema/VERSIONING.md` carries the document-revision anchors (when `version` increments; `(collection, id, version)` immutability; supersession by successor revision) — anchor-presence check in the `accept.sh` style | medium |

## Unit Tests (tools/rcplint/resolve, Go) — Layer 3, Trust

| Component | What to test | Priority |
|---|---|---|
| Record shape (SR-PUB-001) | `target{collection,id,version}` + `source` + `content_hash` + `resolver_version`; a record missing any of the four is rejected | high |
| Canonical JSON + hashing (SR-PUB-001, SP-005) | determinism — two runs over the same document produce byte-identical hashes; key ordering and number formatting are pinned by golden vectors; import allowlist test proves `crypto/sha256` + stdlib only, no new dependency | high |
| reconcile → frozen round-trip (SR-PUB-002) | reconcile writes records; frozen over the same untouched corpus passes and **rewrites nothing** (tree diff asserted empty) — the `npm ci` posture | high |
| Frozen inverted proof (SR-PUB-002, SAC-PUB-001) | three separate failures, each naming the reference and the nature of the break: (a) target mutated by one byte, (b) target missing, (c) `resolver_version` unknown. A gate that cannot fail is not a gate | high |
| Canonical links (SR-REG-001) | `canonical_recipe: {collection?, id, version}` validates and resolves under the scope rule; an entry **without** it stays valid — optionality tested explicitly, since "optional forever" is the design claim | high |

## Unit Tests (tools/rcplint, Go) — Layer 4, Teaching / extraction lint

| Component | What to test | Priority |
|---|---|---|
| Anchorless mention (SR-REG-002a) | step prose containing a registry-known preparation/technique term that nothing in the document anchors → WARNING naming the term and the step (AC-REG-006-2). One fixture, one rule — matching the existing `TestL2FixturesOneRuleEach` convention | high |
| Authored pattern (SR-REG-002b) | `faça um X` / `prepare um X` / `make a X` where X is unknown to the registry → WARNING; a separate fixture where X **is** registry-known must NOT warn (the false-positive guard, without which the rule is noise) | high |
| Pattern list maintenance | the pt/en pattern list is data, not code, and is covered by a table-driven test so adding a pattern cannot silently change unrelated fixtures | medium |
| Extraction rule as documentation | method-given → inline component; method-absent → class reference; the binding statement exists and is anchored (AC-REG-006-1) | medium |

## Unit Tests (tools/viewer, bun test) — Layer 4, surfaces

| Component | What to test | Priority |
|---|---|---|
| See-the-method (SR-TOOL-001) | from a linked mention the linked method renders (ingredients + steps) **without losing the parent** — the parent's DOM is asserted still present, which is the actual claim (AC-TOOL-004-1) | high |
| Schedule placement (SR-TOOL-001) | the linked preparation is placed before its consuming step via the existing two-stage Calculus schedule — offsets read from the Calculus, never re-derived in the viewer (AC-TOOL-004-2) | high |
| Capability gating (ADR-002) | the affordance exists iff the engine declares the capability; engine seam version stays 1; extended mock engine renders it with zero UI code changes — the no-rewrite proof, fourth generation | high |
| Media fragments (SR-CORE-004) | a `uri` carrying `#t=120,180` seeks to the fragment start; a second entry referencing the **same asset** with a different range renders independently (no shared player state) (AC-PR-005-1) | high |
| Fragment passthrough purity | the fragment is passed through verbatim — the viewer never parses it into structured start/end, because structured fields are a stated non-goal | medium |

## Integration

| Scenario | Components | Priority |
|---|---|---|
| Two collections load together, collision survives, pointers bind locally | pack schema + linter scope resolution + second-collection fixture | high |
| Unqualified cross-collection reference fails; qualified one resolves | linter + both collections | high |
| Lineage pin lifecycle: green → parent revised → stale warning → pin updated → green | linter + examples + second collection | high |
| Resolution-order matrix end-to-end on one mention answerable three ways at once | linter + registry canonical link + own collection + pin | high |
| `reconcile` then `frozen` over the full two-collection corpus; then mutate and re-run frozen | resolver/verifier + whole corpus | high |
| Stage contradiction warns while the co-located critical constraint refuses, in one `make validate` run | linter + CUE bounds + Calculus | high |
| See-the-method + schedule over a linked sub-recipe (`brownie-ganache` → `ganache-chocolate`) | viewer + Calculus | high |
| `make accept` extended with the new gates, still identifier-only output | all | high |
| Viewer CSP after rebuild: exact string unchanged, bundle < 500 KB (SAC-TOOL-001) | build | medium |

## Standing gates — every layer, every commit

Each of the four layers must end with all four green before the next
begins (SSP-002). None of them is new; all four now run over a
two-collection corpus, which is the change:

| Gate | Command | What v0.4 adds to it |
|---|---|---|
| Shape + semantics | `make validate` | second collection walked; scope, family, staleness, stage and mention rules fire |
| Cross-stack conformance | `make conformance` | documents carrying axis/lineage/qualifier fields replay unchanged |
| Calculus | `make calculus` | vectors **byte-identical** after the cut (SAC-CALC-001) — `git diff --stat calculus/vectors/` empty is part of the gate |
| Acceptance sweep | `make accept` | new checks for pack, resolver frozen mode, axis coverage, stage pair |
| Decode-compat | `go test -run TestDecodeCompat ./...` | both directions with qualifiers and manifests present; no new REQUIRED field in core (SAC-PR-001, AC-PACK-002-2) |

## Edge Cases

- **Collision plus qualification at once** — the colliding id is *also*
  the target of a qualified cross-collection reference. Both must hold:
  the local binding is untouched and the qualified one reaches the other
  collection.
- **Self-qualified reference** — a document qualifying a reference with
  its *own* collection identifier. Must resolve normally, not be treated
  as cross-collection.
- **Qualifier naming an unloaded collection** — must fail naming the
  collection, distinctly from "id not found".
- **Manifest identifier equal to the document's self-declaration** — no
  conflict report; only a genuine mismatch reports.
- **Two manifests in one loaded tree** — two collections, not one
  ambiguous collection; the loader must not merge them.
- **Pin to a revision the target has never declared** (pin ahead of
  target, not behind) — a failure, not staleness; staleness is only
  "pin behind target".
- **Stale pin and hardened mismatch on the same edge** — one warning and
  one failure; the failure must not be masked by the warning path.
- **Family of one, alone in its collection, with siblings in another** —
  warns, correctly, because cross-collection membership is invisible by
  design. The warning is the honest answer, not a false positive.
- **Axis `other` with an empty `variant_label`** — valid by schema but
  worth a warning: `other` without prose carries no information.
- **Unknown axis value on a known axis** (e.g. `equipment` naming an
  absent registry slug) — fails, distinct from an unknown *axis*, which
  falls into the catch-all.
- **Stage referenced with no measurement at all** — no contradiction to
  detect; must not warn.
- **Measurement exactly on a class bound** — inclusive; asserted
  explicitly so the comparison operator is pinned by test.
- **Media fragment `#t=120` (start only) and `#t=,180` (end only)** —
  both valid W3C forms; passthrough must not normalise them.
- **Fragment on a placeholder/absent asset** — marked absent, never
  silently skipped (the v0.3 posture carries forward).
- **Canonical link pointing into a collection that is not loaded** —
  resolution reports "unresolvable", never falls back to a same-id
  document in the loaded collection.
- **Frozen mode over a corpus with zero records** — passes vacuously;
  a test pins this, because vacuous-pass is exactly how a gate quietly
  stops guarding anything.

## What is hard to test — named limitations

- **Whether curation SCALES cannot be tested.** This is the PRD's riskiest
  assumption and no assertion can settle it: it is a claim about human
  effort over a growing corpus, not about code. The proxy is the
  anchorless-mention warning **count** — a rising count over commits is the
  early signal that authored anchoring is falling behind ingestion. We
  record the count per run; we do not gate on it, because a threshold
  would be invented rather than measured.
- **"Which roux the author meant" is unfalsifiable.** Resolution order is
  testable; whether the winning candidate is the *right* one is an
  authoring judgement the protocol deliberately refuses to automate. Tests
  cover the mechanism, never the intent.
- **Media fragment seeking stays partly manual.** There is still no browser
  harness (unchanged v0.2/v0.3 posture). The fragment parse and
  passthrough are pure and unit-tested; that the player actually seeks is
  a recorded manual check at acceptance.
- **Content-hash "correctness" is definitional.** The hash proves the same
  bytes, nothing more. That the canonical JSON serialisation is the *right*
  canonicalisation can only be tested against its own golden vectors — a
  change to canonicalisation is a spec change with vector regeneration,
  never a quiet test edit.
- **Cross-collection family completeness is unknowable by construction.**
  We test that validation stays silent, which is the correct behaviour, but
  a genuinely mis-slugged family split across collections will not be
  caught by anything. Accepted, and stated here so it is not rediscovered
  as a bug.
- **The second collection is synthetic.** It proves scope mechanics; it
  does not prove that two *independently authored* real packs merge
  cleanly. Private content never enters fixtures, so this stays a
  synthetic stand-in.

## Manual (recorded at acceptance)

- Load the two-collection corpus in the viewer; confirm the colliding
  `pao-alentejano` documents are distinguishable to a human reader.
- Activate see-the-method on the brownie's ganache mention; confirm the
  parent recipe is still readable behind/beside it.
- Play a media entry with `#t=120,180`; confirm the seek lands and a
  second range on the same asset plays independently.
- Read one stage-contradiction warning aloud in pt and en; confirm it
  names both values and reads as a naming disagreement, not an alarm.
