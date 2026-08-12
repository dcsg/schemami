# Schemami

Schemami is a deterministic, machine-readable recipe protocol and compilation
target. It represents source-language recipes, exact quantities, local recipe
concepts, source evidence, dependencies, and portable pack identity without
requiring a global registry, recipe host, translation service, or runtime AI.

Schemami v1 is currently a **verified release candidate**, not a published
stable release. The implementation phases are complete through the end-to-end
runtime; clean-clone and immutable-URL publication proof remain before a tag.

## Quick start

Prerequisite: `mise 2026.3.17`.

```sh
make bootstrap
make ci
```

Validate a recipe or pack:

```sh
tools/with-toolchain.sh go -C tools/schemami run . validate ../../examples/pao-massa-mae.schemami.yaml
tools/with-toolchain.sh go -C tools/schemami run . validate-pack ../../examples/paodeportugal.schemami-pack.yaml
tools/with-toolchain.sh go -C tools/schemami run . verify-pack ../../examples/paodeportugal.schemami-pack.yaml ../../examples
```

Build the local single-file viewer:

```sh
make viewer
```

Then open `tools/viewer/dist/index.html` in a browser. The viewer validates and
renders local documents in their source language and computes with the same
normative conformance corpus as the Go implementation.

## Active v1 surface

| Path | Purpose |
|---|---|
| `schema/schemami-v1-core.schema.json` | Core JSON Schema 2020-12 contract |
| `schema/schemami-v1-pack.schema.json` | Offline pack manifest contract |
| `schema/VERSIONING.md` | Wire and document versioning rules |
| `conformance/schemami-v1/` | Shared exact-operation and refusal vectors |
| `tools/schemami/` | Go validator, canonicalizer, pack verifier, and Calculus |
| `tools/viewer/src/schemami/` | TypeScript validator, renderer, and Calculus consumer |
| `examples/*.schemami.*` | Active recipe and pack examples |
| `docs/product/prds/PRD-007-*` | Accepted product requirements for v1 |
| `docs/product/specs/SPEC-007-*` | Normative v1 implementation specification |

Earlier protocol experiments and release records remain in the repository as
historical evidence. They are not imported by the Schemami v1 runtime; the
classification is recorded in the PRD-007 cutover ledger.

## Product boundary

- One document has one required BCP 47 `content_language` and source-language
  prose. Presentation translations belong to integrators.
- Ingredients, techniques, and equipment use recipe-local IDs and names.
  Integrators may map them to their own catalogs; validation never requires a
  Schemami registry.
- Ratios store ordered parts such as `1:2:2`; percentages store percentage
  points such as `75`; absolute quantities use tagged measured/range/open
  shapes.
- Measured units use the pinned UCUM 2.2 subset for deterministic conversion.
  Ambiguous regional units and mass/volume conversion refuse explicitly.
- AI/OCR/scrapers may produce candidate documents, but they are external
  ingestion adapters. Protocol logic never parses prose or evidence as facts.

See [current status](docs/STATUS.md), [roadmap](docs/product/ROADMAP.md), and
[Schemami v1 plan](docs/plans/PLAN-schemami-v1-stable-release.md).

## License

Schemami is licensed under the [Apache License 2.0](LICENSE).
