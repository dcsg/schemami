# ADR-001: The v0.1 validation harness is written in Go

**Date:** 2026-08-02
**Status:** Accepted

## Status

Accepted

## Context

PRD-001 left exactly one question open for the spec: the implementation
language of the validation harness (Layer-1 shape validation, Layer-2
semantic linter, throwaway safety clamp). Four decision inputs were
recorded on OQ-2: (a) no backend exists or is planned, so there is no
admission point whose language the harness must match; (b) the code is
agent-authored and Daniel-reviewed, so the criterion is "best and most
efficient for the job"; (c) the CUE integration shape is coupled to the
language, since embedding CUE (a Go library) forces Go by itself; (d)
Node.js/TypeScript is not banned but requires very strong, explicitly
argued reasons — the burden of proof is on Node, and ecosystem health
(dependency count and depth, supply-chain risk, toolchain stability) is a
scored criterion, not an afterthought.

The comparative field (verified 2026-08-02): Go has two credible JSON
Schema 2020-12 validators — github.com/santhosh-tekuri/jsonschema v6
(long-standing, ships the `jv` CLI) and Google's Go jsonschema package
(published January 2026) — plus native CUE. Python has the canonical
`jsonschema` library but brings an interpreter and virtualenv into CI.
Rust's `jsonschema` crate is fast but its toolchain is the heaviest for a
repo-internal tool. Node's ajv remains the historical reference validator,
but that edge is no longer unique, and the npm ecosystem fails the
ecosystem-health criterion. Daniel reviews Go daily (edikt), which matters
because he reviews every line here without writing any.

## Decision

We will write the v0.1 harness (`tools/rcplint/`) in Go, using
github.com/santhosh-tekuri/jsonschema/v6 for Layer-1 validation, with a
direct-dependency budget of at most 3 modules (SAC-VAL-002). CUE
constraints are evaluated via the `cue` CLI as a pipeline step; embedding
CUE in-process remains an open option this ADR neither exercises nor
forecloses. Node.js did not meet the very-strong-reasons bar: its one
distinctive asset (ajv) is matched in Go, and it loses outright on the
ecosystem-health criterion.

## Consequences

Easier: single static binary in CI with no interpreter or node_modules;
the smallest realistic supply-chain surface; a later switch to embedded
CUE requires no language change; the validator can be swapped for
Google's Go package behind the same interface if conformance gaps appear;
Daniel reviews in a language he reads daily.

Harder: no ajv — santhosh-tekuri v6's 2020-12 conformance must be pinned
by the six examples plus negative fixtures, with format assertions
enabled explicitly (known weaker area); Go is more verbose than Python
for quick file-walking code; contributors from the web ecosystem face a
less familiar toolchain.

Obligations taken on: the dependency budget is enforced mechanically
(SAC-VAL-002); if the Recipe Calculus reference implementation later
chooses a different language, conformance vectors — not shared source —
prove equivalence (DECISIONS #13); revisiting this choice requires a new
ADR superseding this one.

<!-- Compiled directives live in the co-located ADR-001-harness-language-go.edikt.yaml sidecar. edikt never writes to this .md — edit prose only; run /edikt:adr:compile to regenerate the sidecar. -->
