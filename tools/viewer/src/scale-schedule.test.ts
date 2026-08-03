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
  docYield,
  humanizeDuration,
  renderClampRefusals,
  renderDocument,
  renderDocumentBlock,
  renderSchedule,
  renderScaleControl,
  scheduleLabels,
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

describe("yield-aware scale control (a recipe 'makes 12 madalenas')", () => {
  test("docYield reads scaling.default_yield.units", () => {
    expect(docYield({ scaling: { default_yield: { units: 3 } } })).toBe(3);
    expect(docYield({ scaling: {} })).toBe(null);
    expect(docYield({})).toBe(null);
    expect(docYield({ scaling: { default_yield: { units: 0 } } })).toBe(null);
  });

  test("with a yield: control asks Quantidade, prefilled with the default", () => {
    const html = renderScaleControl(0, 12);
    expect(html).toContain("Quantidade");
    expect(html).toContain('value="12"');
    expect(html).toContain("padrão: 12");
    expect(html).toContain('data-yield="12"');
    expect(html).not.toContain("Fator de escala");
  });

  test("without a yield: bare factor control unchanged", () => {
    const html = renderScaleControl(0, null);
    expect(html).toContain("Fator de escala");
    expect(html).toContain('value="1"');
    expect(html).not.toContain("data-yield");
  });

  test("document block derives the yield from the canonical", () => {
    const d = analysisOf({ name: "T", scaling: { default_yield: { units: 12 } } });
    const html = renderDocumentBlock(d, 0, ctx, { l1: true, clamp: true });
    expect(html).toContain("Quantidade");
    expect(html).toContain("padrão: 12");
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

  test("TORTA: single-day plan — lone day header suppressed, real labels not ids", async () => {
    const text = readFileSync(join(import.meta.dir, "..", "example.rcp.yaml"), "utf8");
    const r = await engine.analyze(text);
    const torta = r.documents[0]!;
    const entries = await engine.schedule!(torta.canonical);
    expect(entries.length).toBeGreaterThan(0);
    const html = renderSchedule(entries, scheduleLabels(torta.canonical, ctx));
    expect(html).toContain("Plano de execução");
    // one-day plan: no day headings at all — the plan is just the plan
    expect(html).not.toContain("<h4>");
    expect(html).not.toContain("véspera");
    expect(html).toContain("<ol>");
    expect(html).toContain("<time");
    // labels resolve to the authored step voice, never raw ids
    expect(html).toContain("Bater a manteiga");
    expect(html).not.toContain("sched-item\">montar<");
  });

  test("labels: title wins, else verb — objects; components label by name; zero offsets silent", () => {
    const canonical = {
      name: { pt: "Bolos mármore" },
      ingredients: [{ id: "manteiga", raw: "manteiga", amount: { value: 180, unit: "g" } }],
      steps: [
        { id: "bater-manteiga", primitive: { id: "primitive.mix", v: 1 }, uses: ["manteiga"] },
        { id: "cozer", primitive: { id: "primitive.bake", v: 1 }, title: { pt: "Cozer 35 minutos a 170 C" }, after: ["bater-manteiga"], duration: { target: "35m" } },
      ],
    };
    const labels = scheduleLabels(canonical, ctx);
    expect(labels["bater-manteiga"]).toBe("primitive.mix — manteiga");
    expect(labels["cozer"]).toBe("Cozer 35 minutos a 170 C");
    const entries = [
      { item: "bater-manteiga", start: { min: 0, target: 0, max: 0 }, duration: { min: 0, target: 0, max: 0 } },
      { item: "cozer", start: { min: 0, target: 0, max: 0 }, duration: { min: 2100, target: 2100, max: 2100 } },
    ];
    const html = renderSchedule(entries, labels);
    expect(html).toContain("Cozer 35 minutos a 170 C");
    expect(html).toContain("primitive.mix — manteiga");
    expect(html).not.toContain("sched-offset"); // zero starts: numbering carries sequence
    expect(html).not.toContain("no início");
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
