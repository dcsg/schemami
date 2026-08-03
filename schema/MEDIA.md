# RCP media conventions (normative)

How media attaches to RCP documents and what implementations must and
must not do with it. The data model is core `$defs/media` — unchanged
since v0.1: `{role, type, uri, licence}` required, `role ∈ technique |
result | ingredient | equipment | failure`, `type ∈ photo | video |
audio | diagram`. Steps carry step-level media; documents carry
document-level media (about the dish as a whole). The `failure` role is
first-class: kahm yeast vs mould is a photo, not a sentence.

## Asset location

- `uri` is a **relative reference resolved against the document's own
  location**. A document at `collection/madeleines.rcp.yaml` referring
  to `media/madeleines-step-3.jpg` names a sibling `media/` directory.
- Absolute `http(s)` URIs are allowed for published documents whose
  media is hosted; renderers operating offline treat an unreachable
  URI exactly like an absent asset (labelled-absent, never a broken
  element).
- Private-collection assets live in `private/collection/media/`,
  next to the private documents that reference them. That directory is
  local-only by definition (see the prohibition below).
- Matching a *supplied* asset (file input, drag-drop) to a reference is
  by **URI basename** — `media/x.jpg` matches a dropped `x.jpg`.
  Renderers must discriminate documents from assets by **content
  (magic bytes), never by filename extension**.

## Licence

- `licence` is **required on every media entry** — the schema enforces
  it. This project deliberately runs two tiers: written heritage may be
  CC BY 4.0 while media stays all-rights-reserved. A media model
  without a licence field quietly erases that boundary, so absence is
  a validation error, not a default.
- `credit` names the creator when the licence demands attribution.
- The licence string travels with the entry through every transform
  (scaling, translation, snapshot) — implementations must not strip it.

## Prohibition: source-book media

- Media derived from **source books or other copyrighted publications**
  (page photographs, scans, crops of printed step photos) **may exist
  only in a local, git-ignored private collection** (e.g.
  `private/collection/media/`) for the owner's personal use alongside
  their own private documents.
- Such media **never enters commits, dist bundles, artifacts,
  conformance vectors, or any published or shared surface. No
  exceptions.** The written word can be re-expressed under the
  ingestion rules; photography cannot — republishing it is plain
  copyright infringement, and a "just this crop" culture erodes the
  private-vs-published boundary the protocol treats as first-class.
- Personal media — photos the owner took of **their own cooking** — is
  the only class eligible to cross beyond the local boundary, under a
  licence the owner chooses.
- Repositories holding RCP content should enforce this mechanically:
  an attestation that fails on any binary media file outside an
  explicit allowlist, and on base64-embedded raster payloads smuggled
  into text files or built bundles.

## Never serialized

- Renderer-side asset handles — object URLs, `data:` URLs built from
  user-supplied files, blob references — are **presentation state.
  They must never be written into any persisted output**: not into
  canonical JSON, not into exported documents, not into snapshots,
  session documents, or conformance vectors.
- A document leaves a renderer byte-identical in its `media` entries
  to how it arrived: `uri` keeps naming the authored location even
  while a local object URL is standing in for it on screen.
- This rule is testable: serialize the canonical document after assets
  are attached and assert no `blob:` or `data:` scheme appears in any
  `uri`.
