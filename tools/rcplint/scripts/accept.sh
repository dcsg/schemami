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
check "SAC-REG-002   technique entries live, interim vocab retired" sh -c "ls registry/entries/technique/*.yaml >/dev/null && test ! -f registry/vocab/techniques.yaml"
check "AC-REG-004-1  grounding audit: every ingredient entry grounded or no-match" sh -c "cd tools/rcplint && go run . lint ../.. | grep -q 'lint: 0 error'"
check "AC-REG-004-2  gap ledger groups cross-language raws by proposed class" sh -c "python3 tools/rcplint/scripts/gap-ledger.py --self-test | grep PROPOSAL | grep cebola | grep -q onion"
check "SAC-TOOL-001  bun-only toolchain, exactly 2 exact-pinned deps, frozen installs" sh -c "python3 -c \"import json; p=json.load(open('tools/viewer/package.json')); d=p.get('dependencies',{}); assert set(d)=={'yaml','@cfworker/json-schema'}; assert all(v[0].isdigit() for v in d.values()); assert 'trustedDependencies' not in p\" && test -f tools/viewer/bun.lock && grep -Eq 'bun *= *\"[0-9]' .mise.toml && grep -q -- '--frozen-lockfile' Makefile"
check "SAC-TOOL-002  conformance vectors green (bun test, capability-scoped)" make conformance
check "AC-PROF-004-1 dish profile exists at hardened maturity" sh -c "python3 -c \"import json; s=json.load(open('schema/profiles/dish.schema.json')); assert s['x-rcp-maturity']=='hardened'\""
check "AC-TOOL-001-2 viewer page self-contained: hash CSP, no external refs" sh -c "f=tools/viewer/dist/index.html; test -f \$f && grep -q Content-Security-Policy \$f && ! grep -q \"'self'\" \$f && ! grep -qE '(src|href)=\"https?://' \$f"
check "AC-PR-003-2  no prose-parked metadata; hat-mapping notes present" python3 tools/rcplint/scripts/prose-parking.py
check "AC-I18N-001-1 every used taxonomy slug has a pt-PT term" python3 tools/rcplint/scripts/i18n-coverage.py
check "DEP-FREEZE    dependency surface exact (2 pinned viewer deps; go.mod unchanged)" sh -c "python3 -c \"import json; p=json.load(open('tools/viewer/package.json')); d=p.get('dependencies',{}); assert d=={'yaml':'2.9.0','@cfworker/json-schema':'4.1.1'}, d\" && python3 -c \"t=open('tools/rcplint/go.mod').read(); assert t.count('github.com/santhosh-tekuri/jsonschema/v6')>=1 and t.count('gopkg.in/yaml.v3')>=1; import re; reqs=re.findall(r'^\t[a-z][^ ]+ v', t, re.M); assert len(reqs)==2, reqs\""
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

echo "── Recipe Calculus (SR-CALC-001/002, DS-CALC-002) ──"
check "AC-CALC-002-* both implementations agree: Go writes, TS replays the frozen vectors" make calculus
check "SAC-CALC-001  coverage gate: every SPEC edge class has vectors (incl. inverted proof)" sh -c "cd tools/rcplint && go test -count=1 -run 'TestCalcCoverage' ."
check "AC-CALC-001-1 SPEC completeness: exported calc surface == SPEC fn sections; purity" sh -c "cd tools/rcplint && go test -count=1 -run 'TestSpecCompleteness|TestCalcPurity' ./calc/"
check "AC-9.3        ledger truthful: 4 FEATs shipped + realized_by; TOOL-001 phased; roadmap" python3 tools/rcplint/scripts/ledger-check.py

echo "── Media (schema/MEDIA.md, DECISIONS #27) ──"
check "AC-TOOL-002-1 MEDIA.md carries the four mandated anchors" sh -c "grep -q '^## Asset location' schema/MEDIA.md && grep -q '^## Licence' schema/MEDIA.md && grep -q '^## Prohibition: source-book media' schema/MEDIA.md && grep -q '^## Never serialized' schema/MEDIA.md"
check "AC-TOOL-002-2 media attestation green (commit-eligible tree, allowlisted only)" python3 tools/rcplint/scripts/media-attest.py .
check "              attestation self-test: planted binary + base64 DETECTED (inverted)" python3 tools/rcplint/scripts/media-attest.py --self-test
check "CSP-EXACT     dist CSP exact string (default-src 'none'; hashes; img+media data: blob:); bundle < 500 KB; file input present" sh -c "python3 -c \"
import re,sys
h=open('tools/viewer/dist/index.html').read()
m=re.search(r'Content-Security-Policy\\\" content=\\\"([^\\\"]+)\\\"',h)
assert m, 'no CSP meta'
pat=r\\\"^default-src 'none'; script-src 'sha256-[A-Za-z0-9+/=]+'; style-src 'sha256-[A-Za-z0-9+/=]+'; img-src data: blob:; media-src data: blob:\$\\\"
assert re.match(pat,m.group(1)), m.group(1)
assert len(h) < 500*1024, len(h)
assert 'id=\\\"file-input\\\"' in h and 'type=\\\"file\\\"' in h
\""

echo "── Decode-compat gate (SR-PR-004, DS-PR-009) ──"
check "AC-PR-004-1   both directions green: frozen reader ⇄ current core (incl. inverted breaking fixture + struct-vs-pinned-tag diff)" sh -c "cd tools/rcplint && go test -count=1 -run TestDecodeCompat ./..."

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && echo "PRD-001 ACCEPTANCE EVIDENCE: GREEN" || exit 1
