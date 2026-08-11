# Schemami roadmap

## 1. Stable Schemami v1 — current

Complete `PRD-007` / `SPEC-007` / `PLAN-schemami-v1-stable-release`:

- finish the active clean-cutover ledger and full local gate;
- reproduce the candidate from a clean clone;
- publish immutable normative schema/vector/problem bytes at `schemami.dev`;
- obtain explicit approval for commit, tag, push, and release.

The documentation website and Pão application are not release gates.

## 2. Pão de Portugal adoption

After the protocol is stable, the Pão application can own an adapter from its
recipe aggregate to Schemami v1, map recipe-local IDs to its own catalog, and
render translations/presentation in its own layer. Schemami conformance proves
the protocol boundary; the application repository owns its compatibility and
product tests.

## 3. AI conversion bridge

Revise the existing AI/discovery PRD against the released Schemami wire.
Source adapters produce candidate structured data plus evidence; deterministic
validation and Recipe Calculus decide which operations are supported. No
runtime model becomes part of the protocol.

## 4. Documentation and manual

Resume the documentation-site PRD only after the normative surface is stable.
The site explains the released schemas, vectors, refusals, and integration
boundary; it does not delay protocol correctness or become a recipe-hosting
service.

## Later, evidence-led candidates

Potential future model work includes structured readiness endpoints,
additional Calculus operations, conditional physical conversions, and richer
method branching. Each requires its own accepted semantics and vectors; none
is implied by v1.
