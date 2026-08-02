#!/usr/bin/env python3
"""Stopgap validation harness (P1-P3) until the Go harness lands in P4.

Validates: (1) the core schema against the 2020-12 metaschema, (2) every
example document against the core schema, (3) that the l1 negative fixtures
are REJECTED. FormatChecker enabled (DS-VAL-002 parity). The Go harness
re-verifies everything this script asserts (plan Known Risks).
"""
import sys, json, pathlib
import yaml
from jsonschema import Draft202012Validator, FormatChecker

ROOT = pathlib.Path(__file__).resolve().parents[3]
SCHEMA = ROOT / "schema/rcp-core-v1.schema.json"
EXAMPLES = sorted((ROOT / "examples").glob("*.rcp.yaml"))
L1_NEG = sorted((ROOT / "tools/rcplint/testdata/l1").glob("*.rcp.yaml"))

def load_docs(path):
    return [d for d in yaml.safe_load_all(path.read_text()) if d is not None]

def main():
    failures = []
    schema = json.loads(SCHEMA.read_text())
    Draft202012Validator.check_schema(schema)
    print(f"OK metaschema: {SCHEMA.name}")
    v = Draft202012Validator(schema, format_checker=FormatChecker())

    n = 0
    for path in EXAMPLES:
        for doc in load_docs(path):
            n += 1
            errs = sorted(v.iter_errors(doc), key=lambda e: str(e.path))
            if errs:
                failures.append(f"{path.name}#{doc.get('id','?')}: {errs[0].json_path}: {errs[0].message[:120]}")
            else:
                print(f"OK example: {path.name}#{doc.get('id','?')}")
    print(f"examples validated: {n} documents")

    for path in L1_NEG:
        for doc in load_docs(path):
            errs = list(v.iter_errors(doc))
            if errs:
                print(f"OK rejected (as required): {path.name}")
            else:
                failures.append(f"{path.name}: NEGATIVE FIXTURE PASSED — hardening missing")

    if failures:
        print("\nFAILURES:")
        [print(f"  {f}") for f in failures]
        sys.exit(1)
    print("\nALL CHECKS GREEN")

if __name__ == "__main__":
    main()
