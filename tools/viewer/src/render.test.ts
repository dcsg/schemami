/**
 * Render-core tests (AC-7.2, AC-7.4): pure-function assertions — sections,
 * ORACLE-PINNED basis strings (copied from rcplint facts: nata's
 * massa-folhada salt_ratio 0.02 of flour=500g → 10 g), injection fixtures
 * render inert, parse-error state escapes, and the MOCK ENGINE proof that
 * an {l1, l2} engine renders extra layers with ZERO UI change (ADR-002).
 */
import { expect, test } from "bun:test";
import { createJsEngine } from "./engine-js/index.ts";
import { loadSchemas, readSource } from "../conformance/repo.ts";
import { esc, renderDocument, renderVerdicts } from "./render.ts";
import type { AnalysisResult, Capabilities } from "./engine.ts";

const engine = createJsEngine(loadSchemas());
const ctx = {
  lang: "pt-PT",
  i18n: { taxonomy: { bread: "Pão", pastry: "Pastelaria" }, tags: { classic: "Clássico" } },
};

test("sections: nata renders name, ingredients with ORACLE-pinned basis strings, steps, maturity badge", async () => {
  const r = await engine.analyze(readSource("examples/other-categories.rcp.yaml"));
  const nata = r.documents.find((d) => d.id === "pasteis-de-nata")!;
  const html = renderDocument(nata, ctx);
  expect(html).toContain("<h2");
  expect(html).toContain("core ∧ pastry");
  expect(html).toContain("hardened");
  // ORACLE (rcplint facts, 2026-08-02): salt_ratio 0.02 of flour; flour
  // basis = 500 g simple sum → 10 g. hydration 0.55 → 275 g.
  expect(html).toContain("2% · flour (10 g)");
  expect(html).toContain("55% · flour (275 g)");
  expect(html).toContain('<ol class="steps">');
});

test("injection: script/onerror content in name, notes and taxonomy renders inert", async () => {
  const r = await engine.analyze(`rcp: 1
id: evil
kind: component
name: { en: "<script>alert(1)</script>" }
description: { en: "<img src=x onerror=alert(2)>" }
ingredients:
  - id: x
    amount: { value: 1, unit: g }
    note: { en: "</li><meta http-equiv=refresh content=0>" }
`);
  const html = renderDocument(r.documents[0]!, ctx) + renderVerdicts(r, engine.capabilities);
  expect(html).not.toContain("<script>alert");
  expect(html).not.toContain("<img src=x");
  expect(html).not.toContain("<meta http-equiv");
  expect(html).toContain("&lt;script&gt;");
});

test("parse-error state: message rendered, escaped, no recipe body", async () => {
  const r = await engine.analyze("name: <b>oops</b>\n\tbroken");
  expect(r.parse.ok).toBe(false);
  const html = renderVerdicts(r, engine.capabilities);
  expect(html).toContain("parse-error");
  expect(html).not.toContain("<b>oops</b>");
});

test("MOCK ENGINE {l1,l2}: additional layers render with zero UI change", () => {
  const caps: Capabilities = { l1: true, l2: true };
  const result: AnalysisResult = {
    parse: { ok: true, errors: [] },
    documents: [
      {
        id: "mock",
        kind: "bread",
        profile: "bread",
        maturity: "hardened",
        valid: false,
        canonical: { id: "mock", name: { en: "Mock" } },
        verdicts: [
          { layer: "l1", pointer: "/x", message: "shape", severity: "error" },
          { layer: "l2", pointer: "/y", message: "semantic finding from a future engine", severity: "warning" },
        ],
      },
    ],
  };
  const html = renderVerdicts(result, caps);
  expect(html).toContain("<h3>L1</h3>");
  expect(html).toContain("<h3>L2</h3>"); // no layer hardcoding — it just renders
  expect(html).toContain("semantic finding from a future engine");
});

test("esc covers the five metacharacters", () => {
  expect(esc(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
});
