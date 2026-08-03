#!/usr/bin/env python3
"""Media attestation (schema/MEDIA.md 'Prohibition: source-book media').

Fails when binary media exists outside the explicit allowlist, or when a
base64-embedded raster/AV payload hides inside a text file or the built
dist. The scan surface is the COMMIT-ELIGIBLE tree (git tracked +
untracked-but-not-ignored): the git-ignored private collection is
exactly the one place media may live unlisted, so ignoring gitignore
would make the rule unenforceable and honoring it makes the boundary
mechanical.

Usage:
  media-attest.py <repo-root>            # attest; exit 1 on violation
  media-attest.py --self-test            # inverted proof: planted binary
                                         # AND planted base64 must FAIL
Allowlist: tools/rcplint/scripts/media-allowlist.txt — exact repo-relative
paths, one per line, '#' comments. Additions require a recorded decision.
"""

import base64
import binascii
import os
import re
import subprocess
import sys
import tempfile

MAGIC = [
    b"\x89PNG\r\n\x1a\n",  # PNG
    b"\xff\xd8\xff",  # JPEG
    b"GIF87a",
    b"GIF89a",
    b"\x1a\x45\xdf\xa3",  # WebM/Matroska
    b"OggS",
    b"ID3",  # MP3
    b"\xff\xfb",  # MP3 frame
]
# RIFF (WebP/WAV/AVI) and MP4 need offset checks — handled separately.

DATA_URI = re.compile(rb"data:(?:image|video|audio)/[a-zA-Z0-9.+-]+;base64,")
BASE64_RUN = re.compile(rb"[A-Za-z0-9+/]{1024,}={0,2}")


def is_media_binary(head: bytes) -> bool:
    if any(head.startswith(m) for m in MAGIC):
        return True
    if head[:4] == b"RIFF" and head[8:12] in (b"WEBP", b"WAVE", b"AVI "):
        return True
    if head[4:8] == b"ftyp":  # MP4/MOV family
        return True
    return False


def commit_eligible_files(root: str) -> list[str]:
    out = subprocess.run(
        ["git", "-C", root, "ls-files", "--cached", "--others", "--exclude-standard"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    return [line for line in out.splitlines() if line]


def load_allowlist(root: str) -> set[str]:
    path = os.path.join(root, "tools/rcplint/scripts/media-allowlist.txt")
    allowed: set[str] = set()
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    allowed.add(line)
    return allowed


def smuggled_base64(data: bytes) -> bool:
    if DATA_URI.search(data):
        return True
    for run in BASE64_RUN.finditer(data):
        try:
            decoded = base64.b64decode(run.group(0)[:4096], validate=True)
        except (binascii.Error, ValueError):
            continue
        if is_media_binary(decoded[:16]):
            return True
    return False


def scan_paths(root: str, rels: list[str], allowed: set[str]) -> list[str]:
    violations = []
    for rel in rels:
        path = os.path.join(root, rel)
        if not os.path.isfile(path):
            continue
        with open(path, "rb") as f:
            data = f.read()
        if is_media_binary(data[:16]):
            if rel not in allowed:
                violations.append(f"binary media outside allowlist: {rel}")
            continue
        if b"\x00" in data[:4096]:
            continue  # other binary (executables, archives) — not media smuggling
        if smuggled_base64(data):
            if rel not in allowed:
                violations.append(f"base64 media payload in text file: {rel}")
    return violations


def self_test() -> int:
    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
    with tempfile.TemporaryDirectory() as tmp:
        planted_bin = "planted.jpg.disguised.txt"
        with open(os.path.join(tmp, planted_bin), "wb") as f:
            f.write(png)
        planted_txt = "planted-smuggle.md"
        payload = base64.b64encode(png * 200).decode()
        # Split so this source file never contains the contiguous marker
        # the scanner hunts — otherwise the attestation flags itself.
        marker = "data:image/png;" + "base" + "64,"
        with open(os.path.join(tmp, planted_txt), "w", encoding="utf-8") as f:
            f.write(f"innocent prose\n![x]({marker}{payload})\n")
        planted_raw = "planted-raw-run.md"
        with open(os.path.join(tmp, planted_raw), "w", encoding="utf-8") as f:
            f.write(payload)
        found = scan_paths(tmp, [planted_bin, planted_txt, planted_raw], set())
        kinds = {v.split(":")[0] for v in found}
        if len(found) >= 3 and len(kinds) == 2:
            print("SELFTEST PASS: planted binary and both base64 forms detected")
            return 0
        print(f"SELFTEST FAIL: detections={found}", file=sys.stderr)
        return 1


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    allowed = load_allowlist(root)
    violations = scan_paths(root, commit_eligible_files(root), allowed)
    if violations:
        for v in violations:
            print(f"MEDIA ATTESTATION FAIL: {v}", file=sys.stderr)
        return 1
    print(f"media attestation green ({len(allowed)} allowlisted)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
