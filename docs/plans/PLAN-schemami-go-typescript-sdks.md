# PLAN: Schemami Go and TypeScript SDK parity

**Status:** release candidate approved
**PRD:** PRD-010
**SPEC:** SPEC-010
**Created:** 2026-08-11

## Outcome

Extract the existing Go CLI and TypeScript viewer protocol engines into public
SDK packages, make the CLI/viewer consumers, and prove parity with Swift and
the shared v1 corpus.

## Working rules

- Preserve unrelated dirty work.
- Add no new protocol behavior without a shared vector.
- Checkpoint evidence after each phase.
- Expected invalid input returns stable results rather than panics/exceptions.
- No commit, push, tag, npm publication, or Go module release without explicit
  approval.

## Phase 1 — Contract and corpus boundary

Freeze package names, public result shapes, resource manifests, and reusable
engine boundaries. Record current CLI/viewer baseline tests.

**Result:** completed 2026-08-11. PRD-010 and SPEC-010 are accepted; package
names, public responsibilities, release boundary, and shared resource checks
are frozen.

## Phase 2 — Go SDK extraction

Implement Core, Calculus, and Diff under `sdk/go`; replay corpus; convert the Go
CLI into a consumer; prove a disposable external module import.

**Result:** completed 2026-08-11. `sdk/go` is an independent module with
retained admission, embedded schema resources, JCS/SHA-256, all six operations,
ID-aware Diff, a separate consumer module, and self-contained corpus tests. The
JSON CLI path delegates recipe/bundle admission and canonical identity to it.

## Phase 3 — TypeScript SDK extraction

Implement ESM/declaration package under `sdk/typescript`; replay corpus; convert
the viewer into a consumer; prove browser/server-safe package imports.

**Result:** completed 2026-08-11. `@schemami/sdk` builds ESM plus declarations,
passes strict Core/bundle/canonicalization/Calculus/Diff tests in a clean copy,
and the viewer now uses thin SDK facades for Core admission and Calculus.

## Phase 4 — Cross-language parity

Run all shared suites in Go, TypeScript, and Swift; compare canonical operation
envelopes; audit for implementation-only semantics and forbidden app/provider
dependencies.

**Result:** completed 2026-08-12. Protocol parity covers shared validation,
canonicalization, structured Calculus, Diff, and resource-budget corpora in Go,
TypeScript, and Swift. The extraction and adversarial review corrections are
pinned by language-neutral vectors and resource manifests.

## Phase 5 — Release-readiness evidence

Produce exact commands/results, API and license inventories, package size/build
observations, known limitations, and proposed immutable release identities.
Stop before any publication or tagging for Daniel's approval.

**Result:** completed 2026-08-12. Implementation, security review, API/license
inventory, package observations, Fornada dogfood, and clean-candidate gates are
recorded in
`docs/reports/schemami-go-typescript-sdk-implementation-2026-08-11.md`.
Daniel approved the `v1.0.0-rc.0` candidate commit. Tagging, pushing, package
publication, and consumer pinning remain separate explicit release mutations.
