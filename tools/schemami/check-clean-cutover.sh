#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root"

ledger="docs/product/prds/artifacts/PRD-007/schemami-v1-cutover-ledger.md"
test -f "$ledger"

active_positive=(
  Makefile
  .mise.toml
  mise.lock
  schema/schemami-v1-core.schema.json
  schema/schemami-v1-bundle.schema.json
  tools/bootstrap.sh
  tools/bootstrap-test.sh
  tools/with-toolchain.sh
  tools/ci/install-mise-ci.sh
  tools/ci/run-gate-dag.sh
  tools/ci/dist-fresh-check.sh
  tools/ci/gate-dag-manifest.json
  tools/schemami/main.go
  tools/schemami/canonical.go
  tools/schemami/calculus/calculus.go
  tools/schemami/go.mod
  tools/schemami/go.sum
  tools/schemami/testdata
  tools/schemami/check-release-contract-map.sh
  tools/schemami/build-release-manifest.sh
  tools/schemami/build-publication-tree.sh
  tools/schemami/check-published-contract.sh
  tools/schemami/check-publication-tree.sh
  tools/schemami/clean-clone-release-proof.sh
  tools/schemami/check-release-evidence.sh
  tools/viewer/build.ts
  tools/viewer/package.json
  tools/viewer/bun.lock
  tools/viewer/style.css
  tools/viewer/src/schemami/app.ts
  tools/viewer/src/schemami/calculus.ts
  tools/viewer/src/schemami/generated.ts
  tools/viewer/src/schemami/main.ts
  tools/viewer/src/schemami/render.ts
  tools/viewer/src/schemami/source-view.ts
  examples/pao-massa-mae.schemami.yaml
  examples/paodeportugal.schemami-bundle.json
  release/schemami-v1.0.0/contract-map.json
  release/schemami-v1.0.0/evidence-map.json
  release/schemami-v1.0.0/problems
  .github/workflows/validate.yml
  README.md
  docs/STATUS.md
  docs/project-context.md
  docs/product/FEATURES.md
  docs/product/features.yaml
  docs/product/ROADMAP.md
)

legacy_pattern='\bRCP\b|\brcp\b|x-rcp|rcp\.invalid|rcplint|RecipesProtocol|recipesprotocol'
if rg -n -i "$legacy_pattern" "${active_positive[@]}"; then
  echo "cutover: predecessor identity found in active positive surface" >&2
  exit 1
fi

# Negative recognition is exact, reviewed, and refusal-only.
grep -Fq '"recipe.rcp.yaml"' tools/schemami/main_test.go
grep -Fq 'Object.hasOwn(value, "rcp")' tools/viewer/src/schemami/engine.ts
grep -Fq 'problem("unsupported-legacy"' tools/viewer/src/schemami/engine.ts
grep -Fq 'legacy RCP input is refused without fallback' tools/viewer/conformance/schemami-viewer.test.ts

# The active DAG may not call historical implementation or vocabulary surfaces.
if rg -n -i 'tools/rcplint|registry/|i18n/|schema/rcp-|calculus/SPEC|docsite' \
  Makefile tools/ci/run-gate-dag.sh tools/ci/gate-dag-manifest.json \
  tools/bootstrap.sh tools/with-toolchain.sh .github/workflows/validate.yml; then
  echo "cutover: active build or CI invokes a historical surface" >&2
  exit 1
fi

# Positive active filenames themselves must carry no predecessor suffix/name.
for path in schema/schemami-v1-*.json examples/*.schemami.* tools/schemami/testdata/*.schemami.*; do
  case "$path" in
    *rcp*|*RCP*) echo "cutover: active filename has predecessor identity: $path" >&2; exit 1 ;;
  esac
done

grep -Fq '## Active normative and runtime surface' "$ledger"
grep -Fq '## Deliberate negative compatibility evidence' "$ledger"
grep -Fq '## Retained historical implementation' "$ledger"

echo "schemami clean cutover: active positive surface clean; negative and historical occurrences classified"
