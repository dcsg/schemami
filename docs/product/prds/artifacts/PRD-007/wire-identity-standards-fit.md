---
title: "PRD-007 wire identity standards-fit assessment"
date: 2026-08-10
status: accepted-evidence
scope: "In-document identity for Schemami wire v1; not schema dialect, linked-data, or transport registration"
---

# PRD-007 wire identity standards-fit assessment

This assessment fulfils the standards-first review for `FR-NAME-001`. It does
not select a host, register a media type, or change Model 1. It determines
whether an established mechanism can safely replace an explicit Schemami
document marker.

## Decision question

How does an offline JSON or YAML recipe instance unambiguously declare the
Schemami wire model that defines its fields and semantics?

The mechanism must work in a file, an embedded document, and a package
without network access. It must be distinguishable from a document revision,
schema dialect, content language, and transport metadata.

## Candidates

| Candidate | Standard fit | Why it does not meet this contract | Result |
|---|---|---|---|
| JSON Schema `$schema` | JSON Schema uses it to identify the *dialect of a schema resource* and requires it at that schema's root. | A recipe is an instance, not a schema. Reusing it would say that the recipe itself is a JSON Schema and would mislead standard tooling. | Reject. |
| JSON-LD `@context` | JSON-LD is a W3C linked-data serialization and gives JSON terms graph/IRI semantics. | It would make Schemami a JSON-LD profile, requiring a separately specified context-processing and IRI/graph contract. It is much more than a format tag, and is outside the current deterministic, offline wire scope. | Reject for v1; reconsider only through a separate linked-data ADR. |
| Registered media type | IANA media types identify representations during transfer. | A media type is transport metadata; it cannot identify a YAML file at rest, an embedded object, or a document copied without headers. It can complement, but cannot replace, the in-document marker. | Optional later complement; not the marker. |
| File extension | Common packaging convention. | Extensions are absent in embedded content, unstable on copy, and not available once parsed. | Optional packaging signal; not the marker. |
| Explicit root marker | No external standard defines a recipe-protocol instance marker. | A protocol-specific property is necessary once the standard mechanisms above are correctly kept in their own layers. Its syntax and version remain our contract, with a canonical schema URL supplied externally by the schema/package metadata. | Recommended. |

## Industry fit and recommended narrow design

Established specifications support the principle, rather than providing a
recipe-format property to reuse:

- OpenAPI requires a product-named root `openapi` string that tells tooling
  which OpenAPI version interprets the document; it explicitly distinguishes
  this from an API document's own `info.version`.
- CycloneDX uses an explicit format/specification identity and separately
  recognizes media types and file patterns. The latter complement rather than
  replace the document contract.
- OpenAPI's `x-` patterned extension fields demonstrate a widely understood,
  forward-compatible extension convention.

For Schemami, the marker selects a **wire model**, not an editorial release of
the specification. Updating a patch-level specification clarification must not
change recipe canonical content or identity. Consequently a full SemVer value
in every recipe would create needless document churn. A quoted major-model
string is the smallest correct adaptation:

Adopt one required root property in every new canonical Schemami recipe
document:

```yaml
schemami: "1"
```

It means exactly: “this instance conforms to Schemami wire model 1.” It is not
the document's editable revision, a JSON Schema dialect, a language/locale,
or a URL. A reader selects the Schemami wire-model parser using that value
before evaluating the document body.

The Schemami release itself may use SemVer (for example `1.0.0`) in release
manifests, schema publication, and tooling. Recipe `version` remains the
revision of that recipe. Those three axes are deliberately separate.

The corresponding custom extension namespace is `x-schemami-*`. It is a
protocol convention, not an asserted external standard; the final schema must
define ownership and compatibility rules for every extension. A media type or
file extension may later be registered as additional distribution metadata,
but must not become a requirement for offline reading.

## Consequences and required proof

- New writers and canonical Schemami v1 fixtures emit only `schemami: "1"`.
  RCP input is rejected as an unsupported legacy marker under ADR-006.
- Repository-owned RCP surfaces are replaced as a clean cutover; Schemami v1
  exposes no migration behavior or compatibility fallback.
- A marker collision vector proves that `schemami`, document `id`, document
  revision, and content language cannot be read as each other.
- Schema URLs remain a separate release decision. Once a protocol-controlled
  host is approved, each canonical schema URL must be immutable and versioned.

## Primary sources

- [OpenAPI Specification 3.2.0](https://spec.openapis.org/oas/v3.2.0.html): the required root `openapi` field identifies the specification version and is distinct from the document's own version; it also defines `x-`-prefixed extensions.
- [CycloneDX specification overview](https://cyclonedx.org/specification/overview/): a mature exchange format distinguishes its specification, registered media types, and recognized file patterns.
- [JSON Schema — Dialect and vocabulary declaration](https://json-schema.org/understanding-json-schema/reference/schema): `$schema` declares the dialect for a JSON Schema, rather than the type of an instance document.
- [W3C JSON-LD 1.1](https://www.w3.org/TR/json-ld11/): JSON-LD is a JSON-based serialization for linked data and specifies context, IRI, and graph semantics.
- [IANA Media Types registry](https://www.iana.org/assignments/media-types/media-types.xhtml): media types are a registry for representation/transfer identification.

## Accepted decision

The owner accepted `schemami: "1"` and `x-schemami-*` on 2026-08-10.
`x-schemami-*` is reserved for protocol-defined extensions; integrator-owned
extensions use `x-<owner>-*` and are preserved without gaining protocol
semantics. The decision on any media-type registration is deliberately
separate. The owner also accepted `schemami.dev` as the canonical schema-ID
host; it remains subject to the publication proof below.

## Proposed host readiness (observed 2026-08-10)

Read-only DNS queries show authoritative `schemami.dev` zone records at
Cloudflare, but no apex `A`, `AAAA`, or `CNAME` answer and no `www` alias at
the time of the check. This establishes neither domain ownership nor a usable
publication endpoint. The host is accepted as Schemami's canonical identifier
base, but is not a live schema endpoint until publication proof is complete;
before the stable tag, the release gate must prove:

1. the owner confirms authority to retain the domain;
2. every canonical schema URL resolves over HTTPS to the immutable released
   bytes (or a documented immutable redirect); and
3. the canonical URLs are served independently of the documentation UI.

Until then, no implementation may claim the host is live merely because it
appears in a draft schema identifier.
