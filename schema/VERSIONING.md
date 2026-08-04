# RCP versioning and compatibility

**Normative** (part of the protocol surface, DECISIONS #21). Binding from
the `rcp-v0.1` tag forward. Sources: DECISIONS #14 (decode-compatibility
contract), #22 (freeze), research 02 §475–560 (SchemaVer synthesis).

## The `$id` scheme

Every schema publishes at a versioned URL, one path segment per protocol
MODEL:

```
https://rcp.invalid/schema/rcp/{MODEL}/core.schema.json
https://rcp.invalid/schema/rcp/{MODEL}/profiles/{kind}.schema.json
https://rcp.invalid/schema/rcp/{MODEL}/registry/{kind}.schema.json
```

Current MODEL: **1**.

### The host is provisional

`rcp.invalid` is a placeholder, not the published host. `.invalid` is
reserved by RFC 2606 and is guaranteed never to resolve, so these URLs
cannot be mistaken for live ones or accidentally fetched.

The protocol has not been named yet, and the host follows the name. Until
it is chosen, the `$id` host is deliberately non-resolving rather than
pointing at a domain that belongs to a *consumer* of the protocol — a
schema whose identity is borrowed from one of its consumers is not
independent of that consumer. The earlier host was Fornada's domain; that
was a defect, corrected before publication.

Changing the host is safe **only while nothing is published**. No document
carries a schema URL (documents carry `rcp: <MODEL>`), every `$ref` is
local, and the frozen decode-compatibility surface does not reference it —
so no previously-valid document stops validating, and this is not a MODEL
bump. Once these URLs resolve and a reader pins or caches them, that stops
being true: the host then becomes part of the published contract and may
only change by the ADDITION/deprecation path like anything else.

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

## Document revisions (binding, v0.4)

Everything above versions the SCHEMA. This section versions a
DOCUMENT — a distinction the file carried implicitly until v0.4 made
pins load-bearing. `rcp:` is the protocol MODEL; `version:` is the
revision of the document you are reading.

**When `version` MUST increment.** Any change to a PUBLISHED document's
ingredients, steps, constraints, yields or lineage. Prose-only edits
(a clearer note, a fixed typo, a translation added) MAY leave it
unchanged — a revision marks a change to what the recipe *is*, not to
how it reads. A document that has never been published (`provenance.status`
of `draft` or `unverified`) may change freely without incrementing:
revisions exist for consumers, and a draft has none.

**A published revision is immutable.** The triple
`(collection, id, version)` names exactly one document body, forever. A
correction is a NEW revision, never an edit in place. This is what makes
a pin meaningful: `ref: ganache-chocolate, version: 1` is a promise that
the bytes behind it cannot change under the reference.

**Supersession is signalled by the successor alone.** There is no
`superseded_by` pointer in MODEL 1. Revision N+1 of an id supersedes
revision N by existing; a consumer holding both renders the higher one
unless pinned to the lower. This is a deliberate minimalism, recorded
so its absence is a choice rather than an oversight — a separate
pointer would need its own consistency rules, and the ordering already
carries the fact. Revisit if a real case needs to say "N is withdrawn"
rather than "N+1 exists".

**A pin that no longer matches is reported, not repaired.** When a
target moves past a pinned revision, validation reports staleness
naming both revisions; when a pin names a revision the target does not
declare, that is an error. Nothing propagates automatically — variants
are self-contained snapshots and drift is detected rather than
compiled away (DECISIONS #29).

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
schema change is classified under the rules above and the six documents
of the `rcp-examples` collection remain the regression suite (`make validate` green is a merge
requirement).
