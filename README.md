# Schemami — Recipe Protocol

Every recipe app models one domain well and the rest badly: fixed ingredient
fields fit bread but not an entremet, a bare duration lies in every kitchen
but the author's, and baker's percentage, brine salinity and brew ratio are
the same idea implemented three incompatible ways. **Schemami** is the answer built
from that research: **one machine-readable recipe protocol** — a small core
plus per-category profiles — able to encode bread, pastry, fermentation,
preserves, drinks, coffee and savoury cooking, renderable by a single
frontend that can rescale, substitute, and guide execution.

The public brand is Schemami. Existing `rcp` schema IDs, paths and technical
names remain until a dedicated compatibility migration is approved; the brand
decision does not authorize a blind namespace replacement.

## Status

Research complete (2026-08-02): six research tracks, an executable core
schema with validated examples, five deep-dives, five expert reviews, and
15 confirmed decisions. v1 shape: **core schema + bread profile + ingestion
pipeline (book photo → LLM extraction → review-and-correct → private
recipe) + private collection.** Implementation has not started.

## Repo map

| Path | What it is |
|---|---|
| `schema/rcp-core-v1.schema.json` | Executable core schema (JSON Schema 2020-12) |
| `examples/` | Example recipes validating against the schema — the regression suite |
| `docs/research/` | The founding research: tracks, proposal, findings, decisions, conclusions, expert reviews |
| `docs/personas.md` | Canonical RCP personas |
| `docs/brand/` | Canonical Schemami strategy, identity and voice standards |
| `design-system/` | Production logo assets, fonts, tokens, CSS and Swift outputs |
| `CLAUDE.md` | Working conventions + settled design decisions |

Start with `docs/research/CONCLUSIONS.md`, then `docs/research/DECISIONS.md`.
