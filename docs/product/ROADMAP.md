# Schemami roadmap

## 1. Public Schemami v1.0.0 release — shipped 2026-08-15

Complete `PRD-007` / `SPEC-007` / `PLAN-schemami-v1-stable-release`:

- immutable schema, conformance, AI, problem, and documentation routes at
  `schemami.dev` through GitHub-controlled deployment;
- Go, TypeScript, and Swift SDK source packages prepared for their normal
  installation paths; owner-assisted registry/tag publication follows;
- one clean public root commit with stable `v1.0.0` release identity.

Protocol correctness does not depend on the documentation website or Pão
application, but public documentation and installable SDKs are product-release
gates.

## 2. Documentation and AI conversion kit — shipped 2026-08-15

The current site covers the wire model, bundles, six Calculus operations,
problems, conformance, all three SDKs, and a local validator/playground. It
offers direct use with an AI selected by the user and application integration
through an SDK, without hosted capture or inference.

## 3. Pão de Portugal adoption

After the protocol is stable, the Pão application can own an adapter from its
recipe aggregate to Schemami v1, map recipe-local IDs to its own catalog, and
render translations/presentation in its own layer. Schemami conformance proves
the protocol boundary; the application repository owns its compatibility and
product tests.

## Later, evidence-led candidates

Potential future model work includes structured readiness endpoints,
additional Calculus operations, conditional physical conversions, and richer
method branching. Each requires its own accepted semantics and vectors; none
is implied by v1.
