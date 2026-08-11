# PRD-009: Schemami Swift SDK fast lane and recipe adjustment

**Status:** accepted  
**Rigor:** platform  
**Author:** Daniel Gomes  
**Created:** 2026-08-11  
**Sidecar:** [PRD-009-schemami-swift-sdk-and-recipe-adjustment.yaml](./PRD-009-schemami-swift-sdk-and-recipe-adjustment.yaml)

---

## Problem

Fornada needs a production Swift SDK now. Its current Schemami experiment is an
application-owned writer/projection spike and correctly refuses unsupported
projections, but it is not a complete protocol implementation. The Schemami
repository currently has a Go CLI reference implementation and TypeScript
behavior embedded in the viewer; waiting to turn both into public SDKs would
unnecessarily delay the first native consumer.

The Swift delivery must still be a real SDK rather than generated Codable
structures. The difficult contract is lossless parsing, semantic admission,
exact Recipe Calculus, stable problems, canonical identity, resource limits,
and deterministic comparison of an original recipe with a proposed derived
recipe.

## Product boundary

```text
existing admitted recipe + user adjustment intent
                    |
                    v
external adapter proposes a complete Schemami candidate
                    |
                    v
Swift SDK: parse -> admit -> calculate -> digest -> compare
                    |
                    v
Fornada review and import as a new derived recipe
```

The SDK is deterministic and provider-neutral. It contains no model calls,
prompts, OCR, retries, consumer subscription knowledge, culinary substitution
heuristics, or Fornada catalog mappings.

## Verified consumer baseline

The current Fornada package declares Swift tools 5.10, iOS 17, and macOS 14.
The initial SDK must compile and test against that verified baseline. Wider
platform support may be added when proven and must not delay Fornada adoption.

## Users

- `fornada.ios-integrator` — needs a production Swift Package and deterministic
  comparison before importing a derived recipe.
- `schemami.swift-integrator` — needs complete retained documents, explicit
  results, exact calculations, and stable problems.
- `schemami.sdk-implementer` — needs the normative v1 corpus exposed in a form
  Swift can replay without invoking the Go CLI at runtime.

## Goals

| Goal | Target | Counter-metric |
|---|---|---|
| Fast native delivery | A production Swift Package reaches Fornada before Go/TypeScript SDK extraction | No dependency on completing other SDK packages |
| Complete SDK value | Lossless models, admission, all Calculus operations, canonical identity, and diagnostics | Generated data types alone are not called an SDK |
| Safe adjustment | A proposed adjustment is reviewed as a complete derived recipe | Original recipe is never mutated and no executable patch chain is created |
| Deterministic review | Swift `SchemamiDiff` identifies exact structural changes without culinary judgment | No heuristic similarity is labelled exact equivalence |
| Protocol parity | Swift replays the existing shared v1 contract and corpus | No Swift-only protocol semantics |
| App boundary | Fornada retains mappings, projections, overlays, heuristics, and execution state | No Fornada model or baking intelligence enters the SDK |

## Non-goals

- Delivering public TypeScript or Go SDK packages in this fast lane. They remain
  an approved later parity track against the same contract and corpus.
- Calling an AI model from the Swift SDK.
- Provider prompt construction, OCR, scraping, retries, or safety copy.
- Automatic ingredient equivalence or substitution advice.
- Replacing Fornada's Recipe entity, persistence, revision policy, or UI.
- Storing timer policy, notifications, bake state, fermentation prediction, or
  application scheduling heuristics in Schemami.
- Android/Kotlin delivery.
- Treating a temporary scale result as a newly publishable recipe.

## Requirements

| ID | Component | Requirement |
|---|---|---|
| FR-SWIFT-001 | package contract | Deliver a versioned Swift Package with `SchemamiCore`, `SchemamiCalculus`, and `SchemamiDiff` products, compiling on the verified Fornada baseline of Swift tools 5.10, iOS 17, and macOS 14. |
| FR-SWIFT-002 | lossless core | `SchemamiCore` must losslessly parse and encode the complete v1 recipe and bundle model, preserve authored order and admitted `x-*` values, retain original admitted bytes/value access, and separate syntax/schema admission from semantic admission. |
| FR-SWIFT-003 | canonical identity | Provide RFC 8785 JCS canonical bytes and SHA-256 identities while keeping authored `(collection, id, revision)` distinct from exact content identity. |
| FR-SWIFT-004 | exact calculus | `SchemamiCalculus` must implement `resolve_selection`, `scale`, `resolve_formula`, `convert_quantity`, `reading_order`, and `schedule` with exact arithmetic and the accepted v1 quantization/refusal behavior. |
| FR-SWIFT-005 | diagnostics and limits | Return explicit admission/evaluation result types, stable problem identities, RFC 6901 pointers, deterministic diagnostic ordering, cycle-safe evaluation, and the accepted interoperability resource floors. Public behavior must not depend only on thrown Swift errors. |
| FR-SWIFT-006 | conformance | Swift must replay the repository-owned schema, semantic, canonicalization, problem, active-graph, formula, component, and Calculus vectors. The Go/TypeScript reference outputs may detect drift during development but are not runtime dependencies. |
| FR-SWIFT-007 | deterministic diff | `SchemamiDiff` must compare two admitted complete documents and report ordered protocol structural changes without modifying identity, merging recipes, judging culinary wisdom, or consuming application projection policy. |
| FR-ADJ-001 | adjustment boundary | An external adapter may use user intent to propose a complete candidate, but the Swift SDK accepts structured documents only and never executes prose or calls a provider. |
| FR-ADJ-002 | lineage and immutability | Persisted composition, method, fermentation-condition, or substitution changes produce a complete new recipe with exact `lineage.derived_from`; the original remains unchanged and lineage is provenance, not an executable patch. |
| FR-ADJ-003 | scaling distinction | Temporary yield adjustment uses a non-publishable Calculus result. Only an explicitly reviewed and persisted changed composition or method becomes a derived recipe according to application policy. |
| FR-ADJ-004 | application ownership | Fornada mappings, projections, overlays, timer rules, biological models, execution state, HTTP presentation, and application revision policy remain outside all SDK products. |

## Acceptance criteria

- **AC-SWIFT-001-1** — Given Fornada's current package baseline, when the SDK is
  added through Swift Package Manager, then all products compile and their tests
  run on iOS 17/macOS 14-compatible tooling.
- **AC-SWIFT-002-1** — Given a valid unfamiliar document with recursive methods,
  components, alternatives, evidence, and `x-*` values, when decoded and
  re-encoded, then no admitted content or authored array order is lost.
- **AC-SWIFT-003-1** — Given canonicalization vectors, when Swift processes them,
  then it produces the pinned RFC 8785 bytes and SHA-256 digests or the required
  refusal without locale-dependent behavior.
- **AC-SWIFT-004-1** — Given every accepted Calculus result and refusal vector,
  when Swift replays it, then results match the shared contract without floating
  tolerance, density inference, network lookup, or Swift-specific rounding.
- **AC-SWIFT-005-1** — Given multiple independent semantic blockers or a resource
  limit, when admission/evaluation runs, then problems are deduplicated and
  deterministically ordered using stable identities and RFC 6901 pointers.
- **AC-SWIFT-006-1** — Given the complete required v1 corpus, when Swift CI runs,
  then no fixture requires the Go CLI, TypeScript runtime, Fornada checkout, or
  network access to determine the expected result.
- **AC-SWIFT-007-1** — Given two admitted recipes, when compared, then the diff
  reports identity/lineage, ingredients, formulas, method hierarchy, conditions,
  durations, completion, environment, resources, components, outputs, and
  extensions as non-canonical metadata. Application projection assessment remains
  a separate application result.
- **AC-ADJ-001-1** — Given hostile or ambiguous adjustment prose, when a structured
  candidate is submitted, then only structured content is evaluated and provider
  claims cannot override admission or calculations.
- **AC-ADJ-002-1** — Given an approved changed recipe, when Fornada imports it,
  then it is a complete document with an exact parent reference and the original
  bytes remain unchanged.
- **AC-ADJ-003-1** — Given a session-only yield change, when `scale` succeeds, then
  no new recipe identity, revision, digest, or lineage is invented.
- **AC-ADJ-004-1** — Given Fornada mappings and baking policy, when SDK boundaries
  are audited, then none appears in `SchemamiCore`, `SchemamiCalculus`, or
  `SchemamiDiff`.

## Package model

| Swift product | Owns | Does not own |
|---|---|---|
| `SchemamiCore` | complete models, parsing, admission, problems, pointers, JCS, digests | provider calls, app mappings, UI |
| `SchemamiCalculus` | exact selection, formulas, scaling, conversion, order, schedule | baking prediction, reminders, session state |
| `SchemamiDiff` | deterministic admitted-document comparison | culinary equivalence, automatic merging, canonical recipe content |

## Fast-lane delivery sequence

1. Freeze only the Swift-facing API surface and externalized corpus layout
   required for implementation.
2. Scaffold the Swift Package and implement `SchemamiCore` parsing, admission,
   identity, and problems.
3. Implement all six `SchemamiCalculus` operations and replay shared vectors.
4. Implement `SchemamiDiff` and adjustment-review fixtures.
5. Replace Fornada's temporary protocol writer/validator boundary with the SDK
   while preserving Fornada-owned mapping and projection code.
6. Run an independent package release proof and pin the released SDK in Fornada.

Swift work does not wait for public Go or TypeScript SDK extraction. Any missing
normative vector discovered during Swift implementation is fixed in the shared
corpus first so later SDKs inherit the same decision.

## Dependencies

- The committed Schemami v1 candidate and accepted ADR-014/015/016 semantics.
- Repository-owned schema, semantic, Calculus, canonicalization, and problem
  vectors accessible without implementation-private code.
- Fornada dogfood as consumer evidence, not normative source.

Track B does not depend on Track A. Fornada can later plug any external
adjustment adapter into the deterministic SDK boundary.

## Risks

| Risk | Mitigation |
|---|---|
| Speed produces an incomplete structs-only package | Definition of done requires admission, Calculus, identity, problems, and corpus replay |
| Swift semantics drift from v1 | Shared golden corpus and reference comparison during development |
| SDK becomes coupled to Fornada | Build in the Schemami repository; Fornada owns mappings and projection |
| Diff becomes semantic guesswork | Compare admitted protocol structure only; applications assess their projection limitations separately |
| Later Go/TypeScript SDKs inherit undocumented Swift behavior | Any behavior change requires a shared vector before Swift code is accepted |

## Later parity track

The approved outcome still includes public Go and TypeScript SDKs. They will be
specified as a separate follow-on track that extracts the current CLI/viewer
implementations and replays the same externalized corpus. Their extraction is
not a gate for Swift release.
