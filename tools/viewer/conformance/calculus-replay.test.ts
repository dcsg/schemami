/**
 * Calculus conformance replay (AC-5.1): the Go reference wrote
 * calculus/vectors/; this suite replays every vector through the TS
 * Calculus (src/calc) and diffs results under the SPEC's numeric
 * discipline (N-2: |a − b| ≤ 1e-9 × max(1, |a|, |b|); strings and
 * integers exact). Vectors are frozen — a disagreement is a bug in
 * src/calc, never in the vectors.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseAllDocuments } from "yaml";
import * as calc from "../src/calc/index.ts";
import { REPO_ROOT } from "./repo.ts";

interface CalcVector {
  function: string;
  name: string;
  edge_classes: string[];
  rules: string[];
  input: Record<string, unknown>;
  expected: unknown;
}

const VECTORS_DIR = join(REPO_ROOT, "calculus", "vectors");

function loadCalcVectors(): CalcVector[] {
  return readdirSync(VECTORS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .flatMap((f) => JSON.parse(readFileSync(join(VECTORS_DIR, f), "utf8")) as CalcVector[]);
}

function loadDocument(source: string): Record<string, unknown> {
  if (source.includes("private/")) {
    throw new Error(`privacy boundary: refusing ${source}`);
  }
  const docs = parseAllDocuments(readFileSync(join(REPO_ROOT, source), "utf8"));
  const first = docs[0]?.toJS();
  if (!first || typeof first !== "object") {
    throw new Error(`vector source ${source} did not parse to a document`);
  }
  return first as Record<string, unknown>;
}

/** N-2 tolerance: relative-absolute hybrid for floats; everything else exact. */
function assertAgrees(got: unknown, want: unknown, path: string): void {
  if (typeof want === "number" && typeof got === "number") {
    const tol = 1e-9 * Math.max(1, Math.abs(want), Math.abs(got));
    expect(Math.abs(got - want), `${path}: ${got} vs ${want}`).toBeLessThanOrEqual(tol);
    return;
  }
  if (Array.isArray(want)) {
    expect(Array.isArray(got), `${path}: expected array`).toBe(true);
    expect((got as unknown[]).length, `${path}: length`).toBe(want.length);
    want.forEach((w, i) => assertAgrees((got as unknown[])[i], w, `${path}[${i}]`));
    return;
  }
  if (want && typeof want === "object") {
    expect(got && typeof got === "object", `${path}: expected object`).toBe(true);
    const wantKeys = Object.keys(want as Record<string, unknown>).sort();
    const gotKeys = Object.keys(got as Record<string, unknown>).sort();
    expect(gotKeys, `${path}: keys`).toEqual(wantKeys);
    for (const k of wantKeys) {
      assertAgrees(
        (got as Record<string, unknown>)[k],
        (want as Record<string, unknown>)[k],
        `${path}.${k}`,
      );
    }
    return;
  }
  expect(got, path).toBe(want);
}

function windowJSON(w: calc.Window): Record<string, number> {
  return { min: w.Min, target: w.Target, max: w.Max };
}

function findingsJSON(doc: Record<string, unknown>, k: number): Record<string, unknown> {
  const f: calc.Findings = { refusals: [], warnings: [] };
  calc.enforceConstraints("vec", doc, k, f);
  return { refusals: f.refusals, warnings: f.warnings };
}

function inputDoc(input: Record<string, unknown>): Record<string, unknown> {
  if (typeof input["source"] === "string") return loadDocument(input["source"]);
  return input["doc"] as Record<string, unknown>;
}

/** Dispatch one vector through the TS Calculus, mirroring the writer's shapes. */
function replay(v: CalcVector): unknown {
  const input = v.input;
  switch (v.function) {
    case "fixedQuantityTransform":
      return calc.fixedQuantityTransform(
        input["amount"] as Record<string, unknown>,
        input["k"] as number,
      );
    case "scale":
      return calc.scale(inputDoc(input), input["k"] as number);
    case "resolveBases":
      return calc.resolveBases(inputDoc(input), input["k"] as number);
    case "selectGuardPath": {
      try {
        const steps = calc.selectGuardPath(inputDoc(input), {
          options: input["selection"] as Record<string, unknown>,
        });
        return { active: steps.map((s) => s["id"] as string) };
      } catch {
        return { error: true };
      }
    }
    case "enforceConstraints":
    case "minBatchFloor":
      return findingsJSON(inputDoc(input), input["k"] as number);
    case "reestimateDurations":
      return calc.reestimateDurations(input["window"] as Record<string, unknown>, input["k"] as number);
    case "readingOrder":
      return calc.readingOrder(inputDoc(input));
    case "interleave":
      return calc.interleave(inputDoc(input)).map((t) => ({ id: t.id, track: t.track }));
    case "schedule":
      return calc.schedule(inputDoc(input)).map((e) => ({
        item: e.item,
        start: windowJSON(e.start),
        duration: windowJSON(e.duration),
      }));
    default:
      throw new Error(`unknown vector function ${v.function}`);
  }
}

const vectors = loadCalcVectors();

test("vector set covers every Calculus function", () => {
  const fns = new Set(vectors.map((v) => v.function));
  expect(vectors.length).toBeGreaterThanOrEqual(21);
  expect([...fns].sort()).toEqual([
    "enforceConstraints",
    "fixedQuantityTransform",
    "interleave",
    "minBatchFloor",
    "readingOrder",
    "reestimateDurations",
    "resolveBases",
    "scale",
    "schedule",
    "selectGuardPath",
  ]);
});

test("no vector references private content", () => {
  for (const v of vectors) {
    expect(JSON.stringify(v)).not.toContain("private/");
  }
});

test("every vector cites SPEC rules", () => {
  for (const v of vectors) {
    expect(v.rules.length, `${v.function}/${v.name} has no rules[]`).toBeGreaterThan(0);
  }
});

describe("agreement with the Go reference", () => {
  for (const v of vectors) {
    test(`${v.function}/${v.name}`, () => {
      assertAgrees(replay(v), v.expected, `${v.function}/${v.name}`);
    });
  }
});

test("src/calc is import-free (AC-5.2 purity)", () => {
  const source = readFileSync(join(import.meta.dir, "..", "src", "calc", "index.ts"), "utf8");
  const importLines = source
    .split("\n")
    .filter((l) => /^\s*(import\b|export\s.*\sfrom\s|require\()/.test(l));
  expect(importLines).toEqual([]);
});
