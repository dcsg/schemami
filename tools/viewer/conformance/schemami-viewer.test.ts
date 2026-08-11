import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFactor } from "../src/schemami/app.ts";
import { createSchemamiEngine } from "../src/schemami/engine.ts";
import { renderAnalysis, renderDocument } from "../src/schemami/render.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");

const schema = JSON.parse(
  readFileSync(join(REPO_ROOT, "schema", "schemami-v1-core.schema.json"), "utf8"),
);
const engine = createSchemamiEngine(schema);
const context = { unitLabels: { g: "g", mL: "mL", "[cup_us]": "chávena US" } };

const source = (name: string) => readFileSync(
  join(REPO_ROOT, "tools", "schemami", "testdata", name),
  "utf8",
);

test("viewer admits and renders the Schemami example without evidence prose", async () => {
  const result = await engine.analyze(readFileSync(
    join(REPO_ROOT, "examples", "pao-massa-mae.schemami.yaml"),
    "utf8",
  ));
  expect(result.parse.ok).toBe(true);
  expect(result.documents).toHaveLength(1);
  const analysis = result.documents[0]!;
  expect(analysis.valid).toBe(true);
  const formula = engine.resolveFormula(analysis.canonical.formula as never);
  const schedule = engine.schedule(analysis.canonical);
  const html = renderDocument(analysis, context, formula, undefined, schedule);
  expect(html).toContain("Pão de massa-mãe");
  expect(html).toContain("100 g");
  expect(html).toContain("500 g");
  expect(html).toContain("375 g");
  expect(html).toContain("Ativa, no pico de fermentação.");
  expect(html).toContain("PT8M");
  expect(html).not.toContain("500 g de farinha");
  expect(html).not.toContain("confidence");
});

test("viewer scales through exact Calculus without rewriting the document", async () => {
  const result = await engine.analyze(readFileSync(
    join(REPO_ROOT, "examples", "pao-massa-mae.schemami.yaml"),
    "utf8",
  ));
  const analysis = result.documents[0]!;
  const before = JSON.stringify(analysis.canonical);
  const scaled = engine.scale(analysis.canonical, "2");
  const html = renderDocument(
    analysis,
    context,
    engine.resolveFormula(analysis.canonical.formula as never),
    scaled,
  );
  expect(html).toContain("200 g");
  expect(html).toContain("1000 g");
  expect(html).toContain("750 g");
  expect(JSON.stringify(analysis.canonical)).toBe(before);
});

test("unknown local concepts validate and render from their own names", async () => {
  const result = await engine.analyze(source("local-entities.schemami.yaml"));
  expect(result.documents[0]!.valid).toBe(true);
  const html = renderDocument(result.documents[0]!, context);
  expect(html).toContain("Mistura secreta da casa");
  expect(html).toContain("Dobra da casa");
  expect(html).toContain("Panela experimental X");
});

test("range, open, ratio, and integrator unit labels render explicitly", async () => {
  const text = `schemami: "1"
collection: test
id: quantities
revision: 1
content_language: pt-PT
title: Quantidades
ingredients:
  - { id: flour, name: Farinha }
  - { id: water, name: Água }
  - { id: salt, name: Sal, quantity: { kind: range, minimum: "8", maximum: "10", unit: g } }
  - { id: oil, name: Azeite, quantity: { kind: open, qualifier: as_needed } }
formula:
  kind: ratio
  terms:
    - { ingredient: flour, parts: "1" }
    - { ingredient: water, parts: "2" }
  target: { kind: measured, value: "3", unit: "[cup_us]" }
steps: []
`;
  const result = await engine.analyze(text);
  expect(result.documents[0]!.valid).toBe(true);
  const html = renderDocument(
    result.documents[0]!,
    context,
    engine.resolveFormula(result.documents[0]!.canonical.formula as never),
  );
  expect(html).toContain("1:2");
  expect(html).toContain("1 chávena US");
  expect(html).toContain("2 chávena US");
  expect(html).toContain("8–10 g");
  expect(html).toContain("quanto baste");
});

test("legacy RCP input is refused without fallback", async () => {
  const result = await engine.analyze("rcp: 1\nid: old\n");
  expect(result.parse.ok).toBe(true);
  expect(result.documents[0]!.valid).toBe(false);
  expect(result.documents[0]!.problems).toEqual([{
    type: "https://schemami.dev/problems/unsupported-legacy",
    pointer: "",
    message: "RCP input is not supported by Schemami v1.",
  }]);
  expect(renderAnalysis(result)).toContain("unsupported-legacy");
});

test("untrusted source prose is escaped", async () => {
  const result = await engine.analyze(`schemami: "1"
collection: test
id: unsafe
revision: 1
content_language: pt-PT
title: "<img src=x onerror=alert(1)>"
ingredients: [{ id: x, name: "</li><script>alert(1)</script>" }]
steps: []
`);
  const html = renderDocument(result.documents[0]!, context);
  expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  expect(html).toContain("&lt;/li&gt;&lt;script&gt;");
  expect(html).not.toContain("<script>alert");
});

test("presentation factor input normalizes to the canonical decimal contract", () => {
  expect(parseFactor("1,5")).toBe("1.5");
  expect(parseFactor("0.5000")).toBe("0.5");
  expect(parseFactor("0")).toBeNull();
  expect(parseFactor("1.00001")).toBeNull();
});

test("active Schemami viewer has no registry, locale map, or evidence dependency", () => {
  const files = ["engine.ts", "render.ts", "app.ts", "main.ts", "source-view.ts"];
  const active = files.map((file) => readFileSync(
    join(REPO_ROOT, "tools", "viewer", "src", "schemami", file),
    "utf8",
  )).join("\n");
  expect(active).not.toMatch(/registry\/|EMBEDDED_NAMES|locale map/i);
  expect(readFileSync(join(REPO_ROOT, "tools", "viewer", "build.ts"), "utf8")).not.toMatch(/registry\/|i18n\//);
});
