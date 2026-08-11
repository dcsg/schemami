# Schemami versioning and compatibility

This document is normative for Schemami wire v1.

## Wire model

Every recipe and bundle carries the string marker:

```yaml
schemami: "1"
```

A reader that does not implement that model must refuse it. Readers do not
guess, migrate, or fall back to another model.

The v1 schemas have immutable identifiers beneath:

```text
https://schemami.dev/schema/schemami/1/core.schema.json
https://schemami.dev/schema/schemami/1/bundle.schema.json
```

Those URLs must resolve to the released bytes before a stable tag is created.

## Release version and wire model are different

The release uses semantic versioning for repository artifacts. Compatible
implementation fixes can therefore produce `1.0.1` while documents still say
`schemami: "1"`.

A new wire model is required when an admitted v1 document would stop being
valid or acquire different normative meaning. Examples include removing or
renaming a field, changing a field type, changing exact arithmetic, or adding
a required field. Such a change must use a new schema path and root marker; it
must never rewrite the v1 schema in place.

Adding an optional field or owner extension does not automatically require a
new model, but it is permitted only when older readers can preserve or ignore
it without changing v1 behavior. A future protocol operation is added only
after Recipe Calculus defines its exact behavior and conformance vectors.

## Document identity and revisions

Within an explicit collection, `(collection, id, revision)` identifies one
document body. `revision` is a positive integer.

Once a revision is published in a bundle, its canonical bytes are immutable. A
composition or method change creates a new revision. A bundle embeds and pins the document
with an RFC 8785 JCS SHA-256 digest; a mismatch is an error and is never
repaired automatically.

Source-language prose corrections may be handled by an integrator according
to its publication policy, but changing published bytes still requires a new
revision because it changes the pinned digest. Presentation translations do
not belong to the Schemami document and do not affect its revision or hash.

## Extensions

Protocol-owned extensions use `x-schemami-*`. Integrator-owned extensions use
the lower-case `x-<owner>-<name>` grammar admitted by the schema. They
round-trip as data but have no core calculation semantics unless a later
Schemami model explicitly standardizes them.

## Pre-publication predecessor

The repository contains historical material from the pre-publication RCP
design. It is not a compatibility contract. Schemami v1 readers neither accept
nor migrate that wire; the active cutover ledger identifies the retained
historical and negative-test surfaces.
