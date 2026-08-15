# Schemami status

**As of 2026-08-15:** Schemami v1.0.0 has one stable source release commit. The
protocol, TypeScript/Go/Swift SDK sources, AI conversion kit, documentation
website, and immutable HTTPS contract are versioned from that commit. SDK
registry and language-specific tag publication is the owner-assisted follow-up.

Phases 0–10 of `PLAN-schemami-v1-stable-release` are implemented. The current
runtime includes core and bundle schemas, a Go CLI, Go/TypeScript/Swift SDKs,
cross-language conformance vectors, deterministic admission and identity,
Recipe Calculus, Diff, resource budgets, and a generated local viewer.

## Verified in the current worktree

- exact Go 1.26.1 and Bun 1.3.14 pins and dependency locks;
- Schemami core/bundle schema identity and strict JSON canonical parity;
- six defined operations: `resolve_selection`, `resolve_formula`, `scale`,
  `convert_quantity`, `reading_order`, and `schedule`;
- canonical decimal strings with at most 16 digits and four fractional digits,
  exact intermediate arithmetic, and round-half-to-even results;
- UCUM 2.2 same-dimension/temperature conversion and explicit refusals;
- registry-free local ingredients, techniques, and equipment;
- evidence isolation and Go/TypeScript diagnostic parity;
- explicit offline bundle resolution by collection, revision, and JCS SHA-256;
- byte-stable generation of `tools/viewer/dist/index.html`;
- a 19-artifact release contract map covering two schemas, six shared corpora,
  and all 11 minimum problem types;
- an explicit candidate scope that excludes retained historical and
  unrelated dirty work.

## Source release surface

1. `https://schemami.dev` publishes the documentation, schemas, conformance
   corpora, AI kit, and stable problem pages.
2. `@schemami/sdk` is prepared at version `1.0.0`; npm publication is performed
   with the owner after the source release is verified.
3. `github.com/dcsg/schemami/sdk/go` is prepared for tag `sdk/go/v1.0.0`.
4. The root Swift Package is prepared for repository tag `v1.0.0`.
5. Pão de Portugal and Fornada remain independent consumers with app-owned
   mappings and adoption tests.

The documentation website is not a protocol-correctness prerequisite, but it is
part of the public product release. The AI release is a provider-neutral
conversion kit: people may use an AI directly, while applications use the SDKs.
Schemami does not host capture, OCR, inference, recipes, or source files.

The public root commit contains only the reviewed Schemami release scope.
Pre-publication history and unrelated local work are excluded from the public
tree and retained only in the maintainer's local archive.
