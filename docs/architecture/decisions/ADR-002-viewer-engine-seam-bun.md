# ADR-002: The viewer is split at an engine interface; Bun is the sanctioned JS toolchain

**Date:** 2026-08-02
**Status:** Accepted

## Status

Accepted

## Context

SPEC-002 ships a lightweight viewer (FR-TOOL-001): a static page that
validates and renders a pasted .rcp.yaml document. The full playground
(later FEAT-TOOL-001 phase) adds L2+CUE verdicts and the clamp-guarded
scaling slider — capabilities that only exist in the Go core and will
necessarily arrive as a WASM build. The tension: a WASM-first lightweight
viewer carries a multi-megabyte payload for what should be an instant
page, while a JS-first viewer risks (a) being rewritten wholesale when
WASM arrives and (b) verdict divergence from rcplint — the founding
failure mode of this project was divergent implementations with no shared
test oracle.

ADR-001 set the toolchain bar: Node.js requires very strong, explicitly
argued reasons, and ecosystem health is a scored criterion. A browser
page is JavaScript at the surface regardless; the question is what
toolchain and dependency posture that forces. Daniel's direction
(2026-08-02): the lightweight cut should be genuinely lightweight, the
full thing may be different tech, the lightweight version must not be
rewritten later, and Bun via mise is the package manager if one is
needed.

## Decision

The viewer is split at a versioned **engine interface** — a small typed
contract (`analyze(text) → {parse, verdicts, canonical}` plus a
`capabilities` object, optional `scale()` for the clamp) — and the UI is
written against that interface only. The v0.2 engine is JavaScript:
YAML 1.2 parse plus a JSON Schema 2020-12 validator, with a runtime
dependency budget of **at most 2 exact-pinned packages** and **zero UI
dependencies** (vanilla DOM). The full-playground engine later implements
the same interface over the WASM-compiled Go core; the UI reads
`capabilities` and lights up features — nothing is rewritten at the seam.

Verdict parity is guaranteed by **conformance vectors, not implementation
monogamy**: the browser engine must produce agreeing verdicts with
rcplint over the full corpus (examples, testdata positives and
negatives), CI-tested. This makes the JS engine the first consumer of the
cross-stack conformance vectors the protocol already owes integrators
(engineering obligation #1) — a proof of independent implementability,
not a drift risk.

**Bun, pinned via mise, is the only sanctioned JavaScript toolchain** in
this repo: package manager, bundler, test runner and TypeScript runtime
in one binary. Node, npm, npx, and separate bundlers (Vite, webpack,
esbuild-as-dependency) remain unsanctioned. TypeScript is used for the
engine interface and glue — the interface is the forward-compatibility
artifact, and Bun makes TS free. The ecosystem-health bar from ADR-001
applies to every individual dependency; the validator pick (shortlist:
@hyperjump/json-schema, @cfworker/json-schema, ajv) is health-scored at
plan time.

## Consequences

Easier: the lightweight page loads in hundreds of KB, not megabytes; the
WASM engine drops in later without touching the UI; the conformance
vector suite the protocol needed anyway gets built and exercised now; a
single mise-pinned binary keeps CI free of node_modules sprawl; TS types
document the seam for the future WASM implementer.

Harder: two implementations of L1 must be kept in verdict agreement —
the conformance suite is now load-bearing and must run in CI on every
schema change; Bun is younger than Node and its lockfile/registry
behaviour must be watched (mitigated: exact pins, 2-dep budget, single
binary); contributors must learn the engine seam before touching the
viewer. The v0.2 JS engine's L1 code is potentially disposable once WASM
lands — bounded loss by design (~glue around two libraries), and it may
persist as the fast-load path regardless.
