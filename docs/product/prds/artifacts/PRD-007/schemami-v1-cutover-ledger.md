---
title: "Schemami v1 active/historical cutover ledger"
date: 2026-08-11
status: implemented
scope: "Repository classification for PRD-007 FR-CUTOVER-001"
---

# Schemami v1 active/historical cutover ledger

This ledger classifies retained predecessor material without turning it into a
runtime compatibility promise. Git history preserves earlier work; the release
candidate does not mechanically relabel it as Schemami evidence.

## Active normative and runtime surface

The release gate treats these paths as current Schemami v1:

- `schema/schemami-v1-core.schema.json`
- `schema/schemami-v1-bundle.schema.json`
- `schema/VERSIONING.md`
- `conformance/schemami-v1/**`
- `tools/schemami/**`, excluding the named negative-test occurrences below
- `tools/viewer/src/schemami/**`, `tools/viewer/build.ts`, package/lock/style,
  and generated `tools/viewer/dist/index.html`
- `examples/*.schemami.yaml` and `examples/*.schemami-bundle.json`
- `Makefile`, `.mise.toml`, `mise.lock`, active bootstrap/toolchain scripts,
  the active CI DAG, and `.github/workflows/validate.yml`
- `README.md`, `docs/STATUS.md`, `docs/project-context.md`,
  `docs/product/FEATURES.md`, `docs/product/features.yaml`, and
  `docs/product/ROADMAP.md`
- PRD-007, SPEC-007, PLAN-schemami-v1-stable-release, ADR-004 through ADR-012,
  and their accepted artifacts/sidecars

Active runtime code imports no predecessor schema, registry, profile, example,
tool, or Calculus implementation. Packs resolve only explicit local Schemami
documents.

## Deliberate negative compatibility evidence

These are the only active places that recognize predecessor identity, and they
exist exclusively to refuse it:

| Path | Allowed occurrence | Reason |
|---|---|---|
| `tools/schemami/main_test.go` | predecessor filename suffix | proves the CLI rejects that suffix |
| `tools/viewer/src/schemami/engine.ts` | predecessor root-marker lookup and human diagnostic | returns `unsupported-legacy` before Schemami semantics |
| `tools/viewer/conformance/schemami-viewer.test.ts` | predecessor input fixture/assertion | proves no browser fallback |
| `tools/schemami/check-schema-identity.sh` | forbidden-token search pattern | inverted identity gate |
| `tools/schemami/check-viewer-boundary.sh` | forbidden import/name search pattern | inverted viewer-boundary gate |
| `tools/schemami/check-candidate-scope.sh` | forbidden historical-path search pattern | prevents historical implementation from entering the candidate scope |
| `tools/viewer/dist/index.html` | generated copy of the engine refusal | byte-generated negative behavior, not a reader |

No writer, canonicalizer, bundle verifier, Calculus operation, or positive fixture
emits predecessor identity.

## Retained historical implementation

These paths document or implement the pre-publication predecessor. They are
excluded from the Schemami v1 build and release manifest:

- predecessor schemas under `schema/` other than the active Schemami files;
- `registry/**`, `i18n/**`, and root `calculus/**`;
- `tools/rcplint/**`;
- legacy viewer sources directly under `tools/viewer/src/` (the active sources
  are under `tools/viewer/src/schemami/`);
- `tools/docsite/**` and the documentation-site prototype;
- recipe/example/test fixtures whose filenames use predecessor suffixes;
- old CI stabilization/failure-injection overlays not referenced by the active
  `make ci` DAG;
- PRD-001 through PRD-006, SPEC-001 through SPEC-006, predecessor release
  plans, historical ADRs, research, reports, handoffs, and dated evidence.

Their continued presence preserves auditability and user-owned work. It does
not make them supported, installed, validated, bundled, or published by v1.

## Classification rule

A future change fails the cutover gate if it introduces predecessor identity or
imports into an active positive surface, or if it adds an unclassified active
exception. New history may name the predecessor descriptively, but new runtime
recognition is permitted only as an explicit refusal test reviewed in this
table.
