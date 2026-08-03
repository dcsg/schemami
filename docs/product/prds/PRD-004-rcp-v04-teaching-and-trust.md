# PRD-004: RCP v0.4 — teaching + trust: mentions resolve, moments address, links verify

**Status:** draft
**Rigor:** solo
**Author:** Daniel Gomes
**Created:** 2026-08-03
**Sidecar:** [PRD-004-rcp-v04-teaching-and-trust.yaml](./PRD-004-rcp-v04-teaching-and-trust.yaml) — structured data, source of truth

---

## Problem

Three failures, all hit with real recipes (Daniel, options-interview 2026-08-03):

1. **Dead-end mentions.** A recipe says "faça um roux"; the brownie consumes a
   ganache. The reader hits the mention and the protocol has nothing to offer —
   no method, no link, no way to load the technique and do it. The protocol
   renders recipes but cannot **teach from inside one**. Hit twice in real
   dogfood: the brownie's ganache gap (v0.2) and the sauces-bible roux page.
2. **Unverifiable links.** Cross-document references (brownie→ganache today,
   canonical links tomorrow) resolve on hope: nothing pins WHAT was resolved,
   nothing detects that the target changed. An offline consumer cannot trust a
   link — and a teaching feature built on untrustworthy links rots silently.
3. **Un-addressable video.** The knowledge often exists as one full-recipe
   video, but "minute 2–3 is the roux" is inexpressible — the media teaches
   nothing at the step where it is needed.

(Identity fog on forks was considered and **not** selected as a driving
problem — FR-PR-006 is scoped as a modeling decision to settle, prompted by a
real consumer's `forked_from` column, not by user pain.)

## Users

- `rcp.cook.home-cook` — hits the mention mid-cook; wants the method now, and
  wants the schedule to say when the sub-preparation must start.
- `rcp.ingester.personal-collector` (Daniel) — ingests books; needs the
  extraction rule to be mechanical, not judgment calls per page.
- `rcp.registry.steward` (Daniel today) — curates which document a class's
  canonical link points at; curation is the load-bearing bet.
- `rcp.dev.surface-engineer` — consumes published documents offline; needs
  links that verify, not links that hope.

## Goals

| Metric | Target | Counter-metric (must not move) |
|--------|--------|--------------------------------|
| Mention→method coverage | Every embedded sub-preparation across all ingested documents (public examples + private collection) resolves to a viewable method | Zero change to any safety refusal or authored reason; frozen calculus vectors byte-identical |
| Verified-link coverage | 100% of cross-document references in the corpus carry hash-pinned resolution; a broken link is DETECTED, never rendered as current | Decode-compat green both directions; the six examples keep validating unchanged |

## Non-Goals

- **No auto-resolution, no runtime LLM** (founding non-goals): which roux a
  mention means is authored/curated — the steward picks; a user's own recipe
  may shadow at render time (surface concern, OQ-2).
- **Fornada migration** — deliberately gated on a more stable protocol version
  (Daniel 2026-08-03; recorded on the roadmap, post-v1).
- **Pool features not graduated:** FEAT-CORE-004 codegen, FEAT-PROF-004
  ferment profile, FEAT-SUB-001 substitutions, FEAT-REG-005 search index,
  FEAT-TOOL-003 documentation site (decided 2026-08-03: leads the next cut,
  landing after the teaching features exist to showcase).
- **Publishing/hosting infrastructure** — app-side per DECISIONS #19/#21;
  this cut ships the resolution *format and verification*, not a service.

## Requirements

<!-- Source of truth: the .yaml sidecar. Mirrored here for reading. -->

| FR | Component | Requirement (abridged) |
|---|---|---|
| FR-REG-005 | registry | Preparation-class and technique entries support an optional **canonical-recipe link** — versioned, curated, never required |
| FR-REG-006 | registry | The **extraction rule** binds and is linted: method given → inline component; method absent → class reference; anchorless mentions warn |
| FR-TOOL-004 | developer tooling | Renderers surface **see-the-method** from any linked mention, including its schedule placement before the parent method |
| FR-PR-005 | protocol-core | **Media temporal fragments** normative: `#t=start,end` blessed in MEDIA.md, passed through to playback; one video, many addressed moments |
| FR-PUB-001 | publish-time resolution | Resolved references carry `resolver_version` + content hash; verification detects changed/missing targets — **never silently current** |
| FR-PR-006 | protocol-core | **Stage-forked identity** settled as a recorded decision with lineage-field consequences, demonstrated by validating examples |

## Acceptance Criteria

Given/When/Then in the sidecar, stable ids `AC-<CODE>-NNN-M`. Highlights: the
sauces-bible roux ingests as an inline component (AC-REG-006-1); the viewer
loads a linked method without losing the parent and schedules it before the
consuming step (AC-TOOL-004-1/2); a `#t=120,180` entry seeks and a second
range on the same asset renders independently (AC-PR-005-1); verification
passes green on an intact corpus and **fails naming the reference** when a
target changed — the inverted proof ships with the gate (AC-PUB-001-1/2);
lineage distinguishes identity-keeping stage-forks from new recipes with
validating examples on both sides (AC-PR-006-1).

Verify commands follow the project precedent: added at SPEC/plan layer where
the harness exists, not fabricated at PRD time.

## Solution References

- `docs/research/08-implicit-subrecipes.md` — F1–F8: the roux problem, three layers, canonical-as-curation
- `docs/product/features.yaml` — FEAT-REG-006 / FEAT-CORE-006 / FEAT-PUB-001 (full design intent)
- [W3C Media Fragments URI 1.0](https://www.w3.org/TR/media-frags/) — the existing `#t=` encoding
- Fornada `padaria.recipes.forked_from` — the identity question, concrete in a real consumer

## Protections

- **SP-001** — Fail-closed semantics + authored refusals untouched; frozen calculus vectors byte-identical.
- **SP-002** — Decode-compat both directions; no new required fields without defaults.
- **SP-003** — `calculus/SPEC.md` stays public-normative and self-contained.
- **SP-004** — DECISIONS #26 vocabulary binding; #27 media boundary + attestation in force — links and fragments never smuggle book media.
- **SP-005** — Dependency freeze: PUB-001 hashing via stdlib only; new deps need a recorded decision.

## Open Questions

- **OQ-1** — Structured start/end fields beside `#t=`, or fragment-only as the
  sole normative form? Resolve in SPEC-004 with renderer + validation evidence.
- **OQ-2** — Render-time shadowing (user's own roux over the canonical):
  surface concern with only resolution order named, or more?

## Evidence & Discovery

Dogfood + industry research (Daniel, Q2): the brownie/ganache gap and the
sauces-bible roux page arose from ingesting real recipes (DECISIONS, research
08); the verified research day found every examined food ontology dissolves
intermediates (axiom-level foodon.owl finding) and ERP systems unanimously say
"sub-recipe" — the industry names what the protocol cannot yet express.
Riskiest assumption (Q5): **curation scales** — authored canonical links stay
honest and complete enough to be useful without drifting toward
auto-resolution; if curation can't keep up, dead-ends return wearing links.

---

**Sidecar:** [PRD-004-rcp-v04-teaching-and-trust.yaml](./PRD-004-rcp-v04-teaching-and-trust.yaml) — structured data for FRs, ACs, status, and revision history.

**Next steps:**
- Write the technical spec: `/edikt:sdlc:spec PRD-004`
- Ship requirements as they complete: `/edikt:sdlc:prd PRD-004 ship FR-NNN`
- Review PRD quality anytime: `/edikt:sdlc:prd-review PRD-004`

*This PRD follows the edit-in-place lifecycle model.*
