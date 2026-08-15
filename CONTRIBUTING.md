# Contributing to Schemami

Schemami is a deterministic protocol. Changes to the wire model, Recipe
Calculus, diagnostics, canonical identity, or conformance behavior require an
accepted decision and specification before implementation.

## Before opening a change

1. Read `docs/project-context.md` and the relevant ADR/specification.
2. Keep application mappings, translations, provider logic, storage, and UI
   policy outside the protocol.
3. Add or update shared conformance vectors for normative behavior.
4. Run `make bootstrap` once and `make ci` before submitting.
5. Run `swift test` when Swift-owned files or shared resources change.

Use English for documentation and identifiers. Recipe content may use its
authored source language. Do not include private, copyrighted, credentialed, or
user-owned recipe material in fixtures or reports.

Bug reports should include exact public reproduction bytes and stable problem
types where applicable. Security issues follow `SECURITY.md`, not public issue
tracking.
