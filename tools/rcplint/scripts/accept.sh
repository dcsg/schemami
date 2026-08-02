#!/usr/bin/env bash
# PRD-001 acceptance sweep — every check names the AC it verifies.
# Informative tooling (SSP-001); exit 0 = all acceptance evidence green.
set -u
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); printf "  ✓ %s\n" "$1"; }
bad()  { FAIL=$((FAIL+1)); printf "  ✗ %s\n" "$1"; }
check(){ local desc="$1"; shift; if "$@" >/dev/null 2>&1; then ok "$desc"; else bad "$desc"; fi; }

echo "── v0.2 standing guards (PLAN-rcp-v02) ──"
check "PRIVACY      private/collection ignored and never staged" sh -c "git check-ignore -q private/collection && [ -z \"\$(git ls-files private/)\" ]"

echo "── Shape + composition (FR-VAL-001, FR-PROF-001/002/003) ──"
check "AC-VAL-001-1  make validate green: 6 docs, 60 entries, L1+L2+CUE" make validate
check "AC-PROF-001-1 alentejano passes core ∧ bread (hardened)" sh -c "cd tools/rcplint && go run . validate ../.. | grep -q 'pao-alentejano (core ∧ bread, maturity: hardened)'"
check "AC-PROF-002-1 nata's embedded BREAD component validated per-component" sh -c "cd tools/rcplint && go run . validate ../.. | grep -q 'massa-folhada (component, bread profile'"
check "AC-PROF-003-1 draft passes labelled, never silent" sh -c "cd tools/rcplint && go run . validate ../.. | grep -q 'negroni (core ∧ drink, maturity: draft)'"

echo "── Failure modes (FR-VAL-001/002) ──"
check "AC-VAL-001-2  broken example → non-zero, file + JSON pointer named" bash tools/rcplint/scripts/negative-check.sh
check "AC-VAL-002-*  every negative fixture fails for exactly its rule" sh -c "cd tools/rcplint && go test ./..."
check "AC-REG-001-2  bare slug rejected citing DECISIONS #23" sh -c "cd tools/rcplint && go test -run TestL2FixturesOneRuleEach"

echo "── Registry (FR-REG-001/002) ──"
check "AC-REG-002-1  zero unresolved refs, bidirectional census clean" bash tools/rcplint/scripts/migration-check.sh refs
check "AC-REG-001-1  entry missing a machine-read field rejected naming it" sh -c "cd tools/rcplint && go test -run TestRegistryFixtures"

echo "── Fail-closed safety (FR-SAFE-001, FR-PR-002) ──"
check "AC-SAFE-001-1 fixed-salt ×2 REFUSED with authored pt/en reason" sh -c "cd tools/rcplint && ! go run . clamp --scale 2.0 testdata/clamp/fixed-salt-chucrute.rcp.yaml"
check "AC-SAFE-001-2 uncertainty (missing qty) REFUSED by default" sh -c "cd tools/rcplint && ! go run . clamp --scale 2.0 testdata/clamp/missing-quantity.rcp.yaml"
check "no false refusals: uniform chucrute ×0.6 ACCEPTED (ratio invariance)" sh -c "cd tools/rcplint && go run . clamp --scale 0.6 ../../examples/other-categories.rcp.yaml#chucrute"
check "AC-PR-002-1   bound-less constraint rejected by hardened core" sh -c "cd tools/rcplint && go test -run TestL1FixturesRejected"
check "AC-PR-002-2   safety numbers single-sourced (no numeric profile bounds)" sh -c "! grep -qE 'safety_gate|ph_max|brine_min_pct' examples/other-categories.rcp.yaml"

echo "── The freeze (FR-PR-001) ──"
check "AC-PR-001-*   rcp-v0.1 annotated tag exists" sh -c "test \"\$(git cat-file -t rcp-v0.1)\" = tag"
check "              VERSIONING.md covers \$id / rcp / SchemaVer / decode-compat" sh -c "grep -q 'SchemaVer' schema/VERSIONING.md && grep -qi 'decode' schema/VERSIONING.md"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && echo "PRD-001 ACCEPTANCE EVIDENCE: GREEN" || exit 1
