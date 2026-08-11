import type { Envelope, Formula } from "./calculus.ts";
import type { AnalysisResult, SchemamiEngine } from "./engine.ts";
import {
  renderAnalysis,
  renderDocument,
  renderEmpty,
  type RenderContext,
} from "./render.ts";

const MAX_INPUT_BYTES = 2 * 1024 * 1024;

export function parseFactor(raw: string): string | null {
  const normalized = raw.trim().replace(",", ".");
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const canonicalFraction = fraction.replace(/0+$/, "");
  const canonical = canonicalFraction ? `${whole}.${canonicalFraction}` : whole;
  const digits = canonical.replace(".", "").length;
  if (canonical === "0" || canonicalFraction.length > 4 || digits > 16) return null;
  return canonical;
}

export function wireApp(
  engine: SchemamiEngine,
  context: RenderContext,
  document: Document,
  example: string,
): void {
  const input = document.getElementById("input") as HTMLTextAreaElement;
  const fileInput = document.getElementById("file-input") as HTMLInputElement;
  const verdicts = document.getElementById("verdicts")!;
  const host = document.getElementById("render")!;
  const busy = document.getElementById("busy")!;
  let current: AnalysisResult | null = null;
  const scaled = new Map<number, Envelope>();

  const renderAll = () => {
    if (!current?.parse.ok) {
      host.innerHTML = "";
      return;
    }
    host.innerHTML = current.documents.map((analysis, index) => {
      const formula = analysis.canonical.formula as Formula | undefined;
      const formulaResult = formula ? engine.resolveFormula(formula) : undefined;
      const schedule = engine.schedule(analysis.canonical);
      return renderDocument(analysis, context, formulaResult, scaled.get(index), schedule, index);
    }).join("");
  };

  const analyze = async (source: string) => {
    if (!source.trim()) {
      current = null;
      verdicts.innerHTML = "";
      host.innerHTML = renderEmpty();
      return;
    }
    if (new TextEncoder().encode(source).length > MAX_INPUT_BYTES) {
      verdicts.innerHTML = `<div class="verdicts invalid">Documento demasiado grande (limite 2 MiB).</div>`;
      host.innerHTML = "";
      return;
    }
    busy.hidden = false;
    input.disabled = true;
    try {
      current = await engine.analyze(source);
      scaled.clear();
      verdicts.innerHTML = renderAnalysis(current);
      renderAll();
    } finally {
      busy.hidden = true;
      input.disabled = false;
    }
  };

  input.addEventListener("input", () => void analyze(input.value));
  document.getElementById("load-example")!.addEventListener("click", () => {
    input.value = example;
    void analyze(example);
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    void file.text().then((source) => {
      input.value = source;
      return analyze(source);
    });
  });
  host.addEventListener("submit", (event) => {
    const form = event.target as HTMLFormElement;
    if (!form.classList.contains("scale-control")) return;
    event.preventDefault();
    const index = Number(form.dataset.doc);
    const factor = parseFactor((form.elements.namedItem("factor") as HTMLInputElement).value);
    if (!factor || !current?.documents[index]?.valid) return;
    scaled.set(index, engine.scale(current.documents[index]!.canonical, factor));
    renderAll();
  });
  host.innerHTML = renderEmpty();
}
