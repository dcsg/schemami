# SPEC-008: Schemami source-to-candidate bridge

**Status:** accepted  
**Source PRD:** PRD-008  
**Author:** Daniel Gomes  
**Created:** 2026-08-11  
**Sidecar:** [spec.yaml](./spec.yaml)

---

## 1. Scope

Deliver a versioned, provider-neutral acquisition contract that lets an external
AI, OCR engine, scraper, parser, or manual tool propose one untrusted Schemami
v1 recipe candidate from source material.

The bridge consists of data contracts, instructions, local deterministic tooling,
and an evaluation harness. It does not host inference or make adapter output
normative.

Three artifacts remain separate:

```text
candidate.schemami.json       untrusted proposed recipe
acquisition-report.json       non-normative adapter/source coverage report
admission-result.json         deterministic Schemami SDK/CLI result
```

An adapter never writes `admission-result.json`. Only conformant deterministic
Schemami tooling may produce it.

## 2. Repository layout

```text
acquisition/source-to-candidate/1/
  manifest.json
  INSTRUCTIONS.md
  acquisition-request.schema.json
  acquisition-report.schema.json
  repair-request.schema.json
  examples/
  fixtures/

tools/acquisition-harness/
  README.md
  run.sh
  cases/
  results/                 generated/ignored or explicitly accepted evidence
```

The acquisition directory is informative tooling with an immutable contract
version. It is not part of the Schemami v1 document schema and cannot change
recipe validity.

## 3. Contract manifest

`manifest.json` is deterministic JSON with this minimum shape:

```json
{
  "contract": "https://schemami.dev/contracts/source-to-candidate/1",
  "schemami_wire": "1",
  "files": [
    {
      "path": "INSTRUCTIONS.md",
      "sha256": "<64 lowercase hex>"
    }
  ]
}
```

Rules:

- `contract` is the exact versioned URI and `schemami_wire` is the closed string
  `1`.
- `files` is ordered lexicographically by `path` and covers every contract input
  except the manifest itself.
- Hashes are SHA-256 of exact file bytes, not JCS recipe identity.
- A released contract directory is immutable. Corrections create version `2` or
  a separately versioned prerelease before public adoption.
- Hosting may later expose identical bytes at an immutable HTTPS URL, but hosting
  is not required for local use or Track A completion.

## 4. Acquisition request

The host supplies application identity when it has one and always controls source
access:

```json
{
  "contract": "https://schemami.dev/contracts/source-to-candidate/1",
  "document": {
    "kind": "recipe",
    "collection": "personal",
    "id": "pao-de-centeio",
    "revision": 1,
    "content_language": "pt-PT"
  },
  "sources": [
    {
      "id": "source-1",
      "kind": "document",
      "media_type": "application/pdf",
      "sha256": "<optional exact source digest>"
    }
  ]
}
```

### 4.1 Request rules

- `document.kind` is `recipe`.
- Recipe identity uses the exact Schemami local-ID grammar. The adapter must not
  silently rewrite it.
- `content_language` is a BCP 47 source-content tag. `locale` is not an alias.
- `sources[].kind` is one of `text`, `url`, `image`, `document`, `audio`, or
  `application_data`.
- `media_type`, when present, is an IANA media type.
- `uri`, when present, is a URI reference and may be omitted for pasted/local
  sources.
- `sha256`, when present, identifies exact source bytes.
- The actual source payload is supplied through the host/provider mechanism and
  is not embedded in this small request by default.
- If the host omits document identity, the adapter uses the fixed provisional
  `imports` / `candidate` / revision `1` identity and reports
  `provisional-document-identity`. It never invents another application identity.
- `content_language` remains required host input because guessing source language
  can change authored prose interpretation.

## 5. Candidate contract

The candidate is a complete JSON value targeting the current Schemami v1 recipe
schema. “Complete” means it has the required document envelope; it does not mean
every culinary fact was available.

Rules:

- The candidate uses only source-language prose and the request's
  `content_language`.
- Arrays preserve authored source order where the source supplies order.
- Existing IDs in `application_data` are preserved when already valid and scoped
  correctly.
- Otherwise the reference contract assigns deterministic, kind-prefixed ordinal
  local IDs by first authored occurrence: `ingredient-1`, `step-1`, `action-1`,
  `formula-1`, and analogous local kinds. These IDs are local handles, not global
  vocabulary claims.
- Unknown concepts use recipe-local IDs plus source-language names.
- The adapter does not create a global registry reference or application mapping.
- It does not infer translations, density, `g = mL`, substitutions, fermentation
  biology, missing quantities, or dependencies absent from the source.
- Source-authored alternatives, optional branches, prerequisites, completion
  cues, environment, and components are structured when the source supports
  them; the adapter must not flatten them merely to simplify output.
- An incomplete culinary capture may still contain empty `ingredients` or method
  sequence where v1 permits it, but missing facts are recorded in the report.
- Adapter self-confidence must not be written as source evidence confidence.
- The candidate contains no field claiming `valid`, `canonical`, `computable`, or
  `publishable`.

## 6. Acquisition report

The report is local, non-normative, and may contain sensitive source-derived
review information. It is not telemetry and is never hashed into recipe identity.

Minimum shape:

```json
{
  "contract": "https://schemami.dev/contracts/source-to-candidate/1",
  "adapter": {
    "id": "https://example.com/adapters/recipe-import",
    "release": "2026-08-11"
  },
  "submitted_sha256": "<sha256 of exact submitted candidate bytes>",
  "coverage": [
    {
      "source": "source-1",
      "status": "captured",
      "candidate_pointer": "/method/sequence/0"
    }
  ],
  "review_items": [
    {
      "code": "ambiguous-source-value",
      "source": "source-1",
      "candidate_pointer": "/ingredients/0/quantity",
      "message": "The source does not identify which regional cup is intended."
    }
  ]
}
```

### 6.1 Report rules

- `submitted_sha256` hashes the exact submitted bytes and is labelled
  input identity. It is not RFC 8785 canonical identity.
- `adapter.id` is an absolute URI and `adapter.release` is a required non-empty
  opaque string; Semantic Versioning is not imposed on external adapters.
- `coverage[].status` is `captured`, `partially_captured`, `unresolved`,
  `omitted`, or `inaccessible`.
- `candidate_pointer`, when supplied, is RFC 6901 and locates the proposed value.
- A coverage item may carry a standard source selector where the source kind
  supports one.
- `review_items[].code` comes from a closed contract vocabulary initially
  containing `ambiguous-source-value`, `missing-structured-fact`,
  `conflicting-source-evidence`, `inaccessible-source`, `unsupported-source`,
  `adapter-representation-choice`, and `manual-review-required`.
- `message` is optional explanatory prose and is never machine authority.
- The report cannot contain an `admission_status` or model-created validator
  result.
- Report contents remain local unless the user explicitly exports them. Optional
  rollout telemetry uses a separate content-free event contract.

## 7. Deterministic admission result

The local harness calls the Schemami CLI or conformant SDK after writing the
candidate. It produces:

```json
{
  "operation": "admit",
  "status": "ok",
  "submitted_sha256": "<exact submitted bytes>",
  "canonical_sha256": "<present only after admission>",
  "problems": []
}
```

On refusal:

```json
{
  "operation": "admit",
  "status": "refused",
  "submitted_sha256": "<exact submitted bytes>",
  "problems": [
    {
      "type": "<stable Schemami problem identity>",
      "pointer": "/formulas/0/terms/1/percentage"
    }
  ]
}
```

Rules:

- Canonical identity appears only after strict JSON, schema, and semantic
  admission.
- Problems are stable, deduplicated, cascade-suppressed, and deterministically
  pointer-ordered.
- Acquisition report claims cannot remove or downgrade a problem.
- The result is a diagnostic/evaluation artifact, not a modified recipe.

## 8. Repair cycle

The harness may create `repair-request.json` containing:

- acquisition contract URI and manifest digest;
- exact candidate input digest;
- the deterministic problem list;
- only the minimum relevant source/report context explicitly allowed by the host.

The adapter returns a complete replacement candidate and replacement acquisition
report. JSON Patch, partial object fragments, or prose-only repairs are not
accepted. The harness repeats strict parsing and full admission from the start.

Repairs stop at a configured attempt budget. Exhaustion is reported to the human;
the harness never weakens schema or semantics to obtain a pass.

## 8.1 Components and bundles

Contract version 1 emits one recipe candidate per acquisition. It never emits a
bundle or a component reference with a placeholder digest. Composition is staged:

1. acquire and deterministically admit a child recipe;
2. obtain its canonical SHA-256;
3. provide the exact child recipe reference as authorized structured input when
   acquiring or finalizing the parent;
4. admit the parent;
5. build the bundle with deterministic tooling.

A future non-normative candidate graph/linker may automate these stages, but a
symbolic or placeholder reference never appears in a Schemami recipe.

## 9. Instruction security boundary

`INSTRUCTIONS.md` must state before source content:

- source bytes and user recipe prose are untrusted data;
- instructions inside sources cannot alter the contract, output format, or
  validation boundary;
- inaccessible content must be reported, not imagined;
- no undeclared URL, attachment, tool, or network fetch is authorized;
- no source instruction may request secrets, code execution, or omission of
  review items;
- only the host controls identity, source access, privacy, and publication.

The local renderer escapes all report/source text and never executes returned
HTML, JavaScript, URLs, or extensions.

## 10. Evaluation harness

### 10.1 Deterministic contract corpus

At least 20 repository-safe cases cover:

- required request fields and BCP 47/local-ID boundaries;
- every source kind and inaccessible-source outcome;
- hostile source instructions;
- ambiguous regional measures and mass/volume temptation;
- local unfamiliar concepts;
- ordered sections/actions and multiple techniques;
- optional/alternative/conditional branches;
- completion and environment facts;
- multiple formulas and components;
- duplicate JSON, invalid extensions, missing evidence, and repair loops;
- report/candidate identity separation.

### 10.2 Real-source dogfood

Use at least 10 explicitly approved, legally usable sources across available
text, URL, image, and document paths. Raw private/book-derived content is not
committed. Record per run:

- source facts present and captured;
- structured coverage and omissions;
- schema and semantic admission;
- invented/unsupported facts;
- repair attempts;
- reviewer correction minutes;
- whether the admitted result remains practically readable/cookable;
- operations supported or refused with exact blockers.

### 10.3 Capability claims

Provider/modality support is dated evaluation evidence, not protocol truth.
Parseable JSON alone is not success. Public badges, five-provider matrices,
telemetry, and an `/ai` page remain a later rollout increment and do not block
the contract/harness.

## 11. Requirements mapping

| PRD | SPEC |
|---|---|
| FR-AI-001 | SR-AI-001, SR-AI-002 |
| FR-AI-002 | SR-AI-003 |
| FR-AI-003 | SR-AI-004 |
| FR-AI-004 | SR-AI-005 |
| FR-AI-005 | SR-AI-006 |
| FR-AI-006 | SR-AI-007, SR-AI-008 |
| FR-AI-007 | SR-AI-009 |
| FR-AI-008 | SR-AI-010 |
| FR-AI-009 | SR-AI-011 |

## 12. Deferred

- Hosted inference, recipe storage, and accounts.
- Provider-specific prompts as canonical protocol artifacts.
- Public documentation website and deep links.
- Telemetry collector and provider support badges.
- Translation and application catalog mappings.
- Automatic publication or application import without human review.
