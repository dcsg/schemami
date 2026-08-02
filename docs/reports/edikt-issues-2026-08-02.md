# edikt issues found during the RCP v0.1 run (2026-08-02)

Field report from a full SDLC pass (init → PRD → SPEC → artifacts → plan →
10-phase autonomous build) on edikt 0.6.0 (payload id 0.6.0-rc4). Each item
was hit in practice, not speculated. Local workarounds are noted; the fixes
belong upstream (diktahq/edikt).

## 1. sidecar-extractor: silent failure on turn exhaustion 🔴

**Symptom:** dispatching the locked `sidecar-extractor` agent returns
"completed but no output" and writes nothing; 4 tool uses consumed. Hit
3 times; each needed a resume-nudge (SendMessage) or a prompt spelling out
the turn budget.
**Cause:** `maxTurns: 3` while the agent's own instructions tell it to read
the parent .md, the starter template, *and optionally the schema* — the
reads exhaust the budget before the Write. Relative resource paths
(`templates/gov-sidecar.yaml.tmpl`) also don't resolve from a project cwd,
costing a wasted turn.
**Fix upstream:** in the agent template, make the turn budget explicit in
the prompt ("3 turns: read input → read template → Write; never read the
schema"), resolve resource paths absolutely, and/or raise maxTurns to 4.
**Local workaround applied:** the note is baked into this project's
`.claude/agents/sidecar-extractor.md`.

## 2. plan criteria sidecar: skill docs ≠ Go binary schema 🔴

**Symptom:** `edikt verify` exits 2 rejecting the sidecar the plan skill's
own documentation says to write. The skill documents per-criterion
`status/fail_count/fail_reason/block_reason/last_evaluated`, phase-level
`phase/title/status/attempt`, top-level `generated/last_evaluated`; the
0.6.0 `verify.CriteriaFile` accepts none of those. The real schema (found
by probing): top-level `schema_version: 1`, `plan`, `phases[]` with
`id` + `classification` (`testable|operational|informational`) +
`criteria[]` of `id`/`statement`/`verify`(/`timeout`).
**Fix upstream:** reconcile the plan skill's Step 10b + Sidecar-Only Flow
docs with the binary schema, or ship the schema file in the payload
(`templates/schemas/plan-criteria...`) so authors validate before writing.

## 3. `ship` parser won't match component-coded FR ids 🟡

**Symptom (predicted, verified by reading the skill):** the PRD lifecycle
`ship` flow extracts `FR-\d+` tokens — `FR-PR-001`-style ids (this
project's traceability scheme, and the PRD/spec sidecar schemas we widened
locally to `FR-[A-Z]+-\d{3,}`) will never match, so
`/edikt:sdlc:prd PRD-001 ship FR-PR-001` parses as "no FRs named".
**Fix upstream:** make the ID pattern configurable (`.edikt/config.yaml`,
e.g. `ids.fr_pattern`) and use it in the sidecar schemas, ship parsing,
and drift checks. This is the "configurable ID scheme" feature the RCP
project effectively prototyped.

## 4. installed agents not usable as subagent types mid-session 🟡

**Symptom:** agents installed by `/edikt:init` into `.claude/agents/`
(architect, qa, pm…) are not dispatchable via the Agent tool in the same
session (`Agent type 'architect' not found`) — the type registry is fixed
at session start. Artifact/plan flows that route to specialists silently
lose their personas unless the operator falls back to general-purpose
agents reading the persona files.
**Fix upstream:** document the restart requirement loudly in init's
summary, and make the artifact/plan skills' routing instructions include
the general-purpose + persona-file fallback explicitly.

## 5. settings.json template: dead `Write(**)` allow rule 🟢

**Symptom:** every headless `claude -p` run prints "Permission allow rule:
Write(**) is not matched by file permission checks — only Edit(path) rules
are." **Fix upstream:** drop `Write(**)` from
`templates/settings.json.tmpl` (Edit(**) already covers file-editing
tools). **Local workaround applied:** removed from this project's
settings.json.

## 6. version identity mismatch: payload vs lock 🟢

**Symptom:** `~/.edikt/current/VERSION` reads `0.6.0-rc4` while
`lock.yaml` says `active: "0.6.0"`; init's pin then triggers the
upgrade-pin warning on first use. **Fix upstream:** stamp the final
release version into the payload VERSION at promotion time.

---
*Positive field note worth keeping: the verify-gate + criteria-sidecar
discipline caught two genuinely sloppy verify commands (AC-2.3, AC-10.5)
that in-session evaluation had already "passed" — the two-layer design
works exactly as intended.*
