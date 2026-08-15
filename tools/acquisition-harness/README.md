# Schemami acquisition contract harness

This directory verifies the provider-neutral source-to-candidate contract. It
does not call an AI provider, fetch recipe sources, store recipes, or grant
admission authority to an adapter.

```sh
bash tools/acquisition-harness/build-manifest.sh
bash tools/acquisition-harness/check-contract.sh
bash tools/acquisition-harness/check-manifest.sh
```

The builder hashes exact contract file bytes and writes a lexicographically
ordered manifest. The checks run entirely from repository and pinned toolchain
bytes; no documentation website or network service is required.

Run deterministic admission and render a local, HTML-escaped review:

```sh
bash tools/acquisition-harness/run.sh \
  acquisition/source-to-candidate/1/examples/candidate.schemami.json \
  acquisition/source-to-candidate/1/examples/acquisition-report.json \
  /tmp/schemami-acquisition-result
```

The result directory receives `admission-result.json` and `review.html`. A
refused candidate also receives a complete-replacement `repair-request.json`.
The attempt defaults to 1 and the repair budget defaults to 3; optional fourth
and fifth arguments override them. The harness never calls an adapter or AI.

Replay the repository-safe adversarial corpus across all six declared source
kinds, hostile and ambiguous inputs, structured variation/composition,
malformed output, exact source/report identity, and repair outcomes:

```sh
bash tools/acquisition-harness/check-adversarial.sh
```

The source excerpts are inert test data. The check never fetches, executes, or
sends them to a provider.

Verify the separate direct-AI distribution kit, its exact dependency digests,
minimal-interview contract, and safe presentation boundary:

```sh
bash tools/acquisition-harness/check-ai-kit.sh
```

This check covers the informative `/ai/v1` workflow and recipe-card template.
It does not call a model or treat rendered output as deterministic admission.

Verify a complete advanced request/candidate/report exchange and the report's
exact candidate-byte digest:

```sh
tools/with-toolchain.sh go -C tools/schemami run ./cmd/acquisition-harness \
  verify-acquisition-artifacts \
  ../../acquisition/source-to-candidate/1 \
  /path/to/acquisition-request.json \
  /path/to/candidate.schemami.json \
  /path/to/acquisition-report.json
```

After an external adapter returns complete replacement candidate/report files,
verify that the repair, report, and admission all identify the exact expected
bytes:

```sh
tools/with-toolchain.sh go -C tools/schemami run ./cmd/acquisition-harness \
  verify-replacement \
  ../../acquisition/source-to-candidate/1 \
  /tmp/schemami-acquisition-result/repair-request.json \
  /path/to/previous-candidate.schemami.json \
  /path/to/replacement-candidate.schemami.json \
  /path/to/replacement-acquisition-report.json \
  /path/to/replacement-admission-result.json
```

## Release boundary

This harness is the optional advanced integrator path. It verifies request,
candidate, report, repair, and admission identities, but it does not implement
capture or inference.

People using an AI directly do not need to create an acquisition report or ask
the model to calculate SHA-256. They follow `/ai` or
`docs/guides/ai-conversion.md`, save the returned candidate, and pass it to
deterministic admission. Applications
that need source-coverage evidence may add the complete acquisition contract and
use this harness to verify the returned artifacts.

OCR, transcription, scraping, source upload, provider selection, model runtime,
storage, and application mappings remain owned by the user or integrator.
