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
