#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
bash "$root/tools/schemami/check-candidate-scope.sh" --committed >/dev/null
candidate="$(git -C "$root" rev-parse HEAD)"
proof_root="$(mktemp -d /private/tmp/schemami-release-proof.XXXXXX)"
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

manifest="$proof_root/schemami-v1.0.0.manifest.json"
bash "$clone/tools/schemami/build-release-manifest.sh" "$manifest" >/dev/null
jq -e --arg candidate "$candidate" '.source_commit == $candidate and (.artifacts | length == 15)' "$manifest" >/dev/null
test -z "$(git -C "$clone" status --porcelain=v1 --untracked-files=all)"

echo "clean-clone proof: candidate $candidate reproduced the full DAG and 14-artifact release manifest"
