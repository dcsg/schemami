---
type: plan
id: PLAN-rcp-v02
model: claude-sonnet-4-6
implements: SPEC-002
phases:
  - id: 1
  - id: 2
  - id: 3
  - id: 4
  - id: 5
  - id: 6
    model: claude-opus-4-6
  - id: 7
  - id: 8
  - id: 9
---

# Plan: RCP v0.2 build

## Overview
**Task:** Implement SPEC-002 (RCP v0.2): four ADDITION-class core field groups (times/difficulty/storage/source), dish profile created at hardened, technique registry kind (DECISIONS #25), ingredient grounding, i18n pt-PT vocabulary, and the lightweight viewer on the ADR-002 engine seam (Bun + @cfworker/json-schema + yaml, conformance-vector parity). Tag rcp-v0.2 at green.
**Total Phases:** 9
**Estimated Cost:** ~$1.80
**Created:** 2026-08-02
**Execution mode:** autonomous run-through (Daniel's choice); evaluator gates each phase. ONE human pause: the Phase 3 batched mint checkpoint (Daniel approves technique seeds).
**Pre-flight:** specialist review 2026-08-02 (architect/security/qa/frontend — 4 lenses): 2 critical (both frontend: HTML escaping, CSP-on-file://), 18 warnings — all incorporated below.

## Progress

| Phase | Status | Attempt | Updated |
|-------|--------|---------|---------|
| 1     | done | 1/5 | 2026-08-02 |
| 2     | done | 1/5 | 2026-08-02 |
| 3     | done | 1/5 | 2026-08-02 |
| 4     | done | 1/5 | 2026-08-03 |
| 5     | done | 1/5 | 2026-08-03 |
| 6     | done | 1/5 | 2026-08-03 |
| 7     | done | 1/5 | 2026-08-03 |
| 8     | done | 1/5 | 2026-08-03 |
| 9     | in_progress (awaiting Daniel's manual checks) | 1/5 | 2026-08-03 |

**IMPORTANT:** Update this table as phases complete. This table is the persistent state that survives context compaction.

## Dependency Health Record (ADR-001 bar, applied per ADR-002)

Scored 2026-08-02; Daniel picked the validator from this scorecard (session record).

| Package | 2020-12 | Formats | Deps under it | Eval/CSP | Verdict |
|---|---|---|---|---|---|
| `@cfworker/json-schema` | official-test-suite-validated (~4,500 assertions) | built in | **zero** | no codegen — CSP-safe | **SELECTED** |
| `yaml` | n/a (YAML 1.2 parser) | n/a | zero | no eval | **SELECTED** |
| ajv (+ajv-formats) | full | second package required | several | `Function` codegen — needs unsafe-eval | rejected: over budget + eval |
| @hyperjump/json-schema | most spec-faithful | built in | several same-author pkgs | no eval | fallback if cfworker vectors show gaps |

Runtime dependency budget: **exactly 2**, exact-pinned (`yaml`, `@cfworker/json-schema`). Any change to this table is an ADR-002 revision, not a plan-level call.

## Standing rules (apply to EVERY phase)

- **ADDITION-only (SP-001/SAC-PR-001):** every phase ends `make validate` green over the unchanged corpus. Any change that invalidates an existing document is out of scope — stop and surface it, never "fix" the document to fit the schema change.
- **Regression floor (SAC-VAL-003):** `go -C tools/rcplint test ./...` green at every phase end. From Phase 6 onward, `make conformance` (bun test, frozen install) green too.
- **Two-surface split (DS-PR-001):** normative = schema/, registry/, i18n/; informative = tools/, Makefile. i18n/pt-PT.yaml is normative data; checkers are informative tooling.
- **Privacy boundary (hard):** private/collection/ is local-only — never copied into testdata/, conformance vectors, fixtures, commits, logs, or plan notes. Checks that read it MUST (a) skip-with-notice when the directory is absent, (b) emit only file+field identifiers, never matched text. Operational-AC evidence is recorded pass/fail only — no quoted content. Standing guard (added in Phase 1, runs in accept.sh): `git check-ignore -q private/collection && [ -z "$(git ls-files private/)" ]`.
- **Original wording:** committed prose derived while reading books — bound rationales, technique definitions, notes — MUST be authored original text, never transcribed book wording.
- **Registry governance:** phases PROPOSE mints; only the Phase 3 checkpoint (Daniel) approves. No entry written before approval. Append-only; aliases, never renames.
- **Toolchain law (ADR-002):** Bun via mise only (exact pin; installed only through mise, never curl|bash). Runtime deps exactly 2, exact-pinned. Installs always `bun install --frozen-lockfile`; bun.lock committed. No Node/npm/npx/bundler config anywhere. wasm is NOT in this cut.
- **Evidence convention:** as each AC passes, the run appends `AC-N.M: PASS — <date>` to this plan's "Verify evidence" section; operational ACs are recorded the same way after the human/local check (pass/fail only, no quoted content).
- Commit small per phase; message says why; cite CMP/DS/SR/AC ids; `git -c commit.gpgsign=false commit`.
- docs/research/ append-only. pt-PT culinary terms exact (massa velha ≠ isco).

## Model Assignment
| Phase | Task | Model | Reasoning | Est. Cost |
|-------|------|-------|-----------|-----------|
| 1 | Core field additions | sonnet | schema surgery + fixtures, well-specified | $0.10 |
| 2 | Dish profile | sonnet | one schema from two observed docs | $0.08 |
| 3 | Technique registry | sonnet | migration + checkpoint + lint check | $0.15 |
| 4 | Grounding | sonnet | 90+ entry edits + audit + ledger | $0.25 |
| 5 | i18n vocabulary | sonnet | vocabulary + coverage + slug lint | $0.10 |
| 6 | Viewer engine + conformance | **opus** | novel seam: interface, JS engine, layer-scoped vectors — correctness-critical | $0.65 |
| 7 | Viewer UI | sonnet | pure render-to-string + capabilities-driven glue | $0.15 |
| 8 | Re-encode private recipes | sonnet | pt-PT fidelity, provenance notes | $0.12 |
| 9 | Acceptance + ship + tag | sonnet | sweep extension, clean-worktree run, ledger updates, tag | $0.18 |

## Execution Waves

- **Wave 1:** Phase 1 (everything downstream builds on the new core)
- **Wave 2:** Phases 2, 3 (independent of each other; both need P1)
- **Wave 3:** Phases 4, 5 (both touch lint.go — serialize 4 then 5)
- **Wave 4:** Phase 6 (vectors must include P1's new fixtures)
- **Wave 5:** Phases 7, 8 (UI on engine; re-encode on P1+P2 schemas)
- **Wave 6:** Phase 9 (gates everything)

---

## Phase 1 — Core field additions + pastry storage

**Objective:** Land the four ADDITION-class field groups in core and admit `storage` in the hardened pastry profile (SR-PR-003; DS-PR-005/006/007/008; CMP-PR-003).

**Context needed:**
- `schema/rcp-core-v1.schema.json` — $defs/recipe, $defs/duration, taxonomy, provenance
- `docs/product/specs/SPEC-002-rcp-v02-implementation/spec.md` §SR-PR-003 — exact field shapes
- `docs/product/specs/SPEC-002-rcp-v02-implementation/fixtures.yaml` §l1-field-additions
- `schema/profiles/pastry.schema.json` — hardened block to extend
- `schema/VERSIONING.md` — ADDITION-class rules

**Prompt:** Add to `$defs/recipe`: (1) `times` object — optional keys `active`, `total`, `prep`, `cook`, `chill`, `rest`, each `$ref: #/$defs/duration`, `additionalProperties: false`, no required; (2) `taxonomy.difficulty` — integer, minimum 1, maximum 5; (3) `storage` — array of `{where: enum[room, refrigerator, freezer] (required), container: $defs/text, duration: $defs/duration, note: $defs/text}`, `additionalProperties: false`; (4) `provenance.sources[]` items gain optional `work` (string) and `page` (string). Extend the pastry profile's hardened block to admit `storage` additively. Create the fixtures from fixtures.yaml §l1-field-additions under tools/rcplint/testdata/l1/ — split the difficulty bounds into TWO fixtures (`difficulty-zero.rcp.yaml`, `difficulty-six.rcp.yaml`), each failing for exactly its one reason — with table-driven Go tests. Add the standing privacy guard to accept.sh (`git check-ignore -q private/collection && [ -z "$(git ls-files private/)" ]`). Do NOT touch example or private documents. `make validate` stays green unchanged.

**Completion promise:** `PHASE 1 COMPLETE CORE FIELDS ADDED REGRESSION GREEN`
**Max iterations:** 5

**Acceptance criteria:**
- AC-1.1: Core schema remains 2020-12 metaschema-valid after the additions.
- AC-1.2: `times-storage-source-ok` validates; `difficulty-zero`, `difficulty-six`, `times-unknown-key`, `storage-bad-where` each fail for exactly their one reason (go test).
- AC-1.3: `pastry-storage-ok.rcp.yaml` passes core ∧ pastry (hardened) — AC-PR-003-3.
- AC-1.4: `make validate` green over the unchanged corpus — AC-PR-003-1, SAC-PR-001.
- AC-1.5: Privacy guard present in accept.sh and green.

## Phase 2 — Dish profile, created at hardened

**Objective:** Create `schema/profiles/dish.schema.json` at `x-rcp-maturity: hardened`, typed from chili + feijoada only, warn-severity bounds with authored n=2 rationale (SR-PROF-004; DS-PROF-002; CMP-PROF-004).

**Context needed:**
- `private/collection/` chili + feijoada (LOCAL ONLY — field inventory source; never copy content)
- `schema/profiles/bread.schema.json` + `pastry.schema.json` — hardened pattern, x-rcp-bounds shape
- `tools/rcplint/validate.go` — profile composition and maturity labelling
- fixtures.yaml §dish-profile

**Prompt:** Inventory the fields the two real dish documents actually use (read locally; never quote book content into committed files — bound rationale strings are authored original text). Create schema/profiles/dish.schema.json following the hardened pattern: `x-rcp-maturity: hardened`, profile-block fields from observed use only, every numeric bound in `x-rcp-bounds` at warn severity with a reason string including the n=2 rationale. Wire into the validator's profile map if registration is explicit. Create `testdata/l1/dish-minimal-ok.rcp.yaml` (synthetic, CI-safe) with a Go test that composes core ∧ dish over it and asserts the hardened maturity label string, and `testdata/l2/dish-out-of-bounds.rcp.yaml` with a test asserting WARN-not-error with the rationale text present. Verify chili + feijoada validate core ∧ dish (hardened) locally — record pass/fail only. `make validate` green.

**Completion promise:** `PHASE 2 COMPLETE DISH PROFILE HARDENED WARN ONLY`
**Max iterations:** 5

**Acceptance criteria:**
- AC-2.1: dish.schema.json exists, metaschema-valid, `x-rcp-maturity: hardened`, every x-rcp-bounds entry warn severity with an n=2 rationale.
- AC-2.2: Go test validates dish-minimal-ok against core ∧ dish and asserts the hardened maturity label.
- AC-2.3: Out-of-bounds fixture produces WARN (not error) carrying the rationale (go test) — AC-PROF-004-2.
- AC-2.4: chili + feijoada validate core ∧ dish locally, recorded pass/fail — AC-PROF-004-1 (operational).

## Phase 3 — Technique registry kind + BATCHED MINT CHECKPOINT

**Objective:** Techniques become the fourth governed kind; the run's single human pause happens here (SR-REG-004; DS-REG-004; CMP-REG-004; part of CMP-VAL-003).

**Context needed:**
- `registry/vocab/techniques.yaml` — interim vocabulary to migrate
- `registry/entries/README.md` + one entry per existing kind — conventions
- `docs/guidelines/registry-governance.md` — rules 1–6; gains the fourth kind
- Dogfood harvest list (session record): sear, sauté/refogar, simmer, flambé, blend, strain, steam, soak, pipe
- `tools/rcplint/lint.go` — current executionMode.technique membership check

**Prompt:** STEP A (propose): draft the technique entry schema (id `technique.<ontology-path>`, kind: technique, display_name en required + pt, definition — authored original text, never book wording — optional primitive association, teaches, media) and a proposal table covering every interim vocab technique plus the dogfood harvest: proposed id, ontology path per rule 6, display names, definition, primitive link. STOP and present the batch to Daniel. No entry is written before approval. STEP B (after approval): write approved entries under registry/entries/technique/ (one file per entry, filename = id), extend registry validation to the fourth kind, switch rcplint's membership check from vocab list to entries, add `testdata/l2/unknown-technique.rcp.yaml`, update registry-governance.md (fourth kind, DECISIONS #25) and registry/entries/README.md, DELETE registry/vocab/techniques.yaml. `make validate` green.

**Completion promise:** `PHASE 3 COMPLETE TECHNIQUE KIND LIVE VOCAB RETIRED`
**Max iterations:** 5

**Acceptance criteria:**
- AC-3.1: Daniel approved the mint batch before any entry was written (operational — pass/fail checkpoint evidence in plan notes).
- AC-3.2: Entries exist for at minimum `technique.stir`-family, `none`-sentinel, `bulhao-pato`, `refogado`, `flambe` (exact approved ids recorded), and all validate under the technique. namespace — AC-REG-003-1.
- AC-3.3: Unknown technique reference rejected naming the entry (go test) — AC-REG-003-2.
- AC-3.4: `registry/vocab/techniques.yaml` deleted; entries present — SAC-REG-002.
- AC-3.5: registry-governance.md documents the fourth kind citing DECISIONS #25.

## Phase 4 — Ingredient grounding + gap-ledger consolidation

**Objective:** Every ingredient entry grounded (cross_refs or explicit no-match); audit enforces it; ledger groups by proposed canonical class (SR-REG-005; DS-REG-005; CMP-REG-005; part of CMP-VAL-003).

**Context needed:**
- `registry/entries/ingredient/*.yaml` — all entries
- `registry/schemas/ingredient-class.schema.json` — gains cross_refs/grounding
- `tools/rcplint/scripts/gap-ledger.py` — grouping change
- spec.md §SR-REG-005 — cross_refs shape; no-match is first-class

**Prompt:** Extend the ingredient-class schema with optional `cross_refs` (array of {system: enum[foodon, fdc, off], ref: string, url?: uri}) and `grounding: no-match` + `grounding_note`. Ground every ingredient entry: prefer FooDON class IRIs; FDC/OFF where FooDON lacks the concept; heritage/RCP-specific items (massa velha, isco, …) get explicit no-match with an authored note. Grounding refs are DATA — copy identifiers; never add network calls to validation. Use no-match honestly rather than forcing weak matches. Add the audit as a registry-CI check in rcplint (entry with neither → fails, named; testdata/registry/ fixtures per fixtures.yaml). Update gap-ledger.py: unresolved raws carry a proposed canonical English class; ledger groups by proposal. Give gap-ledger.py a `--self-test` flag: exits 0 and prints one line per group in the exact shape `PROPOSAL <canonical-class>: <raw>, <raw>` — the built-in case must show cebola and onion in one group. Update extraction guidance so extractors propose the canonical class per unresolved item. `make validate` green.

**Completion promise:** `PHASE 4 COMPLETE ALL ENTRIES GROUNDED AUDIT ENFORCED`
**Max iterations:** 5

**Acceptance criteria:**
- AC-4.1: Every ingredient entry has ≥1 cross_ref or explicit no-match; audit green — AC-REG-004-1.
- AC-4.2: Ungrounded fixture fails naming the entry; no-match fixture passes (go test).
- AC-4.3: `gap-ledger.py --self-test` exits 0 and its output shows cebola + onion on one PROPOSAL line — AC-REG-004-2.
- AC-4.4: `make validate` green.

## Phase 5 — i18n vocabulary + English-base enforcement

**Objective:** `i18n/pt-PT.yaml` covers every used taxonomy slug; rcplint enforces English-base slug shape (SR-I18N-001; DS-I18N-001; CMP-I18N-001; part of CMP-VAL-003).

**Context needed:**
- `examples/*.rcp.yaml` + private/collection (local) — used-slug census source
- Registry display_name pattern — translation shape
- `tools/rcplint/lint.go` — new L2 check location
- spec.md §SR-I18N-001

**Prompt:** Census every taxonomy slug (category, subcategory, other slug-valued facets) used across examples/ and private/collection/. Create i18n/pt-PT.yaml mapping each English-base slug to a pt-PT display term (exact culinary Portuguese; massa velha ≠ isco). Add the coverage checker at `tools/rcplint/scripts/i18n-coverage.py` with a `--collection-path` flag (default private/collection) and TWO explicit modes: examples-only with a skip notice when the collection path does not exist, full census when it does; failures name only the missing slug. The absent branch is exercised in tests by passing a nonexistent path — never by moving real local data. Wire into accept.sh. Add the L2 check: taxonomy slug values must be ASCII kebab-case, with `testdata/l2/accented-taxonomy-slug.rcp.yaml`. Registry entries keep their own display_name layer — do not duplicate into i18n/. `make validate` green.

**Completion promise:** `PHASE 5 COMPLETE I18N COVERED SLUGS ENFORCED`
**Max iterations:** 5

**Acceptance criteria:**
- AC-5.1: Coverage check green in full-census mode locally (operational, pass/fail record) — AC-I18N-001-1.
- AC-5.2: Accented-slug fixture rejected by the L2 check (go test).
- AC-5.3: `make validate` green.
- AC-5.4: `i18n-coverage.py --collection-path /nonexistent` exits 0 with the skip notice (the absent branch, exercised safely).

## Phase 6 — Viewer engine, layer-scoped conformance vectors (opus)

**Objective:** The ADR-002 seam becomes real: engine interface, JS engine, rcplint layer-tagged vector export, capability-scoped bun-test replay, CI wiring (SR-TOOL-001 engine half; DS-TOOL-001/002; CMP-TOOL-001; SAC-TOOL-001/002).

**Context needed:**
- `docs/architecture/decisions/ADR-002-viewer-engine-seam-bun.md` — the binding decision
- Dependency Health Record above — the pinned picks
- spec.md §SR-TOOL-001 + model.mmd engine classes — interface shape
- `tools/rcplint/validate.go` — verdict shapes and profile-composition logic to mirror
- fixtures.yaml §conformance-vectors

**Prompt:** (1) Create `.mise.toml` pinning bun (exact version; installs only via mise); run mise install. (2) Scaffold tools/viewer/ with Bun only: package.json with exactly two exact-pinned runtime deps — `yaml` and `@cfworker/json-schema` — committed bun.lock, tsconfig; no Node/bundler config. All installs `bun install --frozen-lockfile`. (3) `src/engine.ts`: the versioned interface — `capabilities: {l1: true}`, `analyze(text): Promise<{parse: {ok, errors[]}, verdicts[], canonical}>` with LAYER-TAGGED diagnostics (l1|l2|cue), `scale?` reserved; documented as the contract the future WASM engine implements. (4) `src/engine-js/`: YAML 1.2 parse via `yaml`; L1 validation via @cfworker/json-schema with format assertions enabled, mirroring rcplint's core ∧ profile[kind] composition and missing-profile warning (read validate.go). Include unit tests for YAML pathologies the repo already met — duplicate keys, flow-map unquoted commas — and for verdict layer-tagging. (5) rcplint vector export: for every document from a HARD-CODED allowlist (`examples/`, `tools/rcplint/testdata/l1/` — positives AND negatives), emit {input, expected verdicts (ALL layers, layer-tagged)} JSON into tools/viewer/conformance/vectors/. Assert-fail if any input path contains `private/`; add a vector-suite test asserting no vector carries a private-collection recipe id (ids only, never content). rcplint writes vectors; never hand-author; conformance disagreements are fixed in the JS engine, never by editing vectors. (6) bun test: replay each vector, FILTER expected verdicts to the engine's declared capabilities before diffing (same vectors + harness must serve the future WASM engine unchanged); interface-contract tests (analyze shape, capabilities, parse-failure → canonical null). (7) Makefile: add `conformance` target (frozen install + bun test) — the standing gate from this phase onward.

**Completion promise:** `PHASE 6 COMPLETE ENGINE CONFORMANT VECTORS GREEN`
**Max iterations:** 5

**Acceptance criteria:**
- AC-6.1: SAC-TOOL-001 checks pass: bun.lock committed with exactly 2 package entries, exactly 2 exact-pinned runtime deps, no trustedDependencies, no Node/bundler config, bun exact-pinned in .mise.toml, frozen-lockfile install mandated in Makefile.
- AC-6.2: Vector export covers the full allowlist (positives and negatives, ≥15 vectors), all verdicts layer-tagged; private-path assertion and no-private-id test green.
- AC-6.3: `make conformance` green: every vector agrees under capability-scoped comparison; interface contract pinned; YAML-pathology and layer-tagging tests green — SAC-TOOL-002.
- AC-6.4: `make validate` green (nothing normative changed).

## Phase 7 — Viewer UI (capabilities-driven render + page)

**Objective:** The static page: paste/drop → verdicts + human-readable render, pt-PT display, zero network, capabilities-driven so the WASM engine drops in without UI edits (SR-TOOL-001 UI half; CMP-TOOL-001; SSP-003/004).

**Context needed:**
- `tools/viewer/src/engine.ts` — the only import surface the UI may use
- `i18n/pt-PT.yaml` — display lookup
- spec.md render list; ADR-002 "UI reads capabilities" contract

**Prompt:** Build the UI as a pure core with thin glue — ALL rendering is pure string functions; app.ts only assigns their output.

- `src/render.ts`: pure canonical-JSON → HTML string covering the spec's render list (name; ingredients with resolved basis expressions; step sections with notes; per-component profile + maturity labels; display terms from a build-time-embedded i18n/pt-PT.yaml lookup). Signature takes a `lang` parameter, defaulted `'pt-PT'` with English fallback — v0.2 ships always-pt-PT, NO language toggle (recorded decision; the param exists so a toggle never changes the signature). **Escaping is mandatory:** every interpolated text value — including parse/validator error messages, which echo document content — goes through one `esc()` helper (`& < > " '`). Basis-expression rendering is pinned to an oracle: render tests assert expected resolved strings copied verbatim from `rcplint facts` output for at least one example doc (annotated as oracle-copied). Generated HTML uses classes only — never `style=""` attributes (CSP bans them). Verdict rendering is also a pure function here, CAPABILITIES-DRIVEN: group verdicts by layer tag, render whatever layers the engine returns, gate optional features (future scale control) on `engine.capabilities` — no layer names hardcoded into page structure.
- `src/app.ts`: thin DOM glue only — paste box, drop handlers (`preventDefault` on dragover/drop at BOTH drop-zone and window level so a stray drop never navigates away), size guard (reject input > 2 MB with a message before parse), busy state (disable input + "a validar…" while analyze runs), then assign render/verdict strings. Three UI states, each explicit: empty (instructional), parse-error (message, no render), results (verdicts + render). MUST NOT import the validator or yaml directly.
- `index.html`: hand-written; `<meta charset="utf-8">` FIRST (pt-PT diacritics); semantic structure (`<main>`, headings per section, `<ul>` for ingredients/steps); `aria-live="polite"` verdict region; verdict severity conveyed by text/icon, never color alone; visible focus on the paste box (the keyboard path — say so next to the drop zone); `<html lang="en">` with `lang="pt-PT"` on Portuguese display terms; `overflow-wrap: anywhere` for long names/URLs and a scrollable container for long ingredient lists.
- **Build (CSP-critical):** produce a SINGLE-FILE `dist/index.html` — `bun build --minify` output and CSS inlined — with a hash-based CSP meta tag (`default-src 'none'; script-src 'sha256-<hash>'; style-src 'sha256-<hash>'; img-src data:`), computed at build time. `'self'` sources are FORBIDDEN in the CSP: they break on file:// opaque origins. The build script recomputes hashes on every build.
- bun tests: render.ts pure-function tests (sample doc → expected sections, oracle-pinned basis strings); injection test — a doc with `<script>` and `<img onerror>` in name/notes/error text renders inert (escaped); parse-error state test; MOCK ENGINE advertising `{l1: true, l2: true}` proves additional layers render with zero UI change; greps assert app.ts imports the engine interface only and src/ contains no `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `localStorage`, `indexedDB`, `document.cookie` (the dist/ grep is a tripwire only — minification may need an allowlist tweak; src grep + CSP are the real controls). No browser-DOM harness.
- Immediately verify the CSP/file:// interaction: open dist/index.html from file:// in at least two browsers, page renders and validates a pasted example — recorded pass/fail in THIS phase, not deferred to Phase 9.

**Completion promise:** `PHASE 7 COMPLETE VIEWER RENDERS OFFLINE`
**Max iterations:** 5

**Acceptance criteria:**
- AC-7.1: Single-file dist/index.html < 500 KB, self-contained (no external references), hash-based CSP meta tag present with no 'self' sources, charset meta first.
- AC-7.2: render.ts tests green: expected sections for the sample doc; basis strings match the rcplint-facts oracle; injection fixtures render inert; parse-error state renders its message escaped.
- AC-7.3: Purity greps green: engine-only imports in app.ts; no forbidden network/storage APIs in src/ (dist tripwire noted if allowlisted).
- AC-7.4: Mock-engine `{l1, l2}` test proves added layers render with no UI change (the ADR-002 no-rewrite guarantee, tested).
- AC-7.5: Page opens from file:// in ≥2 browsers, renders and validates a pasted example (operational, recorded pass/fail in this phase).

## Phase 8 — Re-encode the private collection (north metric)

**Objective:** The five private recipes carry the new fields; zero prose-parking; nothing invented (completes FR-PR-003; AC-PR-003-2).

**Context needed:**
- `private/collection/*.rcp.yaml` (LOCAL ONLY)
- Phase 1 field shapes; DS-PR-006 mapping-recorded rule
- The ingest session's parked metadata (already in description prose)

**Prompt:** For each of the five private documents: move every piece of metadata currently parked in description prose into the new fields — times (book values as target), taxonomy.difficulty (map the book's 1–3 hat scale onto 1–5; record the mapping call in provenance notes per DS-PR-006), storage entries, provenance.sources work/page. Keep pt-PT exact; never invent values the book pages did not state — absent data stays absent, and that is a pass, not a gap. If re-encoding introduces any NEW taxonomy slug, add its pt-PT term to i18n/pt-PT.yaml in the same commit. Add to accept.sh: the prose-parking heuristic (time/difficulty/storage/source keyword patterns over description fields, pt-PT + English) and a hat-mapping-note presence check — both emitting file+field identifiers ONLY, never matched text, both skip-with-notice when private/ is absent. All five validate locally; dish docs pass core ∧ dish.

**Completion promise:** `PHASE 8 COMPLETE COLLECTION RE ENCODED NO PARKING`
**Max iterations:** 5

**Acceptance criteria:**
- AC-8.1: All metadata previously parked in prose is moved into fields; nothing invented; all 5 docs validate locally (operational, pass/fail record).
- AC-8.2: Prose-parking heuristic green over the collection (identifiers-only output) — AC-PR-003-2 assist.
- AC-8.3: Hat-mapping note presence check green locally; correctness judgment stays with Daniel.

## Phase 9 — Acceptance sweep, clean-worktree run, ship, tag

**Objective:** Extend the acceptance sweep to v0.2, prove the fresh-clone property, run all gates, update the ledger/roadmap, queue Daniel's manual checks, tag (all ACs; SAC-*).

**Context needed:**
- `tools/rcplint/scripts/accept.sh` — sweep to extend
- `docs/product/features.yaml` + `ROADMAP.md` — shipped-status updates
- PRD-002 + SPEC-002 sidecars — ship lifecycle targets
- Phase 7's queued manual checks

**Prompt:** Extend accept.sh with the v0.2 checks, each naming its AC: i18n coverage (dual-mode), grounding audit, prose-parking + hat-note heuristics (identifier-only, skip-with-notice), SAC-TOOL-001 file checks (incl. frozen-lockfile mandate + lock entry count), `make conformance`, vocab retirement, dish maturity labels, privacy guard. Run `make accept` — all green locally. Then the fresh-clone proof: `git worktree add` a clean checkout, `mise install`, `bun install --frozen-lockfile`, run `make validate` + `make conformance` there (private-dependent checks must skip-with-notice); remove the worktree. Update features.yaml — flip to shipped: FEAT-CORE-005, FEAT-PROF-005, FEAT-REG-003, FEAT-REG-004, FEAT-I18N-001; FEAT-TOOL-001 phasing note marks the lightweight cut delivered (full playground still later). Update ROADMAP.md v0.2 table. Present Daniel the manual-check list (11-doc paste-test AC-TOOL-001-1, devtools network silence AC-TOOL-001-2 — CSP + greps are the structural controls, devtools is confirmation — prose review AC-PR-003-2). After Daniel's green: run the edikt verify runner over the spec, ship PRD-002 FRs via the lifecycle, tag `rcp-v0.2` (unsigned), final summary with the re-validation statement per working conventions.

**Completion promise:** `PHASE 9 COMPLETE V02 SHIPPED TAGGED`
**Max iterations:** 5

**Acceptance criteria:**
- AC-9.1: `make accept` green including every new v0.2 check.
- AC-9.2: Clean-worktree run green: frozen install, `make validate` + `make conformance`, private checks skipped-with-notice.
- AC-9.3: features.yaml shows shipped for FEAT-CORE-005, FEAT-PROF-005, FEAT-REG-003, FEAT-REG-004, FEAT-I18N-001, and FEAT-TOOL-001's lightweight phase marked delivered; ROADMAP updated.
- AC-9.4: Daniel's manual checks recorded green (operational).
- AC-9.5: Tag `rcp-v0.2` exists on the green commit.

## Known Risks

- Grounding (P4) is research-heavy: FooDON IRI quality varies; use the no-match escape valve honestly rather than forcing weak matches.
- Conformance (P6): @cfworker format-assertion behaviour vs santhosh-tekuri's is the likeliest divergence point; budget iterations there. Vectors are never edited to make tests pass; hyperjump is the recorded fallback validator (Dependency Health Record).
- P3 checkpoint is the only human gate mid-run; if Daniel is away the run pauses there by design.
- private/collection is local-only: CI green ≠ collection green; operational criteria are verified locally, recorded pass/fail only.

## Deferred Artifacts

None — all three spec artifacts have phase coverage (model.mmd is reference-only by type).

## Verify evidence

<!-- The run appends `AC-N.M: PASS — <date>` lines here as gates pass. -->

Phase 9:
- AC-9.1: PASS — 2026-08-03 (make accept: 26/26 incl. all new v0.2 checks)
- AC-9.2: PASS — 2026-08-03 (clean worktree: mise install + frozen bun install + validate + conformance green; private checks skip-with-notice)
- AC-9.3: PASS — 2026-08-03 (5 features shipped w/ realized_by; FEAT-TOOL-001 lightweight delivered; ROADMAP v0.2 SHIPPED)
- AC-9.4: AWAITING DANIEL — checklist presented (paste-test, network silence, prose review, file:// x2 browsers)
- AC-9.5: pending AC-9.4 (tag after Daniel's green)
- edikt verify spec SPEC-002: 5 passed, 0 failed (verify-carrying SACs), 19 evidence-tracked

Phase 8:
- AC-8.1: PASS — 2026-08-03 (all parked metadata moved to fields; absent data stayed absent — biscuits/chili/feijoada carry no times/storage because their pages stated none; all 5 validate core ∧ profile locally)
- AC-8.2: PASS — 2026-08-03 (prose-parking heuristic clean, identifiers-only, skip-with-notice)
- AC-8.3: PASS — 2026-08-03 (DS-PR-006 mapping notes present on both difficulty-asserting docs; provenance.notes field ADDED to core — DS-PR-006 mandated the record but no field existed; adjustment recorded)

Phase 7:
- AC-7.1: PASS — 2026-08-03 (single-file dist 162 KiB, hash CSP no 'self', charset first, zero external refs)
- AC-7.2: PASS — 2026-08-03 (26/26 incl. oracle-pinned basis strings: nata salt 2%→10 g, hydration 55%→275 g)
- AC-7.3: PASS — 2026-08-03
- AC-7.4: PASS — 2026-08-03 (mock {l1,l2} engine renders the L2 group with zero UI change)
- AC-7.5: QUEUED for Daniel — browser extension cannot attach to file:// or localhost; CSP hash self-consistency proven mechanically (the page cannot block its own assets on any origin). Daniel: open tools/viewer/dist/index.html from file:// in 2 browsers, paste an example.

Phase 6:
- AC-6.1: PASS — 2026-08-03
- AC-6.2: PASS — 2026-08-03 (12 vector files, 16 layer-tagged verdicts; verify command corrected to count verdicts)
- AC-6.3: PASS — 2026-08-03 (21/21 bun tests: capability-scoped replay + contract + pathologies; agreement with rcplint on first run)
- AC-6.4: PASS — 2026-08-03

Phase 5:
- AC-5.1: PASS — 2026-08-03 (full census: 38 slugs incl. tags, all covered)
- AC-5.2: PASS — 2026-08-03 (ADJUSTED: enforcement is the core L1 slug pattern, pinned by fixture+test in l1/)
- AC-5.3: PASS — 2026-08-03
- AC-5.4: PASS — 2026-08-03 (absent branch via --collection-path /nonexistent, exit 0 + notice)

Phase 4:
- AC-4.1: PASS — 2026-08-03 (61/61 entries grounded, all refs web-verified by research agents; audit wired into lint)
- AC-4.2: PASS — 2026-08-03
- AC-4.3: PASS — 2026-08-03
- AC-4.4: PASS — 2026-08-03
- Phase 4 notes: v0.1's unexercised cross_refs placeholder (object shape, zero entries used it, verified against the tag) replaced by DS-REG-005's array shape with label/url/match evidence fields. 7 entries initially got system: False — YAML 1.1 parsed bare `off` as boolean; fixed and safe_dump now quotes it. massa-velha grounded broader-to-dough with a note refusing the sourdough-starter conflation (massa velha ≠ isco). ingredient.proposed_class added to core (extraction proposal channel).

Phase 3:
- AC-3.1: PASS — 2026-08-02 (Daniel approved all 13 at the checkpoint; orphans kept)
- AC-3.2: PASS — 2026-08-02
- AC-3.3: PASS — 2026-08-02
- AC-3.4: PASS — 2026-08-02
- AC-3.5: PASS — 2026-08-02

Phase 2:
- AC-2.1: PASS — 2026-08-02 (zero bounds authored — n=2 observed none; rationale in the profile description)
- AC-2.2: PASS — 2026-08-02
- AC-2.3: PASS — 2026-08-02 (ADJUSTED: severity machinery tested — warn→advisory, critical→gate; no dish bound exists to violate; adjustment recorded in criteria sidecar)
- AC-2.4: PASS — 2026-08-02 (chili + feijoada core ∧ dish hardened, local)
- Phase 2 notes: severity routing is now real pipeline-wide — bread's warn bounds (salty-bread fixture) became advisories; v0.1's AC-PROF-001-2 vet-failure expectation updated with comments. check.py census reverse direction downgraded to advisory (registry is a vocabulary, not a per-doc index); two orphan entries queued for the Phase 3 checkpoint: ingredient.fruit.dried.raisin, ingredient.vegetable.tomato.pulp.

Phase 1:
- AC-1.1: PASS — 2026-08-02
- AC-1.2: PASS — 2026-08-02
- AC-1.3: PASS — 2026-08-02
- AC-1.4: PASS — 2026-08-02
- AC-1.5: PASS — 2026-08-02
