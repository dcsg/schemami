#!/usr/bin/env python3
"""Every `DECISIONS #N` cited anywhere in the repo must resolve to an entry in
docs/research/DECISIONS.md.

The failure this exists for: decisions #24-#29 were made during v0.2-v0.4 and
cited by schemas, linter code, gate scripts and guidelines — while none of them
existed in the decisions log. `accept.sh` labelled a gate section "DECISIONS
#27" for a decision the record did not contain. Nothing caught it for two cuts,
because plans record decisions inline ("record DECISIONS #28") and writing them
back was never a gate.

Citations are the load-bearing direction. A decision nobody cites is merely
unused; a citation that resolves to nothing means code claims authority from a
record that cannot be read. So this checks citation -> entry, and deliberately
does NOT require the reverse.

DECISIONS.md has two entry formats, both of which count:
  - the original numbered list  ->  `1. **One core protocol...`
  - back-filled/later entries   ->  `### #24 — Registry identifiers...`
"""
import pathlib
import re
import subprocess
import sys

DECISIONS = "docs/research/DECISIONS.md"
CITATION = re.compile(r"DECISIONS #(\d+)")
ENTRY_HEADING = re.compile(r"^### #(\d+)", re.M)
ENTRY_LIST_ITEM = re.compile(r"^\s*(\d+)\.\s+\*\*", re.M)


def recorded_decisions(root: pathlib.Path) -> set[str]:
    path = root / DECISIONS
    if not path.is_file():
        print(f"FAIL: {DECISIONS} not found", file=sys.stderr)
        raise SystemExit(1)
    text = path.read_text()
    return set(ENTRY_HEADING.findall(text)) | set(ENTRY_LIST_ITEM.findall(text))


def tracked_files(root: pathlib.Path) -> list[str]:
    """Only tracked files — generated output and the private tree are not ours
    to police, and untracked scratch files would make this gate flap."""
    out = subprocess.run(
        ["git", "-C", str(root), "ls-files"],
        capture_output=True, text=True, check=True,
    )
    return out.stdout.split()


def citations(root: pathlib.Path) -> dict[str, set[str]]:
    found: dict[str, set[str]] = {}
    for name in tracked_files(root):
        path = root / name
        try:
            text = path.read_text()
        except (OSError, UnicodeDecodeError):
            continue  # binary or unreadable; no citations to find
        for number in CITATION.findall(text):
            found.setdefault(number, set()).add(name)
    return found


def verify(root: pathlib.Path) -> list[str]:
    recorded = recorded_decisions(root)
    cited = citations(root)
    problems = []
    for number in sorted(cited, key=int):
        if number not in recorded:
            where = sorted(cited[number])
            problems.append(
                f"DECISIONS #{number} is cited in {len(where)} file(s) "
                f"(e.g. {where[0]}) but has no entry in {DECISIONS}"
            )
    return problems


def self_test(root: pathlib.Path) -> int:
    """Inverted proof: cite a decision that cannot exist, assert detection.

    The planted file must be TRACKED, since the gate only reads tracked files.
    `--intent-to-add` registers it without staging content, and the finally
    block removes it from the index either way — a self-test that can dirty
    the repo is worse than no self-test.
    """
    planted = root / "decisions-resolve-selftest.md"
    if planted.exists():
        print(f"SELF-TEST FAIL: {planted} already exists", file=sys.stderr)
        return 1

    # Assembled, never written literally: this file is itself scanned, so a
    # literal citation here would make the gate flag its own source. (It did,
    # the moment this script became tracked — the same trap media-attest.py
    # hit with its planted-media marker.)
    sentinel = "9999"
    citation = f"DECISIONS{chr(32)}#{sentinel}"

    try:
        planted.write_text(f"Citing {citation}, which cannot exist.\n")
        subprocess.run(
            ["git", "-C", str(root), "add", "--intent-to-add", planted.name],
            check=True, capture_output=True,
        )
        detected = any(sentinel in p for p in verify(root))
    finally:
        subprocess.run(
            ["git", "-C", str(root), "rm", "--cached", "--quiet", planted.name],
            capture_output=True,
        )
        planted.unlink(missing_ok=True)

    if not detected:
        print(f"SELF-TEST FAIL: planted citation of #{sentinel} NOT detected", file=sys.stderr)
        return 1
    if verify(root):
        print("SELF-TEST FAIL: repo not clean after cleanup", file=sys.stderr)
        return 1
    print("SELF-TEST OK: unresolvable citation detected, then cleaned up")
    return 0


def main() -> int:
    args = [a for a in sys.argv[1:] if a != "--self-test"]
    root = pathlib.Path(args[0] if args else ".").resolve()

    if "--self-test" in sys.argv:
        return self_test(root)

    problems = verify(root)
    if problems:
        for p in problems:
            print(f"FAIL: {p}", file=sys.stderr)
        print(
            "\nA citation that resolves to nothing means code claims authority "
            "from a record that cannot be read. Add the entry to "
            f"{DECISIONS}.",
            file=sys.stderr,
        )
        return 1

    total = len(citations(root))
    print(f"OK: all {total} distinct cited decisions resolve to entries")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
