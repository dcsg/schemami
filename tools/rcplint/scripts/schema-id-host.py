#!/usr/bin/env python3
"""Every schema $id must share ONE host, and that host must not belong to a
consumer of the protocol.

The failure this exists to prevent already happened: every $id shipped as
`https://paodeportugal.pt/schema/rcp/1/...` up to v0.4 — Fornada's domain,
i.e. one *consumer* of the protocol lending its identity to the protocol
itself. Nothing broke, because no document carries a schema URL and every
$ref is local, so it stayed invisible. It would have become permanent the
moment those URLs resolved and a reader pinned them.

Two assertions, both cheap and both fail-closed:

  1. ONE host across the whole normative surface. A schema surface with two
     hosts has no single identity, and a partial rename is the likely way
     that happens.
  2. The host is not on the consumer denylist. This is the regression guard
     — it is what makes re-introducing the old domain a red gate rather than
     a thing someone notices later.

The provisional host `rcp.invalid` is ACCEPTED, not merely tolerated: the
protocol is unnamed, the host follows the name, and RFC 2606 guarantees
`.invalid` never resolves. A non-resolving placeholder is the honest state
for an unpublished identity. This script deliberately does NOT fail on it —
a gate that fails on the known-correct interim state gets muted, and a muted
gate protects nothing.
"""
import json
import pathlib
import sys
from urllib.parse import urlparse

# Domains belonging to consumers/apps, never to the protocol.
CONSUMER_DOMAINS = {"paodeportugal.pt"}

SEARCH = ["schema/**/*.schema.json", "registry/schemas/*.schema.json"]


def collect(root: pathlib.Path) -> dict[str, list[str]]:
    """Map host -> [files declaring an $id on that host]."""
    hosts: dict[str, list[str]] = {}
    for pattern in SEARCH:
        for path in sorted(root.glob(pattern)):
            try:
                doc = json.loads(path.read_text())
            except (json.JSONDecodeError, OSError) as exc:
                print(f"FAIL: {path} unreadable as JSON: {exc}", file=sys.stderr)
                raise SystemExit(1)
            sid = doc.get("$id")
            if not sid:
                continue
            host = urlparse(sid).netloc
            if not host:
                print(f"FAIL: {path} has a non-absolute $id: {sid!r}", file=sys.stderr)
                raise SystemExit(1)
            hosts.setdefault(host, []).append(str(path.relative_to(root)))
    return hosts


def verify(root: pathlib.Path) -> list[str]:
    """Return a list of problems; empty means green."""
    hosts = collect(root)
    problems = []

    if not hosts:
        return ["no schema declared an $id — the search patterns are wrong"]

    if len(hosts) > 1:
        detail = "; ".join(f"{h} ({len(f)} files)" for h, f in sorted(hosts.items()))
        problems.append(f"schema $ids span {len(hosts)} hosts, expected 1: {detail}")

    for host, files in sorted(hosts.items()):
        if host in CONSUMER_DOMAINS:
            problems.append(
                f"$id host {host!r} belongs to a CONSUMER of the protocol, not to "
                f"the protocol ({len(files)} files, e.g. {files[0]}). A schema's "
                f"identity may not be borrowed from something that consumes it."
            )
    return problems


def self_test() -> int:
    """Inverted proof: plant a consumer domain, assert it is DETECTED.

    A gate that has never been shown to fail is not known to work.
    """
    import tempfile

    root = pathlib.Path(__file__).resolve().parents[3]
    with tempfile.TemporaryDirectory() as tmp:
        fake = pathlib.Path(tmp)
        for sub in ("schema/profiles", "registry/schemas"):
            (fake / sub).mkdir(parents=True)
        # A clean surface: one host, not a consumer.
        (fake / "schema/core.schema.json").write_text(
            json.dumps({"$id": "https://rcp.invalid/schema/rcp/1/core.schema.json"})
        )
        if verify(fake):
            print("SELF-TEST FAIL: a clean single-host surface was flagged", file=sys.stderr)
            return 1

        # Plant the exact regression this guard exists for.
        (fake / "schema/profiles/bread.schema.json").write_text(
            json.dumps({"$id": "https://paodeportugal.pt/schema/rcp/1/profiles/bread.schema.json"})
        )
        problems = verify(fake)
        if not any("CONSUMER" in p for p in problems):
            print("SELF-TEST FAIL: planted consumer domain NOT detected", file=sys.stderr)
            return 1
        if not any("span 2 hosts" in p for p in problems):
            print("SELF-TEST FAIL: planted host split NOT detected", file=sys.stderr)
            return 1

    print("SELF-TEST OK: consumer domain and host split both detected")
    return 0


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()

    root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    problems = verify(root)
    if problems:
        for p in problems:
            print(f"FAIL: {p}", file=sys.stderr)
        return 1

    host = next(iter(collect(root)))
    note = "  (provisional — RFC 2606, never resolves)" if host.endswith(".invalid") else ""
    print(f"OK: all schema $ids on one host: {host}{note}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
