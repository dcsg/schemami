# Schemami source-to-candidate Phase 3 evidence

**Date:** 2026-08-11  
**Result:** passed at the deterministic contract boundary  
**Contract:** `https://schemami.dev/contracts/source-to-candidate/1`

## Delivered

The repository-safe corpus contains 20 indexed cases covering every declared
source kind: text, URL, image, document, audio, and application data. Cases
exercise hostile source instructions, ambiguous and conflicting measures,
invention pressure, recipe-local concepts, recursive structured methods,
conditional variation, multiple-formula omissions, component identity,
invalid JSON, invalid unprefixed fields, source/report byte identity, and both
no-repair and complete-replacement repair outcomes.

Each case identifies:

- an inert source excerpt and explicit pressure tags;
- complete candidate and separate acquisition-report artifacts;
- the expected deterministic admission status;
- required closed report codes; and
- the expected repair posture.

The verifier refuses duplicate cases, missing source-kind or required-pressure
coverage, repository path traversal, stale report digests, invalid reports,
unknown outcomes, absent review codes, and inconsistent admission envelopes.
Every candidate is then independently replayed through `schemami admit`.
Refused outcomes also replay the Phase 2 complete-replacement, stale-digest,
and attempt-budget checks.

## Verification

```sh
bash tools/acquisition-harness/check-adversarial.sh
```

Result:

```text
acquisition-harness: verify-corpus passed
20/20 deterministic candidate admissions matched
acquisition-harness: repair boundary passed
acquisition-harness: 20-case adversarial corpus passed
```

The Go package tests also pass:

```sh
GOCACHE=/tmp/schemami-go-phase3-cache \
  tools/with-toolchain.sh go -C tools/schemami test ./...
```

## Honest boundary

This corpus verifies the provider-neutral contract and deterministic trust
boundary. It does not claim that an AI/OCR/scraper correctly transformed the
inert source excerpts: no adapter is called in Phase 3. Adapter quality,
invention rate, reviewer time, and modality support require the explicitly
approved real-source dogfood in Phase 4.

No source was fetched, executed, uploaded, or stored. No provider support
claim, contract publication, commit, or network dependency was introduced.

`PHASE 3 COMPLETE ACQUISITION ADVERSARIAL CORPUS VERIFIED`
