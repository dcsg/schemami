import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  convertQuantity,
  readingOrder,
  resolveFormula,
  scale,
  schedule,
  type Envelope,
  type Formula,
  type Quantity,
  type Recipe,
  type Step,
} from "../src/schemami/calculus.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");

type Vector = {
  name: string;
  operation: string;
  input: Record<string, unknown>;
  expected: Envelope;
};

const vectors = JSON.parse(
  readFileSync(join(REPO_ROOT, "conformance", "schemami-v1", "calculus.json"), "utf8"),
) as Vector[];

function replay(vector: Vector): Envelope {
  switch (vector.operation) {
    case "convert_quantity":
      return convertQuantity(
        vector.input.quantity as Quantity,
        vector.input.target_unit as string,
        vector.input.pointer as string,
      );
    case "reading_order":
      return readingOrder(vector.input.steps as Step[]);
    case "resolve_formula":
      return resolveFormula(vector.input.formula as Formula, vector.input.pointer as string);
    case "scale":
      return scale(vector.input.recipe as Recipe, vector.input.factor as string);
    case "schedule":
      return schedule(vector.input.steps as Step[]);
    default:
      throw new Error(`unsupported vector operation ${vector.operation}`);
  }
}

describe("Schemami v1 exact Calculus vectors", () => {
  for (const vector of vectors) {
    test(vector.name, () => expect(replay(vector)).toEqual(vector.expected));
  }
});

const knownOperations = new Set([
  "scale",
  "resolve_formula",
  "convert_quantity",
  "reading_order",
  "schedule",
]);

function expectKeys(value: object, expected: string[]): void {
  expect(Object.keys(value).sort()).toEqual([...expected].sort());
}

function validJsonPointer(pointer: string): boolean {
  if (pointer === "") return true;
  if (!pointer.startsWith("/")) return false;
  return pointer.slice(1).split("/").every((token) => !/(?:~$|~[^01])/.test(token));
}

test("all operation envelopes are closed and machine-only", () => {
  for (const vector of vectors) {
    const envelope = replay(vector);
    expect(knownOperations.has(envelope.operation)).toBe(true);
    if (envelope.status === "ok") {
      expectKeys(envelope, ["operation", "status", "result"]);
      const result = envelope.result as Record<string, unknown>;
      const resultKey = envelope.operation === "convert_quantity"
        ? "quantity"
        : envelope.operation === "scale" || envelope.operation === "resolve_formula"
          ? "quantities"
          : "steps";
      expectKeys(result, [resultKey]);
    } else if (envelope.status === "refused") {
      expectKeys(envelope, ["operation", "status", "problems"]);
      expect(envelope.problems?.length ?? 0).toBeGreaterThan(0);
      for (const problem of envelope.problems ?? []) {
        expectKeys(problem, problem.pointer === undefined ? ["type"] : ["type", "pointer"]);
        expect(problem.type.startsWith("https://schemami.dev/problems/")).toBe(true);
        if (problem.pointer !== undefined) expect(validJsonPointer(problem.pointer)).toBe(true);
      }
    } else {
      expectKeys(envelope, ["operation", "status"]);
    }
    expect(JSON.stringify(envelope)).not.toMatch(/"(?:title|detail|message|reason|instruction|raw_text|confidence)"/);
  }
});

test("the exact implementation has no runtime imports", () => {
  const source = readFileSync(join(REPO_ROOT, "sdk", "typescript", "src", "calculus.ts"), "utf8");
  const imports = source.split("\n").filter((line) => /^\s*(import\b|require\()/.test(line));
  expect(imports).toEqual([]);
});
