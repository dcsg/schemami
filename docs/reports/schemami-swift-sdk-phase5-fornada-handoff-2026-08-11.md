# Schemami Swift SDK Phase 5 — Fornada dogfood handoff

**Date:** 2026-08-11
**SDK baseline commit:** `3263c87cd8613da00897da997117371765ef4893`
**Package path at that commit:** `sdk/swift`
**Package lock SHA-256:** `d930a12a0287fd1a03dda0db404803cf9b7ae6d418ab89f6ce5c40588ec68d49`
**Status:** dogfood complete; `v1.0.0-rc.0` candidate approved; not published

## Scope and safety boundary

Evaluate the committed Swift SDK inside Fornada while preserving the app's
existing dirty work. Do not replace persistence, migrate live recipe payloads,
or delete the temporary adapter in the first slice. Integrate beside it, compare
results, then classify gaps.

Fornada owns mappings, overlays, projection, prompts, UI, persistence, recipe
revision policy, timers, fermentation intelligence, baker's math, and bake state.
The SDK owns strict parsing, protocol admission, canonical identity, the six
Recipe Calculus operations, and protocol-only structural Diff.

## Baseline pin and current-candidate boundary

The original Phase 5 handoff was pinned to the commit above. The current
hardened candidate intentionally contains uncommitted SDK changes after that
baseline, so Fornada must record both the baseline commit and a digest or patch
identity for the exact candidate bytes it evaluates. The earlier subtree-clean
command is no longer expected to exit zero:

```sh
git -C "$SCHEMAMI_ROOT" \
  diff --quiet 3263c87cd8613da00897da997117371765ef4893 -- sdk/swift
```

Do not report the current candidate as commit-pinned until these corrections are
committed.

```sh
shasum -a 256 "$SCHEMAMI_ROOT/sdk/swift/Package.resolved"
```

Observed digest: `d930a12a0287fd1a03dda0db404803cf9b7ae6d418ab89f6ce5c40588ec68d49`.

## Local dependency

From `mobile/ios/Fornada`, the package is currently reachable at:

```text
../../../../RecipesProtocol/sdk/swift
```

Inspect the dirty `Package.swift` before editing. Add the local Schemami package
and only the products required by `FornadaKit`:

- `SchemamiCore` for parse/admit/identity and retained models;
- `SchemamiDiff` for review comparison;
- `SchemamiCalculus` only where a protocol operation is actually invoked.

The local path is a Phase 5 development pin, not a publishable dependency. The
handoff must continue to report the exact Schemami Git commit and verify the SDK
subtree has no diff from it.

## Minimal adoption sequence

### 1. Retain before projection

Replace the temporary JSON validation entry point with the SDK boundary while
keeping exact received bytes:

```swift
import SchemamiCore

let parsed = SchemamiCore.parse(receivedData)

let admission: AdmissionResult
switch parsed {
case .parsed(let document):
    admission = SchemamiCore.admit(document)
case .refused(let problems):
    // Present/store stable Problem identities and RFC 6901 pointers.
    return
}

switch admission {
case .recipe(let admitted):
    // admitted.submittedJSON is the exact received input.
    // admitted.value is the retained lossless protocol value.
    // Projection is a separate Fornada decision.
case .bundle(let admitted):
    // Retain and assess bundle projection separately.
case .refused(let problems):
    // Protocol refusal; do not relabel it as a projection failure.
}
```

A valid unfamiliar recipe must remain retainable and readable even when
`FornadaSchemamiAdapter.project` refuses.

### 2. Separate protocol Diff from app projection

```swift
import SchemamiDiff

let protocolComparison = SchemamiDiff.compare(
    source: admittedSource,
    candidate: admittedCandidate
)
let projectionAssessment = fornadaAdapter.assessProjection(admittedCandidate)
```

Compose both in the review UI by RFC 6901 pointer. Do not pass ingredient
mappings, timer rules, or Fornada workflow primitives into `SchemamiDiff`.

### 3. Invoke Calculus only for protocol operations

```swift
import SchemamiCalculus

let result = SchemamiCalculus.evaluate(
    .scale(arguments: arguments),
    input: .recipe(admittedRecipe)
)
```

The result is non-publishable evaluation metadata. Do not replace Fornada's
fermentation models, massa-velha decomposition, yield policy, or baking
recommendations with similarly named SDK operations.

### 4. Retire temporary behavior incrementally

Candidate call-site ownership:

| Current Fornada responsibility | Phase 5 disposition |
|---|---|
| `SchemamiV1Models.swift` flattened document types | stop using for protocol admission; retain temporarily only for legacy adapter migration |
| `validateSupportedShape` and direct `JSONSerialization` admission | replace with `SchemamiCore.parse` and `admit` |
| temporary structural change rows | compare against `SchemamiDiff`, then remove only after parity review |
| exact protocol scaling/conversion/schedule calls | use `SchemamiCalculus` where semantics match |
| ingredient/step bindings and `FornadaSchemamiOverlay` | remain Fornada-owned |
| export/project methods | remain Fornada-owned and emit/consume current recursive method plus plural formulas |
| prompt, model/provider call, review UI | remain Fornada-owned |
| live `payloadJSON` persistence | explicitly unchanged in Phase 5 |

## Required dogfood cases

Run and classify at least these cases:

1. current Alentejano legacy fixture — expected protocol refusal before adapter
   migration because it contains flat `steps` and singular `formula`;
2. migrated current-v1 Alentejano — expected admission with exact formula and
   seven ordered method steps;
3. unfamiliar valid local ingredient — protocol admits, legacy projection may
   refuse without discarding the admitted document;
4. hydration change — Diff identifies exact pointers and Fornada separately
   reports projection consequences;
5. session-only scale — Calculus result is not stored as a publishable recipe;
6. cold versus ambient fermentation — authored environment/duration changes are
   protocol Diff; prediction remains Fornada policy;
7. one-for-one authored alternative — admission/selection succeeds without
   asserting culinary equivalence;
8. recursive sections/actions and multiple techniques — retained by the SDK,
   with any legacy projection limit reported independently;
9. multiple formulas;
10. valid nested/reused component bundle with instance-scoped selection.

Also replay invalid duplicate JSON, stale bundle digest, resource-limit, and
invalid-operation-input cases and confirm stable problem identities/pointers.

## Verification commands

SDK proof:

```sh
CLANG_MODULE_CACHE_PATH=/tmp/schemami-swift-clang-cache \
SWIFTPM_MODULECACHE_OVERRIDE=/tmp/schemami-swiftpm-cache \
swift test --disable-sandbox \
  --package-path "$SCHEMAMI_ROOT/sdk/swift"
```

Current hardened candidate: 42 tests, 0 failures, plus a successful production
build and a 19-resource digest check.

Fornada should use a disposable scratch build because its existing `.build`
contains historical absolute paths:

```sh
CLANG_MODULE_CACHE_PATH=/tmp/fornada-schemami-phase5-clang \
SWIFTPM_MODULECACHE_OVERRIDE=/tmp/fornada-schemami-phase5-swiftpm \
swift test --disable-sandbox \
  --scratch-path /tmp/fornada-schemami-phase5-build \
  --package-path "$FORNADA_ROOT/mobile/ios/Fornada"
```

## Findings to return

For each failure or friction point, report:

- exact Fornada and Schemami revisions;
- command and unedited result;
- source/candidate pointer;
- classification: `sdk-defect`, `protocol-defect`, `fornada-projection-gap`,
  `application-policy`, or `dependency-risk`;
- whether a valid admitted document remained retained after projection refusal;
- smallest proposed fix and the owner of that fix.

Stop and report rather than working around any SDK behavior that conflicts with
the shared schema/conformance corpus, loses exact submitted bytes or `x-*`
content, changes authored order, requires a network/runtime subprocess, or moves
Fornada policy into Schemami.

## 2026-08-12 hardened candidate note

The command above now passes 42 tests. Since the original handoff, the Swift
candidate has added lossless scalar-distinct Unicode retention, pre-identity
I-JSON integer checks, bounded graph analysis and raw parsing, closed nested
operation arguments, formula-owned component scaling, recursive schedule
composition, producer/consumer alignment, and globally deterministic composed
schedule ties. The final hardening pass also prevents Unicode-key Diff traps,
handles huge-exponent numeric zero in constant work, deduplicates logically
equivalent activation regions, enforces aggregate bundle budgets, validates
component-path local IDs, replays the shared cross-language Diff corpus, and
uses exact-key lookup for large opaque extension objects.
It also implements ADR-017's separate request-scoped `analysisStates` budget,
aggregates semantic capacity across bundles and component instances, and
replays the shared `resource-budgets.json` boundary: semantic 389 refuses and
390 admits; analysis 49,163 refuses and 49,164 admits.
Fornada should evaluate the current worktree bytes rather than the earlier
27-test snapshot.

## 2026-08-12 dogfood result

The current Fornada integration compiled against the hardened local Swift
package and passed all requested SDK cases. An initial run passed 10/11 and
correctly detected that Swift emitted multiple nested pointers for one
recursive-budget exhaustion. Schemami normalized admission resource exhaustion
to one root-level `resource-limit` problem across Go, TypeScript, and Swift and
added the behavior to the shared resource-budget corpus.

Final focused results:

- `FornadaSchemamiSDKDogfoodTests`: 11 passed;
- all `FornadaSchemami*` acquisition, adapter, and SDK tests: 29 passed;
- valid unfamiliar content remains admitted when the legacy projection refuses;
- recursive methods, alternatives, multiple formulas, nested/reused components,
  exact scale metadata, protocol Diff, and stable refusal identities all pass.

No Fornada file was modified. The evaluated Schemami candidate is still an
uncommitted worktree over baseline commit
`3263c87cd8613da00897da997117371765ef4893`; publication still requires a
committed candidate and explicit release authority.
