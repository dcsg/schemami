/**
 * Phase 11 (SR-TOOL-001): see-the-method and the loud omission notice.
 */
import { describe, expect, test } from "bun:test";
import { createJsEngine } from "./engine-js/index.ts";
import { loadSchemas } from "../conformance/repo.ts";
import type { LinkedMethod } from "./engine.ts";
import { isTemporalFragment, renderLinkOmissionNotice, renderLinkedMethod } from "./render.ts";

const ctx = { i18n: { taxonomy: {}, tags: {} }, names: {}, lang: "pt-PT", assets: {} };

const rouxDoc = {
  name: { pt: "Roux" },
  ingredients: [{ id: "b", raw: "manteiga", amount: { value: 2, unit: "tbsp" } }],
  steps: [{ id: "s1", primitive: { id: "primitive.heat", v: 1 }, title: { pt: "Derreter a manteiga" } }],
};

describe("capability pairing", () => {
  test("links capability is declared only when the corpus is injected", () => {
    const without = createJsEngine(loadSchemas());
    expect(without.capabilities.links).toBeFalsy();

    const withLinks = createJsEngine({
      ...loadSchemas(),
      links: { "technique.roux": { label: "Roux", document: rouxDoc } },
    });
    expect(withLinks.capabilities.links).toBe(true);
    expect(typeof withLinks.resolveLinks).toBe("function");
  });

  test("engine version stays 1 — capabilities only, never a breaking interface change", () => {
    expect(createJsEngine(loadSchemas()).version).toBe(1);
  });
});

describe("resolveLinks", () => {
  const engine = createJsEngine({
    ...loadSchemas(),
    links: { "technique.roux": { label: "Roux", document: rouxDoc } },
  });

  test("resolves a link the document actually mentions", async () => {
    const links = await engine.resolveLinks!({
      steps: [{ id: "s", primitive: { id: "technique.roux", v: 1 }, uses: [] }],
    });
    expect(links).toHaveLength(1);
    expect(links[0]!.mention).toBe("technique.roux");
  });

  test("offers nothing the document never asked for", async () => {
    const links = await engine.resolveLinks!({
      steps: [{ id: "s", primitive: { id: "primitive.mix", v: 1 } }],
    });
    expect(links).toHaveLength(0);
  });
});

describe("rendering the linked method", () => {
  const link: LinkedMethod = { mention: "technique.roux", label: "Roux", document: rouxDoc };

  test("renders in place without losing the parent, and without duplicate ids", () => {
    const html = renderLinkedMethod(link, 0, ctx);
    expect(html).toContain("Ver o método: Roux");
    expect(html).toContain("Derreter a manteiga");
    // The nesting hazard: a doc-block or a scale-input inside a
    // document would collide with the parent's, and app.ts's
    // querySelector is first-match-wins.
    expect(html).not.toContain("doc-block");
    expect(html).not.toContain("scale-input");
  });

  test("uses details/summary so it is keyboard- and AT-reachable", () => {
    const html = renderLinkedMethod(link, 0, ctx);
    expect(html).toContain("<details");
    expect(html).toContain("<summary>");
  });
});

describe("omission", () => {
  test("a poorer engine says what is missing rather than going silent", () => {
    const notice = renderLinkOmissionNotice(2);
    expect(notice).toContain("2");
    expect(notice).toContain("omitidas");
    expect(notice).toContain("incompleto");
    expect(notice).toContain('role="status"');
  });

  test("nothing omitted renders nothing", () => {
    expect(renderLinkOmissionNotice(0)).toBe("");
  });
});

describe("media fragments", () => {
  test("the temporal grammar is an allowlist", () => {
    for (const ok of ["t=120,180", "t=10", "t=1.5,2.75", "t=npt:120,180"]) {
      expect(isTemporalFragment(ok), ok).toBe(true);
    }
    for (const bad of [
      "",
      "t=",
      "xywh=0,0,10,10",
      "t=abc",
      "javascript:alert(1)",
      "t=1,2;evil",
      "track=audio",
    ]) {
      expect(isTemporalFragment(bad), bad).toBe(false);
    }
  });
});
