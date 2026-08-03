/**
 * Thin DOM glue ONLY (SSP-004): reads input, calls the engine, assigns
 * render.ts output. No validation logic, no direct yaml/validator imports
 * (AC-7.3 grep-enforced) — the engine interface is the whole world.
 *
 * Media ingress (schema/MEDIA.md): the FILE INPUT is the primary,
 * keyboard-accessible, touch-capable door; drag-drop is an enhancement.
 * Every incoming file is discriminated by CONTENT (magic bytes) — a
 * JPEG named anything must never land in the textarea, and a YAML named
 * .jpg is still a document. Assets persist across re-analyses; a
 * same-name re-drop revokes the old URL; loading the example resets.
 */
import type { AnalysisResult, RcpEngine } from "./engine.ts";
import { AssetStore, sniffMediaKind } from "./assets.ts";
import { renderDocument, renderEmptyState, renderVerdicts, type RenderContext } from "./render.ts";

const MAX_INPUT_BYTES = 2 * 1024 * 1024; // pathological-input guard

export function wireApp(engine: RcpEngine, baseCtx: RenderContext, doc: Document, exampleText?: string): void {
  const input = doc.getElementById("input") as HTMLTextAreaElement;
  const fileInput = doc.getElementById("file-input") as HTMLInputElement | null;
  const verdictsEl = doc.getElementById("verdicts")!;
  const renderEl = doc.getElementById("render")!;
  const busyEl = doc.getElementById("busy")!;

  const assets = new AssetStore({
    create: (f) => URL.createObjectURL(f),
    revoke: (u) => URL.revokeObjectURL(u),
  });
  let lastResult: AnalysisResult | null = null;

  const ctx = (): RenderContext => ({ ...baseCtx, assets: assets.map });

  const setState = (verdicts: string, render: string) => {
    verdictsEl.innerHTML = verdicts;
    renderEl.innerHTML = render;
  };

  const rerender = () => {
    if (!lastResult?.parse.ok) return;
    renderEl.innerHTML = lastResult.documents.map((d) => renderDocument(d, ctx())).join("");
  };

  const analyze = async (text: string) => {
    if (!text.trim()) {
      lastResult = null;
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
      lastResult = result;
      const rendered = result.parse.ok
        ? result.documents.map((d) => renderDocument(d, ctx())).join("")
        : "";
      setState(renderVerdicts(result, engine.capabilities), rendered);
    } finally {
      input.disabled = false;
      busyEl.hidden = true;
    }
  };

  /** Content-first triage: media files feed the asset store, the LAST
   *  document file becomes the textarea content (mixed drops work). */
  const ingestFiles = async (files: FileList | File[]) => {
    let documentText: string | null = null;
    for (const file of Array.from(files)) {
      const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      if (sniffMediaKind(head) !== null) {
        assets.put(file.name, file);
      } else {
        documentText = await file.text();
      }
    }
    if (documentText !== null) {
      input.value = documentText;
      await analyze(documentText);
    } else {
      rerender(); // assets only: refresh figures on the current document
    }
  };

  input.addEventListener("input", () => void analyze(input.value));

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      if (fileInput.files?.length) {
        void ingestFiles(fileInput.files).then(() => {
          fileInput.value = "";
        });
      }
    });
  }

  const exampleBtn = doc.getElementById("load-example");
  if (exampleBtn && exampleText) {
    exampleBtn.addEventListener("click", () => {
      assets.clear(); // document change: local media belongs to the old one
      input.value = exampleText;
      void analyze(exampleText);
    });
  }

  // A stray drop must never navigate the page away (frontend pre-flight):
  // guard at BOTH window and drop-zone level.
  for (const target of [doc.defaultView!, input] as const) {
    target.addEventListener("dragover", (e: Event) => e.preventDefault());
    target.addEventListener("drop", (e: Event) => e.preventDefault());
  }
  input.addEventListener("drop", (e: DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files?.length) void ingestFiles(files);
  });

  setState("", renderEmptyState());
}
