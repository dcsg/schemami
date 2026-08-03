/**
 * Pure render core (SR-TOOL-001 UI half; SSP-004: NO validation logic —
 * this renders what an engine returned). Every function here is
 * string-in/string-out so the whole layer is testable without a DOM and
 * app.ts stays assignment-only glue (frontend pre-flight findings).
 *
 * ESCAPING IS LAW: every interpolated text value — including engine error
 * messages, which echo document content — goes through esc(). Pasted
 * documents are untrusted input; CSP is the backstop, not the defense.
 *
 * Styling: classes only, never style="" attributes (CSP bans them).
 *
 * lang is a parameter (default pt-PT, English fallback) so a future
 * language toggle never changes this signature — v0.2 ships always-pt-PT
 * by recorded decision.
 */
import type { AnalysisResult, Capabilities, Diagnostic, DocumentAnalysis } from "./engine.ts";

export interface I18nVocab {
  taxonomy: Record<string, string>;
  tags: Record<string, string>;
}

export interface RenderContext {
  i18n: I18nVocab;
  /** Registry display-name layer: entry id -> {pt?, en?}. */
  names: Record<string, Record<string, string>>;
  lang: string; // "pt-PT" in v0.2
  /**
   * Locally supplied media: URI BASENAME -> object URL (schema/MEDIA.md).
   * Presentation state only — never serialized back into documents.
   */
  assets: Record<string, string>;
}

export function esc(v: unknown): string {
  return String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type Dict = Record<string, unknown>;
const asDict = (v: unknown): Dict => (v && typeof v === "object" ? (v as Dict) : {});
const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Prose values are either bare strings or locale maps ($defs/text). */
function text(v: unknown, lang: string): string {
  if (typeof v === "string") return v;
  const m = asDict(v);
  const short = lang.split("-")[0]!;
  return String(m[lang] ?? m[short] ?? m["en"] ?? Object.values(m)[0] ?? "");
}

function term(slug: string, table: Record<string, string>): string {
  return table[slug] ?? slug; // English-base slug is its own fallback
}

/** Registry entry id -> localized display name; the id itself is the honest fallback. */
function displayName(id: string, ctx: RenderContext): string {
  const dn = ctx.names[id];
  if (!dn) return id;
  const short = ctx.lang.split("-")[0]!;
  return dn[ctx.lang] ?? dn[short] ?? dn["en"] ?? id;
}

/**
 * Display-time basis resolution for ratio amounts: sum of same-scope
 * ingredients whose roles intersect the basis `where.roles`, when units
 * are uniform. Pinned against rcplint facts output for the nata case
 * (render.test.ts) — divergence from the oracle is a test failure, the
 * founding-disease guard. Component-inclusive bases render the ratio
 * without a computed absolute rather than guessing.
 */
function basisSum(doc: Dict, basisName: string): { value: number; unit: string } | null {
  const basis = asDict(asDict(doc["bases"])[basisName]);
  if (basis["sum"] !== "ingredients" || basis["include_components"] === true) return null;
  const roles = new Set(asList(asDict(basis["where"])["roles"]).map(String));
  let total = 0;
  let unit: string | null = null;
  for (const raw of asList(doc["ingredients"])) {
    const ing = asDict(raw);
    if (!asList(ing["roles"]).some((r) => roles.has(String(r)))) continue;
    const amount = asDict(ing["amount"]);
    if (typeof amount["value"] !== "number" || typeof amount["unit"] !== "string") return null;
    if (unit !== null && unit !== amount["unit"]) return null;
    unit = amount["unit"];
    total += amount["value"];
  }
  return unit === null ? null : { value: total, unit };
}

function amountLabel(doc: Dict, ing: Dict): string {
  const a = asDict(ing["amount"]);
  if (typeof a["value"] === "number") return `${a["value"]} ${esc(a["unit"] ?? "")}`;
  if (typeof a["ratio"] === "number" && typeof a["of"] === "string") {
    const pct = `${+(a["ratio"] * 100).toFixed(2)}%`;
    const base = basisSum(doc, a["of"]);
    const resolved = base ? ` (${+(a["ratio"] * base.value).toFixed(1)} ${esc(base.unit)})` : "";
    return `${pct} · ${esc(a["of"])}${resolved}`;
  }
  if (typeof a["to_consistency"] === "string") return esc(a["to_consistency"]);
  return "";
}

function ingredientList(doc: Dict, ctx: RenderContext): string {
  const items = asList(doc["ingredients"])
    .map(asDict)
    .map((ing) => {
      const label = ing["item"]
        ? `<span title="${esc(String(ing["item"]))}">${esc(displayName(String(ing["item"]), ctx))}</span>`
        : `<em class="unresolved">${esc(ing["raw"] ?? ing["id"] ?? "?")}</em>`;
      const prep = ing["prep"] ? ` <span class="prep">${esc(text(ing["prep"], ctx.lang))}</span>` : "";
      return `<li><span class="amount">${amountLabel(doc, ing)}</span> ${label}${prep}</li>`;
    });
  return items.length ? `<ul class="ingredients">${items.join("")}</ul>` : "";
}

/** Endpoint ("until") → a human chip: "até 104 °C", "até: palito sai seco". */
function untilChip(u: Dict): string {
  if (u["expect"]) return `até: ${text(u["expect"], "pt-PT")}`;
  if (typeof u["value"] === "number") return `até ${u["value"]} ${u["unit"] ?? ""}`.trim();
  if (u["test"]) return `até: ${u["test"]}`;
  return String(u["kind"] ?? "");
}

function stepList(doc: Dict, ctx: RenderContext): string {
  const steps = asList(doc["steps"]).map(asDict);
  if (!steps.length) return "";
  // uses references ingredient ids in the SAME scope — resolve them to
  // registry display names for composed lines.
  const ingName = new Map<string, string>();
  for (const raw of asList(doc["ingredients"])) {
    const ing = asDict(raw);
    if (ing["id"] && ing["item"]) ingName.set(String(ing["id"]), displayName(String(ing["item"]), ctx));
    else if (ing["id"]) ingName.set(String(ing["id"]), String(ing["raw"] ?? ing["id"]));
  }
  // uses may also anchor on components (produced intermediates) — resolve
  // them to their names so "Montar — Ganache de cobertura, Calda" reads.
  for (const raw of asList(doc["components"])) {
    const c = asDict(raw);
    if (c["id"]) ingName.set(String(c["id"]), text(c["name"], ctx.lang) || String(c["id"]));
  }
  const items = steps.map((s) => {
    // Authored title always wins — the author's voice. Otherwise COMPOSE
    // the instruction from the machine layer (renderer-prototype seed,
    // CONCLUSIONS §7): verb = primitive display name, objects = resolved
    // uses, conditions = until chips + duration. Structured, never fake
    // prose the author did not write.
    const prim = asDict(s["primitive"])["id"];
    const title = s["title"] ? text(s["title"], ctx.lang) : "";
    let head: string;
    if (title) {
      head = esc(title);
    } else {
      const verb = prim ? displayName(String(prim), ctx) : String(s["id"] ?? "");
      const objects = asList(s["uses"]).map((u) => ingName.get(String(u)) ?? String(u));
      head = `<strong>${esc(verb)}</strong>${objects.length ? ` — ${esc(objects.join(", "))}` : ""}`;
    }
    const chips = asList(s["until"]).map(asDict).map((u) => `<span class="chip">${esc(untilChip(u))}</span>`);
    const dur = asDict(s["duration"]);
    const durLabel = dur["target"] ?? dur["min"] ?? "";
    if (durLabel) chips.push(`<span class="chip">${esc(durLabel)}</span>`);
    const body = s["body"] ? `<p class="note">${esc(text(s["body"], ctx.lang))}</p>` : "";
    const note = s["note"] ? `<p class="note">${esc(text(s["note"], ctx.lang))}</p>` : "";
    const media = mediaBlock(s["media"], ctx);
    return `<li>${head}${chips.length ? " " + chips.join(" ") : ""}${body}${note}${media}</li>`;
  });
  return `<ol class="steps">${items.join("")}</ol>`;
}

/** Role labels (pt-PT). Failure is labelled by TEXT — never color/position alone. */
const MEDIA_ROLE_LABEL: Record<string, string> = {
  technique: "técnica",
  result: "resultado",
  ingredient: "ingrediente",
  equipment: "equipamento",
  failure: "falha",
};

/**
 * Media list -> figures (schema/MEDIA.md). Matching is by URI basename
 * against ctx.assets; placeholder URIs and unmatched URIs collapse to
 * the SAME labelled-absent state — never a broken element. All four
 * types render their own element; video/audio get controls, no autoplay.
 */
function mediaBlock(list: unknown, ctx: RenderContext): string {
  const entries = asList(list).map(asDict);
  if (!entries.length) return "";
  const figures = entries.map((m) => {
    const role = String(m["role"] ?? "");
    const roleLabel = MEDIA_ROLE_LABEL[role] ?? role;
    const caption = m["caption"] ? text(m["caption"], ctx.lang) : "";
    const alt = caption || roleLabel;
    const uri = String(m["uri"] ?? "");
    const basename = uri.split("/").pop() ?? uri;
    const src = ctx.assets[basename];
    const failureClass = role === "failure" ? " media-failure" : "";
    const label =
      `<span class="media-role${failureClass}">${esc(roleLabel)}</span>` +
      (caption ? `<span class="media-caption">${esc(caption)}</span>` : "");
    if (!src) {
      return (
        `<figure class="media media-absent${failureClass}">` +
        `<figcaption>${label}<span class="media-missing">sem ficheiro local</span></figcaption></figure>`
      );
    }
    const type = String(m["type"] ?? "photo");
    let element: string;
    if (type === "video") {
      element = `<video controls src="${esc(src)}" aria-label="${esc(alt)}"></video>`;
    } else if (type === "audio") {
      element = `<audio controls src="${esc(src)}" aria-label="${esc(alt)}"></audio>`;
    } else {
      element = `<img src="${esc(src)}" alt="${esc(alt)}">`;
    }
    return `<figure class="media${failureClass}">${element}<figcaption>${label}</figcaption></figure>`;
  });
  return `<div class="media-list">${figures.join("")}</div>`;
}

function taxonomyLine(doc: Dict, ctx: RenderContext): string {
  const tax = asDict(doc["taxonomy"]);
  const parts: string[] = [];
  if (tax["category"]) parts.push(esc(term(String(tax["category"]), ctx.i18n.taxonomy)));
  for (const s of asList(tax["subcategory"])) parts.push(esc(term(String(s), ctx.i18n.taxonomy)));
  if (typeof tax["difficulty"] === "number") parts.push(`${"★".repeat(tax["difficulty"])} (${tax["difficulty"]}/5)`);
  for (const t of asList(doc["tags"])) parts.push(`<span class="tag">${esc(term(String(t), ctx.i18n.tags))}</span>`);
  return parts.length ? `<p class="taxonomy">${parts.join(" · ")}</p>` : "";
}

export function renderDocument(analysis: DocumentAnalysis, ctx: RenderContext): string {
  const doc = asDict(analysis.canonical);
  const title = esc(text(doc["name"], ctx.lang));
  const maturityBadge = analysis.profile
    ? `<span class="badge">core ∧ ${esc(analysis.profile)} · ${esc(analysis.maturity ?? "?")}</span>`
    : `<span class="badge badge-warn">core-only</span>`;
  const components = asList(doc["components"])
    .map(asDict)
    .filter((c) => c["ingredients"] || c["steps"])
    .map(
      (c) =>
        `<section class="component"><h3 lang="pt-PT">${esc(text(c["name"], ctx.lang))}</h3>` +
        `${ingredientList(c, ctx)}${stepList(c, ctx)}</section>`,
    )
    .join("");
  const mainSteps = stepList(doc, ctx);
  const mainMethod = mainSteps
    ? (components ? `<section class="main-method"><h3>Preparação principal</h3>${mainSteps}</section>` : mainSteps)
    : "";
  return (
    `<article class="recipe"><header><h2 lang="pt-PT">${title}</h2>${maturityBadge}</header>` +
    `${taxonomyLine(doc, ctx)}${mediaBlock(doc["media"], ctx)}${ingredientList(doc, ctx)}${components}${mainMethod}</article>`
  );
}

/**
 * CAPABILITIES-DRIVEN verdict rendering (ADR-002 no-rewrite guarantee):
 * groups whatever layer tags the engine returned — no layer names are
 * hardcoded into page structure, so an engine advertising more layers
 * renders them with zero UI changes (mock-engine test pins this).
 */
export function renderVerdicts(result: AnalysisResult, _caps: Capabilities): string {
  if (!result.parse.ok) {
    const errs = result.parse.errors
      .map((e) => `<li>${esc(e.message)}${e.line ? ` <span class="loc">(linha ${e.line})</span>` : ""}</li>`)
      .join("");
    return `<div class="verdicts parse-error" role="status"><h2>Documento não interpretável</h2><ul>${errs}</ul></div>`;
  }
  const byLayer = new Map<string, Diagnostic[]>();
  for (const d of result.documents) {
    for (const v of d.verdicts) {
      byLayer.set(v.layer, [...(byLayer.get(v.layer) ?? []), v]);
    }
  }
  const allValid = result.documents.every((d) => d.valid);
  const headline = allValid
    ? `<p class="ok">✓ válido (${result.documents.length} documento(s))</p>`
    : `<p class="bad">✗ inválido</p>`;
  const groups = [...byLayer.entries()]
    .map(([layer, list]) => {
      const items = list
        .map(
          (v) =>
            `<li class="sev-${v.severity}"><span class="sev">${v.severity === "error" ? "ERRO" : "aviso"}</span> ` +
            `<code>${esc(v.pointer || "/")}</code> ${esc(v.message)}</li>`,
        )
        .join("");
      return `<section class="layer"><h3>${esc(layer.toUpperCase())}</h3><ul>${items}</ul></section>`;
    })
    .join("");
  return `<div class="verdicts" role="status">${headline}${groups}</div>`;
}

export function renderEmptyState(): string {
  return (
    `<div class="empty"><p>Cole um documento <code>.rcp.yaml</code> na caixa, ou arraste o ficheiro para aqui.</p>` +
    `<p class="hint">Nada sai desta página: a validação corre inteiramente no seu navegador.</p></div>`
  );
}
