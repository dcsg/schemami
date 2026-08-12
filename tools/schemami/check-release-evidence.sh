#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
evidence_map="$root/release/schemami-v1.0.0/evidence-map.json"

expected="FR-CALC-006 FR-CUTOVER-001 FR-EVIDENCE-001 FR-MODEL-001 FR-NAME-001 FR-PAO-001 FR-PORTABLE-001 FR-REL-001 FR-VOCAB-001"
actual="$(jq -r '.requirements[].id' "$evidence_map" | sort | tr '\n' ' ' | sed 's/ $//')"
test "$actual" = "$expected" || { echo "release evidence: requirement coverage drift: $actual" >&2; exit 1; }
test "$(jq '[.requirements[].id] | length == (unique | length)' "$evidence_map")" = true

grep -Fq 'status: accepted' "$root/docs/product/prds/PRD-007-schemami-stable-protocol-release.yaml"
grep -Fq 'status: accepted' "$root/docs/product/specs/SPEC-007-schemami-v1-stable-release/spec.yaml"
if grep -En 'status: (draft|proposed)' \
  "$root/docs/product/prds/PRD-007-schemami-stable-protocol-release.yaml" \
  "$root/docs/product/specs/SPEC-007-schemami-v1-stable-release/spec.yaml"; then
  echo "release evidence: accepted PRD/SPEC contains draft or proposed status" >&2
  exit 1
fi

bash "$root/tools/schemami/check-candidate-scope.sh" --committed >/dev/null

make -C "$root" ci >/dev/null
edikt gov compile --check --json | jq -e '.status == "ok" and (.phase_a.errors | length == 0) and (.lossless_report | length == 0)' >/dev/null
bash "$root/tools/schemami/clean-clone-release-proof.sh" >/dev/null

temporary_manifest="$(mktemp "${TMPDIR:-/tmp}/schemami-v1.0.0.manifest.XXXXXX")"
cleanup() { rm -f -- "$temporary_manifest"; }
trap cleanup EXIT
bash "$root/tools/schemami/build-release-manifest.sh" "$temporary_manifest" >/dev/null
bash "$root/tools/schemami/check-published-contract.sh" "$temporary_manifest" >/dev/null

commit="$(git -C "$root" rev-parse HEAD)"
echo "release evidence: all nine PRD requirements, clean clone, governance, and published bytes pass for $commit"
