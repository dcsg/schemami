#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
kit="$root/ai/v1"
manifest="$kit/manifest.json"

fail() {
  echo "ai-kit: $*" >&2
  exit 1
}

digest() {
  shasum -a 256 "$1" | awk '{print $1}'
}

test -f "$manifest" || fail "missing ai/v1/manifest.json"
jq -e '
  .workflow == "https://schemami.dev/ai/v1" and
  .schemami_wire == "1" and
  .status == "informative" and
  ([.files[].path] == ([.files[].path] | sort)) and
  ([.dependencies[].role] == ([.dependencies[].role] | sort)) and
  (all(.files[]; (.sha256 | test("^[0-9a-f]{64}$")) and (.media_type | test("^(application/json|text/html|text/markdown)$")))) and
  (all(.dependencies[]; (.sha256 | test("^[0-9a-f]{64}$")) and (.url | startswith("https://schemami.dev/"))))
' "$manifest" >/dev/null || fail "invalid manifest identity, order, or field contract"

manifest_files="$(jq -r '.files[].path' "$manifest")"
actual_files="$(find "$kit" -type f ! -name manifest.json | sed "s#^$kit/##" | LC_ALL=C sort)"
test "$manifest_files" = "$actual_files" || fail "manifest does not cover every versioned kit file exactly"

while IFS=$'\t' read -r path expected; do
  test -f "$kit/$path" || fail "missing kit file $path"
  actual="$(digest "$kit/$path")"
  test "$actual" = "$expected" || fail "digest mismatch for ai/v1/$path"
done < <(jq -r '.files[] | [.path, .sha256] | @tsv' "$manifest")

while IFS=$'\t' read -r path expected; do
  test -f "$root/$path" || fail "missing dependency $path"
  actual="$(digest "$root/$path")"
  test "$actual" = "$expected" || fail "dependency digest mismatch for $path"
done < <(jq -r '.dependencies[] | [.path, .sha256] | @tsv' "$manifest")

instructions="$kit/INSTRUCTIONS.md"
rendering="$kit/RENDERING.md"
template="$kit/recipe-card.html"
entry="$root/ai/index.html"

rg -q 'no more than three short questions' "$instructions" || fail "interview question limit is absent"
rg -q 'unknown.*,.*not stated.*,.*keep unresolved' "$instructions" || fail "honest unresolved answers are absent"
rg -q 'BCP 47' "$instructions" || fail "language standard is absent"
rg -q 'never a validator' "$instructions" || fail "AI authority boundary is absent"
rg -q 'complete replacement JSON object' "$instructions" || fail "repair replacement rule is absent"
rg -q 'OUTPUT: JSON_ONLY' "$instructions" || fail "automation output mode is absent"
rg -q 'Fragment viewer links, remote MCP/MCP Apps resources' "$rendering" || fail "deferred rendering boundary is absent"
rg -q 'provider widgets are deferred' "$rendering" || fail "deferred rendering boundary is incomplete"

rg -q 'Content-Security-Policy' "$template" || fail "template CSP is absent"
rg -Fq 'id="schemami-document" type="application/json">{}' "$template" || fail "template JSON insertion point is absent"
rg -q 'Unverified candidate' "$template" || fail "template trust label is absent"
rg -q 'textContent' "$template" || fail "template does not use safe text rendering"

if rg -n '<script[^>]+src=|innerHTML|eval\(|fetch\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|https?://' "$template"; then
  fail "template contains forbidden executable, storage, or network behavior"
fi

rg -Fq 'href="./v1/INSTRUCTIONS.md"' "$entry" || fail "/ai does not expose versioned machine instructions"
rg -Fq 'href="./examples/candidate.schemami.json"' "$kit/index.html" || fail "/ai/v1 does not expose its example"
rg -Fq 'href="./recipe-card.html"' "$kit/index.html" || fail "/ai/v1 does not expose its recipe card"

"$root/tools/with-toolchain.sh" bun -e '
  for (const path of process.argv.slice(2)) {
    const html = await Bun.file(path).text();
    const scripts = html.split("<script>").slice(1).map((part) => part.split("</script>")[0]);
    if (scripts.length !== 1) throw new Error(`${path}: expected one executable script, got ${scripts.length}`);
    new Function(scripts[0]);
  }
' -- "$entry" "$template" || fail "inline script syntax is invalid"

jq -e '.schemami == "1" and .content_language == "pt-PT"' \
  "$kit/examples/candidate.schemami.json" >/dev/null \
  || fail "pinned candidate example is not a Schemami v1 pt-PT document"
cmp -s "$kit/examples/candidate.schemami.json" \
  "$root/acquisition/source-to-candidate/1/examples/candidate.schemami.json" \
  || fail "published candidate example drifted from the verified acquisition example"

echo "ai-kit: manifest, dependencies, interview contract, and rendering boundary verified"
