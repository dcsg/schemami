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
import type {
  AnalysisResult,
  Capabilities,
  Diagnostic,
  DocumentAnalysis,
  TimelineEntry,
} from "./engine.ts";

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

/** Per-scope resolver: ingredient/component id -> display text. */
function usesNames(doc: Dict, ctx: RenderContext): Map<string, string> {
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
  return ingName;
}

/**
 * One step's human head as PLAIN TEXT: authored title always wins — the
 * author's voice. Otherwise COMPOSE from the machine layer (renderer-
 * prototype seed, CONCLUSIONS §7): verb = primitive display name,
 * objects = resolved uses. Structured, never fake prose.
 */
function stepHeadText(s: Dict, ingName: Map<string, string>, ctx: RenderContext): string {
  const title = s["title"] ? text(s["title"], ctx.lang) : "";
  if (title) return title;
  const prim = asDict(s["primitive"])["id"];
  const verb = prim ? displayName(String(prim), ctx) : String(s["id"] ?? "");
  const objects = asList(s["uses"]).map((u) => ingName.get(String(u)) ?? String(u));
  return objects.length ? `${verb} — ${objects.join(", ")}` : verb;
}

function stepList(doc: Dict, ctx: RenderContext): string {
  const steps = asList(doc["steps"]).map(asDict);
  if (!steps.length) return "";
  const ingName = usesNames(doc, ctx);
  const items = steps.map((s) => {
    const title = s["title"] ? text(s["title"], ctx.lang) : "";
    let head: string;
    if (title) {
      head = esc(title);
    } else {
      const prim = asDict(s["primitive"])["id"];
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
    const caption = m["note"] ? text(m["note"], ctx.lang) : "";
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

/** The document's authored yield anchor (scaling.default_yield.units), or null. */
export function docYield(canonical: unknown): number | null {
  const u = asDict(asDict(asDict(canonical)["scaling"])["default_yield"])["units"];
  return typeof u === "number" && u > 0 ? u : null;
}

/**
 * Per-document scale control (SR-TOOL-003). Pure markup — app.ts wires
 * the submit by delegation. Client-side rejections render into the
 * aria-described message span, DISTINCT from an engine refusal (which
 * renders as a role="alert" block).
 *
 * YIELD-AWARE (Daniel's acceptance rework): when the document authors a
 * default yield ("makes 3 cakes", "12 madalenas"), people think in
 * quantities, not factors — the control asks "Quantidade" prefilled with
 * the default, and the factor is derived (wanted ÷ default). Documents
 * without a yield keep the bare factor control.
 */
export function renderScaleControl(index: number, yieldUnits: number | null = null): string {
  const field = yieldUnits
    ? `<label for="scale-input-${index}">Quantidade</label>` +
      `<input id="scale-input-${index}" name="factor" inputmode="decimal" value="${yieldUnits}" ` +
      `autocomplete="off" aria-describedby="scale-msg-${index}">` +
      `<span class="scale-default">unidades (padrão: ${yieldUnits})</span>`
    : `<label for="scale-input-${index}">Fator de escala</label>` +
      `<input id="scale-input-${index}" name="factor" inputmode="decimal" value="1" ` +
      `autocomplete="off" aria-describedby="scale-msg-${index}">`;
  return (
    `<form class="scale-control" data-doc="${index}"${yieldUnits ? ` data-yield="${yieldUnits}"` : ""}>` +
    field +
    `<button type="submit">Aplicar</button>` +
    `<span id="scale-msg-${index}" class="scale-msg"></span>` +
    `<div class="clamp-refusals" id="scale-refusals-${index}"></div></form>`
  );
}

/** Engine refusals: authored reasons verbatim, pt primary (text() convention). */
export function renderClampRefusals(reasons: { pt?: string; en?: string }[]): string {
  const items = reasons
    .map((r) => `<li lang="pt-PT">${esc(text(r, "pt-PT"))}</li>`)
    .join("");
  return `<div role="alert" class="clamp-refusal"><p>Escala recusada:</p><ul>${items}</ul></div>`;
}

/**
 * One capability-driven document block: the article plus (iff the
 * engine clamps) its scale control. Mock richer/poorer engines pin that
 * controls appear/vanish with zero UI code change.
 */
export function renderDocumentBlock(
  d: DocumentAnalysis,
  index: number,
  ctx: RenderContext,
  caps: Capabilities,
): string {
  const control = caps.clamp ? renderScaleControl(index, docYield(d.canonical)) : "";
  return `<div class="doc-block" data-doc="${index}">${renderDocument(d, ctx)}${control}` +
    `<div class="schedule-slot"></div></div>`;
}

/** Seconds -> humanized pt-PT ("2 h 30 min", "45 min", "1 d 12 h"). */
export function humanizeDuration(seconds: number): string {
  const s = Math.abs(Math.round(seconds));
  if (s === 0) return "0 min";
  const units: [number, string][] = [
    [86400, "d"],
    [3600, "h"],
    [60, "min"],
    [1, "s"],
  ];
  const parts: string[] = [];
  let rest = s;
  for (const [size, label] of units) {
    if (parts.length === 2) break;
    const n = Math.floor(rest / size);
    if (n > 0) {
      parts.push(`${n} ${label}`);
      rest -= n * size;
    }
  }
  return parts.join(" ");
}

/** ISO-8601 duration for <time datetime> (magnitude only). */
function isoDuration(seconds: number): string {
  const s = Math.abs(Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${sec || (!h && !m) ? `${sec}S` : ""}`;
}

/** Relative-day bucket for a start offset ("2 dias antes" / "véspera" / "no dia").
 *  Rounding is symmetric away from zero: −12 h is a véspera task, not "no dia"
 *  (JS Math.round(−0.5) would round toward +∞ and swallow it). */
function dayLabel(targetSeconds: number): string {
  const days = Math.sign(targetSeconds) * Math.round(Math.abs(targetSeconds) / 86400);
  if (days === 0) return "no dia";
  if (days === -1) return "véspera";
  if (days < 0) return `${-days} dias antes`;
  return days === 1 ? "dia seguinte" : `${days} dias depois`;
}

/**
 * Timeline item id -> human label, resolved exactly like the step list:
 * authored title wins, else the composed verb — objects; components
 * label by their name. Covers parent AND inline component scopes (the
 * schedule flattens both). The plan must read as real actions, never as
 * ids (Daniel's acceptance finding).
 */
export function scheduleLabels(canonical: unknown, ctx: RenderContext): Record<string, string> {
  const labels: Record<string, string> = {};
  const addScope = (scope: Dict) => {
    const ingName = usesNames(scope, ctx);
    for (const raw of asList(scope["steps"])) {
      const s = asDict(raw);
      if (s["id"]) labels[String(s["id"])] = stepHeadText(s, ingName, ctx);
    }
  };
  const doc = asDict(canonical);
  addScope(doc);
  for (const raw of asList(doc["components"])) {
    const c = asDict(raw);
    if ("ref" in c) continue;
    if (c["id"]) labels[String(c["id"])] = text(c["name"], ctx.lang) || String(c["id"]);
    addScope(c);
  }
  return labels;
}

/**
 * Timeline entries -> a kitchen plan (SR-TOOL-003 schedule half):
 * grouped by relative day, target offset prominent, min–max as the
 * secondary range, humanized pt-PT durations, semantic <ol>/<time>.
 * Anchor is t0 (serve-anchoring is a later transform). Zero offsets are
 * silent — <ol> numbering already carries the sequence — and a lone
 * "no dia" group drops its header: a single-day plan is just the plan.
 */
export function renderSchedule(entries: TimelineEntry[], labels: Record<string, string> = {}): string {
  if (!entries.length) return "";
  const groups = new Map<string, TimelineEntry[]>();
  for (const e of entries) {
    const label = dayLabel(e.start.target);
    groups.set(label, [...(groups.get(label) ?? []), e]);
  }
  const soleDay = groups.size === 1 && groups.has("no dia");
  const ordered = [...groups.entries()].sort(
    (a, b) => (a[1][0]?.start.target ?? 0) - (b[1][0]?.start.target ?? 0),
  );
  const sections = ordered
    .map(([label, list]) => {
      const items = [...list]
        .sort((a, b) => a.start.target - b.start.target)
        .map((e) => {
          const off = e.start.target;
          const zeroStart = off === 0 && e.start.min === 0 && e.start.max === 0;
          const offLabel = zeroStart
            ? ""
            : `<span class="sched-offset">${esc(off < 0 ? `${humanizeDuration(off)} antes` : `+${humanizeDuration(off)}`)}</span> `;
          const dur = e.duration.target
            ? ` <time datetime="${isoDuration(e.duration.target)}">${humanizeDuration(e.duration.target)}</time>`
            : "";
          const range =
            e.duration.min !== e.duration.max
              ? ` <span class="sched-range">(${humanizeDuration(e.duration.min)}–${humanizeDuration(e.duration.max)})</span>`
              : "";
          return `<li>${offLabel}<span class="sched-item">${esc(labels[e.item] ?? e.item)}</span>${dur}${range}</li>`;
        })
        .join("");
      const heading = soleDay ? "" : `<h4>${esc(label)}</h4>`;
      return `<section class="sched-day">${heading}<ol>${items}</ol></section>`;
    })
    .join("");
  return `<section class="schedule"><h3>Plano de execução</h3>${sections}</section>`;
}

export function renderEmptyState(): string {
  return (
    `<div class="empty"><p>Cole um documento <code>.rcp.yaml</code> na caixa, ou arraste o ficheiro para aqui.</p>` +
    `<p class="hint">Nada sai desta página: a validação corre inteiramente no seu navegador.</p></div>`
  );
}
