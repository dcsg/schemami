# RCP — Recipe Protocol

RCP is a universal, machine-readable recipe protocol: one core schema +
per-category profiles able to encode bread, pastry, fermentation, preserves,
drinks, coffee and savoury cooking. A single renderer can rescale quantities,
substitute ingredients, and guide execution from it.

**Status:** research complete, v1 shape decided, pre-implementation. The next
concrete steps are in `docs/research/CONCLUSIONS.md` §7 (spec + ADRs, the
ingestion dogfood, renderer + Recipe Calculus prototype).

## Provenance

This project was born as a research spike inside the Calculador PAo repo
(`~/Projects/MyStuff/Calculador PAo`, branch `research/recipe-protocol`).
That repo remains the consumer context (Fornada app, /calculador,
/receituario); this repo is the protocol itself. Research commit history
lives on that branch.

## Layout

- `schema/rcp-core-v1.schema.json` — the executable core schema
  (JSON Schema 2020-12). The current source of truth for the protocol shape.
- `examples/*.rcp.yaml` — six validated example recipes in two files (Pão
  Alentejano; a cocktail, sauerkraut, pastéis de nata, and a ganache + the
  brownie that references it). Every schema change must keep these
  validating (ajv, 2020-12 dialect) — they are the regression suite.
- `docs/research/` — the founding research bundle: 6 research tracks
  (`01`–`06`), the strawman proposal (`00-PROPOSAL-rcp-v1.md`), deep-dives
  (`07`), `FINDINGS.md`, `DECISIONS.md`, `CONCLUSIONS.md`, and five bok
  expert reviews in `reviews/`. Treat as historical record — append, don't
  rewrite.
- `docs/personas.md` — canonical RCP personas (RCP-scoped; the Fornada app
  has its own, separate personas).

Read `docs/research/CONCLUSIONS.md` first, then `DECISIONS.md` for the
15 confirmed decisions and what's still open.

## Non-negotiable design decisions

These survived expert review and are settled — do not reopen without an
explicit decision entry in `docs/research/DECISIONS.md`:

1. Ingredients are rows with functional **roles**, never named struct fields.
2. **`basis`** generalizes baker's percentage to every domain (flour %,
   brine %, cure ppm, brew ratio, cocktail parts).
3. Steps form an **opt-in DAG** anchored on produced intermediates; linear
   recipes stay a numbered list.
4. **Enum/registry/prose discipline** — machine-read fields are closed enums
   or registry references; prose is for human eyes only.
5. **Safety-critical quantities are bounded data**, enforced fail-closed
   client-side; scaling and substitution may not violate them.
6. One small **core + per-category profiles**, not N protocols.
7. Documents are the system of record; edges projected to Postgres — no
   graph DB. Execution state lives in separate session documents.
8. JSON canonical, YAML authoring; JSON Schema + semantic linter validate
   BE/CI-side only.

Deliberate non-goals: no runtime LLM, no automatic substitution
(authored/curated only), no numeric encoding of sensory judgment, no
Turing-complete formulas in data, no publishing of imported book content
(private-vs-published is a first-class boundary).

## Engineering obligations (before real implementation code)

1. **Recipe Calculus** — scaling, basis resolution, guard-path selection,
   constraint enforcement as pure functions, specified once with cross-stack
   conformance test vectors shipped with the protocol.
2. **Decode-compatibility contract** for offline snapshots, CI-tested:
   unknown-field tolerance, enum catch-alls, no new required fields without
   defaults.
3. **Verified publish-time reference resolution** (resolver_version +
   content hashes).

## Working conventions

- Commit small and often; the message says **why**, not just what. Never
  amend pushed commits.
- Flour types are always explicit in names (T65, T80, T130, …).
- Every schema or example change: re-validate examples against the schema
  and say so in the commit/summary.
- Language: docs and identifiers in English; recipe content may be
  Portuguese (pt-PT) — keep Portuguese culinary terms exact (massa velha ≠
  isco; they are distinct ferments).
