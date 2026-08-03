/**
 * Phase 8 surfaces (SR-TOOL-003): the scale HAPPY PATH renders changed
 * amounts; refusals carry authored pt/en verbatim; the schedule view
 * humanizes and day-groups — tested on the TORTA and the ENTREMET;
 * richer/poorer mock engines prove controls appear/vanish with zero UI
 * code change; comma-tolerant factor parsing.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createJsEngine } from "./engine-js/index.ts";
import { loadSchemas, readSource } from "../conformance/repo.ts";
import type { Capabilities, DocumentAnalysis } from "./engine.ts";
import {
  humanizeDuration,
  renderClampRefusals,
  renderDocument,
  renderDocumentBlock,
  renderSchedule,
} from "./render.ts";
import { parseFactor } from "./app.ts";

const engine = createJsEngine(loadSchemas());
const ctx = { i18n: { taxonomy: {}, tags: {} }, names: {}, lang: "pt-PT", assets: {} };

const chucruteLike = {
  id: "chucrute-t",
  bases: { veg: { sum: "ingredients", where: { roles: ["substrate"] } } },
  ingredients: [
    { id: "cabbage", item: "ingredient.veg.cabbage", amount: { value: 1000, unit: "g" }, roles: ["substrate"] },
    {
      id: "salt",
      item: "ingredient.salt.fine",
      amount: { value: 20, unit: "g", scaling: "fixed" },
      roles: ["salt"],
      constraints: [
        {
          min_ratio: 0.018,
          of: "veg",
          severity: "critical",
          reason: { pt: "Sal abaixo de 1,8% não preserva.", en: "Salt below 1.8% does not preserve." },
        },
      ],
    },
  ],
};

describe("engine clamp capability", () => {
  test("declares clamp + timeline and defines scale/schedule", () => {
    expect(engine.capabilities.clamp).toBe(true);
    expect(engine.capabilities.timeline).toBe(true);
    expect(typeof engine.scale).toBe("function");
    expect(typeof engine.schedule).toBe("function");
  });

  test("happy path: accepted scale returns the SCALED canonical and amounts change", async () => {
    const r = await engine.scale!(chucruteLike, 0.6);
    expect(r.accepted).toBe(true);
    const scaled = r.scaled as Record<string, unknown>;
    const ings = scaled["ingredients"] as Record<string, unknown>[];
    expect((ings[0]!["amount"] as Record<string, unknown>)["value"]).toBe(600);
    // fixed quantity does NOT scale (the asymmetry):
    expect((ings[1]!["amount"] as Record<string, unknown>)["value"]).toBe(20);
  });

  test("refusal carries the authored pt AND en reasons verbatim", async () => {
    const r = await engine.scale!(chucruteLike, 2);
    expect(r.accepted).toBe(false);
    expect(r.scaled).toBeUndefined();
    const all = r.reasons.map((x) => x.pt ?? "").join("\n");
    expect(all).toContain("Sal abaixo de 1,8% não preserva.");
    expect(all).toContain("Salt below 1.8% does not preserve.");
  });

  test("non-positive factor refused", async () => {
    const r = await engine.scale!(chucruteLike, 0);
    expect(r.accepted).toBe(false);
  });
});

describe("scaled render (the control is not a no-op)", () => {
  test("re-rendering with result.scaled visibly changes ingredient amounts", async () => {
    const before = renderDocument(analysisOf(chucruteLike), ctx);
    expect(before).toContain("1000 g");
    const clamp = await engine.scale!(chucruteLike, 0.6);
    const after = renderDocument(analysisOf(clamp.scaled), ctx);
    expect(after).toContain("600 g");
    expect(after).not.toContain("1000 g");
    expect(after).toContain("20 g"); // fixed salt unmoved
  });

  test("refusal block renders pt primary with role=alert", () => {
    const html = renderClampRefusals([
      { pt: "Sal abaixo de 1,8% não preserva.", en: "Salt below 1.8% does not preserve." },
    ]);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Sal abaixo de 1,8% não preserva.");
  });
});

function analysisOf(canonical: unknown): DocumentAnalysis {
  return { id: "x", kind: "recipe", profile: null, maturity: null, valid: true, verdicts: [], canonical };
}

describe("capability-driven controls (zero UI code change)", () => {
  const doc = analysisOf({ name: "T", ingredients: [] });
  test("richer engine ({l1, clamp, timeline}) shows the control", () => {
    const caps: Capabilities = { l1: true, clamp: true, timeline: true };
    const html = renderDocumentBlock(doc, 0, ctx, caps);
    expect(html).toContain("scale-control");
    expect(html).toContain("Aplicar");
    expect(html).toContain("<label");
    expect(html).toContain('inputmode="decimal"');
    expect(html).toContain("aria-describedby");
  });
  test("poorer engine ({l1}) hides it", () => {
    const caps: Capabilities = { l1: true };
    const html = renderDocumentBlock(doc, 0, ctx, caps);
    expect(html).not.toContain("scale-control");
  });
});

describe("comma-tolerant factor parsing (pt-PT UI)", () => {
  test("accepts comma and dot decimals", () => {
    expect(parseFactor("1,5")).toBe(1.5);
    expect(parseFactor("0.6")).toBe(0.6);
    expect(parseFactor(" 2 ")).toBe(2);
  });
  test("rejects zero, negatives, junk and empty", () => {
    expect(parseFactor("0")).toBe(null);
    expect(parseFactor("-1")).toBe(null);
    expect(parseFactor("abc")).toBe(null);
    expect(parseFactor("")).toBe(null);
    expect(parseFactor("1,5,5")).toBe(null);
  });
});

describe("schedule view", () => {
  test("humanizes durations in pt-PT", () => {
    expect(humanizeDuration(900)).toBe("15 min");
    expect(humanizeDuration(9000)).toBe("2 h 30 min");
    expect(humanizeDuration(129600)).toBe("1 d 12 h");
    expect(humanizeDuration(0)).toBe("0 min");
  });

  test("TORTA: single-day plan — everything groups under 'no dia'", async () => {
    const text = readFileSync(join(import.meta.dir, "..", "example.rcp.yaml"), "utf8");
    const r = await engine.analyze(text);
    const torta = r.documents[0]!;
    const entries = await engine.schedule!(torta.canonical);
    expect(entries.length).toBeGreaterThan(0);
    const html = renderSchedule(entries);
    expect(html).toContain("Plano de execução");
    expect(html).toContain("no dia");
    expect(html).not.toContain("véspera");
    expect(html).not.toContain("dias antes");
    expect(html).toContain("<ol>");
    expect(html).toContain("<time");
  });

  test("ENTREMET: multi-day plan — day grouping surfaces 'dias antes' and 'véspera'", async () => {
    const r = await engine.analyze(readSource("tools/rcplint/testdata/calc/entremet.rcp.yaml"));
    const entremet = r.documents[0]!;
    const entries = await engine.schedule!(entremet.canonical);
    const negative = entries.filter((e) => e.start.target < 0);
    expect(negative.length).toBeGreaterThan(0); // components start before t0
    const html = renderSchedule(entries);
    expect(html).toContain("dias antes");
    expect(html).toContain("véspera");
    expect(html).toContain("no dia");
    expect(html).toContain("antes</span>");
  });

  test("empty timeline renders nothing", () => {
    expect(renderSchedule([])).toBe("");
  });
});
