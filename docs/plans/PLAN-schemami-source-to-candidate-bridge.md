# PLAN: Schemami source-to-candidate bridge

**Status:** active  
**PRD:** PRD-008  
**SPEC:** SPEC-008  
**Created:** 2026-08-11

## Outcome

Deliver acquisition contract version 1, deterministic local admission/repair
tooling, adversarial fixtures, and real-source evidence without hosting an LLM,
storing recipes, or requiring the documentation website.

## Rules

- Candidate, acquisition report, and admission result stay separate.
- External adapter output is always untrusted.
- No global registry, translation companion, or provider-specific wire field.
- Preserve unrelated dirty work and approved/private source boundaries.
- Every phase produces a checkpoint. Stop when identity, public contract,
  dependency, privacy, or publication decisions need Daniel.
- No commit, push, publication, provider badge, telemetry collection, or external
  source upload without explicit authority.

## Phase 0 — Contract and vocabulary acceptance

**Classification:** operational. **Depends on:** accepted PRD/SPEC scope.

Review full positive/invalid examples for acquisition request, candidate/report
separation, deterministic admission result, repair request, source kinds, coverage
statuses, review codes, and deterministic local-ID policy. Confirm no field collides
with Schemami v1 or reinvents a standard. Record Daniel's decision before schemas.

**Completion:** `PHASE 0 COMPLETE ACQUISITION CONTRACT ACCEPTED`

**Result:** completed 2026-08-11. Daniel accepted 1C, 2C, 3C, 4B, 5B,
6B, and 7B.

## Phase 1 — Schemas, instructions, and manifest

**Classification:** testable. **Depends on:** Phase 0.

Create the versioned contract directory, strict schemas, provider-neutral
instructions, examples, hostile neighbours, deterministic manifest builder, and
hash verification. Prove no website/network dependency.

**Completion:** `PHASE 1 COMPLETE ACQUISITION CONTRACT BYTES VERIFIED`

**Result:** completed 2026-08-11. Contract directory, strict schemas,
provider-neutral instructions, examples, 18 indexed boundary fixtures, exact
manifest builder, and offline verification are recorded in the Phase 1 evidence
report.

## Phase 2 — Deterministic admission and repair harness

**Classification:** testable. **Depends on:** Phase 1 and a conformant CLI/SDK.

Add machine-readable `admit` output, exact input/canonical identity distinction,
stable problem output, complete-replacement repair requests, stale-digest refusal,
attempt budgets, and escaped local report rendering.

**Completion:** `PHASE 2 COMPLETE ACQUISITION ADMISSION AND REPAIR VERIFIED`

**Result:** completed 2026-08-11. The machine-readable deterministic `admit`
artifact, stale-sensitive complete-replacement repair cycle, attempt budgets,
and HTML-escaped local review are verified in the Phase 2 evidence ledger.

## Phase 3 — Adversarial deterministic corpus

**Classification:** testable. **Depends on:** Phase 2.

Implement at least 20 repository-safe cases spanning every source kind, hostile
instructions, ambiguous measures, local concepts, structured methods/variation,
multiple formulas/components, invalid JSON/extensions, source/report identity,
and repair outcomes.

**Completion:** `PHASE 3 COMPLETE ACQUISITION ADVERSARIAL CORPUS VERIFIED`

**Result:** completed 2026-08-11 at the deterministic contract boundary. The
20-case corpus covers all six source kinds and required adversarial pressures,
replays exact candidate/report identity and deterministic admission, and keeps
external adapter-quality claims explicitly deferred to Phase 4.

## Phase 4 — AI conversion kit documentation

**Classification:** product documentation. **Depends on:** Phase 3 and released
SDK admission APIs.

Publish two explicit entry paths:

- **direct AI:** a user supplies a photo, PDF, URL content, text, audio
  transcription, or application export to an AI chosen by that user; the AI
  returns one untrusted candidate which is checked by the playground, CLI, or an
  SDK;
- **SDK integration:** an application owns source access and its AI/OCR/parser,
  then uses Schemami admission, Calculus, Diff, and optional acquisition-report
  verification.

The quick path does not require an acquisition report or ask a model to compute
a digest. The advanced request/report/repair contract remains optional. Schemami
does not build OCR, transcription, source upload, provider adapters, model
runtimes, telemetry, or a private evaluation corpus for this release.

**Completion:** `PHASE 4 COMPLETE AI CONVERSION KIT DOCUMENTED`

**Decision:** Daniel approved this reduced release scope on 2026-08-13. The
previous local capture/evaluation lanes are removed from the release plan.

## Phase 5 — Contract and documentation release

**Classification:** release decision. **Depends on:** Phase 4.

Build immutable contract bytes from a clean checkout, include the AI guide,
versioned `/ai/v1` workflow and non-validating recipe-card template, and optional
integrator contract in the documentation publication. Verify their manifests,
links, trust labels, released schemas, and SDK APIs. Make no provider-support
claim. Fragment viewer links, remote MCP UI, hosted inference, and recipe storage
remain deferred.

**Completion:** `PHASE 5 COMPLETE AI CONVERSION KIT RELEASED`
