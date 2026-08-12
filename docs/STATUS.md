# Schemami status

**As of 2026-08-11:** Schemami v1 is an unpublished release candidate.

Phases 0–3 of `PLAN-schemami-v1-stable-release` are complete. Phase 4 has an
end-to-end Schemami-only runtime: core and pack schemas, Go CLI and Calculus,
shared Go/TypeScript vectors, source-language local-entity rendering, explicit
offline pack verification, and a generated single-file viewer.

## Verified in the current worktree

- exact Go 1.26.1 and Bun 1.3.14 pins and dependency locks;
- Schemami core/pack schema identity and JSON/YAML canonical parity;
- five defined operations: `scale`, `resolve_formula`, `convert_quantity`,
  `reading_order`, and `schedule`;
- canonical decimal strings with at most 16 digits and four fractional digits,
  exact intermediate arithmetic, and round-half-to-even results;
- UCUM 2.2 same-dimension/temperature conversion and explicit refusals;
- registry-free local ingredients, techniques, and equipment;
- evidence isolation and Go/TypeScript diagnostic parity;
- explicit offline pack resolution by collection, revision, and JCS SHA-256;
- 44 Schemami viewer/calculus tests with 252 assertions;
- byte-stable generation of `tools/viewer/dist/index.html`.
- a 19-artifact release contract map covering two schemas, six shared corpora,
  and all 11 minimum problem types;
- an explicit candidate scope that excludes retained historical and
  unrelated dirty work.

## Still required before stable release

1. Reproduce the full candidate from a clean clone with no dirty overlay or
   external application checkout.
2. Create and verify the versioned release/evidence manifests.
3. Publish every normative schema, vector, and problem URI immutably over
   HTTPS at `schemami.dev` and verify its digest.
4. Obtain explicit approval before commit, tag, push, or publication.

The documentation website is not a protocol prerequisite. Pão de Portugal is
the intended first external adopter but its repository and adapter are not a
Schemami release gate. AI ingestion and the documentation/manual work follow
the stable protocol.

The current worktree contains substantial retained historical and user-owned
work. The final gate therefore checks that the explicit candidate scope is
committed at `HEAD` while allowing unrelated paths to remain dirty. No
clean-clone claim, stable tag, remote publication, or Pão integration claim has
been made.
