# PRD-005: RCP v0.5 — the protocol goes public: a documentation site rendered from the repo

**Status:** accepted
**Rigor:** solo
**Author:** Daniel Gomes
**Created:** 2026-08-04
**Sidecar:** [PRD-005-rcp-v05-protocol-goes-public.yaml](./PRD-005-rcp-v05-protocol-goes-public.yaml) — structured data, source of truth

---

## Problem

Three failures, and none of them is "we need marketing".

1. **The protocol is unreadable to outsiders.** Four tagged versions, a
   normative Calculus with 23 conformance vectors, a 109-entry registry — and
   the only way to understand any of it is to clone the repo and read raw JSON
   Schema. A protocol nobody can read is a private format with extra steps.
2. **The viewer exists but nobody can reach it.** A self-contained 204 KiB page
   that answers *"what is this?"* better than any prose could, reachable only
   by cloning and opening a local file.
3. **No entry point for a second implementer.** The whole point of a protocol
   is that someone else can implement it. `calculus/SPEC.md` is deliberately
   public-normative and carries no project ids — verified by a test. The
   conformance vectors ship *with* the protocol as a cross-stack contract.
   `VERSIONING.md` binds from a tag forward. All of that presumes an outside
   reader who currently has nowhere to read.

Daniel explicitly did **not** select "you can't share it". This is about the
artefact being legible, not about promotion.

## Users

- `rcp.dev.surface-engineer` — the second implementer. The one the Calculus
  SPEC and the shipped vectors were written for, and the one with no way in.
- `rcp.cook.home-cook` — arrives curious, needs the playground to answer
  "what is this?" before any prose earns their attention.
- `rcp.registry.steward` (Daniel today) — needs the registry legible to anyone
  he might ever hand curation to.

## Goals

| Metric | Target | Counter-metric (must not move) |
|--------|--------|--------------------------------|
| Second-implementer completeness | Everything a second implementation needs is reachable without cloning — Calculus SPEC, conformance vectors, core and pack schemas, profiles, registry, versioning + decode-compat contract — measured as coverage and asserted by a gate | **Zero drift**: no page may state anything the repo does not; a hand-edited copy of a normative source is a build failure |
| Time-to-first-validation | A stranger pastes a recipe and sees a verdict within one page-load, no install | The viewer's no-egress posture unchanged: CSP source list and the two pinned dependencies exactly as at v0.4 |

## Non-Goals

- **Promotion.** No analytics, no SEO work, no launch. The deliverable is a
  legible artefact, not an audience.
- **A docs framework.** No search index, no versioned doc trees, no plugin
  ecosystem — unless a requirement genuinely needs one, and then it needs a
  recorded decision (SP-005).
- **Editing anything through the site.** It renders; it never writes.
- **New normative content.** The site adds no rules. If it seems to, that is a
  defect (SP-002).
- **Deployment.** v0.5 builds and verifies the site *locally*. Publishing it
  is a separate step, after. Hosting is expected to be Cloudflare but is not
  decided here, and **no requirement may depend on which host is chosen**.

## Requirements

| FR | Component | Requirement (abridged) |
|---|---|---|
| FR-DOC-001 | documentation site | Every normative surface has a page **rendered from the repo at build time**; a hand-authored copy is a build failure |
| FR-DOC-002 | documentation site | The site declares itself **informative**, names the repo as binding, and says which file each page came from |
| FR-DOC-003 | documentation site | **Drift is mechanically impossible to ship** — a gate fails on divergence and on any uncovered normative surface |
| FR-TOOL-005 | developer tooling | The viewer is **reachable as the live playground** without weakening its guarantees |
| FR-DOC-004 | documentation site | An **implementer path**: SPEC, downloadable vectors, versioning contract, registry — no cloning required |
| FR-DOC-005 | documentation site | **Static and egress-free as a property of the built output**, verifiable locally with the network disabled. v0.5 ships and verifies **locally**; deployment is out of scope |
| FR-DOC-006 | documentation site | The site works as a **manual**: navigable from any page, with a reading path for a newcomer, legible on a phone. Coverage is necessary but **not sufficient** |

## Acceptance Criteria

Given/When/Then in the sidecar. The three that carry the most weight:
**AC-DOC-003-1** — a page hand-edited to differ from its source **fails** the
drift gate naming both, with the inverted proof shipping alongside;
**AC-DOC-005-1** — every page renders completely **with the network disabled**;
and **AC-DOC-006-2** — a reader who arrives knowing nothing reaches a working
understanding and tries a document in the playground **without being sent to
the repo**.

## Solution References

- `docs/research/11-documentation-site-tooling.md` — the measurements behind ADR-003
- `docs/architecture/decisions/ADR-003-docs-site-no-framework.md` — plain Bun script + `marked`, and why that makes FR-DOC-006 load-bearing
- `docs/product/features.yaml` — FEAT-TOOL-003, including the build-time-rendering constraint
- `calculus/SPEC.md` — the public-normative surface to render without altering
- `tools/viewer/dist/index.html` — the playground to embed (204 KiB, byte-exact CSP)
- [jwt.io](https://jwt.io/) — the move being copied: a spec explained beside a live tool

## Protections

- **SP-001** — never fork a normative source; every page renders from the repo at build time.
- **SP-002** — the site is **informative, never normative**; the repo wins, and the site says so.
- **SP-003** — `calculus/SPEC.md` stays public-normative in **both** directions.
- **SP-004** — no egress: static, no server, no analytics, no CDN fonts or
  scripts — as a property of the **built output**, so it holds regardless of
  host. A site that is egress-free only because of one host's configuration
  has not satisfied this.
- **SP-005** — dependency freeze; new build tooling needs a recorded decision.
- **SP-006** — the private collection is never reachable, rendered, or referenced.
- **SP-007** — navigation, typography and layout are **deliverables with an
  acceptance criterion**, not afterthoughts. ADR-003 rejected a framework whose
  main value was exactly these; that rejection is only honest if they land.

## Open Questions

- ~~**OQ-1** — Hosting~~ → **RESOLVED as DEFERRED** (2026-08-04). Out of scope
  for v0.5. Likely Cloudflare; not decided, and nothing here depends on it.
  Two findings carry forward to deployment day: the zone needs an egress audit
  (`paodeportugal.pt` currently sends `nel`/`report-to` beacons), and Cloudflare
  *"reserves the right to attach new headers to static asset responses at any
  time"* — which composes with the viewer's meta-CSP by intersection.
- **OQ-2** — Information architecture: what does a stranger read **first**? Neither of us can judge this from inside the project. Decide whether to test it on a real reader before or after shipping.
- **OQ-3** — Registry: browsable pages, or link to the repo? 109 entries is a lot of generated pages for a first cut.
- **OQ-4** — Versioned docs: current tag only, or every tag? `VERSIONING.md` binds from a tag, so a reader holding an older document may need older docs.
- **OQ-5** — CI installs **Go only** today, so it cannot build the site or run Bun. A mise/Bun setup step is a prerequisite for the drift gate running in CI at all.
- **OQ-6** — `media-attest.py` scans **built output** and fails on any `data:image/…;base64` URI, so no inlined images or data-URI favicon in generated pages.

## Evidence & Discovery

**Structural, not observed** — stated plainly because nobody has yet tried to
read RCP from outside, so there are no reports to cite. The evidence is the gap
between what the artefacts *claim* and what a stranger can reach: a
public-normative SPEC with no project ids, conformance vectors shipped as a
cross-stack contract, and a versioning contract binding from a tag — all
presuming an outside reader with no surface to read.

**The failure mode is not hypothetical.** Cooklang — a recipe markup language,
our nearest neighbour — syncs its spec page from a sibling clone that CI never
checks out, invoked with `|| echo "Spec sync failed, continuing..."`. The build
proceeds from the committed copy. Manual sync on a maintainer's laptop, silently
tolerated drift in CI. That is this PRD's riskiest assumption observed in the
wild, in our own domain.

**Riskiest assumption: rendering stays in lockstep.** The bet is that
build-time rendering keeps every page identical in content to its source,
forever. The moment one page is easier to hand-edit than to regenerate, the
site starts lying — and a lying documentation site is worse than none, because
readers trust it. That is why FR-DOC-003 makes drift *mechanically impossible
to ship* rather than a review habit.

---

**Sidecar:** [PRD-005-rcp-v05-protocol-goes-public.yaml](./PRD-005-rcp-v05-protocol-goes-public.yaml) — structured data for FRs, ACs, status, and revision history.

**Next steps:**
- Review the draft, flip status to accepted when ready
- Write the technical spec: `/edikt:sdlc:spec PRD-005`
- Re-score anytime: `/edikt:sdlc:prd-review PRD-005`

*This PRD follows the edit-in-place lifecycle model.*
