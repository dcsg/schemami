# Registry entries

One YAML file per governed entry; **filename = entry id** (SAC-REG-001).
Kind-prefixed ids per DECISIONS #23. Append-only: deprecate, never delete.
Additions via PR stating which recipe demanded the entry
([governance](../../docs/guidelines/registry-governance.md)).

## Vocabulary decision (2026-08-02; techniques graduated same day)

Endpoint tests (`float`, `nappe`, …) and temperature stages (`thread`, …)
remain **documented vocabularies** in `registry/vocab/*.yaml` — machine-read
data lists the L2 linter validates against — NOT per-entry registry files.
Recipe fields (`test:`, `stage:`) keep their bare slugs.

**Techniques took the growth path**: DECISIONS #25 (PRD-002 FR-REG-003)
sanctioned `technique.` as the fourth kind prefix, and the interim
techniques vocabulary graduated to full per-entry files under
`entries/technique/` (schema: `registry/schemas/technique.schema.json`;
seed batch approved by Daniel 2026-08-02). `execution_modes[].technique`
references full entry ids and the L2 linter validates them against
entries. The remaining two vocabularies keep the same growth path: past
trivial size or per-entry metadata, they graduate via a new DECISIONS
entry.

## Extraction contract (SR-REG-005, v0.2)

Extraction NEVER mints. For every ingredient it cannot resolve to an
existing entry it emits, in the document itself:

- `item: null` — unresolved, honestly;
- `raw:` — the source text exactly as extracted, preserved for audit;
- `proposed_class:` — the proposed **canonical English** class slug
  (e.g. `vegetable.onion` for raw "cebola"). English-base per DECISIONS
  #24 so cross-language raws consolidate: the gap ledger
  (`tools/rcplint/scripts/gap-ledger.py`) groups by this proposal, and
  the steward reviews ONE mint-or-alias candidate per class, not one per
  language.

Grounding is part of minting: a new ingredient entry carries `cross_refs`
(FooDON preferred; FDC/OFF accepted; `match: broader` when the external
class is wider than ours) or an explicit `grounding: no-match` +
`grounding_note` — the audit (`rcplint lint`) fails any entry with
neither. Refs are static data; validation never touches the network.
