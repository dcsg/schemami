---
type: plan
id: PLAN-rcp-v03
model: claude-sonnet-4-6
implements: SPEC-003
phases:
  - id: 1
    model: claude-opus-4-6
  - id: 2
    model: claude-opus-4-6
  - id: 3
    model: claude-opus-4-6
  - id: 4
  - id: 5
  - id: 6
  - id: 7
  - id: 8
  - id: 9
---

# Plan: RCP v0.3 build — the protocol computes

## Overview
**Task:** Implement SPEC-003: the Recipe Calculus (normative spec + vectors at calculus/, Go reference replacing the clamp, TS implementation behind the seam), timeline derivation, decode-compat gate on frozen v0.1 decode structs, media conventions + rendering, viewer scale + schedule surfaces. Tag rcp-v0.3 at green.
**Total Phases:** 9 (FULLY SERIAL — no parallel waves; shared-file analysis showed parallelism saved nothing and risked conflicts)
**Estimated Cost:** ~$2.70
**Created:** 2026-08-03
**Media boundary:** DECISIONS #27 carve-out applies (book-derived media local-private only; attestation enforces the absolute remainder).
**Pre-flight:** 4-lens specialist review (architect/security/qa/frontend): 1 critical (coverage-gate ordering — phases reordered: timeline now precedes vectors), 8 high, ~15 warnings — ALL incorporated.
**Execution mode:** autonomous run-through (Daniel); evaluator gates each phase. TWO human pauses: the Phase 1→2 CHECKPOINT GATE (Daniel reviews calculus/SPEC.md; Phase 2 MUST NOT start without his recorded green — an entry precondition, not a Phase 1 AC) and Phase 7's media drop (photo of Daniel's own cooking; book-media extraction refused per SP-004/DECISIONS #11).
**Vocabulary:** binding per DECISIONS #26.

## Progress

| Phase | Status | Attempt | Updated |
|-------|--------|---------|---------|
| 1     | done | 1/5 | 2026-08-03 |
| 2     | done | 1/5 | 2026-08-03 |
| 3     | pending | 0/5 | — |
| 4     | pending | 0/5 | — |
| 5     | pending | 0/5 | — |
| 6     | pending | 0/5 | — |
| 7     | pending | 0/5 | — |
| 8     | pending | 0/5 | — |
| 9     | pending | 0/5 | — |

**IMPORTANT:** update as phases complete — persistent state across compaction.

## Standing rules (EVERY phase)

- **ADDITION-only (SP-002):** every phase ends `make validate` + `make conformance` green; `go -C tools/rcplint test -count=1 ./...` green. `make calculus` joins the standing gate from Phase 5 (both implementations).
- **Fail-closed parity (SP-001):** no phase alters a refusal outcome or authored reason. Clamp deleted only in the phase proving parity. If parity work reveals a clamp BUG, policy is bug-for-bug parity first; divergence only via a recorded decision entry — never silent.
- **Purity (SSP-005):** Go calc = stdlib allowlist; TS calc = zero imports. Purity tests land WITH the first code. The SPEC defines float tolerance/rounding explicitly (Phase 1) — replay disagreement beyond tolerance is a replayer bug.
- **Vector discipline (DS-CALC-002):** rcplint writes vectors; replays fix the replayer. The freeze BINDS AT THE END OF PHASE 4 (the set is complete then); after that, a vector edit outside a calculus/SPEC.md-change commit is a defect. During build-out (P3–P4) additions are expected; pre-existing vector files must remain byte-identical across regenerations (asserted).
- **Dependency freeze:** accept.sh (from Phase 2) asserts the exact dependency surface — viewer: exactly `yaml` + `@cfworker/json-schema` at their pinned versions; rcplint go.mod require block unchanged. Any new dep fails the sweep and requires a recorded decision.
- **Seam stability (SP-003):** RcpEngine version stays 1; capabilities only. PRE-AUTHORIZED additive shapes (so implementers don't relitigate mid-phase): `ClampResult` gains optional `scaled?: unknown` (the scaled canonical document — scale() was reserved, its result shape is being DEFINED, not changed); `schedule?()` added as optional member. UI imports the engine interface only (grep-enforced).
- **Privacy boundary:** private/collection/ local-only; skip-with-notice; identifier-only outputs. Media (per DECISIONS #27): book-derived media permitted ONLY in the gitignored private collection for personal use; it NEVER enters commits, dist, artifacts or vectors — including base64-encoded in text files (attestation enforces both forms). Drop-pause evidence is the literal string PASS/FAIL/DEFERRED only — no filenames, paths, EXIF or screenshots. Object/data URLs never serialized into any persisted output.
- **CSP exact-match:** from Phase 7, accept.sh asserts the ENTIRE CSP meta string byte-for-byte (all directives incl. `default-src 'none'`) — absence of connect-src proves nothing; the full string does. Every dist rebuild re-proves it.
- **Two-surface split:** calculus/ (SPEC.md + vectors/) is NORMATIVE. The promotion is a concrete deliverable: CLAUDE.md's Layout section and docs/project-context.md both list calculus/ as normative (Phase 1).
- **Evidence convention:** `AC-N.M: PASS — <date>` appended to Verify evidence; operational ACs pass/fail(/deferred) only.
- Commit small; cite CMP/DS/SR/AC ids; `git -c commit.gpgsign=false commit`. docs/research/ append-only. pt-PT culinary terms exact.

## Model Assignment
| Phase | Task | Model | Est. |
|-------|------|-------|------|
| 1 | calculus/SPEC.md + CHECKPOINT GATE | **opus** | $0.50 |
| 2 | Go reference + parity + clamp deletion | **opus** | $0.55 |
| 3 | Timeline derivations + entremet | **opus** | $0.45 |
| 4 | Vector writer + coverage gate + freeze | sonnet | $0.20 |
| 5 | TS implementation + full replay | sonnet | $0.30 |
| 6 | Decode-compat gate | sonnet | $0.15 |
| 7 | Media (conventions, ingress, rendering) + DROP PAUSE | sonnet | $0.25 |
| 8 | Viewer scale + schedule surfaces | sonnet | $0.20 |
| 9 | Acceptance, worktree, ship, tag | sonnet | $0.15 |

## Execution order

Strictly serial: 1 → [CHECKPOINT GATE] → 2 → 3 → 4 → 5 → 6 → 7 → [MEDIA PAUSE] → 8 → 9.

---

## Phase 1 — calculus/SPEC.md: the normative semantics (opus)

**Objective:** Every Calculus function specified — domain, units, edges, float tolerance, worked examples — plus the machine-readable edge-class enumeration; normative-surface promotion delivered; run pauses at the checkpoint gate (SR-CALC-001 spec half; SR-CALC-002 enumeration; CMP-CALC-001; DS-CALC-001/002/003).

**Context needed:**
- tools/rcplint/clamp.go + clamp_test.go (behaviours the SPEC subsumes exactly)
- tools/rcplint/facts.go (basis + severity semantics as implemented)
- schema/rcp-core-v1.schema.json (duration windows, bases, scaling, constraints)
- SPEC-003 DS-CALC-003; docs/ubiquitous-language.md (binding terms)

**Prompt:** Write `calculus/SPEC.md` (normative). Define: scale (uniform + pivot), resolveBases (matching facts.go semantics incl. include_components), selectGuardPath, enforceConstraints (critical refuses with authored pt/en reasons as opaque strings; warn advises), min_batch floors, fixed-quantity asymmetry, duration re-estimation, readingOrder, interleave (track), schedule (offsets from t0; {item, start_offset window, duration window}; target scalar, min/max conservative intervals) — each with domain, unit semantics, edge behaviour and AT LEAST ONE WORKED EXAMPLE (these become verbatim table tests in P2/P3). STRUCTURAL ANCHORS ARE MANDATORY (criteria pre-flight — completeness must grep): every function gets a `## fn: <name>` section containing `### Domain`, `### Units`, `### Edges`, `### Worked example` sub-headings; window arithmetic examples titled `### Worked example: window-propagation` and `### Worked example: prerequisite-placement`; numeric discipline under a `## Numeric discipline` heading (float tolerance + rounding, display vs vectors). The edge-class enumeration is a fenced block tagged `rcp-edge-classes`, one `class: <slug>` per line, ≥6 classes (unit-boundaries, guard-combinations, fixed-quantity-refusals, min-batch, ratio-invariance, timeline-arithmetic). Anchors make the ACs mechanical; ADEQUACY is Daniel's checkpoint's job — the division is deliberate. Deliver the normative-surface promotion concretely: CLAUDE.md Layout section + docs/project-context.md list calculus/ as normative. Then STOP and present the SPEC to Daniel.

**Completion promise:** `PHASE 1 COMPLETE CALC SPEC DRAFTED`
**Checkpoint gate (Phase 2 entry precondition, NOT a Phase 1 AC):** Phase 2 MUST NOT start until Daniel's verdict is recorded in this plan's notes as `CHECKPOINT: CALC SPEC GREEN — <date>` (with any semantic changes he ordered applied and re-presented). The evaluator cannot satisfy this; only the recorded human green does.
**Max iterations:** 5

**Acceptance criteria:**
- AC-1.1: calculus/SPEC.md has a `## fn:` section for every SR-CALC-001/003 function, each containing the four mandated sub-headings (grep).
- AC-1.2: The ```rcp-edge-classes fenced block exists with ≥6 `class:` lines (grep + count).
- AC-1.3: `### Worked example: window-propagation`, `### Worked example: prerequisite-placement` and `## Numeric discipline` anchors present (grep); adequacy = Daniel's checkpoint.
- AC-1.4: CLAUDE.md + docs/project-context.md list calculus/ as normative.
- AC-1.5: `make validate` green (nothing else touched).

## Phase 2 — Go reference: parity, then the clamp dies (opus)

**Objective:** tools/rcplint/calc implements the REVIEWED SPEC; clamp parity verbatim; clamp deleted; SPEC↔code completeness mechanical (SR-CALC-001; CMP-CALC-002; SP-001; SSP-005; AC-CALC-001-2).

**Context needed:**
- Reviewed calculus/SPEC.md (post-checkpoint)
- clamp.go + clamp_test.go (parity oracle, migrated not rewritten)
- facts.go (shared basis logic — extract to ONE home)

**Prompt:** Implement package tools/rcplint/calc per the reviewed SPEC — pure, stdlib-allowlist (TestCalcPurity lands now). EVERY WORKED EXAMPLE in the SPEC for this phase's functions becomes a verbatim table test NAMED BY ITS WE-id, and parity/edge tests cite the R-rule ids they pin (QA pre-flight HIGH — the examples are the spec's own tests). Migrate all clamp_test cases to calc/parity_test.go asserting identical outcomes AND authored pt/en reason strings. Rewire the clamp subcommand through calc (CLI surface unchanged; accept.sh refusal checks untouched). Extract basis resolution to exactly one exported home — mechanical check: a test asserts a single exported basis-resolution symbol and that facts.go imports/calls it (no duplicate implementation). Add the SPEC-completeness check: a test greps every exported symbol in calc and asserts it appears in calculus/SPEC.md (AC-CALC-001-2 made mechanical). Add the dependency-freeze check to accept.sh (viewer's exact 2 pinned deps; go.mod require block unchanged). Delete clamp.go in the parity commit. Standing gates green — note `make conformance` also pins facts' CUE payload shape (the v0.2 L1 vectors), promoted here to an explicit AC.

**Completion promise:** `PHASE 2 COMPLETE CALC REFERENCE PARITY CLAMP DELETED`
**Max iterations:** 5

**Acceptance criteria:**
- AC-2.1: Every migrated parity case: identical accept/refuse + authored reasons — AC-CALC-001-1.
- AC-2.2: clamp.go absent; clamp subcommand routes through calc; accept.sh refusal checks green untouched.
- AC-2.3: TestCalcPurity green; SPEC worked examples for P2 functions pass as verbatim table tests.
- AC-2.4: Single-sourcing mechanical: one exported basis symbol, facts.go consumes it (test-asserted).
- AC-2.5: SPEC-completeness test green (every exported calc symbol appears in calculus/SPEC.md).
- AC-2.6: facts CUE payload unchanged (make conformance green) + dependency-freeze check live in accept.sh.

## Phase 3 — Timeline derivations (opus)

**Objective:** readingOrder, interleave, schedule in calc matching the SPEC's worked examples; torta + original-authored entremet fixtures (SR-CALC-003; CMP-CALC-002; DS-CALC-003).

**Context needed:**
- calculus/SPEC.md worked examples (the arithmetic oracle)
- tools/viewer/example.rcp.yaml (torta); fixtures.yaml §timeline-derivation

**Prompt:** Implement the three derivations per the SPEC. SPEC worked examples become verbatim table tests named by their WE-ids (window propagation, prerequisite placement); edge tests cite R-SCHED/R-INTERLEAVE/R-ORDER rule ids. readingOrder must reproduce the v0.2 viewer's component-before-consumer order on the torta. Create testdata/calc/entremet.rcp.yaml — ORIGINAL-AUTHORED (structure exercises multi-day + parallel tracks; quantities and text invented, transcribed from NO published recipe — security pre-flight): insert frozen 2 days ahead, sponge the day before, assembly + glaze day-of. Schedule: torta places ganache/calda before s5 with correct offsets; entremet respects DAG + windows across days/tracks. Extend the SPEC-completeness test to the new exported symbols. Standing gates green.

**Completion promise:** `PHASE 3 COMPLETE TIMELINE DERIVED`
**Max iterations:** 5

**Acceptance criteria:**
- AC-3.1: SPEC worked examples for timeline pass verbatim as table tests.
- AC-3.2: Torta: mise-en-place order + offsets + prerequisite placement — AC-CALC-003-1 (Go half).
- AC-3.3: Entremet (original-authored): multi-day multi-track schedule respects DAG + windows — AC-CALC-003-2 (Go half).
- AC-3.4: SPEC-completeness test still green; standing gates green.

## Phase 4 — Vector writer + coverage gate + FREEZE

**Objective:** calc-vectors emits the COMPLETE set (all functions incl. timeline); coverage gate enforces the enumeration and provably fails; the vector freeze binds at phase end (SR-CALC-002; CMP-CALC-002; SAC-CALC-002).

**Context needed:**
- calc (complete, P2+P3); SPEC enumeration block; v0.2 vectors.go pattern

**Prompt:** Add `rcplint calc-vectors <outdir>` with an EXPLICIT INPUT ALLOWLIST (examples/, tools/rcplint/testdata/ — hard-refuse with nonzero exit any path outside it; a test feeds a private/collection path and asserts refusal, not absence). Records {function, edge_classes[], rules[] (R-ids exercised), input, expected}; no absolute filesystem paths in any record (asserted); deterministic (two runs byte-identical, tested). TestCalcCoverage parses the SPEC's enumeration and fails naming any vectorless class; inverted test (emptied class → failure). All six classes populated — timeline exists (P3), so coverage is GREEN on the real set with no exemptions. `make calculus` = regenerate + verify + Go suite (TS joins P5). From this phase's end the vector freeze binds (standing rule). Standing gates green.

**Completion promise:** `PHASE 4 COMPLETE VECTORS FROZEN COVERAGE ENFORCED`
**Max iterations:** 5

**Acceptance criteria:**
- AC-4.1: calc-vectors covers every exported function; determinism test green; no absolute paths in records.
- AC-4.2: Coverage gate green on the real set (all classes); inverted test proves failure — SAC-CALC-002.
- AC-4.3: Private-path input REFUSED (tested); allowlist hard-coded.
- AC-4.4: `make calculus` (Go half) green.

## Phase 5 — TS implementation replays everything

**Objective:** tools/viewer/src/calc replays the frozen set; make calculus = both implementations (SR-CALC-002; CMP-CALC-003; SAC-CALC-001).

**Context needed:** calculus/SPEC.md + vectors/ (frozen); engine.ts; v0.2 replay pattern.

**Prompt:** Implement the TS Calculus — zero imports (bun purity test). Replay every vector; diffs fixed HERE, never in vectors; tolerance per the SPEC's numeric discipline. Extend make calculus: Go + TS in one command. Math only — NO engine wiring (P8). No new deps (freeze check already live). Standing gates green; bundle untouched.

**Completion promise:** `PHASE 5 COMPLETE TWO IMPLEMENTATIONS AGREE`
**Max iterations:** 5

**Acceptance criteria:**
- AC-5.1: Full replay green in TS — AC-CALC-002-1 second implementation.
- AC-5.2: TS purity (zero imports) green.
- AC-5.3: `make calculus` runs both, green — SAC-CALC-001; dependency surface unchanged.

## Phase 6 — Decode-compat gate

**Objective:** Frozen v0.1 decode structs; both directions; provably able to fail; struct-vs-tag mechanical (SR-PR-004; CMP-PR-004; DS-PR-009; SAC-PR-002).

**Context needed:** tag rcp-v0.1; schema/VERSIONING.md; fixtures.yaml §decode-compat.

**Prompt:** Hand-write tools/rcplint/compat/reader_v01.go: exactly the rcp-v0.1 field surface, tag SHA pinned, unknowns tolerated by decoder default. Extract the tag's documents to testdata/compat/v01/. TestDecodeCompat: frozen reader decodes every current document (v0.1-era fields intact); current loader decodes every v01 extract; breaking variant FAILS (inverted test). Add the mechanical transcription check (QA pre-flight): a test diffs the struct field list against `git show <pinned-SHA>:schema/rcp-core-v1.schema.json`'s property names — the pin can now rot loudly for real. Wire into accept.sh naming AC-PR-004-1. Standing gates green.

**Completion promise:** `PHASE 6 COMPLETE COMPAT GATE BOTH DIRECTIONS`
**Max iterations:** 5

**Acceptance criteria:**
- AC-6.1: Both directions green — AC-PR-004-1.
- AC-6.2: Breaking fixture fails; inverted test — AC-PR-004-2, SAC-PR-002.
- AC-6.3: Struct-vs-tag field diff test green; gate in make accept.

## Phase 7 — Media: conventions, ingress, rendering + DROP PAUSE

**Objective:** schema/MEDIA.md; smuggle-proof attestation; viewer media at document AND step level with real ingress paths; Daniel's photo (SR-TOOL-002; CMP-TOOL-002/003; SP-004).

**Context needed:**
- core $defs/media (roles incl. failure; licence REQUIRED; steps carry media since v0.1)
- DS-TOOL-003; current app.ts drop handler (READS ANY DROP AS TEXT — must be fixed here)
- Daniel's ruling: book-page extraction refused; personal-cooking photos only

**Prompt:**
- `schema/MEDIA.md` (normative) with MANDATED SECTION ANCHORS (criteria pre-flight): `## Asset location`, `## Licence`, `## Prohibition: source-book media` (scope per DECISIONS #27: local private-collection personal use permitted; commits/dist/artifacts/vectors/published surfaces absolutely never — with the rationale), `## Never serialized` (object/data URLs never enter any persisted output — rule + test). Content beyond the anchors: relative URIs from document location; private assets in private/collection/media/; licence required, two-tier stance.
- **Attestation (smuggle-proof, security pre-flight HIGH):** accept.sh check with an EXPLICIT allowlist file (checked in, exact paths); scans (a) binary media files outside the allowlist AND (b) text files + built dist for `data:image/...;base64` / large base64 raster payloads outside the allowlist. Inverted tests: planted disallowed binary AND planted base64 fixture both fail the gate (then removed).
- **Ingress (frontend pre-flight HIGH):** `<input type="file" multiple>` as the primary, keyboard-accessible, TOUCH-CAPABLE path (drag-drop is an enhancement, not the only door — mobile artifact has no drag). Discriminate document vs asset drops by CONTENT (magic bytes), never extension — a dropped JPEG must never land in the textarea (fixes the current files[0]-as-text bug). Multiple files; matching = URI basename vs dropped filename (tested, incl. a mixed doc+asset drop).
- **Render plumbing:** RenderContext gains `assets: Record<uri, objectUrl>` (named here so purity survives); render media at document AND step level by role — failure visibly labelled by TEXT not color/position alone; alt = authored caption via text(), falling back to the role label; placeholder URIs AND unmatched URIs both render the same labelled-absent state (never a broken element). ALL FOUR media types render (Daniel 2026-08-03 — the model is photo|video|audio|diagram since v0.1): photo/diagram via <img>; video via <video controls> (no autoplay); audio via <audio controls>; every element's absent/unmatched state identical.
- **Lifecycle:** assets live in app.ts state keyed by basename, persist across re-analyses, revoked on same-name re-drop and on document change/page reset (revocation testable in isolation from DOM events — bun test).
- **CSP:** img-src data: blob: AND media-src data: blob: (Daniel's video catch — <video>/<audio> are governed by media-src, which default-src 'none' would silently block; neither scheme can reach the network, egress stays impossible). NO other source. Rebuild single-file dist; the CSP EXACT-STRING assertion (full meta string incl. default-src 'none') enters accept.sh now and stays.
- Book-derived local assets (DECISIONS #27): crop the nine madeleine step frames from Daniel's page photo (provided 2026-08-03) into private/collection/media/ and reference them as step-level media from the madeleines private document — LOCAL ONLY; the attestation must stay green after (proof the boundary holds with real content behind it).
- THEN PAUSE: ask Daniel for ≥1 photo of his own cooking (still the AC-TOOL-002-1 target — personal media remains the only class eligible beyond the local boundary); reference from a private document; render locally. Evidence recorded as the literal string PASS, FAIL, or DEFERRED — nothing else (no filename/path/EXIF/screenshot). If DEFERRED: synthetic placeholder marked as such; AC-7.4 records deferred; Phase 9's human gate still blocks the tag until resolved.

**Completion promise:** `PHASE 7 COMPLETE MEDIA RENDERED` (asset outcome recorded separately as PASS/FAIL/DEFERRED)
**Max iterations:** 5

**Acceptance criteria:**
- AC-7.1: MEDIA.md carries the four mandated section anchors (grep) — AC-TOOL-002-1 doc half; adequacy at Daniel's Phase 9 read.
- AC-7.2: Attestation green AND provably fails on both planted cases (binary + base64) — AC-TOOL-002-2 gate.
- AC-7.3: Render tests: roles at doc+step level across ALL FOUR types (img/video/audio elements per type), failure text-labelled, alt policy, absent-state for placeholder AND unmatched, basename matching, revocation unit test.
- AC-7.4: Daniel's photo outcome recorded (PASS/FAIL/DEFERRED — operational).
- AC-7.5: CSP exact-string assertion live in accept.sh (img-src AND media-src exactly `data: blob:`); bundle < 500 KB; file-input ingress works without drag.

## Phase 8 — Viewer scale + schedule surfaces

**Objective:** clamp + timeline capabilities live; the scale control's HAPPY PATH renders scaled quantities; schedules read like a kitchen plan (SR-TOOL-003; CMP-TOOL-003; DS-TOOL-004; SP-003).

**Context needed:**
- engine.ts (pre-authorized shapes: ClampResult.scaled?, schedule?())
- src/calc (P5); render.ts capabilities pattern; entremet fixture (P3)

**Prompt:**
- **Engine:** capabilities gain clamp + timeline. scale() via TS calc returns {accepted, reasons, scaled?} — scaled = the scaled canonical document (pre-authorized additive shape). schedule() optional member returns the derivation.
- **Scale control (per-document, next to each article):** visible <label>; `inputmode="decimal"`; COMMA-TOLERANT parsing ("1,5" works — pt-PT UI); default 1; explicit "Aplicar" button (the decided trigger); client-side rejection of ≤0/non-finite/empty with a rendered message DISTINCT from an engine refusal (aria-describedby association). Factor state lives in app.ts outside the render output, persists across re-analyses, resets on document change. ACCEPTED path re-renders via renderDocument(result.scaled) — ingredient amounts and basis absolutes visibly change (frontend pre-flight HIGH: the happy path renders). REFUSED path renders authored reasons pt primary + en secondary per the text() convention, role="alert".
- **Schedule view (only when timeline declared):** humanized pt-PT durations ("2 h 30 min"); relative-day grouping for multi-day ("2 dias antes" / "véspera" / "no dia"); target prominent, min–max as secondary range; anchor = t0 default (serve-anchor is a later transform); semantic structure (<ol> with <time>); render-tested on the TORTA and the ENTREMET (day grouping does not ship untested).
- **Tests:** mock engines BOTH richer ({l1, clamp, timeline}) and poorer ({l1}) prove controls appear/vanish with zero UI code change; scaled-render assertion (amounts change); refusal render (authored strings verbatim); schedule formatting for both fixtures; purity greps; single-file dist rebuild; CSP exact-string still green (standing).

**Completion promise:** `PHASE 8 COMPLETE VIEWER COMPUTES`
**Max iterations:** 5

**Acceptance criteria:**
- AC-8.1: Scale happy path: accepted factor re-renders scaled amounts (bun-tested) — the control is not a no-op.
- AC-8.2: Refusal renders authored pt/en verbatim, role=alert; control present iff clamp — AC-TOOL-003-1.
- AC-8.3: Schedule view humanized + day-grouped, tested on torta AND entremet — AC-TOOL-003-2 render half.
- AC-8.4: Mock engines richer AND poorer: zero UI changes — AC-TOOL-003-2; purity greps; CSP exact-string; < 500 KB.

## Phase 9 — Acceptance, clean worktree, ship, tag

**Objective:** Sweep extended; fresh-clone proof; ledger/roadmap; Daniel's acceptance; tag (all ACs; SACs; AC-CALC-001-2 evidence).

**Context needed:** accept.sh; features.yaml/ROADMAP; PRD-003+SPEC-003 sidecars; edikt verify.

**Prompt:** accept.sh finalized (each check names its AC): make calculus, coverage, compat, attestation (with both inverted proofs referenced), CSP exact-string, dependency freeze, purity, SPEC-completeness. make accept green. Clean-worktree proof (mise install, frozen bun install, validate + conformance + calculus; private checks skip-with-notice). Ledger: FEAT-CALC-001/002, FEAT-CORE-003, FEAT-TOOL-002 → shipped with realized_by (verify: python assertion on the four ids' status + realized_by, named command — QA pre-flight); FEAT-TOOL-001 phasing note (scale+schedule shipped via TS calc; WASM later); ROADMAP v0.3 SHIPPED. Daniel's checklist: Calc-SPEC final read (AC-CALC-001-2 evidence — SPEC review against what shipped), scale refusal reads right in pt+en, schedule sanity vs human reading, media photo renders (resolve any DEFERRED), file:// two browsers. After green: edikt verify spec SPEC-003; ship PRD-003 FRs; tag rcp-v0.3 (`git -c tag.gpgsign=false`); final summary with re-validation statement.

**Completion promise:** `PHASE 9 COMPLETE V03 SHIPPED TAGGED`
**Max iterations:** 5

**Acceptance criteria:**
- AC-9.1: make accept green (all v0.3 checks incl. inverted proofs).
- AC-9.2: Clean-worktree run green (validate + conformance + calculus).
- AC-9.3: Ledger/roadmap verified by named command (four FEATs shipped + realized_by; TOOL-001 note; ROADMAP grep).
- AC-9.4: Daniel's acceptance recorded green incl. Calc-SPEC final read and any DEFERRED media resolved (operational).
- AC-9.5: Tag rcp-v0.3 exists.

## Known Risks

- Semantics disputes after the freeze — mitigated by the checkpoint gate (human review BEFORE implementations) + worked-examples-as-tests in P2/P3; change = SPEC change + regeneration, versioned.
- Clamp parity may surface clamp bugs — bug-for-bug first; divergence only via recorded decision.
- facts.go refactor blast radius — bounded by AC-2.6 (conformance pins the CUE payload) and AC-2.2 (CLI surface pinned by accept.sh).
- Float agreement across Go/TS — tolerance defined in the SPEC (P1); disagreement beyond tolerance is a replayer bug by rule.
- Frozen-struct transcription — now mechanically diffed against the pinned tag (AC-6.3); rots loudly for real.

## Deferred Artifacts

None — full coverage (model.mmd reference-only).

CHECKPOINT: CALC SPEC GREEN — 2026-08-03 (Daniel; three review rounds folded in: rule/WE ids, trace lineage then corrected to project-side-only, full public-normative sweep. R-BASIS-2 include_components upgrade APPROVED with the green.)

Phase 2:
- AC-2.1: PASS — 2026-08-03 (all 8 pinned clamp cases green through calc — clamp_test.go retained verbatim as the CLI-level parity suite; WE-ENFORCE-1/WE-MINBATCH-1 assert authored pt/en reason strings; slight deviation from the letter: parity lives in the unchanged clamp_test.go + calc WE tests rather than a renamed parity_test.go — stronger evidence, recorded)
- AC-2.2: PASS — 2026-08-03 (clamp.go deleted; subcommand routes through calc; accept.sh refusal checks untouched and green)
- AC-2.3: PASS — 2026-08-03 (TestCalcPurity structural; 8 WE-named verbatim table tests incl. R-BASIS-2 decomposition)
- AC-2.4: PASS — 2026-08-03 (basis resolution single-sourced in calc; completeness gate forced resolvedRatio/basisDeclared unexported — export surface == SPEC surface)
- AC-2.5: PASS — 2026-08-03 (TestSpecCompleteness: every exported calc func has its `## fn:` section — the gate caught two violations before they shipped)
- AC-2.6: PASS — 2026-08-03 (make conformance green — facts CUE payload pinned; DEP-FREEZE check live in accept.sh)

## Checkpoint notes (project-side — kept OUT of the public SPEC per Daniel's ruling)

- R-BASIS-2 (include_components decomposition) upgrades the throwaway
  clamp's behaviour: the clamp refused such bases as unresolvable; the
  Calculus resolves inline decomposition. No pinned parity case depends
  on the old refusal. Flagged for Daniel's checkpoint ruling.
- calculus/SPEC.md is PUBLIC-NORMATIVE and self-contained: no project
  ids (FEAT/FR/SR/DS/SSP/DECISIONS), no internal history, no names.
  Project→protocol traceability lives in SPEC-003 (CMP-CALC-001) and
  this plan; the protocol document never points back.

## Verify evidence

<!-- `AC-N.M: PASS — <date>` lines appended as gates pass. Checkpoint entries: `CHECKPOINT: CALC SPEC GREEN — <date>`; media outcome: `MEDIA ASSET: PASS|FAIL|DEFERRED — <date>`. -->

Phase 1:
- AC-1.1: PASS — 2026-08-03 (10 fn sections, all four sub-headings each)
- AC-1.2: PASS — 2026-08-03 (6 edge classes, fenced + parseable)
- AC-1.3: PASS — 2026-08-03
- AC-1.4: PASS — 2026-08-03 (CLAUDE.md + project-context list calculus/ as normative)
- AC-1.5: PASS — 2026-08-03
- CHECKPOINT NOTE for Daniel: resolveBases DEFINES include_components decomposition — the clamp refused these as unresolvable; no pinned parity case depends on the old behaviour, but it is a semantic upgrade flagged in the SPEC's Edges for your ruling.
