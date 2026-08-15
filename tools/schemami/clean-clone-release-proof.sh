#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
bash "$root/tools/schemami/check-candidate-scope.sh" --committed >/dev/null
candidate="$(git -C "$root" rev-parse HEAD)"
proof_root="$(mktemp -d "${TMPDIR:-/tmp}/schemami-release-proof.XXXXXX")"
clone="$proof_root/repository"
cleanup() {
  chmod -R u+w "$proof_root" 2>/dev/null || true
  rm -rf -- "$proof_root"
}
trap cleanup EXIT

git clone --quiet --no-hardlinks --no-local "$root" "$clone"
git -C "$clone" checkout --quiet --detach "$candidate"
test "$(git -C "$clone" rev-parse HEAD)" = "$candidate"
test -z "$(git -C "$clone" status --porcelain=v1 --untracked-files=all)"

echo "clean-clone proof: bootstrap pinned candidate $candidate"
bash "$clone/tools/bootstrap.sh" >/dev/null

echo "clean-clone proof: run full DAG with package/network proxies disabled"
env \
  GONOSUMDB='*' GOSUMDB=off GOPROXY=off BUN_INSTALL_OFFLINE=1 \
  http_proxy=http://127.0.0.1:9 https_proxy=http://127.0.0.1:9 \
  make -C "$clone" ci >/dev/null

echo "clean-clone proof: run locked Swift SDK package"
swift package --package-path "$clone/sdk/swift" resolve >/dev/null
swift package --package-path "$clone" resolve >/dev/null
env http_proxy=http://127.0.0.1:9 https_proxy=http://127.0.0.1:9 \
  swift test --package-path "$clone/sdk/swift" --disable-sandbox \
  --disable-automatic-resolution --skip-update >/dev/null
env http_proxy=http://127.0.0.1:9 https_proxy=http://127.0.0.1:9 \
  swift test --package-path "$clone" --disable-sandbox \
  --disable-automatic-resolution --skip-update >/dev/null

manifest="$proof_root/schemami-v1.0.0.manifest.json"
bash "$clone/tools/schemami/build-release-manifest.sh" "$manifest" >/dev/null
jq -e --arg candidate "$candidate" '.source_commit == $candidate and (.artifacts | length == 26)' "$manifest" >/dev/null
test -z "$(git -C "$clone" status --porcelain=v1 --untracked-files=all)"

echo "clean-clone proof: candidate $candidate reproduced the full DAG and 26-artifact release manifest"
