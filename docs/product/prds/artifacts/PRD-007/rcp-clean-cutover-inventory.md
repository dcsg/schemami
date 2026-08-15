---
title: "PRD-007 RCP clean-cutover inventory"
date: 2026-08-10
status: accepted
scope: "Active runtime/normative RCP surfaces; historical records excluded"
---

# PRD-007 RCP clean-cutover inventory

This inventory implements ADR-006 and `FR-CUTOVER-001`. It records the scope
to replace before the first public Schemami release. It is not a migration
interface and does not establish a legacy support promise.

## Decision evidence

On 2026-08-10 the remote tag query returned no tags. The current Model 1
versioning contract says `rcp.invalid` may change safely while nothing is
published. The owner confirmed there is no RCP user in scope. Therefore RCP is
pre-publication repository state, not an external compatibility contract.

## Measured active surface

The pre-cutover mechanical search found 288 repository files containing a
legacy RCP name or identifier outside reports/prototypes. Classifications
overlap and are used for work planning, not a public support matrix.

| Surface | Observed count | Required clean-cutover action |
|---|---:|---|
| Schema and registry identity | 14 files | Replace active `$id`, `$ref`, root marker, and protocol-owned extensions with Schemami v1 equivalents. |
| Recipes, package manifests, and fixtures | 58 files | Replace with Schemami fixtures that directly prove v1 behavior. RCP fixtures may survive only as negative unsupported-input fixtures or historical evidence. |
| Go and TypeScript behavior | 41 files | Replace parser dispatch, validation, pack handling, facts, viewer, and generated schema input with Schemami-only behavior. |
| Scripts and CI callers | 118 files | Replace active RCP name/filename checks with Schemami cutover checks and a deliberate negative RCP-marker test. |
| Package/developer identities | 3 declarations | Rename Go module/package/CLI/viewer/docsite identities as part of the Schemami public release, without a compatibility shim. |

## Cutover rules

1. New schemas use the accepted `schemami: "1"` root marker and
   `https://schemami.dev/schema/schemami/1/...` identifiers.
2. New runtime readers reject `rcp` input with a stable
   `unsupported-legacy` diagnostic before semantic parsing.
3. No active writer, generated bundle, package manifest, file-discovery path,
   CLI, schema graph, vector, or test claims RCP acceptance after cutover.
4. Existing RCP wording in dated research, release notes, ADR-006, and negative
   input vectors is historical evidence, not a violation.
5. Generated viewer/schema artifacts are regenerated from Schemami sources;
   they are never edited by a text replacement.

## Required release evidence

- A positive Schemami document/package/vector suite proves validation, viewer,
  Calculus, registry-local terms, and unit conversion.
- One negative RCP-marker vector proves explicit refusal and no parser fallback.
- A scoped inventory gate rejects RCP identity within active runtime/normative
  paths while allowing named historical exclusions.
- A clean-clone gate runs the complete Schemami suite without any Pão checkout
  or adapter input.

## Deliberate non-deliverables

- No RCP-to-Schemami migration CLI, API, reader, writer alias, or deprecation
  window.
- No RCP semantic-parity claim.
- No Pão de Portugal code change, target branch, adapter test, screenshot, or
  compatibility report as a Schemami release requirement.
