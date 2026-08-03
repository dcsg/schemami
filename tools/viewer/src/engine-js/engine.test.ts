/**
 * Engine interface contract tests (DS-TOOL-001; AC-6.3) — pinned for the
 * future WASM implementer — plus the YAML pathologies this repo already
 * met in anger (duplicate keys swallowed by a lenient parser; flow-map
 * unquoted commas) and verdict layer-tagging.
 */
import { expect, test } from "bun:test";
import { createJsEngine } from "./index.ts";
import { loadSchemas } from "../../conformance/repo.ts";

const engine = createJsEngine(loadSchemas());

const MINIMAL = `rcp: 1
id: contract-fixture
kind: component
name: { en: Contract fixture }
ingredients:
  - id: x
    amount: { value: 10, unit: g }
`;

test("contract: capabilities match defined members (clamp↔scale, timeline↔schedule)", () => {
  expect(engine.version).toBe(1);
  expect(engine.capabilities.l1).toBe(true);
  // v0.3: the JS engine computes — declared capability and defined member
  // must agree in BOTH directions (the reserved-member rule).
  expect(engine.capabilities.clamp).toBe(true);
  expect(typeof engine.scale).toBe("function");
  expect(engine.capabilities.timeline).toBe(true);
  expect(typeof engine.schedule).toBe("function");
});

test("contract: analyze never throws; parse failure yields ok:false and no documents", async () => {
  const r = await engine.analyze(":\n  - not: [valid: yaml");
  expect(r.parse.ok).toBe(false);
  expect(r.parse.errors.length).toBeGreaterThan(0);
  expect(r.documents).toHaveLength(0);
});

test("contract: valid document yields canonical JSON and layer-tagged verdicts", async () => {
  const r = await engine.analyze(MINIMAL);
  expect(r.parse.ok).toBe(true);
  expect(r.documents).toHaveLength(1);
  const d = r.documents[0]!;
  expect(d.id).toBe("contract-fixture");
  expect(d.valid).toBe(true);
  expect((d.canonical as { id: string }).id).toBe("contract-fixture");
  for (const v of d.verdicts) {
    expect(["l1", "l2", "cue"]).toContain(v.layer);
  }
});

test("pathology: duplicate mapping keys are a parse error, never silently last-wins", async () => {
  const r = await engine.analyze(`rcp: 1
id: dup
id: dup-two
kind: component
name: { en: Dup }
ingredients: [{ id: x, amount: { value: 1, unit: g } }]
`);
  expect(r.parse.ok).toBe(false);
});

test("pathology: unquoted comma text inside a flow map fails parse rather than corrupting", async () => {
  const r = await engine.analyze(`rcp: 1
id: flow
kind: component
name: { en: One, two and three }
ingredients: [{ id: x, amount: { value: 1, unit: g } }]
`);
  // "One, two and three" in a flow map is LEGAL YAML — it parses as
  // {en: One, "two and three": null}. The defense is not the parser but
  // L1: the malformed text object MUST be rejected, so the mangled name
  // can never slip through as a valid document (the dogfood lesson).
  expect(r.parse.ok).toBe(true);
  expect(r.documents[0]!.valid).toBe(false);
  expect(
    r.documents[0]!.verdicts.some((v) => v.severity === "error" && v.pointer.includes("name")),
  ).toBe(true);
});

test("composition: unknown-kind document is core-only with an explicit warning", async () => {
  // kind must be enum-valid for core, so use a kind with no profile file:
  // all 8 kinds have profiles now EXCEPT none — synthesize by removing a
  // profile from the schema set instead.
  const schemas = loadSchemas();
  delete schemas.profiles["component"];
  const e2 = createJsEngine(schemas);
  const r = await e2.analyze(MINIMAL);
  const d = r.documents[0]!;
  expect(d.profile).toBeNull();
  expect(d.verdicts.some((v) => v.severity === "warning" && v.message.includes("core-only"))).toBe(true);
});

test("verdict tagging: an invalid document's errors are l1-tagged with pointers", async () => {
  const r = await engine.analyze(`rcp: 1
id: bad-difficulty
kind: component
name: { en: Bad }
taxonomy: { difficulty: 9 }
ingredients: [{ id: x, amount: { value: 1, unit: g } }]
`);
  const d = r.documents[0]!;
  expect(d.valid).toBe(false);
  const hit = d.verdicts.find((v) => v.pointer.includes("difficulty") || v.pointer.includes("taxonomy"));
  expect(hit).toBeDefined();
  expect(hit!.layer).toBe("l1");
});
