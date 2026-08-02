# Registry entries

One YAML file per governed entry; **filename = entry id** (SAC-REG-001).
Kind-prefixed ids per DECISIONS #23. Append-only: deprecate, never delete.
Additions via PR stating which recipe demanded the entry
([governance](../../docs/guidelines/registry-governance.md)).

## Vocabulary decision (closes SPEC-001's NEEDS CLARIFICATION, 2026-08-02)

Endpoint tests (`float`, `nappe`, …) and temperature stages (`thread`, …)
are **documented vocabularies** in `registry/vocab/*.yaml` — machine-read
data lists the L2 linter validates against — NOT per-entry registry files.
Rationale: DECISIONS #23 sanctioned exactly three kind prefixes
(ingredient./primitive./equipment.); minting a fourth for a 10-word
vocabulary would extend that decision implicitly, and recipe fields
(`test:`, `stage:`) keep their bare slugs, avoiding a second migration.
Growth path: if these vocabularies grow past trivial size or need
per-entry metadata, they graduate to full registry kinds via a new
DECISIONS entry.
