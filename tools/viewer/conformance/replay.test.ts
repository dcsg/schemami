/**
 * Conformance replay (SAC-TOOL-002; AC-6.3): rcplint exports the vectors,
 * this suite replays every one through the JS engine and diffs verdicts —
 * CAPABILITY-SCOPED: expected verdicts are filtered to the layers this
 * engine declares, so the same vectors serve the future L1+L2+CUE WASM
 * engine unchanged (architect pre-flight finding). Red on any
 * disagreement; fixes land in the engine, never in vectors.
 */
import { describe, expect, test } from "bun:test";
import { createJsEngine } from "../src/engine-js/index.ts";
import { loadSchemas, loadVectors, readSource } from "./repo.ts";

const engine = createJsEngine(loadSchemas());
const vectors = loadVectors();
const layers = new Set(
  (Object.keys(engine.capabilities) as (keyof typeof engine.capabilities)[]).filter(
    (k) => engine.capabilities[k] === true && k !== "clamp",
  ),
);

test("vector set is present and substantial", () => {
  const totalVerdicts = vectors.flatMap((v) => v.expected ?? []).length;
  expect(vectors.length).toBeGreaterThanOrEqual(12);
  expect(totalVerdicts).toBeGreaterThanOrEqual(15);
});

test("no vector references private content", () => {
  for (const v of vectors) {
    expect(v.source).not.toContain("private/");
  }
});

describe("verdict agreement with rcplint", () => {
  for (const vector of vectors) {
    test(vector.source, async () => {
      const result = await engine.analyze(readSource(vector.source));
      expect(result.parse.ok).toBe(vector.parse_ok);
      if (!vector.parse_ok) return;

      const scoped = (vector.expected ?? []).filter((e) => layers.has(e.layer));
      for (const exp of scoped) {
        const got = result.documents.find((d) => d.id === exp.doc);
        expect(got, `document ${exp.doc} missing from engine output`).toBeDefined();
        expect(got!.valid, `${vector.source}#${exp.doc} validity`).toBe(exp.valid);
        expect(got!.profile ?? undefined, `${vector.source}#${exp.doc} profile`).toBe(
          exp.profile,
        );
        expect(got!.maturity ?? undefined, `${vector.source}#${exp.doc} maturity`).toBe(
          exp.maturity,
        );
      }
    });
  }
});
