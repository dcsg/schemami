---
type: spec
id: SPEC-002
title: RCP v0.2 implementation — dogfood fields, dish hardening, technique registry, grounding, i18n, viewer
status: draft
author: Daniel Gomes
implements: PRD-002
source_prd: PRD-002
source_brainstorm: null
source_prompt: null
created_at: 2026-08-02T22:45:00Z
references:
  adrs: [ADR-001]
  invariants: []
---

# SPEC-002: RCP v0.2 implementation

**Implements:** PRD-002 — RCP v0.2, "what the dogfood taught"
**Date:** 2026-08-02
**Author:** Daniel Gomes
**Sidecar:** [spec.yaml](./spec.yaml) — structured source of truth (SRs, ACs, DS/CMP design block, coverage)

---

## Summary

v0.2 closes the five meaning-leaks the first dogfood exposed, strictly
ADDITION-class per `schema/VERSIONING.md`: four new optional field groups in
core (times, difficulty, storage, source detail), the dish profile hardened
from its two real documents, techniques promoted from interim vocab to the
fourth governed registry kind (DECISIONS #25), external ontology grounding on
every ingredient entry, an English-base→pt-PT taxonomy translation vocabulary,
and a lightweight static viewer. The viewer reuses the existing Go validation
core compiled to WASM — zero npm anywhere, and verdict parity with rcplint by
construction. All tooling stays on the informative surface (DS-PR-001,
DECISIONS #21); everything schema- and registry-shaped is normative.

## Context

PRD-002's evidence is direct: five ingested recipes, all of which parked
times/difficulty/storage/source in prose, two savoury documents running
core-only, an unvalidated technique vocabulary, and a cebola/onion
consolidation failure. The PRD deliberately deferred two decisions to this
spec — the time-field shape (OQ-2) and the viewer build toolchain (OQ-4).
Both are resolved here as design statements DS-PR-005 and DS-TOOL-001, with
the PRD's recorded inputs applied: research 04:79-80 requires hands-on and
total time as separate fields, and the anti-Node bar (burden of proof on any
npm dependency, per PRD-001 OQ-2 input d and ADR-001's ecosystem-health
scoring) applies to the viewer's build chain.

## Existing Architecture

Normative surface: `schema/rcp-core-v1.schema.json` (hardened; already
carries `$defs/duration` — a min/target/max window over `$defs/isoDuration`),
7 profiles under `schema/profiles/` (bread/pastry hardened, 5 drafts — no
dish profile exists: dish documents validate core-only with an explicit
warning per DS-VAL-001), 91 registry entries under `registry/entries/{ingredient,primitive,equipment}/`,
interim vocab lists under `registry/vocab/`, CUE relation logic in
`schema/constraints/`. Informative surface: `tools/rcplint` (Go 1.26, two
direct deps), `make validate` (L1+L2+CUE) and `make accept`, scripts under
`tools/rcplint/scripts/`. Governance: registry-governance guideline (18
directives, rule 6 ontology paths), traceability guideline (component-coded
ids), DECISIONS #1–#25.

## Proposed Design

Six workstreams, each a spec requirement below. The unifying constraints:

1. **ADDITION-only (SP-001).** Every change is a new optional field, a new
   registry kind, or a new tool. The v0.1 corpus (6 examples, regression
   testdata, 5 private recipes) validates unchanged throughout; `make validate`
   is the standing gate (SAC-PR-001).
2. **One validation implementation.** No validation logic is reimplemented in
   another language. The viewer embeds the existing Go core via WASM
   (DS-TOOL-001) — the founding failure mode (five divergent recipe
   representations) is not re-imported through a browser port.
3. **English-base identifiers everywhere** (DECISIONS #23/#24/#25); display
   language is a data layer (registry `display_name`, new i18n vocabulary),
   never an identifier layer.

### Requirements

### SR-PR-003 — Implements FR-PR-003

The core schema MUST add four optional, MODEL-1-legal field groups to
`$defs/recipe`:

- **`times`** (DS-PR-005): an object with optional keys `active` (hands-on),
  `total`, `prep`, `cook`, `chill`, `rest` — each a `$defs/duration` window
  (min/target/max over the existing ISO-style duration strings), with
  `additionalProperties: false` and no required keys. `active` and `total`
  are separate fields per research 04:79-80 (stir-fry vs risotto: same total,
  opposite hands-on experience). Book pages that print a single value encode
  it as `target`.
- **`taxonomy.difficulty`** (DS-PR-006): integer, minimum 1, maximum 5
  (PRD-002 OQ-3 resolution). Source books using 1–3 chef-hat scales map in
  per-ingest; the mapping call MUST be recorded in the document's provenance
  notes at ingest time.
- **`storage`** (DS-PR-007): an array of entries, each with `where`
  (enum: `room`, `refrigerator`, `freezer`), optional `container` (text),
  optional `duration` (`$defs/duration`), optional `note` (text).
- **provenance source detail** (DS-PR-008): `provenance.sources[]` items gain
  optional `work` (publication/book title, string) and `page`
  (string — admits "123", "123–125", "xii"); existing `label`/`url`/`type`
  unchanged.

The hardened pastry profile MUST admit `storage` additively (it currently
constrains its shape with the hardened-block pattern). The five private
recipes MUST be re-encoded using the new fields with zero prose-parking of
the four field classes (north metric).

### SR-PROF-004 — Implements FR-PROF-004

The dish profile MUST be created — `schema/profiles/dish.schema.json` does
not exist today, which is why both savoury documents run core-only — directly
at `x-rcp-maturity: hardened`, its fields typed from the two real documents
(chili, feijoada) and nothing speculative; every numeric bound enters at
**warn severity only**
in this cut, with the n=2 rationale authored into each bound's
`x-rcp-bounds` reason (DS-PROF-002 — the PRD's recorded riskiest
assumption). Both dish documents MUST validate core ∧ dish (hardened).
Bounds MUST NOT be promoted to error severity within v0.2.

### SR-REG-004 — Implements FR-REG-003

Techniques MUST become the fourth governed registry kind under
`registry/entries/technique/` (DECISIONS #25; DS-REG-004): one YAML file per
entry, filename = id, ids prefixed `technique.` with ontology paths per
registry-governance rule 6. Entry schema: `id`, `kind: technique`,
`display_name` (en required, pt for current entries), `definition`, optional
`primitive` association (slug of a step primitive), optional `teaches` links
and `media`. Seed entries MUST cover the interim vocabulary plus the dogfood
harvest (at minimum: stir, none, bulhao-pato, refogado, flambe). rcplint MUST
validate every technique reference (`execution_modes[].technique` today)
against the entries, and `registry/vocab/techniques.yaml` MUST be deleted
once migration completes (SAC-REG-002). Minting remains steward-approved —
the migration proposes, Daniel approves.

### SR-REG-005 — Implements FR-REG-004

Every ingredient entry MUST carry external grounding (DS-REG-005): a
`cross_refs` list — each item `{system: foodon|fdc|off, ref, url?}` — or an
explicit `grounding: no-match` with a note explaining why (heritage-specific
items like massa velha will legitimately no-match). An audit check MUST fail
naming any ingredient entry with neither (AC-REG-004-1). The extraction
process guidance MUST be updated so unresolved raw items carry a proposed
canonical English class, and `gap-ledger.py` MUST group unresolved raws by
that proposal so *cebola* and *onion* consolidate under one candidate
(AC-REG-004-2). Grounding refs are data, not lookups: no network access in
any validation path.

### SR-I18N-001 — Implements FR-I18N-001

A taxonomy translation vocabulary MUST exist at `i18n/pt-PT.yaml`
(DS-I18N-001): English-base taxonomy slugs (category, subcategory, and any
other slug-valued taxonomy facets) → pt-PT display terms, following the
registry `display_name` pattern. Coverage MUST span every taxonomy slug used
across `examples/` and the private collection, checked mechanically
(AC-I18N-001-1). Identifiers are NEVER localized (DECISIONS #23/#24): rcplint
MUST enforce English-base slug shape on taxonomy values (ASCII kebab-case,
no accented characters) as a new L2 check. Registry entries keep their own
`display_name` layer — the i18n vocabulary covers only slugs that have no
registry entry to carry a display name.

### SR-TOOL-001 — Implements FR-TOOL-001

The lightweight viewer MUST ship at `tools/viewer/` (informative surface) as
a static page: paste or drop an `.rcp.yaml`/JSON document → L1 verdicts + a
human-readable render (name, ingredients with resolved basis expressions,
step sections with notes, per-component profile and maturity labels, pt-PT
display via the i18n vocabulary). Architecture per DS-TOOL-001: the existing
Go core (yaml.v3 parse + santhosh-tekuri L1 validation) compiled with
`GOOS=js GOARCH=wasm` into `rcp.wasm` via a make target, driven by
hand-written vanilla `index.html`/`app.js`/`style.css` plus the
Go-distribution `wasm_exec.js`. The build chain MUST contain no npm, no
Node.js, no bundler, and no vendored JavaScript dependencies (SAC-TOOL-001).
The page MUST work from `file://` or any static host with zero network
transmission of document content (AC-TOOL-001-2). L2/CUE/clamp in-browser
remain out of scope (later phase of FEAT-TOOL-001).

### SR-VAL-003 — Spec-only (serves SR-REG-004, SR-REG-005, SR-I18N-001)

rcplint MUST gain the v0.2 checks as L2 lints with tests: technique
references validated against `registry/entries/technique/`, English-base
taxonomy slug shape, and the ingredient grounding audit. The existing
regression suite (`go test ./...`, `make accept` negative checks) MUST stay
green throughout (SAC-VAL-003), and new checks MUST follow the existing
severity model (fail-closed only where a standing decision demands it;
grounding audit is a registry-CI check, not a document-validation failure).

## Non-Goals

- The full WASM playground: L2+CUE verdicts, clamp slider in-browser — later
  phase of FEAT-TOOL-001 (the v0.2 wasm binary intentionally exports L1 +
  parse only).
- v1 heavyweights per ROADMAP.md: FEAT-CALC-001, FEAT-CORE-003/004,
  FEAT-PROF-004 (ferment), FEAT-SUB-001, FEAT-PUB-001, FEAT-REG-005.
- Retroactive grounding research beyond the current 91-entry registry's
  needs; grounding is a per-entry data obligation, not a bulk ontology
  import.
- Any localization beyond pt-PT display terms for taxonomy (full document
  translation, multilingual steps text) — FEAT-I18N-001 later phases.
- Primitive/equipment minting — standing registry governance, not
  release-bound.

## Alternatives Considered

### Viewer: vanilla JS + vendored js-yaml + vendored JSON-Schema validator
- **Pros:** No WASM payload (~few hundred KB total); familiar stack.
- **Cons:** Two vendored JavaScript dependencies to track (each subject to
  the ecosystem-health bar from ADR-001); worse, L1 verdicts come from a
  *different validator implementation* than rcplint — divergence between
  browser verdicts and `make validate` verdicts is exactly the
  five-divergent-implementations failure RCP exists to kill.
- **Rejected because:** verdict parity is a correctness property, not a
  nice-to-have; and zero JS dependencies beats two.

### Viewer: npm toolchain (Vite/esbuild + TypeScript)
- **Pros:** Rich tooling, typed render code.
- **Cons:** Fails the anti-Node bar with no compensating strength — the page
  is a paste-box and a render, not an app; drags in a lockfile, a registry
  exposure surface and a second toolchain for a repo that is deliberately
  Go + make.
- **Rejected because:** the burden of proof on Node was not met (PRD-001
  OQ-2 input d; ADR-001).

### Times: ISO-8601 duration strings (PT20M) instead of the existing shape
- **Pros:** schema.org `prepTime`/`cookTime` compatibility for decode.
- **Cons:** The core already has `$defs/isoDuration` ("4h30m" style) and
  `$defs/duration` windows used by steps; introducing a second duration
  grammar for recipe-level times would split the type system. Decode-compat
  (DECISIONS #14) is an importer's mapping concern, not a reason to fork
  internal representation.
- **Rejected because:** one duration grammar; importers map PT20M → "20m".

### Difficulty as an enum (easy/medium/hard)
- **Pros:** Human-readable in raw YAML.
- **Cons:** PRD-002 OQ-3 was resolved by Daniel to integer 1–5 — room for
  finer assertions later; labeled scales localize badly and books disagree
  on labels while mapping cleanly onto ordinals.
- **Rejected because:** decided upstream (PRD-002 revision 2026-08-02).

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation | Rollback |
|---|---|---|---|---|
| Dish rules from n=2 break the third savoury recipe | New ingests fail dish profile | Medium | All numeric bounds warn-severity with n=2 rationale authored in (DS-PROF-002); PRD's recorded riskiest assumption | Loosen the offending bound — warn-only means no document is ever rejected |
| wasm binary size hurts viewer load | Slow first load on the tool page | Medium | `-ldflags "-s -w"`, gzip/brotli at serve time; measure in plan; page is a deliberate tool, not a landing page | Ship render-only page (validation deferred) — render needs no wasm |
| Grounding stalls on hard-to-match heritage ingredients | AC-REG-004-1 blocks the tag | Medium | `grounding: no-match` + note is a first-class, audit-passing outcome by design | n/a — no-match is the escape valve |
| Technique migration mints wrong ontology paths | Registry churn (append-only pain) | Low | Migration proposes, Daniel approves every mint (standing governance); aliases handle later consolidation | Aliases + deprecation per governance, never renames |
| i18n vocabulary drifts as new taxonomy slugs appear | Coverage check rots | Low | Coverage is mechanically checked against actual usage (examples + collection), wired into `make accept` | Check reports the gap; adding a term is one line |

## Security Considerations

The viewer is the new surface: it MUST be fully client-side — no server, no
accounts, no analytics, no network transmission of document content
(AC-TOOL-001-2, SSP-003). Private-collection documents pasted into it never
leave the machine. WASM runs sandboxed; the page loads zero third-party
resources. Grounding cross-refs are static data — validation never performs
network lookups. No other new attack surface: everything else is schemas,
YAML data files, and Go lints.

## Performance Approach

Standard patterns sufficient. rcplint's new checks are in-memory set
lookups over registry entries (91 + techniques — trivial). The wasm
binary is the only artifact with a size concern (see Risks); build-time
stripping and serve-time compression are the plan-phase levers.

## Protections

- **SP-001** (from PRD-002) — ADDITION-only: every document valid at
  `rcp-v0.1` remains valid throughout v0.2.
- **SSP-003** (spec) — The viewer MUST NOT transmit document content over
  the network, load third-party resources, or persist pasted documents
  anywhere but page memory.
- **SSP-004** (spec) — No validation logic is reimplemented outside the Go
  core: the viewer's verdicts come from the same compiled code path as
  rcplint's.

## Acceptance Criteria

All 12 PRD-002 ACs pass through verbatim in the sidecar (source: prd).
Spec-added (source: spec):

- **SAC-PR-001** — ADDITION gate: `make validate` (L1+L2+CUE over the whole
  corpus) passes unchanged at every v0.2 commit. Verify: `make validate`.
- **SAC-REG-002** — Technique migration complete: `registry/entries/technique/`
  populated and `registry/vocab/techniques.yaml` deleted. Verify: file
  checks (in sidecar).
- **SAC-TOOL-001** — Zero-Node viewer: no `package.json`, lockfile,
  `node_modules`, or vendored `.js` dependency anywhere under
  `tools/viewer/` (`wasm_exec.js` from the Go distribution is the single
  permitted non-authored file). Verify: file checks (in sidecar).
- **SAC-VAL-003** — Regression floor: `go test ./...` in `tools/rcplint`
  green throughout. Verify: `go -C tools/rcplint test ./...`.

## Testing Strategy

- **Schema additions:** positive/negative fixtures under
  `tools/rcplint/testdata/l1/` (times windows, difficulty bounds 0/6
  rejected, storage `where` enum, provenance work/page); the frozen v0.1
  corpus re-validated as the ADDITION regression.
- **Dish hardening:** chili + feijoada as the positive pair; synthetic
  out-of-bounds dish doc asserting warn (not error) severity.
- **Technique registry:** entry-schema fixtures; an undocumented technique
  reference fixture asserting rejection naming the entry (AC-REG-003-2).
- **Grounding:** audit fixture with an ungrounded entry (fails, names it) and
  a `no-match` entry (passes); ledger grouping test: cebola + onion raws →
  one proposal group.
- **i18n:** coverage check against a slug deliberately missing a term;
  accented-slug fixture rejected by the English-base L2 check.
- **Viewer:** hard to test headlessly without adding a browser harness —
  keep it honest and cheap: a smoke script asserting the wasm target builds
  and the page's static assets exist and reference each other; manual
  paste-test of the 11 documents (AC-TOOL-001-1) recorded in the plan's
  verify evidence; network silence (AC-TOOL-001-2) verified by manual
  devtools inspection at acceptance, not automated in v0.2.

## Dependencies

- ADR-001 (Go for tooling; ecosystem-health bar) — the viewer decision
  extends it to the browser via WASM rather than revisiting it.
- DECISIONS #23/#24/#25 (kind-prefixed English-base ids; technique. kind),
  #10 (difficulty as asserted facet), #14 (decode-compat posture), #18
  (profile hardening from real documents), #21 (two-surface split).
- Registry-governance guideline (rule 6 ontology paths; append-only,
  steward-approved minting) — gains the technique kind.
- Go toolchain ≥1.26 (already pinned) — now also the wasm build.
- FooDON / FDC / OFF as grounding targets — data references only, no runtime
  dependency.

## Open Questions

None blocking. PRD-002's OQ-2 and OQ-4 are resolved by this spec
(DS-PR-005 and DS-TOOL-001 above). Deliberately deferred within v0.2:

- Exact wasm size budget and whether to add a loading indicator — plan-phase
  measurement, not a design unknown.
- Which of the harvested primitives/equipment (sear, sauté, Dutch oven,
  madeleine tin, …) mint alongside the technique migration — standing
  governance queue, Daniel approves; not release-gated.

---

*Generated by edikt:spec — 2026-08-02*
