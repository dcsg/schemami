# PRD-002: RCP v0.2 — what the dogfood taught

**Status:** draft
**Rigor:** solo
**Author:** Daniel Gomes
**Created:** 2026-08-02T22:07:39Z
**Sidecar:** [PRD-002-rcp-v02-dogfood-taught.yaml](./PRD-002-rcp-v02-dogfood-taught.yaml) — structured data, source of truth

**ID scheme** ([traceability guideline](../../guidelines/traceability.md)):
component codes with globally-unique numbering continuing from PRD-001;
new codes `TOOL` and `I18N` declared for this PRD. Every FR trace leads
with the FEAT id it graduates.

---

## Problem

Ingestion loses meaning, and the collection stays illegible. Five real
recipes came through the pipeline in the first dogfood — and every one
parked information in prose because fields don't exist (preparation and
cooking times, difficulty, storage, book/page source). Both savoury
documents run core-only with zero dish enforcement. The techniques the
books lean on — *refogar*, *bulhão-pato*, flambé — are unvalidated
vocabulary. Cross-language ingestion can't consolidate (*cebola* and
*onion* are the same class and nothing knows it). And the only way to look
at an ingested recipe is reading raw YAML. The protocol works; the
*experience of accumulating a collection* leaks meaning at every step.

v0.2 closes exactly those leaks — nothing more. The heavyweights
(Calculus, compat fixtures, codegen, substitution catalog) stay v1.

## Users

Same canonical personas ([docs/personas.md](../../personas.md)); primary
remains `rcp.ingester.personal-collector` (Daniel, n=1). The viewer adds
the first surface for `rcp.dev.surface-engineer` and any human reviewer.

| Persona | Story | Served by |
|---|---|---|
| `rcp.ingester.personal-collector` | As an ingester, I want everything the book page says to land in fields, not prose — so my collection is queryable, not just stored. | FR-PR-003, FR-REG-004 |
| `rcp.cook.home-cook` | As a cook, I want savoury recipes held to the same standard as bread and pastry, and to *see* a recipe rendered, in my language. | FR-PROF-004, FR-TOOL-001, FR-I18N-001 |
| `rcp.registry.steward` | As steward, I want techniques governed like every other vocabulary, and every ingredient grounded to an external ontology so consolidation stops being string-matching. | FR-REG-003, FR-REG-004 |
| `rcp.dev.surface-engineer` | As an integrator, I want to paste a document and see what it means in ten seconds. | FR-TOOL-001 |

## Goals

| Metric | Target | Counter-metric (must not move) |
|--------|--------|--------------------------------|
| **Semantic coverage** — share of book-page metadata landing in machine-read fields instead of description prose on newly-ingested recipes | **Zero prose-parking** for times, difficulty, storage, and source; both existing dish documents validate against the hardened dish profile | **No MODEL bump** — every change is ADDITION-class per VERSIONING.md; the regression suite and all five private recipes stay green throughout |

## Non-Goals

- The full WASM playground (L2+CUE in-browser, clamp slider) — later phase
  of FEAT-TOOL-001.
- The v1 heavyweights: FEAT-CALC-001, FEAT-CORE-003/004, FEAT-PROF-004
  (ferment), FEAT-SUB-001, FEAT-PUB-001, FEAT-REG-005 (per ROADMAP.md).
- Primitive/equipment minting — continues through standing registry
  governance, not release-bound.
- Anything app-side (FEAT-APP-001..003; DECISIONS #19/#21).

## Requirements

<!-- Source of truth: the .yaml sidecar. Mirror for human readability. -->

| ID | Component | Requirement | Trace |
|----|-----------|-------------|-------|
| FR-PR-003 | protocol-core | The four dogfood field groups: times, difficulty facet, storage shape, provenance source detail — all optional, MODEL-1-legal; pastry profile admits storage | FEAT-CORE-005; runs #1–#5; #10 |
| FR-PROF-004 | profiles | Dish profile hardened from its two real documents; numeric bounds warn-severity only (n=2), rationale in the profile | FEAT-PROF-005; runs #3/#5; #18 |
| FR-REG-003 | registry | Techniques become a governed registry kind (schema + seed from the harvest + validation); interim vocab retired; needs the #23-extension decision (OQ-1) | FEAT-REG-003; run #5; 06:270-286 |
| FR-REG-004 | registry | Every ingredient entry externally grounded (FooDON/FDC/OFF or recorded no-match); extraction proposes canonical English classes; ledger groups by proposal | FEAT-REG-004; rule 6; run #5 |
| FR-I18N-001 | i18n | Taxonomy translation vocabulary (English-base → pt-PT display) covering all used slugs; ids never localized, linter-enforced | FEAT-I18N-001; #24 |
| FR-TOOL-001 | tool | Lightweight viewer: paste/drop → L1 verdicts + human-readable render; static, client-side only, private-safe | FEAT-TOOL-001; #19/#21 |

## Acceptance Criteria

<!-- Source of truth: the .yaml sidecar. -->

| ID | Given / When / Then |
|----|---------------------|
| AC-PR-003-1 | Given every rcp-v0.1-valid document, when validated against v0.2 core, then it still validates — no MODEL bump |
| AC-PR-003-2 | Given the five private recipes re-encoded, when descriptions are inspected, then zero prose-parking of the four field classes |
| AC-PR-003-3 | Given a pastry doc with storage guidance, when validated, then the hardened block admits it additively |
| AC-PROF-004-1 | Given chili + feijoada, when validated, then both pass core ∧ dish, maturity: hardened |
| AC-PROF-004-2 | Given the dish profile's bounds, when inspected, then all warn-severity with the n=2 rationale authored in |
| AC-REG-003-1 | Given the technique entries, when validated, then all pass under the technique. namespace per the extended decision |
| AC-REG-003-2 | Given an undocumented technique reference, when linted, then rejected naming the entry; interim vocab file gone |
| AC-REG-004-1 | Given the ingredient registry, when audited, then every entry has ≥1 cross_ref or a recorded no-match — none silently ungrounded |
| AC-REG-004-2 | Given raws "cebola" and "onion" unresolved, when the ledger runs, then they group under one proposed canonical class |
| AC-I18N-001-1 | Given every used taxonomy slug, when looked up, then a pt-PT display term exists; slugs stay English-base, linter-enforced |
| AC-TOOL-001-1 | Given any of the 11 documents pasted/dropped, when processed, then L1 verdicts + the rendered view appear |
| AC-TOOL-001-2 | Given a private document in the viewer, when network activity is inspected, then zero requests carry document content |

## Solution References

- [ROADMAP.md](../ROADMAP.md) — the approved v0.2 cut
- `private/collection/` — the five ingested recipes (demand evidence)
- [features.yaml](../features.yaml) — the six graduating features
- `registry/vocab/techniques.yaml` — the interim vocabulary FR-REG-003 retires

## Protections

- **SP-001** — ADDITION-only: every document valid at `rcp-v0.1` remains
  valid throughout v0.2. Anything that would invalidate an existing
  document is out of scope by definition. *(The two-surface split,
  private-vs-published boundary and English-base identifiers stay
  protected by their standing decisions and SSPs — not restated.)*

## Open Questions

- **OQ-1** — The `technique.` kind prefix extends DECISIONS #23 (which
  sanctioned exactly three): needs Daniel's decision entry before
  FR-REG-003 lands.
- **OQ-2** — Time-field semantics: hands-on vs total vs per-phase
  (research 04 wants both) — shape decided in SPEC.
- **OQ-3** — Difficulty scale representation (books use 1–3 chef hats).
- **OQ-4** — Viewer build toolchain: the page is JavaScript by nature, but
  the anti-Node bar (PRD-001 OQ-2 input d) applies to the *build chain* —
  zero-build vanilla vs minimal bundler is the SPEC's call, burden of
  proof on any npm dependency.

## Evidence & Discovery

Direct dogfood evidence, n=5 — every FR traces to a specific run's
finding: 5/5 prose-parking (runs #1–#5); 2/5 unenforced dish documents
(runs #3, #5); the technique harvest and the cebola/onion consolidation
failure (run #5); raw-YAML review on every correct pass. One explicit
hypothesis, honestly labelled: the viewer's audience (integrators, other
humans) does not exist yet — it is taken here only at lightweight cost.

---

**Sidecar:** [PRD-002-rcp-v02-dogfood-taught.yaml](./PRD-002-rcp-v02-dogfood-taught.yaml)

**Next steps:**
- Review the draft, flip status to accepted when ready
- Write the technical spec: `/edikt:sdlc:spec PRD-002`
- Re-score anytime: `/edikt:sdlc:prd-review PRD-002`

*This PRD follows the edit-in-place lifecycle model.*
