# RCP versioning and compatibility

**Normative** (part of the protocol surface, DECISIONS #21). Binding from
the `rcp-v0.1` tag forward. Sources: DECISIONS #14 (decode-compatibility
contract), #22 (freeze), research 02 §475–560 (SchemaVer synthesis).

## The `$id` scheme

Every schema publishes at a versioned URL, one path segment per protocol
MODEL:

```
https://paodeportugal.pt/schema/rcp/{MODEL}/core.schema.json
https://paodeportugal.pt/schema/rcp/{MODEL}/profiles/{kind}.schema.json
https://paodeportugal.pt/schema/rcp/{MODEL}/registry/{kind}.schema.json
```

Current MODEL: **1**.

## The `rcp` field

Every root document carries `rcp: <MODEL>` (const per MODEL; omitted on
nested components). A reader that does not know a document's MODEL MUST
refuse to interpret it — never guess.

## Change rules (SchemaVer-flavoured)

There are no bug fixes for a schema — only these change classes:

- **ADDITION** — new optional fields, new enum values, new registry
  entries, new profiles. Allowed freely within a MODEL. A new required
  field is permitted ONLY with a default (DECISIONS #14).
- **MODEL bump** — any change under which previously-valid documents stop
  validating (rename, removal, type change, requirement without default).
  Renames never happen in place: add + deprecate.
- Registry entries are append-only: never deleted, never repurposed;
  deprecated entries stay resolvable forever (registry governance).
- Profiles may add and tighten but never remove or redefine a core field
  (SSP-002): a core-only consumer always renders any valid document.

### Extension scope (pinned by the edge-regression suite)

The `x-` vendor-extension bucket exists at the **document root only** in
MODEL 1 — `x-*` inside nested objects (ingredients, steps…) does not
validate. Widening to per-node extensions would be an ADDITION and may
happen later; narrowing never will. Typo'd fields are rejected everywhere
(virtuous intolerance): the writer side stays strict so the reader side's
tolerance means something.

## Decode-compatibility contract (binding, DECISIONS #14)

"Data outlives code." Every reader implementation MUST:

1. Tolerate unknown fields and preserve them on round-trip (including
   `x-*` extension fields).
2. Decode every enum with a catch-all case — an unknown enum value is
   never a crash.
3. Assume no new required fields without defaults will ever appear within
   a MODEL (writers are bound above).

Bidirectional fixtures (old reader/new document, new reader/old document)
become CI-enforced in v1 (FEAT-CORE-003).

## The freeze

The annotated tag **`rcp-v0.1`** marks the first frozen protocol state:
hardened core, registry formats + seed, bread + pastry hardened profiles,
five draft profiles, declarative bounds. From that tag forward, every
schema change is classified under the rules above and the six example
documents remain the regression suite (`make validate` green is a merge
requirement).
