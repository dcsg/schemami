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

[edikt:start]: # managed by edikt — do not edit this block manually
## edikt

### Project

RCP — a universal, machine-readable recipe protocol (core schema +
per-category profiles). Research complete, 22 decisions locked in
`docs/research/DECISIONS.md`, pre-implementation; v0.1 scope is decision
#22 (frozen core + registry formats/seed + bread & pastry profiles +
validation harness + fail-closed safety clamp). Protocol (normative) vs
implementation (informative) split per decision #21.

### Before Writing Code

1. Read `docs/project-context.md` for project context
2. Rules are enforced automatically via `.claude/rules/`
3. If a plan is active, read it in `docs/plans/` — check progress table for current state
4. If a spec exists, read it in `docs/product/specs/` — the spec and its artifacts are the engineering blueprint
5. All paths are configurable in `.edikt/config.yaml` under `paths:`

### Build & Test Commands

```
# Build
# none yet — no implementation code; the validation harness is a v0.1 deliverable

# Test
# none yet — examples re-validate via ajv once the harness lands (decision #22)

# Lint
# none yet — semantic linter (Layer 2) is a v0.1 deliverable (decision #8)
```

### edikt Commands

Match the user's intent, not their exact words. These are representative examples — if the meaning is the same, run the command.

| Intent | Examples | Run |
|--------|----------|-----|
| Project status / what's next | "what's our status", "where are we", "what's next", "project status", "next steps" | `/edikt:status` |
| Load project context | "load context", "remind yourself", "what's this project", "give me context" | `/edikt:context` |
| Create an execution plan | "create a plan", "make a plan", "let's plan this", "plan for X", "plan this ticket", "help me plan", "how should we approach X", "continue the plan", "re-plan phase 3", "plan these changes", "plan this work" | `/edikt:sdlc:plan` |
| Capture an architecture decision | "save this decision", "record this", "capture that", "write an ADR", "document this decision" | `/edikt:adr:new` |
| Add a hard constraint | "add an invariant", "that's a hard rule", "never do X", "this must always be true" | `/edikt:invariant:new` |
| Write a PRD | "write a PRD", "document this feature", "requirements for X", "product requirements" | `/edikt:sdlc:prd` |
| Write a technical spec | "write a spec", "technical spec for X", "spec this out", "design doc for X" | `/edikt:sdlc:spec` |
| Review a PRD | "review my PRD", "check the PRD", "score this PRD", "is the PRD any good" | `/edikt:sdlc:prd-review` |
| Review a spec | "review the spec", "check spec coverage", "does the spec cover the PRD", "score this spec" | `/edikt:sdlc:spec-review` |
| Generate spec artifacts | "generate artifacts", "create the data model", "generate the contracts", "build the artifacts" | `/edikt:sdlc:artifacts` |
| Check implementation drift | "check drift", "did we build what we decided", "verify the implementation", "are we on track with the spec" | `/edikt:sdlc:drift` |
| Compile governance | "compile governance", "update directives", "update the rules" | `/edikt:gov:compile` |
| Review governance quality | "review governance", "are our ADRs well written", "check governance quality" | `/edikt:gov:review` |
| Score governance quality | "score governance", "governance health", "directive quality", "how good are our directives" | `/edikt:gov:score` |
| Review implementation | "review what we built", "post-implementation review", "review this code" | `/edikt:sdlc:code-review` |
| Security audit | "run a security audit", "check for vulnerabilities", "security check" | `/edikt:sdlc:audit` |
| Check documentation gaps | "check for doc gaps", "what docs are outdated", "audit documentation" | `/edikt:docs:review` |
| Validate setup | "check my setup", "is everything configured right", "health check", "run doctor" | `/edikt:doctor` |
| Initialize project or onboard | "set up edikt", "initialize this project", "onboard this repo", "validate my environment", "onboard me", "team setup" | `/edikt:init` |
| View or change config | "show config", "change config", "disable quality gates", "set database type", "what can I configure" | `/edikt:config` |
| Import existing docs | "import existing docs", "onboard these docs", "intake our documentation" | `/edikt:docs:intake` |
| Update rule packs | "check for rule updates", "are my rules outdated", "update rules" | `/edikt:gov:rules-update` |
| Sync linter rules | "sync rules from linter", "import linter config", "sync eslint rules" | `/edikt:gov:sync` |
| Capture mid-session decisions | "capture this", "save this decision", "what did we decide", "mid-session sweep" | `/edikt:capture` |
| Create a guideline | "add a guideline", "create a team guideline", "document this convention" | `/edikt:guideline:new` |
| Review guideline quality | "review our guidelines", "check guideline language" | `/edikt:guideline:review` |
| Generate ADR sentinels | "compile this adr", "generate sentinels for ADR-NNN" | `/edikt:adr:compile` |
| Review ADR language | "review this adr", "check ADR-NNN quality" | `/edikt:adr:review` |
| Generate invariant sentinels | "compile this invariant", "generate sentinels for INV-NNN" | `/edikt:invariant:compile` |
| Review invariant language | "review this invariant", "check INV-NNN quality" | `/edikt:invariant:review` |
| End-of-session sweep | "wrap up this session", "end of session", "session summary" | `/edikt:session` |
| Upgrade edikt | "upgrade edikt", "update edikt", "check for edikt updates" | `/edikt:upgrade` |
| Migrate to sidecars (v0.6.0) | "migrate sidecars", "upgrade my sidecars", "convert legacy ADRs", "run the v0.6.0 migration" | `bin/edikt migrate sidecars --dry-run` then `--apply` |
| Verify a plan phase | "verify phase N", "run the verify runner", "check phase N criteria", "did phase N actually pass" | `bin/edikt verify <plan-id> --phase N` |
| List or manage agents | "what agents do we have", "list agents", "add the security agent" | `/edikt:agents` |
| Set up integrations | "setup Linear", "connect Jira", "add MCP server" | `/edikt:mcp` |
| Brainstorm / explore ideas | "let's brainstorm", "brainstorm this", "explore options for X", "I have an idea", "let's think through X" | `/edikt:brainstorm` |

### Output Conventions

| Symbol | Meaning |
|--------|---------|
| ✅ | Action completed successfully |
| 🔴 | Critical finding — must fix before shipping |
| 🟡 | Warning — should fix, not blocking |
| 🟢 | Healthy / no issues |
| ⚠ | Needs attention |
| 🔀 | Routing to specialist agent |

### After Compaction

If context was compacted, the PostCompact hook will re-inject the active plan phase and invariants automatically. If you need full context, run `/edikt:context`.

### Commit Convention

No conventional-commit prefixes. Small, frequent commits with imperative
subjects; the message body explains **why**. Never amend pushed commits.
No Co-Authored-By lines, no generated-with footers.
[edikt:end]: #
