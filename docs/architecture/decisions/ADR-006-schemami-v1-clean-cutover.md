# ADR-006: Schemami v1 is a clean cutover, not an RCP compatibility release

**Date:** 2026-08-10
**Status:** Accepted

## Context

RCP has local development tags, but no remote tags, published schema host, or
verified external adopter. `schema/VERSIONING.md` states that the current
`rcp.invalid` identity can change safely while nothing is published. Maintaining
a dual reader, migration CLI, deprecation calendar, and aliases would enlarge
the first public release while preserving a private pre-release wire model that
no known integrator consumes.

Pão de Portugal has a useful uncommitted RCP parity spike on a product branch,
but it is explicitly disposable discovery work. The Pão team will adapt its
own application to the released Schemami contract; it is not a protocol release
dependency.

## Decision

1. Schemami v1 is a clean cutover. Its reader accepts Schemami wire v1
   only; an `rcp` marker is an explicit unsupported-legacy input, not a fallback
   or compatibility path.
2. Schemami v1 ships no public RCP migration tool, dual-read compatibility
   promise, deprecation window, or legacy writer alias.
3. Repository-owned RCP examples, tests, schemas, registry formats, generated
   data, and tooling are converted or replaced as implementation input. A
   historical source may remain in archived research/release records, but it
   is not an accepted Schemami document or runtime fixture.
4. The release must prove the new wire model directly with Schemami fixtures,
   schema, validator, Calculus, and cross-language conformance. It need not
   prove semantic parity with the private RCP model as a public obligation.
5. Pão de Portugal adoption is not a Schemami v1 release dependency. Pão may
   adapt on its own schedule using the published contract; Schemami does not
   mutate, test-gate, or require a target Pão branch for this release.
6. The protocol still proves ADR-005 independently: a repository-owned
   Schemami vector with a local term must be readable and structurally valid
   without a central registry entry, and an operation lacking required facts
   must refuse narrowly.

## Consequences

The public protocol starts under one name, one marker, and one implementation
path. There is no ongoing burden to preserve old private RCP behavior or to
maintain two schema graphs.

The accepted risk is that an undisclosed external RCP user would need to adapt
without support. This is acceptable only because the owner has confirmed no
such user is in scope and the evidence shows the protocol has not been
published. Any later discovery of an external user is a new product decision,
not an implicit restoration of the old contract.

Pão remains an important future integrator but is not blocked by Schemami's
release schedule, and Schemami is not blocked by Pão's dirty product worktree.

## Alternatives considered

### Dual reader plus migration tool

Rejected. It serves no known external user, expands the first public release,
and preserves the old RCP name and field contract precisely where the clean
Schemami boundary is intended to begin.

### Require Pão adapter proof before release

Rejected. It makes a protocol release depend on a separate dirty application
worktree and turns Pão application behavior into protocol scope. ADR-005 can
be proven with neutral conformance vectors instead.

## References

- ADR-004 — presentation-owned translations
- ADR-005 — registry-optional local vocabulary and integrator resolution
- `schema/VERSIONING.md`
- `docs/product/prds/PRD-007-schemami-stable-protocol-release.md`
