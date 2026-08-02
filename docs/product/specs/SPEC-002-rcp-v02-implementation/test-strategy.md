---
type: artifact
artifact_type: test-strategy
spec: SPEC-002
status: draft
created_at: 2026-08-02T23:06:15Z
reviewed_by: qa
---

# Test Strategy — RCP v0.2 implementation

Two systems under test: the protocol's executable surface (schemas,
registry, rcplint — as in v0.1) and, new in v0.2, the viewer's engine seam.
The standing principle carries over: the frozen corpus is the regression
suite, every new rule gets a dedicated fixture failing for exactly one
reason (enumerated in [fixtures.yaml](./fixtures.yaml)), and everything
runs through `make validate` + `go test` — plus, new, `bun test` for the
conformance vectors. Private-collection documents are never copied into
testdata or vectors; CI-safe synthetic equivalents stand in for them.

## Unit Tests (tools/rcplint, Go)

| Component | What to test | Priority |
|---|---|---|
| Field additions (CMP-PR-003) | times windows accepted, unknown time key rejected; difficulty 1..5 in, 0/6 out; storage `where` closed enum; provenance work/page accepted | high |
| Dish profile (CMP-PROF-004) | synthetic dish doc passes core ∧ dish; bound violation is WARN not error and carries the authored n=2 rationale | high |
| Technique references (CMP-VAL-003) | unknown `technique.` ref rejected naming the entry; all seed entries pass entry-schema validation | high |
| Grounding audit (CMP-VAL-003) | neither-cross_refs-nor-no-match fails, named; no-match + note passes | high |
| English-base slug shape (CMP-VAL-003) | accented/non-ASCII taxonomy slug rejected; existing English slugs untouched | medium |
| Ledger grouping (CMP-REG-005) | cebola + onion raws group under one proposed canonical class | medium |

## Unit Tests (tools/viewer, bun test)

| Component | What to test | Priority |
|---|---|---|
| Conformance vectors (CMP-TOOL-001) | JS engine verdict set equals rcplint's for every vector — positives and negatives; rcplint exports vectors, bun replays (SAC-TOOL-002) | high |
| Engine interface contract (DS-TOOL-001) | `analyze()` result shape; `capabilities` object; parse failure → `canonical: null` + errors; contract pinned for the future WASM engine | high |
| JS engine internals | YAML edge cases the repo already met (duplicate keys, flow-map commas); verdict layer-tagging | medium |

## Integration

| Scenario | Components | Priority |
|---|---|---|
| `make validate` green on fresh clone at every commit (SAC-PR-001) | schemas + registry (incl. technique kind) + rcplint + cue | high |
| `bun test` green in CI beside the Go suite (SAC-TOOL-002) | vectors export → viewer conformance replay | high |
| `make accept` extended: i18n coverage step + prose-parking grep + grounding audit | scripts + registry + i18n vocabulary | medium |
| Vocab retirement (SAC-REG-002) | technique entries exist, `registry/vocab/techniques.yaml` absent | medium |
| Toolchain guard (SAC-TOOL-001) | bun.lock present, ≤2 exact-pinned deps, no Node/bundler config, bun pinned in `.mise.toml` | medium |

## Manual (recorded at acceptance, not automated in v0.2)

- Paste/drop each of the 11 documents into the viewer → verdicts + render
  appear (AC-TOOL-001-1); evidence recorded in the plan's verify notes.
- Devtools network inspection while processing a private document → zero
  requests carry document content (AC-TOOL-001-2).
- Daniel's prose-parking review of the re-encoded private recipes
  (AC-PR-003-2) — the grep heuristic assists, the human call decides.

## Hard to test, and why

- **DOM rendering** — no browser harness in v0.2 (deliberate: the harness
  would outweigh the page). The engine seam keeps everything testable
  headless except the final DOM layer, which the manual paste-test covers.
- **Dish bounds correctness** — n=2 evidence means the bounds themselves
  can't be validated against a population; warn-only severity is the
  mitigation, and the third real savoury ingest is the actual test.
- **Grounding accuracy** — cross_refs point at external ontologies; the
  audit can verify presence, not semantic correctness of the match. Steward
  review at mint time is the control.
