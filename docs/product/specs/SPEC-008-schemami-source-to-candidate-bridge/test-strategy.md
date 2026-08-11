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

## Evaluation tests

- Twenty deterministic cases run without an external provider.
- Ten approved real sources record denominators, failures, reviewer effort, and
  inventions; private raw content remains outside the repository.
- No provider capability is claimed from parseability alone.

## Completion rule

Track A core passes without a documentation website, telemetry endpoint, hosted
model, or network access during admission. External acquisition runs may use only
source access explicitly authorized by their host.

