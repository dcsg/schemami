# 11 — Documentation site tooling: what a protocol site is actually built with

**Date:** 2026-08-04
**Status:** research complete — feeds SPEC-005 (PRD-005, FEAT-TOOL-003)
**Method:** four parallel tracks. Every SSG candidate was installed and built
on this machine with the real viewer; every JSON Schema renderer was run
against the real `rcp-core-v1.schema.json`. Numbers below are measured, not
quoted. Comparable projects were read from their public repos.

---

## 1. The finding that decides it

**Every JavaScript documentation framework fails the dependency freeze, and
none of them fails any other constraint.**

Measured transitive package counts, installed locally:

| Candidate | Packages | Install size | Verdict against DEP-FREEZE |
|---|---:|---:|---|
| plain bun script | **0** (1 with `marked`) | ~0 | passes |
| mdBook | 1 binary | 4.4 MB | passes — but no data pipeline at all |
| Zola | 1 binary | 13.2 MB | passes |
| Hugo | 1 binary | 19–21 MB | passes |
| Eleventy | 130 | 22 MB | **fails** |
| VitePress | 127 | 98 MB | **fails**, plus latent egress |
| Astro | 202 | 150 MB | **fails** |
| Starlight | 362 | 224 MB | **fails** |
| Docusaurus | 1,275 | 360 MB | **fails** |

`accept.sh:22` (DEP-FREEZE) asserts the exact dict
`{'yaml':'2.9.0','@cfworker/json-schema':'4.1.1'}` and exactly two `go.mod`
requires. It is not a guideline — it is a check that goes red.

Everything else about these frameworks is fine. **All seven SSGs copied the
viewer byte-exact** (sha256 identical in every `dist/`); its self-carried CSP
meta tag survives untouched in every one, so the `sha256-…` script/style
hashes stay valid. No candidate needs an iframe — each has a verbatim
passthrough directory. The differentiator is footprint alone.

### Egress: one candidate actually leaks

**VitePress** ships `https://api.iconify.design` and
`https://docsearch.algolia.com` inside its built JS bundle. Both are inert
until you use the corresponding features, but they are *in the shipped
output*. (Its Google Fonts `@import` is correctly stripped at build — 14 Inter
woff2 emitted locally, no `googleapis` string in `dist/`.) Under a zero-egress
mandate this is a CI assertion over `dist/`, not a promise.

Hugo and Zola ship **no default theme**, so egress is zero by construction —
the risk moves entirely to whichever third-party theme you pick, and popular
ones (Docsy) do pull Google Fonts.

### `file://` viability

Only mdBook and the no-theme options (bun, Hugo, Zola, Eleventy) emit relative
paths. VitePress, Docusaurus, Astro-with-assets and Starlight all emit
root-absolute `/assets/…` and require a served root. VitePress, Docusaurus and
Starlight also ship client routers that prefetch page chunks — same-origin, not
third-party, but they issue network requests where the others issue none.

### mdBook: eliminated on capability, not footprint

It is the cleanest on egress (all-relative, self-hosted fonts, local search
index) and the only one whose output works from `file://` unmodified. But it
has **no build-time data mechanism** — no way to read
`rcp-core-v1.schema.json` and emit pages. You would pre-generate Markdown with
a separate script, at which point mdBook is only doing chrome.

---

## 2. The plain bun script is not a compromise

Verified on bun 1.3.11, the pinned version:

- **`Bun.YAML.parse()` exists and works**; `import data from './f.yaml'`
  resolves directly. Every registry entry, every example, every manifest is
  readable with zero dependencies.
- **JSON Schema is a plain `import`.** No parser needed.
- The only genuine gap is **Markdown → HTML** for `SPEC.md`, `MEDIA.md` and
  `VERSIONING.md`. `marked` is **1 package total** (measured); `markdown-it` is
  7.

So the honest floor for the entire site is **one transitive dependency**, with
full control over relative paths and a trivially auditable "no external host
appears in `dist/`" grep in CI.

---

## 3. JSON Schema → docs: every off-the-shelf tool fails on our schema

Run against the real 58 KB core schema (2020-12, root is
`$ref: "#/$defs/recipe"`, 30 `$defs`, recursive via components, **93
`description` strings totalling 17,519 characters**):

| Tool | Ran? | Description fidelity |
|---|---|---|
| json-schema-for-humans | ✅ 0.07 s → 1.47 MB HTML | **89/93** — drops the `$defs` description whenever the referencing property has its own |
| jsonschema-markdown | ✅ 40 KB single file | **86/93** |
| @adobe/jsonschema2md | ✅ | **84/93**, and explodes into **316 files**, one per subschema node |
| json-schema-static-docs | ❌ | 1,151 bytes of prose then a raw JSON dump; unwrapping the root `$ref` → stack overflow (it fully dereferences; RCP is recursive) |
| docson (2018), wetzel (2021) | — | stale |

**The declared draft version is a red herring.** RCP's keyword surface renders
fine by tree-walking regardless. What separates the tools is `$ref` resolution
strategy, recursion tolerance, and root-level `$ref` — and that is exactly
where three of four fail.

### Why hand-rolling wins here, specifically

1. **Prose is the payload.** RCP's semantics live in `description`. The best
   off-the-shelf result still silently drops the canonical `$defs` prose — the
   exact text that defines what `variantDiscriminator` *is*.
2. **Full dereferencing is the wrong model.** RCP wants one section per
   `$def` with `$ref` rendered as a *link*. That's ~200 lines precisely
   because you don't dereference.
3. **The build should enforce policy, not just render** — "every `$def` has a
   description", "every enum member is documented". No tool does this, and for
   a protocol repo that is the whole point.
4. **JSON-Pointer-shaped anchors** (`#/$defs/quantity`) so `SPEC.md` and the
   profile pages can link into the reference. No tool produces these.

Keep `json-schema-for-humans` as a zero-cost smoke check
(`uvx --from json-schema-for-humans generate-schema-doc`) — one command,
catches structural mistakes. Don't ship its output.

---

## 4. Drift: only one mechanism catches a hand-edited page

| Mechanism | Catches hand-edit | Catches stale | Catches prose that lies |
|---|---|---|---|
| **generate-and-diff in CI** | **YES** | **YES** | no |
| checksum markers (cog `-c`) | **YES** | yes | no |
| build-time transclusion | n/a — *no copy exists to edit* | n/a — always current | no |
| doctests | no | only executable examples | no |
| `DO NOT EDIT` header alone | no | no | no |

That last row is the trap: the header is a social norm, not a mechanism.

**We already own the pattern.** `accept.sh:73`, DIST-FRESH:

```
cd tools/viewer && bun run build.ts && cd ../.. && git diff --quiet -- tools/viewer/dist/
```

Rebuild, then fail if the tree moved. It is exactly the Kubernetes
`hack/verify-codegen.sh` shape, already in this repo, already green. The site
build wants the same gate pointed at the site directory.

Its prerequisites are also already met by our conventions: the generator must
be **byte-deterministic** (no timestamps, sorted keys, tool version as a
pinned literal), and the output must be committed. `clean-clone-proof.sh:45`
already enforces byte-stability across a fresh clone.

**Transclusion is worth using where humans write prose about the schema** —
never copy a description into narrative text. Warning from the survey: of the
four transclusion systems, **only Sphinx with `-W` fails closed** on a missing
anchor. mdBook's `take_anchored_lines` returns an **empty string silently** on
a missing anchor — its own unit test asserts this. Silent content loss in a
spec is worse than no transclusion.

---

## 5. What real protocol sites do

Patterns seen in two or more projects:

1. **Spec prose lives in the spec repo; the website is a build target.**
   Nobody edits spec text on the website side. CommonMark's `spec-web` README
   says it outright — mostly generated, should not be manually modified.
   json-schema.org mounts the spec repo as **eleven git submodules**, one per
   draft, each pinned to that draft's branch.
2. **Cross-repo sync as an automated PR, not a push.** AsyncAPI and OpenAPI
   both generate, then open a PR with named reviewers. Machine propagation,
   human merge gate.
3. **Conformance vectors authored split, published as one bundle, with a
   schema for the vector format and CI that fails on drift.** The JSONPath CTS
   (RFC 9535) builds `tests/*.json` → `cts.json`, validates both against
   `cts.schema.json`, and re-runs the build in CI failing on any diff. README:
   do not modify the bundle directly.
4. **Vectors distributed as a consumable package** so every implementation
   runs the identical file — npm (CommonMark), git submodule (JSONPath CTS),
   direct pull by six-plus parsers (Cooklang).
5. **The playground is the reference implementation shipped as static
   assets** — not a re-implementation, and usually not embedded in the spec
   page. CommonMark `cp -r`'s its dingus from the parser repo; Cooklang
   compiles its Rust parser to WASM. **jwt.io is the exception we are
   copying**: same app, prose beside tool — but its debugger is still pure
   client-side with **no API route**, tokens never leave the browser.
6. **Machine-readable artefacts published beside prose, on their own
   cadence.** OpenAPI's schema publish workflow triggers on
   `src/schemas/validation/*.yaml` independently of the prose workflow.
7. **Every published version stays live at a stable versioned URL** —
   `spec.commonmark.org/0.31.2/` with `spec.txt` and `spec.json` beside the
   HTML, git-tagged on release. Directly relevant to OQ-4.

### The sharpest technique, and nobody else uses it

**CommonMark extracts its test suite from the spec prose itself.** `spec.txt`
holds ~650 examples in fenced blocks; `spec_tests.py --dump-tests` produces
`spec.json` at build time. One source, two derivations, no committed
duplicate. Every other project in the survey hand-authors vectors in a
parallel file and defends the relationship with CI — which is what we do.

### The anti-pattern has a name, and it is our nearest neighbour

**Cooklang** — a recipe markup language — syncs its spec page with
`scripts/sync-spec.sh`, which reads `../spec/README.md` from a **sibling
clone**. The CI workflow checks out only the website repo, so the script
**cannot succeed**, and it is invoked as:

```
|| echo "Spec sync failed, continuing..."
```

The build then proceeds from the **committed copy**. Manual sync on a
maintainer's laptop; silently tolerated drift in CI. This is precisely the
failure Daniel named as the riskiest assumption — *"the moment one page is
easier to hand-edit than to regenerate, the site starts lying"* — observed in
the wild, in our own domain.

---

## 6. Repo constraints the spec must absorb

- **CI cannot build the site today.** `.github/workflows/validate.yml` installs
  **Go only** — no mise, no Bun. `make conformance`, `make calculus`,
  `make accept` and any `bun run build.ts` cannot run there. A Bun setup step
  is a prerequisite for any drift gate. (The workflow has also never run: the
  repo has no remote.)
- **`media-attest.py` scans built output**, failing on any `data:image/…;base64`
  URI or any ≥1024-char base64 run that decodes to media magic. This
  **forecloses inlining images or a favicon as a data URI** in generated
  pages. Non-obvious, and it would fail late.
- **`corpus-provenance-check.py` skips when `private/` is absent** — so CI can
  never exercise it. Only a local `make accept` sees it.
- **The viewer is 208,901 bytes** against a **500 KB CSP-EXACT budget** —
  ~296 KB of headroom. The CSP regex is anchored `^…$`, so adding any
  directive (e.g. `frame-ancestors`) fails the gate.
- **All schema `$id`s are `https://paodeportugal.pt/schema/rcp/1/…`** — URLs
  that currently resolve to nothing. A published site is the first time that
  matters.
- **`README.md` and `docs/project-context.md` are stale** — both still say
  "pre-implementation" / "15 confirmed decisions" after four shipped versions.
  The README is what a stranger reads first.

### Already site-ready prose

`calculus/SPEC.md` (39 `R-` rules, 12 worked examples, no project ids by
design), `schema/MEDIA.md`, `schema/VERSIONING.md`, `docs/ubiquitous-language.md`
(binding per DECISIONS #26 — the most site-ready doc in `docs/`), the 109
registry entries with bilingual definitions and cited public-domain sources,
and `registry/README.md`.

---

## 7. Recommendation

**Build the site with a plain bun script and one dependency (`marked`), and
hand-roll the schema renderer.** Not because frameworks are bad, but because
every framework that fits the *content* problem fails the *dependency* gate we
already enforce, while the zero-framework path fails nothing and is the only
one that can also enforce documentation policy at build time.

Gate it with the DIST-FRESH pattern already in the repo, pointed at the site
directory, plus a coverage assertion that every normative surface has a page.

Corollary: **CI needs a Bun/mise setup step before any of this can be
enforced there.**

---

## Sources

Measured locally: dependency counts, install sizes, sha256 comparisons, all
schema-renderer runs. Public repos read: jsonwebtoken.github.io,
commonmark-spec + commonmark-spec-web, json-schema-org/website +
json-schema-spec, asyncapi/spec + website, OAI/OpenAPI-Specification,
cooklang/spec + cooklang.org + cooklang-rs, w3c/webref,
jsonpath-compliance-test-suite.
