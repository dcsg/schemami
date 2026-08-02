#!/usr/bin/env bash
# AC-4.2 / AC-VAL-001-2: a breaking edit must produce a non-zero exit that
# names the file and the failing JSON pointer. Works on a temp copy.
set -u
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
cp -r "$ROOT/schema" "$ROOT/registry" "$TMP/"
mkdir -p "$TMP/examples"
# break alentejano: rcp must be const 1
sed 's/^rcp: 1$/rcp: 2/' "$ROOT/examples/alentejano.rcp.yaml" > "$TMP/examples/alentejano.rcp.yaml"
OUT=$(cd "$ROOT/tools/rcplint" && go run . validate "$TMP" 2>&1)
RC=$?
echo "$OUT" | tail -3
if [ $RC -eq 0 ]; then echo "FAIL: broken example validated"; exit 1; fi
echo "$OUT" | grep -q "alentejano.rcp.yaml" || { echo "FAIL: file not named"; exit 1; }
echo "$OUT" | grep -q "/rcp" || { echo "FAIL: JSON pointer not named"; exit 1; }
echo "NEGATIVE CHECK OK: non-zero exit, file + pointer named"
