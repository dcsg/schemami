# PRD-008: Schemami source-to-candidate bridge

**Status:** accepted  
**Rigor:** platform  
**Author:** Daniel Gomes  
**Created:** 2026-08-11  
**Sidecar:** [PRD-008-schemami-source-to-candidate-bridge.yaml](./PRD-008-schemami-source-to-candidate-bridge.yaml)

---

## Problem

People have recipes in web pages, books, PDFs, photographs, messages, voice
descriptions, and existing applications. Schemami v1 is deliberately a
deterministic recipe intermediate representation, not a blank form and not an
AI service. Integrators still need a repeatable way to ask an external parser,
OCR system, or language model to produce a candidate that can be checked
without confusing model confidence with protocol validity.

The previous AI conversion proposal predates Schemami v1. It assumed a central
registry, governed global IDs, category profiles, and a documentation-site
launch. Those are no longer the protocol boundary. Recipe-local identities,
source-language content, structured evidence, semantic admission, explicit
refusal, and Recipe Calculus now define the trustworthy boundary.

## Product boundary

```text
source material
      |
      v
external acquisition adapter (AI/OCR/parser/manual)
      |
      +--> acquisition report (non-normative)
      v
untrusted Schemami candidate
      |
      v
deterministic admission + Recipe Calculus
      |
      +--> admitted candidate
      +--> pointer-specific problems
```

Schemami does not host inference, recipes, prompts, user accounts, or source
files. A model may propose structured values, but it cannot declare a document
valid, canonical, publishable, or computationally supported.

The release exposes two entry paths:

1. a direct AI conversion guide for a person who supplies source material and
   receives one candidate document; and
2. SDK integration for applications that need retained input, deterministic
   admission, Calculus, Diff, repair, or the optional acquisition report.

Schemami does not own capture infrastructure. OCR, transcription, scraping,
provider selection, source upload, and model execution belong to the user or
integrating application.

## Users

- `schemami.integrator.recipe-platform` — needs a provider-neutral acquisition
  contract and deterministic repair loop.
- `schemami.import-reviewer` — needs source evidence, omissions, uncertainty,
  and unresolved facts presented honestly.
- `schemami.implementer` — needs fixtures proving that candidate admission does
  not depend on a central vocabulary or runtime model.

## Goals

| Goal | Target | Counter-metric |
|---|---|---|
| Source-faithful candidate | The adapter preserves authored facts, order, language, evidence, and explicit uncertainty | No invented culinary facts or silent omissions |
| Provider neutrality | One versioned acquisition contract can be used by AI, OCR, parsers, or manual tooling | No provider-specific field enters Schemami v1 |
| Honest trust boundary | Only deterministic admission and Calculus establish support | No model confidence or acquisition report overrides a problem |
| Useful partial capture | Readable content survives when some facts cannot be structured | Missing facts disable only dependent operations |
| Local vocabulary | Adapters create valid recipe-local IDs and source-language names | No global registry or Schemami minting request blocks capture |
| Accessible conversion | A person can use the published guide with an AI and validate the returned candidate; an integrator can perform the same boundary through an SDK | No hosted Schemami capture or inference service |

## Non-goals

- A hosted Schemami inference or recipe-storage service.
- A Schemami-owned OCR, transcription, scraper, source-upload, or model-runtime
  pipeline.
- A consumer blank schema-entry form.
- A normative prompt, model, OCR engine, scraper, or provider API.
- A central ingredient, technique, or equipment registry.
- Automatic substitution, density inference, biological fermentation
  prediction, or parsing prose during protocol operations.
- Translation storage or translation companions.
- Making the documentation website, telemetry collection, or provider support
  badges a prerequisite for the bridge contract.
- Importing copyrighted or private source material into the repository without
  explicit permission.

## Requirements

| ID | Component | Requirement |
|---|---|---|
| FR-AI-001 | acquisition contract | Publish a small, immutable, provider-neutral instruction and output contract that tells an adapter how to produce one complete or partial untrusted Schemami v1 recipe candidate without claiming admission. Components and bundles are linked only after deterministic child admission supplies exact canonical digests. |
| FR-AI-002 | source fidelity | Preserve source language, authored ordering, source references, available selectors/raw evidence, and explicit omissions. Acquisition metadata must never be an input to Recipe Calculus. |
| FR-AI-003 | local identity | Create deterministic recipe-local IDs within Schemami's accepted grammar. Unknown ingredients, techniques, equipment, and other local concepts remain named local entities; the adapter must not invent global equivalence. |
| FR-AI-004 | uncertainty | Represent structured facts only when supported by the source. Unsupported, ambiguous, or missing facts must be omitted rather than guessed; when the optional acquisition report is used, it records them for review. |
| FR-AI-005 | output boundary | Direct use returns one candidate. When an integrator elects to produce a non-normative acquisition report, return it separately with source coverage, unresolved items, assumptions proposed for review, and adapter identity/release provenance. The report is never canonical recipe content. |
| FR-AI-006 | deterministic repair | Validate candidates through the Schemami SDK/CLI and produce stable problem identities and RFC 6901 pointers suitable for a provider-neutral repair cycle. A repaired candidate is re-admitted from the beginning. |
| FR-AI-007 | hostile-source safety | Treat source content as untrusted data. Source instructions cannot change the acquisition contract, suppress evidence, execute code, fetch undeclared resources, or override validation. |
| FR-AI-008 | release access | Publish a direct AI quickstart and SDK integration path. The direct path returns a candidate that is subsequently admitted by deterministic tooling; it does not require a hosted service, acquisition report, or model-generated digest. |
| FR-AI-009 | optional integrator evidence | Keep the acquisition request/report and repair contract available for integrators that need source coverage and replayable review evidence. It is optional for direct use and never changes recipe identity or admission. Provider evaluations, telemetry, and support badges are separate later work. |

## Acceptance criteria

- **AC-AI-001-1** — Given the same contract version and source fixture, when an
  adapter emits a candidate, then the output identifies the contract version
  and contains no assertion that substitutes for Schemami admission.
- **AC-AI-002-1** — Given source text with ordered sections, quantities,
  alternatives, conditions, completion cues, and method facts, when captured,
  then every represented fact is traceable to the source and authored order is
  preserved.
- **AC-AI-003-1** — Given a valid unfamiliar ingredient or technique, when the
  adapter cannot map it to an application catalog, then it emits a recipe-local
  ID and source-language name rather than failing or inventing a global ID.
- **AC-AI-004-1** — Given an ambiguous quantity or missing relationship, when
  conversion completes, then the candidate remains readable where possible,
  the optional report records it when present, and every dependent operation
  refuses rather than consuming a guessed value.
- **AC-AI-005-1** — Given candidate JSON and an optional acquisition report,
  when canonical identity is calculated, then report presence or changes do not
  change recipe bytes, revision, digest, or Calculus results.
- **AC-AI-006-1** — Given a schema or semantic problem, when a repair cycle is
  requested, then the adapter receives stable problem identities and RFC 6901
  pointers and the new candidate is fully re-admitted.
- **AC-AI-007-1** — Given source text that asks the adapter to ignore its
  contract, fabricate IDs, hide omissions, or execute content, when processed,
  then the hostile instruction is retained only as source data or rejected and
  never changes validation behavior.
- **AC-AI-008-1** — Given source material and the published direct-AI guide,
  when a user asks an AI for a Schemami candidate, then the documented next step
  is deterministic admission through the playground, CLI, or an SDK and no
  model statement is treated as validity.
- **AC-AI-009-1** — Given an integrator that needs auditable source coverage,
  when it adopts the optional acquisition contract, then candidate, report, and
  deterministic admission remain separate and exact candidate-byte identity is
  verifiable without Schemami hosting the source or model.

## Protections

- **SP-001 — deterministic authority:** acquisition output is always untrusted
  until deterministic Schemami admission succeeds.
- **SP-002 — no prose execution:** source prose, evidence, confidence, and the
  acquisition report never become calculation inputs.
- **SP-003 — no registry gate:** capture never depends on Schemami governing or
  cleaning a global catalog.
- **SP-004 — data minimisation:** evaluation fixtures must be approved and
  repository-safe; telemetry, if later enabled, contains no recipe or source
  content.
- **SP-005 — no silent invention:** an adapter must prefer a visible omission or
  unresolved report item over an unsupported structured fact.

## Rollout

1. Freeze the provider-neutral acquisition contract and report schema.
2. Build deterministic fixtures and a local validation/repair harness.
3. Publish a direct-AI quickstart that produces one untrusted candidate and
   immediately routes it to deterministic admission.
4. Publish Go, TypeScript, and Swift integration examples for admission, repair,
   Calculus, and Diff.
5. Include the guide, optional acquisition contract, schemas, examples, and
   validator/playground links in the release documentation.
6. Evaluate providers or add telemetry/support claims only through separately
   accepted evidence work.

## Dependencies

- A committed Schemami v1 candidate and shared conformance corpus.
- Deterministic admission exposed by at least one supported SDK or CLI.

Track A does not depend on Track B's adjustment workflow or three-language SDK
completion. It may use whichever conformant SDK is available to validate its
candidate output.

## Risks

| Risk | Mitigation |
|---|---|
| Plausible but invented recipe facts | Evidence coverage, hostile cases, reviewer report, and zero-authority model output |
| Partial capture is mistaken for computability | Operation-specific deterministic refusals |
| Provider behavior changes | Versioned contract, dated evaluations, attachment/local fallback |
| Private source leakage | Local validation, approved fixtures, content-free metrics |
| Bridge becomes a hidden application model | Keep reports, mappings, UI, and provider behavior outside canonical Schemami |

## Open decisions

The core bridge has no open protocol-model decision. Daniel approved the
protocol + SDK + AI conversion-kit + documentation release boundary on
2026-08-13 and explicitly removed a Schemami-owned capture/evaluation program
from the release. Provider evaluations, hosted inference, telemetry, and support
badges require separate evidence and cannot block the conversion kit.
