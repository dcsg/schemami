# Schemami Go and TypeScript SDK implementation evidence

**Date:** 2026-08-11
**Status:** `v1.0.0-rc.0` candidate approved; publication pending
**Authority:** PRD-010 / SPEC-010

## Outcome

The remaining approved SDK track is implemented:

- `sdk/go` — independently importable Go module
  `github.com/dcsg/schemami/sdk/go` with Core, `calculus`, and `diff`.
- `sdk/typescript` — ESM npm package `@schemami/sdk` with Core,
  `@schemami/sdk/calculus`, and `@schemami/sdk/diff`, plus emitted TypeScript
  declarations.
- The Go CLI delegates JSON recipe/bundle admission and canonical identity to
  the Go SDK.
- The Schemami viewer delegates admission and Calculus to `@schemami/sdk`; its
  remaining adapter owns YAML parsing and UI messages only.

No package was published, tagged, pushed, or pinned by an external consumer.

## Public responsibilities delivered

| Responsibility | Go | TypeScript |
|---|---|---|
| Strict duplicate-member/Unicode JSON guard | yes | yes |
| Exact submitted bytes and defensive retained value | yes | yes |
| Recipe and bundle admission | yes | yes |
| Embedded deterministic schema resources | yes | yes |
| RFC 8785 canonical bytes and SHA-256 | yes | yes |
| Six Recipe Calculus operations | yes | yes |
| Stable problem URIs and RFC 6901 pointers | yes | yes |
| Protocol-only structural Diff | yes | yes |
| ID-aware authored-array comparison | yes | yes |
| Provider/network/app policy | excluded | excluded |

## Defect found by parity extraction

The private TypeScript engine returned `/bundle/documents` for a standalone
recipe whose selected component could not resolve. Go and the shared digest
required `/recipe/components`. The SDK implementation corrected the pointer and
the full structured-calculus corpus now matches byte-for-byte.

The viewer's phase-9 replay also failed to load `recipe_fixture` vectors and was
therefore testing `undefined` instead of two real recipes. The replay now loads
both inline recipes and `recipe_fixture` cases. This made the previously hidden
pointer mismatch observable.

## Verification

### Go SDK and external consumer

```sh
GOCACHE=/tmp/schemami-sdk-go-cache GONOSUMDB='*' GOPROXY=off \
  go -C sdk/go test ./...
GOCACHE=/tmp/schemami-sdk-consumer-cache GONOSUMDB='*' GOPROXY=off \
  go -C sdk/go/integration/consumer test ./...
```

Result: Core, Calculus, Diff, and the separately rooted consumer module pass.

A clean copied module at `/tmp/schemami-go-proof.9X9IOn/go` also passed all
three package suites with network disabled.

### TypeScript SDK and clean-copy proof

```sh
bun run build
bun test
```

Result: ESM build and declarations succeeded; 29 tests passed with 173
assertions. Coverage includes every shared validation verdict, all five RFC
8785 vectors, every structured Calculus digest, bundle closure, strict JSON,
retention, Diff, and package exports.

A clean copy at `/tmp/schemami-ts-proof-final.0zsqKV/typescript` installed from the
locked cache, built, emitted declarations, and passed its then-current suite. No
repository-relative schema or corpus path was required.

### Existing consumers and third implementation

```sh
GOCACHE=/tmp/schemami-tools-go-cache GONOSUMDB='*' GOPROXY=off \
  go -C tools/schemami test ./...
bun --cwd tools/viewer test
CLANG_MODULE_CACHE_PATH=/tmp/schemami-swift-clang-cache \
SWIFTPM_MODULECACHE_OVERRIDE=/tmp/schemami-swiftpm-cache \
  swift test --disable-sandbox --package-path sdk/swift
```

Results:

- Go CLI and acquisition commands: pass.
- Viewer: 161 tests, 1,100 assertions, all pass.
- Swift SDK: 42 tests, all pass. Its production build also passes. SwiftPM emitted only expected read-only cache
  warnings under the managed sandbox.

### Resources, governance, and hygiene

```sh
./tools/schemami/check-sdk-resources.sh
git diff --check
bash tools/edikt-checks/approved-edikt.sh gov compile --check --json .
```

Results: SDK schema/corpus copies match repository authorities; diff hygiene
passes; Edikt returns `status: ok`, zero errors, zero stale inputs, and an empty
lossless report.

## Build observations

- TypeScript emitted output: approximately 376 KiB / 341 KiB of files before
  package compression. Development `node_modules` is approximately 24 MiB and
  is not package content.
- Go source module: approximately 428 KiB including embedded resources and
  tests.
- The TypeScript SDK runtime dependency is pinned to
  `@cfworker/json-schema` 4.1.1; TypeScript 5.9.3 is development-only. YAML is
  intentionally viewer-owned and is not an SDK runtime dependency.
- Go dependencies remain the reviewed reference-engine dependencies pinned by
  `go.mod`/`go.sum`.

These are implementation/build observations, not final package-size or mobile
binary claims.

## Remaining release mutations

Daniel selected `v1.0.0-rc.0`, accepted the public SDK strategy, and approved
the manifest-scoped candidate commit. Fornada Phase 5 dogfood is complete.
Tagging, pushing, npm publication, Go/Swift release distribution, and consumer
pinning remain separate explicit mutations; none occurred in this checkpoint.

### Resolved activation-analysis contract

[ADR-017](../architecture/decisions/ADR-017-separate-semantic-capacity-and-analysis-safety-budgets.md)
separates normative semantic capacity from deterministic solver safety:

- `semanticOccurrences` charges the static registered protocol surface once and
  that surface again for every completed deduplicated active graph;
- `analysisStates` charges unique canonical residual solver states and may
  refuse explicitly with `resource-limit` without making the document
  intrinsically invalid;
- both counters are request-scoped across bundle admission; public Calculus
  additionally charges each distinct root/component instance once and does not
  consume analysis states.

The shared `conformance/schemami-v1/resource-budgets.json` adversary fixes the
cross-language boundary at 130 static occurrences, two reachable graphs, 390
total semantic occurrences, and 49,164 analysis states. All three SDKs refuse
at 49,163 and admit at 49,164 when the semantic budget is 390. The default
10,000-state profile refuses deterministically.

## Known compatibility boundary

The Go CLI keeps its legacy YAML compatibility helpers, but canonical JSON
recipe/bundle admission uses the SDK. The TypeScript SDK Core accepts strict
JSON; the viewer retains YAML as an authoring/presentation adapter and submits
the resulting structured value to SDK admission. YAML never defines canonical
identity.

## 2026-08-12 security and quality hardening addendum

Three independent language-specialist reviews were run against Go, TypeScript,
and Swift. The first pass found release-blocking identity, admission-boundary,
composition, and denial-of-service defects. The following corrections are now
implemented and covered by adversarial tests:

- invalid UTF-8, binary64 overflow/underflow, and inexact integer tokens refuse
  before admitted identity;
- duplicate/hostile JSON members, including `__proto__`, retain or refuse
  without silent tree mutation;
- JavaScript consumers cannot manufacture an admitted handle;
- public Calculus accepts admitted handles and closed nested arguments only;
- recursive components, selected instances, raw JSON nesting, semantic object
  counts, and reachable-graph exploration have deterministic limits;
- extension data cannot influence activation analysis;
- equivalent activation regions are symbolically reduced and memoized, so
  ordinary tautologies avoid Cartesian expansion while analysis still exhausts
  explicitly at the deterministic implementation ceiling;
- Go SDK no longer contains CLI/filesystem/YAML behavior or its YAML dependency;
- TypeScript package builds before pack, contains a digest manifest, the
  Apache-2.0 project license, and the complete MIT notice for its bundled
  runtime dependency. It remains private until release approval;
- Go and TypeScript resource manifests are pinned to repository-authority
  SHA-256 values.

Final observed verification after hardening:

- Go SDK: all tests, race detector, vet, and separate consumer module pass.
- TypeScript SDK: build and 29 tests / 173 assertions pass.
- Viewer: 161 tests / 1,100 assertions pass after reinstalling the local package.
- Swift SDK: 42 tests pass; its 19-resource digest check, package manifest, and
  production build pass.
- npm dry-run archive: 43 files, 159.8 kB compressed, 885.6 kB unpacked
  bytes; prepack build and tests pass.

The language-neutral `conformance/schemami-v1/diff.json` and
`conformance/schemami-v1/resource-budgets.json` corpora now replay in Go,
TypeScript, and Swift. They pin structural Diff behavior and the independent
semantic/analysis resource boundary.

The final adversarial pass additionally closed forged JavaScript handles,
Swift Unicode-key Diff traps, huge-exponent zero parsing, aggregate bundle
budgets, extension-payload budget pollution, ambiguous Swift component paths,
duplicate dynamic selection keys, nested extension pollution of activation
thresholds, YAML identity through the legacy Go admission path, generic Go
container-amplification, and quadratic Swift object equality.

Schemami and all three package distributions are now licensed under
Apache-2.0. Publication remains deliberately blocked by `private: true` and the
absence of explicit release authority. No package was published or tagged.

### Final closure verification — 2026-08-12

The complete repository `make ci` gate passes after correcting two stale
cutover assertions to recognize the viewer's current, equivalent explicit
legacy-refusal code. The correction changed only the checker strings; the
runtime refusal and its conformance test were already present.

Additional final gates passed:

- Go SDK tests with the race detector, vet, and the separately rooted external
  consumer;
- TypeScript build and 29 tests / 173 assertions;
- Swift debug tests (42), production build, and 19-resource manifest check;
- viewer reinstall from the local package and 161 tests / 1,100 assertions;
- SDK resource manifests, canonical-wire verification, Edikt compile, and Git
  diff hygiene;
- npm dry-run package inspection confirming 43 intended files, Apache-2.0
  license text, and the full bundled-dependency MIT notice.

### Fornada Phase 5 dogfood closure — 2026-08-12

Fornada's current local package integration compiled against the exact hardened
Swift SDK worktree. The first run passed 10 of 11 dogfood cases and exposed one
cross-language diagnostic inconsistency: Swift returned seven precise nested
method pointers when a configured recursive-depth budget was exhausted, while
Go and the Fornada boundary expected one non-cascading root-level
`resource-limit` problem.

The protocol behavior was normalized rather than weakening the consumer test:

- admission resource exhaustion now returns exactly one root-level
  `resource-limit` problem in Go, TypeScript, and Swift;
- the behavior is pinned in the shared
  `conformance/schemami-v1/resource-budgets.json` corpus and replayed by all
  three SDKs;
- Fornada then passed all 11 current SDK dogfood cases and all 29 Schemami
  acquisition/adapter/SDK tests.

No Fornada source, persistence, mapping, or application-policy file was changed.
