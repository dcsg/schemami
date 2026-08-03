/**
 * Thin DOM glue ONLY (SSP-004): reads input, calls the engine, assigns
 * render.ts output. No validation logic, no direct yaml/validator imports
 * (AC-7.3 grep-enforced) — the engine interface is the whole world.
 */
import type { RcpEngine } from "./engine.ts";
import { renderDocument, renderEmptyState, renderVerdicts, type RenderContext } from "./render.ts";

const MAX_INPUT_BYTES = 2 * 1024 * 1024; // pathological-input guard

export function wireApp(engine: RcpEngine, ctx: RenderContext, doc: Document): void {
  const input = doc.getElementById("input") as HTMLTextAreaElement;
  const verdictsEl = doc.getElementById("verdicts")!;
  const renderEl = doc.getElementById("render")!;
  const busyEl = doc.getElementById("busy")!;

  const setState = (verdicts: string, render: string) => {
    verdictsEl.innerHTML = verdicts;
    renderEl.innerHTML = render;
  };

  const analyze = async (text: string) => {
    if (!text.trim()) {
      setState("", renderEmptyState());
      return;
    }
    if (new TextEncoder().encode(text).length > MAX_INPUT_BYTES) {
      setState(
        `<div class="verdicts parse-error" role="status"><p>Documento demasiado grande (limite 2 MB).</p></div>`,
        "",
      );
      return;
    }
    input.disabled = true;
    busyEl.hidden = false;
    try {
      const result = await engine.analyze(text);
      const rendered = result.parse.ok
        ? result.documents.map((d) => renderDocument(d, ctx)).join("")
        : "";
      setState(renderVerdicts(result, engine.capabilities), rendered);
    } finally {
      input.disabled = false;
      busyEl.hidden = true;
    }
  };

  input.addEventListener("input", () => void analyze(input.value));

  // A stray drop must never navigate the page away (frontend pre-flight):
  // guard at BOTH window and drop-zone level.
  for (const target of [doc.defaultView!, input] as const) {
    target.addEventListener("dragover", (e: Event) => e.preventDefault());
    target.addEventListener("drop", (e: Event) => e.preventDefault());
  }
  input.addEventListener("drop", (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    void file.text().then((t) => {
      input.value = t;
      void analyze(t);
    });
  });

  setState("", renderEmptyState());
}
