import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFactor } from "../src/schemami/app.ts";
import { createSchemamiEngine } from "../src/schemami/engine.ts";
import { renderAnalysis, renderDocument } from "../src/schemami/render.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");
const schema = JSON.parse(readFileSync(join(REPO_ROOT, "schema", "schemami-v1-core.schema.json"), "utf8"));
const engine = createSchemamiEngine(schema);
const context = { unitLabels: { "1": "unidade", g: "g", mL: "mL", "[cup_us]": "chávena US" } };
const corpus = JSON.parse(readFileSync(join(REPO_ROOT, "conformance", "schemami-v1", "validation.json"), "utf8")) as {
  vectors: Array<{ id: string; expected_valid: boolean; document: Record<string, unknown> }>;
};
const source = (name: string) => readFileSync(join(REPO_ROOT, "tools", "schemami", "testdata", name), "utf8");

test("shared Schemami v1 structured validation vectors", async () => {
  for (const vector of corpus.vectors) {
    const analysis = (await engine.analyze(JSON.stringify(vector.document))).documents[0]!;
    expect(analysis.valid, vector.id).toBe(vector.expected_valid);
  }
});

test("viewer validates, calculates, and renders the structured example", async () => {
  const analysis = (await engine.analyze(readFileSync(join(REPO_ROOT, "examples", "pao-massa-mae.schemami.yaml"), "utf8"))).documents[0]!;
  expect(analysis.valid).toBe(true);
  const formula = engine.resolveFormula(analysis.canonical, "dough");
  const schedule = engine.schedule(analysis.canonical);
  const html = renderDocument(analysis, context, [formula], undefined, schedule);
  expect(html).toContain("Pão de massa-mãe");
  expect(html).toContain("100 g");
  expect(html).toContain("500 g");
  expect(html).toContain("375 g");
  expect(html).toContain("Misture os ingredientes.");
  expect(html).toContain("PT8M");
  expect(html).toContain("Mafra");
  expect(html).toContain("pao-massa-mae.mp4#t=300,600");
  expect(html).not.toContain("500 g de farinha");
});

test("viewer scales through exact structured Calculus without rewriting canonical input", async () => {
  const analysis = (await engine.analyze(readFileSync(join(REPO_ROOT, "examples", "pao-massa-mae.schemami.yaml"), "utf8"))).documents[0]!;
  const before = JSON.stringify(analysis.canonical);
  const scaled = engine.scale(analysis.canonical, "2");
  const html = renderDocument(analysis, context, [engine.resolveFormula(analysis.canonical, "dough")], scaled);
  expect(html).toContain("200 g");
  expect(html).toContain("1000 g");
  expect(html).toContain("750 g");
  expect(JSON.stringify(analysis.canonical)).toBe(before);
});

test("unknown recipe-local concepts validate and render from authored labels", async () => {
  const analysis = (await engine.analyze(source("local-entities.schemami.yaml"))).documents[0]!;
  expect(analysis.valid).toBe(true);
  const html = renderDocument(analysis, context);
  expect(html).toContain("Mistura secreta da casa");
  expect(html).toContain("Dobra da casa");
  expect(html).toContain("Panela experimental X");
});

test("range, open, ratio, and integrator unit labels render explicitly", async () => {
  const document = {
    schemami: "1", collection: "test", id: "quantities", revision: 1, content_language: "pt-PT", title: "Quantidades",
    ingredients: [
      { id: "flour", name: "Farinha" }, { id: "water", name: "Água" },
      { id: "salt", name: "Sal", quantity: { kind: "range", minimum: "8", maximum: "10", unit: "g" } },
      { id: "oil", name: "Azeite", quantity: { kind: "open", qualifier: "as_needed" } },
    ],
    formulas: [{ id: "mix", kind: "ratio", terms: [
      { input: { kind: "ingredient", id: "flour" }, parts: "1" },
      { input: { kind: "ingredient", id: "water" }, parts: "2" },
    ], target: { kind: "measured", value: "3", unit: "[cup_us]" } }],
    method: { sequence: [] },
  };
  const analysis = (await engine.analyze(JSON.stringify(document))).documents[0]!;
  expect(analysis.valid).toBe(true);
  const html = renderDocument(analysis, context, [engine.resolveFormula(analysis.canonical, "mix")]);
  expect(html).toContain("1:2");
  expect(html).toContain("1 chávena US");
  expect(html).toContain("2 chávena US");
  expect(html).toContain("8–10 g");
  expect(html).toContain("quanto baste");
});

test("legacy RCP input is refused without fallback", async () => {
  const result = await engine.analyze("rcp: 1\nid: old\n");
  expect(result.documents[0]!.valid).toBe(false);
  expect(result.documents[0]!.problems[0]?.type).toBe("https://schemami.dev/problems/unsupported-legacy");
  expect(renderAnalysis(result)).toContain("unsupported-legacy");
});

test("cyclic YAML aliases return a parse result instead of throwing", async () => {
  const result = await engine.analyze("schemami: '1'\na: &a\n  self: *a\n");
  expect(result.parse.ok).toBe(false);
  expect(result.documents).toHaveLength(0);
});

test("untrusted structured prose is escaped", async () => {
  const document = { schemami: "1", collection: "test", id: "unsafe", revision: 1, content_language: "pt-PT", title: "<img src=x onerror=alert(1)>", ingredients: [{ id: "x", name: "</li><script>alert(1)</script>" }], method: { sequence: [] } };
  const analysis = (await engine.analyze(JSON.stringify(document))).documents[0]!;
  const html = renderDocument(analysis, context);
  expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  expect(html).toContain("&lt;/li&gt;&lt;script&gt;");
  expect(html).not.toContain("<script>alert");
});

test("presentation factor input follows the canonical decimal contract", () => {
  expect(parseFactor("1,5")).toBe("1.5");
  expect(parseFactor("0.5000")).toBe("0.5");
  expect(parseFactor("0")).toBeNull();
  expect(parseFactor("1.00001")).toBeNull();
});

test("active viewer has no registry, locale map, or runtime evidence dependency", () => {
  const files = ["engine.ts", "render.ts", "app.ts", "main.ts", "source-view.ts"];
  const active = files.map((file) => readFileSync(join(REPO_ROOT, "tools", "viewer", "src", "schemami", file), "utf8")).join("\n");
  expect(active).not.toMatch(/registry\/|EMBEDDED_NAMES|locale map/i);
  expect(readFileSync(join(REPO_ROOT, "tools", "viewer", "build.ts"), "utf8")).not.toMatch(/registry\/|i18n\//);
});
