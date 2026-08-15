# PRD-010: Schemami Go and TypeScript SDK parity

**Status:** accepted
**Rigor:** platform
**Author:** Daniel Gomes
**Created:** 2026-08-11
**Sidecar:** [PRD-010-schemami-go-typescript-sdks.yaml](./PRD-010-schemami-go-typescript-sdks.yaml)

## Problem

Schemami v1 has a reusable Swift SDK, but its Go implementation is exposed as a
CLI and its TypeScript implementation is embedded in the private viewer. Go and
web/server integrators should not copy CLI or UI code, invoke subprocesses, or
reimplement protocol semantics.

## Outcome

Deliver public, provider-neutral Go and TypeScript SDK packages that expose the
same three responsibilities as Swift:

- Core: strict retained JSON, recipe/bundle admission, RFC 6901 problems, RFC
  8785 canonical bytes, and SHA-256 identity.
- Calculus: all six Schemami v1 operations with exact arithmetic and explicit
  refusal.
- Diff: deterministic structural comparison without culinary judgment or app
  projection policy.

The existing Go CLI and TypeScript viewer become consumers of these packages.
They may not remain independent sources of normative behavior.

## Requirements

| ID | Requirement |
|---|---|
| FR-SDK-001 | Publish independently consumable packages at `sdk/go` and `sdk/typescript` with documented stable entry points for Core, Calculus, and Diff. |
| FR-SDK-002 | Both packages must retain exact submitted JSON bytes and the complete admitted JSON value, reject duplicate members and invalid I-JSON, preserve authored array order and `x-*`, and admit recipe and bundle documents. |
| FR-SDK-003 | Both packages must produce RFC 8785 JCS and SHA-256 identities matching the shared corpus. |
| FR-SDK-004 | Both packages must implement `resolve_selection`, `scale`, `resolve_formula`, `convert_quantity`, `reading_order`, and `schedule` with the accepted exact v1 behavior. |
| FR-SDK-005 | Both packages must return stable problem URIs and RFC 6901 pointers with deterministic ordering and resource-limit refusal. |
| FR-SDK-006 | Both packages must provide deterministic protocol-only structural Diff; mappings, projection, storage, prompts, network, and culinary policy stay outside. |
| FR-SDK-007 | The Go CLI and TypeScript viewer must delegate reusable normative behavior to their SDK rather than maintaining divergent copies. |
| FR-SDK-008 | Go, TypeScript, and Swift must replay the same repository-owned schema and conformance corpus with no runtime dependency on another language implementation. |

## Acceptance criteria

- The Go SDK can be imported by a disposable external module and all package
  tests pass without running the CLI.
- The TypeScript package builds declarations/ES modules, can be imported by a
  disposable consumer, and runs in supported browser and server runtimes
  without importing viewer UI code.
- Every shared admission, canonicalization, structured-calculus, and Diff
  vector produces the same language-neutral result in Go, TypeScript, and
  Swift.
- The CLI and viewer continue to pass their existing tests after adopting the
  packages.
- Neither SDK contains AI providers, OCR, scraping, app mappings, baking
  heuristics, HTTP policy, persistence, or UI.

## Non-goals

- Kotlin/Android SDK delivery.
- Generated structs alone being called an SDK.
- Cloud services, remote validation, registry lookup, or runtime subprocesses.
- Publishing packages, tags, or immutable releases without Daniel's explicit
  approval after evidence review.

## Package names

- Go module: `github.com/dcsg/schemami/sdk/go`; public package `schemami`, with
  subpackages `calculus` and `diff` only where separation prevents cycles.
- npm package: `@schemami/sdk`; exports `.`, `./calculus`, and `./diff`.

The names are wire-neutral: package organization does not alter Schemami
document identity or protocol version.

## Risks and controls

| Risk | Control |
|---|---|
| Copied engines drift | SDK becomes the reusable authority; CLI/viewer import it; corpus parity is mandatory. |
| JavaScript numbers corrupt exact values | Protocol decimals remain strings and Calculus uses `bigint` rational arithmetic. |
| Parser accepts ambiguous JSON | Mandatory pre-parse duplicate-member and Unicode/I-JSON guards. |
| Dependency behavior becomes protocol behavior | Dependencies are implementation machinery; shared vectors remain authority. |
| Release mutation happens prematurely | Implementation and evidence may proceed; publication/tagging requires a separate approval. |

## Dependencies

- PRD-007 accepted Schemami v1.
- PRD-009 establishes the complete SDK responsibility boundary and Swift parity
  reference.
- The committed schema and language-neutral conformance corpus.
