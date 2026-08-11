import type { Envelope, Formula, Quantity } from "./calculus.ts";
import type { AnalysisResult, DocumentAnalysis, ViewerProblem } from "./engine.ts";

type Dict = Record<string, unknown>;
const object = (value: unknown): Dict => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Dict : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

export type RenderContext = { unitLabels: Record<string, string> };

export function esc(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function unit(code: unknown, context: RenderContext): string {
  const identity = String(code ?? "");
  return context.unitLabels[identity] ?? identity;
}

export function quantityLabel(quantity: Quantity, context: RenderContext): string {
  if (quantity.kind === "measured") return `${esc(quantity.value)} ${esc(unit(quantity.unit, context))}`;
  if (quantity.kind === "range") return `${esc(quantity.minimum)}–${esc(quantity.maximum)} ${esc(unit(quantity.unit, context))}`;
  if (quantity.kind === "open") {
    const labels: Record<string, string> = {
      to_taste: "a gosto",
      as_needed: "quanto baste",
      to_consistency: "até obter a consistência desejada",
    };
    const guide = quantity.guide ? ` <small>(referência: ${quantityLabel(quantity.guide, context)})</small>` : "";
    return `${esc(labels[quantity.qualifier ?? ""] ?? quantity.qualifier ?? "quantidade aberta")}${guide}`;
  }
  return esc(quantity.kind);
}

function effectiveMap(envelope?: Envelope): Map<string, Quantity> {
  if (envelope?.status !== "ok") return new Map();
  const values = object(envelope.result).quantities;
  return new Map(list(values).map((value) => {
    const item = object(value);
    return [String(item.ingredient), object(item.quantity) as Quantity];
  }));
}

function termMap(formula: Dict): Map<string, string> {
  const terms = new Map<string, string>();
  for (const value of list(formula.terms)) {
    const term = object(value);
    const label = formula.kind === "ratio" ? `${String(term.parts)} parte(s)` : `${String(term.percentage)}%`;
    terms.set(String(term.ingredient), label);
  }
  return terms;
}

function notes(values: unknown): string {
  const items = list(values).map((value) => `<li>${esc(value)}</li>`).join("");
  return items ? `<ul class="notes">${items}</ul>` : "";
}

function ingredients(document: Dict, context: RenderContext, formulaResult?: Envelope, scaled?: Envelope): string {
  const formula = object(document.formula);
  const terms = termMap(formula);
  const resolved = effectiveMap(formulaResult);
  const effective = effectiveMap(scaled);
  const items = list(document.ingredients).map((value) => {
    const ingredient = object(value);
    const id = String(ingredient.id);
    const quantity = effective.get(id) ?? resolved.get(id) ?? (object(ingredient.quantity) as Quantity);
    const amount = quantity?.kind ? quantityLabel(quantity, context) : esc(terms.get(id) ?? "quantidade não resolvida");
    return `<li><span class="amount">${amount}</span> ${esc(ingredient.name)}${notes(ingredient.notes)}</li>`;
  }).join("");
  return `<section><h2>Ingredientes</h2><ul class="ingredients">${items}</ul></section>`;
}

function formulaSection(document: Dict): string {
  const formula = object(document.formula);
  if (!formula.kind) return "";
  const values = list(formula.terms).map((value) => {
    const term = object(value);
    return formula.kind === "ratio" ? String(term.parts) : `${String(term.percentage)}%`;
  });
  const relationship = formula.kind === "ratio" ? values.join(":") : values.join(" · ");
  const basis = formula.kind === "percentage" ? ` — base: ${esc(formula.basis)}` : "";
  return `<section class="formula"><h2>Fórmula</h2><p><strong>${esc(relationship)}</strong>${basis}</p></section>`;
}

function duration(value: unknown): string {
  if (typeof value === "string") return value;
  const window = object(value);
  return [window.minimum, window.target, window.maximum].filter(Boolean).map(String).join(" / ");
}

function steps(document: Dict): string {
  const ingredientsById = new Map(list(document.ingredients).map((value) => {
    const ingredient = object(value);
    return [String(ingredient.id), String(ingredient.name)];
  }));
  const techniques = new Map(list(document.techniques).map((value) => {
    const item = object(value);
    return [String(item.id), String(item.name)];
  }));
  const equipment = new Map(list(document.equipment).map((value) => {
    const item = object(value);
    return [String(item.id), String(item.name)];
  }));
  const items = list(document.steps).map((value) => {
    const step = object(value);
    const metadata = [
      step.duration ? `duração ${duration(step.duration)}` : "",
      ...list(step.techniques).map((id) => `técnica ${techniques.get(String(id)) ?? id}`),
      ...list(step.equipment).map((id) => `equipamento ${equipment.get(String(id)) ?? id}`),
      list(step.uses).length ? `usa ${list(step.uses).map((id) => ingredientsById.get(String(id)) ?? id).join(", ")}` : "",
    ].filter(Boolean).map((item) => `<span class="meta">${esc(item)}</span>`).join(" ");
    return `<li><p>${esc(step.instruction)}</p>${metadata}${notes(step.notes)}</li>`;
  }).join("");
  return `<section><h2>Método</h2><ol class="steps">${items}</ol></section>`;
}

function origin(document: Dict): string {
  const value = object(document.origin);
  const parts = [value.country, value.subdivision, value.locality].filter(Boolean).map(esc);
  return parts.length ? `<section class="origin"><h2>Origem</h2><p>${parts.join(" · ")}</p></section>` : "";
}

function evidenceSelectors(document: Dict): string {
  const sources = new Map(list(document.sources).map((value) => {
    const source = object(value);
    return [String(source.id), String(source.uri)];
  }));
  const items = list(document.evidence).flatMap((value) => {
    const evidence = object(value);
    const selector = object(evidence.selector);
    if (selector.kind !== "fragment") return [];
    const source = sources.get(String(evidence.source)) ?? String(evidence.source ?? "");
    return [`<li><code>${esc(evidence.pointer)}</code>: <code>${esc(source)}#${esc(selector.value)}</code></li>`];
  }).join("");
  return items ? `<section class="evidence"><h2>Segmentos da fonte</h2><ul>${items}</ul></section>` : "";
}

function localEntities(document: Dict): string {
  const section = (heading: string, values: unknown) => {
    const items = list(values).map((value) => `<li>${esc(object(value).name)}</li>`).join("");
    return items ? `<section><h2>${heading}</h2><ul>${items}</ul></section>` : "";
  };
  return section("Técnicas", document.techniques) + section("Equipamento", document.equipment);
}

export function renderProblems(problems: ViewerProblem[]): string {
  if (problems.length === 0) return `<div class="verdicts valid" role="status">Documento Schemami válido.</div>`;
  return `<div class="verdicts invalid" role="status"><h2>Problemas</h2><ul>${problems.map((problem) =>
    `<li><code>${esc(problem.type)}</code>${problem.pointer === undefined ? "" : ` <code>${esc(problem.pointer)}</code>`}: ${esc(problem.message)}</li>`
  ).join("")}</ul></div>`;
}

export function renderAnalysis(result: AnalysisResult): string {
  if (!result.parse.ok) return `<div class="verdicts invalid" role="status"><h2>Erro de leitura</h2><ul>${result.parse.errors.map((error) => `<li>${esc(error.message)}</li>`).join("")}</ul></div>`;
  return result.documents.map((document) => renderProblems(document.problems)).join("");
}

export function renderDocument(
  analysis: DocumentAnalysis,
  context: RenderContext,
  formulaResult?: Envelope,
  scaled?: Envelope,
  scheduleResult?: Envelope,
  index = 0,
): string {
  if (!analysis.valid) return "";
  const document = analysis.canonical;
  const scheduleRows = scheduleResult?.status === "ok"
    ? `<section class="schedule"><h2>Horário relativo</h2><ol>${list(object(scheduleResult.result).steps).map((value) => {
        const item = object(value);
        return `<li><code>${esc(item.id)}</code>: ${esc(item.start)} → ${esc(item.end)} (${esc(item.duration)})</li>`;
      }).join("")}</ol></section>`
    : "";
  const scaleProblems = scaled?.status === "refused"
    ? `<div class="scale-refusal">${renderProblems((scaled.problems ?? []).map((item) => ({ ...item, message: "A escala foi recusada por falta de dados estruturados." })))}</div>`
    : "";
  return `<article class="doc-block" data-doc="${index}" lang="${esc(document.content_language)}">
    <header><h1>${esc(document.title)}</h1><p><code>${esc(document.collection)}/${esc(document.id)}@${esc(document.revision)}</code> · ${esc(document.content_language)}</p></header>
    ${notes(document.notes)}
    ${origin(document)}
    <form class="scale-control" data-doc="${index}"><label for="scale-${index}">Fator de escala</label> <input id="scale-${index}" name="factor" inputmode="decimal" value="1"> <button type="submit">Aplicar</button></form>
    ${scaleProblems}
    ${formulaSection(document)}
    ${ingredients(document, context, formulaResult, scaled)}
    ${localEntities(document)}
    ${steps(document)}
    ${evidenceSelectors(document)}
    ${scheduleRows}
  </article>`;
}

export function renderEmpty(): string {
  return `<div class="empty"><p>Cole ou abra um documento <code>.schemami.yaml</code> ou <code>.schemami.json</code>.</p></div>`;
}
