# SPEC-008 test strategy

## Contract validation

- Validate request, report, repair, and manifest examples against their schemas.
- Reject unknown fields, invalid BCP 47/local IDs, bad RFC 6901 pointers, invalid
  media types/URIs/digests, unknown codes/statuses, and mismatched candidate hashes.
- Rebuild the manifest twice and require identical bytes/hashes.

## Trust-boundary tests

- An acquisition report cannot create or overwrite `admission-result.json`.
- Changing report bytes never changes candidate JCS or Calculus.
- A candidate self-claiming validity fails because no such Schemami field exists.
- Hostile source instructions cannot alter output files, suppress issues, execute
  content, read secrets, or authorize network access.
- Duplicate JSON and invalid Unicode refuse before schema admission.

## Fidelity tests

- Preserve source language and authored order.
- Unknown local concepts remain readable with local IDs.
- Ambiguous regional measures, missing quantities, and inaccessible sources remain
  unresolved rather than guessed.
- Structured alternatives/conditions/components remain structured when authored.
- Model self-confidence is never promoted to source evidence confidence.

## Repair tests

- Every repair uses exact candidate digest and deterministic problems.
- Stale repair requests refuse.
- Replacement output is a complete candidate, not a patch.
- Attempt exhaustion remains an explicit human-review outcome.

## Release-access tests

- Twenty deterministic cases run without an external provider.
- The direct guide exists, uses the released core schema, returns one candidate,
  and routes it to deterministic admission without requiring a report or digest
  from the model.
- The `/ai/v1` manifest covers every versioned kit file exactly, sorts its file
  and dependency inventories, and pins the released schema, candidate example,
  and advanced-contract manifest by SHA-256.
- The interview contract limits questions, permits honest unresolved answers,
  uses BCP 47, distinguishes faithful capture from authoring, and forbids the AI
  from claiming validation.
- The recipe-card template is self-contained, labels the document unverified,
  uses text-only DOM insertion for authored values, and contains no external
  script, network, storage, evaluation, or HTML-injection behavior.
- Go, TypeScript, and Swift documentation identify the admitted-handle boundary.
- The optional acquisition harness verifies request/report/candidate byte
  identity and repair without calling a provider.
- No provider capability is claimed from parseability or documentation alone.

## Completion rule

The conversion kit passes without telemetry, hosted inference, Schemami-owned
source capture, or network access during admission. External AI/OCR/parser calls
use only source access selected and authorized by their user or host application.
