# Schemami project context

## Purpose

Schemami is a deterministic recipe intermediate representation. Source-first
adapters may ingest typed text, web pages, photographs, documents, voice, or
application data into candidate Schemami, but those adapters are not normative
and the protocol has no runtime AI dependency.

The protocol distinguishes captured evidence from structured facts. A recipe
may remain readable when facts are missing; only operations requiring those
facts refuse. Human prose, evidence, confidence, and translations are never
calculation inputs.

## Current architecture

- JSON Schema 2020-12 defines recipes and offline bundles.
- JSON is canonical; YAML is a parse-equivalent authoring/import form.
- RFC 8785 JCS plus SHA-256 pins published document bytes.
- BCP 47 identifies the one source content language.
- RFC 6901 pointers target source evidence and diagnostics.
- UCUM 2.2 identifiers drive the supported deterministic unit conversions.
- Go is the reference CLI/Calculus implementation; TypeScript replays the
  shared corpus and powers the local viewer.

Recipe-local IDs identify ingredients, techniques, equipment, and steps within
one document. Integrators may map those IDs into their own contexts. Schemami
does not require or govern a global vocabulary registry.

## Normative v1 surface

- `schema/schemami-v1-core.schema.json`
- `schema/schemami-v1-bundle.schema.json`
- `schema/VERSIONING.md`
- `conformance/schemami-v1/`
- `docs/product/specs/SPEC-007-schemami-v1-stable-release/`
- accepted ADR-004 through ADR-012 where referenced by SPEC-007

The CLI, viewer, examples, Make/CI scripts, and product reports are reference
implementations or evidence. Earlier schemas, registries, profiles, examples,
tools, and dated product records are retained historical material, not part of
the active Schemami v1 contract.

## Product boundary

Schemami does not host recipes, users, translations, catalogs, AI inference,
editorial workflow, execution sessions, or application presentation. It owns
portable structured recipe data, deterministic operation semantics, explicit
refusal, and conformance.

Schemami v1.0.0 is the stable protocol boundary. The next sequence is consumer
adoption through app-owned adapters, followed by evidence-led protocol work
that does not retroactively change v1 semantics.
