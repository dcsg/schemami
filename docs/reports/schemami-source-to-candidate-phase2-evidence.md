# Schemami source-to-candidate Phase 2 evidence

**Date:** 2026-08-11  
**Result:** passed  
**Contract:** `https://schemami.dev/contracts/source-to-candidate/1`

## Delivered

- `schemami admit` emits deterministic JSON for both accepted and refused
  candidates;
- `submitted_sha256` always identifies exact input bytes;
- `canonical_sha256` appears only after strict parse, schema, semantic graph
  admission, and RFC 8785 canonicalization;
- refusals carry the shared stable problem URI and RFC 6901 pointer contract;
- repair requests pin exact contract-manifest and candidate-input digests;
- stale admission, stale manifest, stale candidate, unchanged replacement,
  partial/patch replacement, inconsistent report, and inconsistent replacement
  admission are refused;
- attempts use explicit positive attempt/max values and stop after the budget;
- external adapters return complete replacement candidate/report artifacts and
  full admission restarts from bytes;
- a local HTML report uses Go `html/template`, so adapter/source prose is escaped
  rather than executed.

The admission command never reads the acquisition report. A boundary check runs
admission before and after rendering that report and byte-compares the result,
proving report-only claims cannot change admission or canonical identity.

## Verification

```sh
bash tools/acquisition-harness/check-admission-boundary.sh
bash tools/acquisition-harness/check-repair.sh
bash tools/acquisition-harness/check-contract.sh
bash tools/acquisition-harness/check-manifest.sh
```

Results:

```text
acquisition-harness: admission boundary passed
acquisition-harness: repair boundary passed
acquisition-contract: check passed
schemami: valid
acquisition-contract: verify passed
```

The success fixture produced distinct exact-input and canonical identities:

```text
submitted: 516fe71e0bc37b9f0927593d23592d557cf0a1b2fb470c60b57cd1c076fa1ebe
canonical: 6a4883761f8465f40e1e1656d1a4b8001486df088173042528e70d70def6e59c
```

The refused fixture produced no canonical identity, generated a schema-valid
repair request at attempt 1/3, and rendered the literal hostile `<script>`
message as escaped `&lt;script&gt;` text.

## Boundary

This phase does not call an AI, OCR provider, scraper, network service, or source
URL. It does not store recipes or reports. Phase 3 supplies the repository-safe
adversarial acquisition corpus; Phase 4 requires Daniel-approved legal real
sources and remains the first provider/dogfood gate.

No contract publication, telemetry, commit, or provider support claim was made.

`PHASE 2 COMPLETE ACQUISITION ADMISSION AND REPAIR VERIFIED`
