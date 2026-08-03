/**
 * Thin DOM glue ONLY (SSP-004): reads input, calls the engine, assigns
 * render.ts output. No validation logic, no direct yaml/validator/calc
 * imports (grep-enforced) — the engine interface is the whole world.
 *
 * Media ingress (schema/MEDIA.md): the FILE INPUT is the primary,
 * keyboard-accessible, touch-capable door; drag-drop is an enhancement.
 * Every incoming file is discriminated by CONTENT (magic bytes).
 *
 * Scale (SR-TOOL-003): per-document control, comma-tolerant pt-PT
 * parsing, explicit "Aplicar". Client-side rejections and engine
 * refusals are DISTINCT surfaces. Factor state lives here, outside the
 * render output; persists across re-analyses; resets on document change.
 */
import type { AnalysisResult, RcpEngine } from "./engine.ts";
import { AssetStore, sniffMediaKind } from "./assets.ts";
import {
  renderClampRefusals,
  renderDocumentBlock,
  renderEmptyState,
  renderSchedule,
  renderVerdicts,
  type RenderContext,
} from "./render.ts";

const MAX_INPUT_BYTES = 2 * 1024 * 1024; // pathological-input guard

/** "1,5" -> 1.5 (pt-PT decimal comma); null when not a positive finite number. */
export function parseFactor(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!/^[0-9]*\.?[0-9]+$/.test(normalized)) return null;
  const v = Number(normalized);
  return Number.isFinite(v) && v > 0 ? v : null;
}

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
  const factors = new Map<number, number>(); // doc index -> applied factor

  const ctx = (): RenderContext => ({ ...baseCtx, assets: assets.map });

  const setState = (verdicts: string, render: string) => {
    verdictsEl.innerHTML = verdicts;
    renderEl.innerHTML = render;
  };

  /** Render one document into its block, honouring its applied factor. */
  const renderInto = async (index: number): Promise<void> => {
    if (!lastResult?.parse.ok) return;
    const d = lastResult.documents[index];
    const stale = renderEl.querySelector(`.doc-block[data-doc="${index}"]`);
    if (!d || !stale) return;
    let analysis = d;
    const k = factors.get(index) ?? 1;
    if (k !== 1 && engine.scale) {
      const clamp = await engine.scale(d.canonical, k);
      if (clamp.accepted && clamp.scaled !== undefined) {
        analysis = { ...d, canonical: clamp.scaled };
      }
    }
    stale.outerHTML = renderDocumentBlock(analysis, index, ctx(), engine.capabilities);
    const block = renderEl.querySelector(`.doc-block[data-doc="${index}"]`)!;
    const inputEl = block.querySelector(`#scale-input-${index}`) as HTMLInputElement | null;
    if (inputEl && k !== 1) inputEl.value = String(k).replace(".", ",");
    if (engine.capabilities.timeline && engine.schedule) {
      const slot = block.querySelector(".schedule-slot");
      if (slot) slot.innerHTML = renderSchedule(await engine.schedule(analysis.canonical));
    }
  };

  const renderAll = async (): Promise<void> => {
    if (!lastResult?.parse.ok) return;
    renderEl.innerHTML = lastResult.documents
      .map((d, i) => renderDocumentBlock(d, i, ctx(), engine.capabilities))
      .join("");
    for (let i = 0; i < lastResult.documents.length; i++) await renderInto(i);
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
      lastResult = await engine.analyze(text);
      verdictsEl.innerHTML = renderVerdicts(lastResult, engine.capabilities);
      renderEl.innerHTML = "";
      if (lastResult.parse.ok) await renderAll();
    } finally {
      input.disabled = false;
      busyEl.hidden = true;
    }
  };

  /** Scale submit — event delegation over rendered content. */
  renderEl.addEventListener("submit", (e: Event) => {
    const form = e.target as HTMLFormElement;
    if (!form.classList.contains("scale-control")) return;
    e.preventDefault();
    const index = Number(form.dataset["doc"]);
    const field = form.querySelector("input[name=factor]") as HTMLInputElement;
    const msg = form.querySelector(`#scale-msg-${index}`)!;
    const refusals = form.querySelector(`#scale-refusals-${index}`)!;
    const k = parseFactor(field.value);
    if (k === null) {
      // Client-side rejection — NOT an engine refusal.
      msg.textContent = "Fator inválido: use um número positivo (ex.: 1,5).";
      msg.className = "scale-msg scale-msg-invalid";
      return;
    }
    msg.textContent = "";
    msg.className = "scale-msg";
    void (async () => {
      const d = lastResult?.documents[index];
      if (!d || !engine.scale) return;
      const clamp = await engine.scale(d.canonical, k);
      if (clamp.accepted) {
        factors.set(index, k);
        await renderInto(index);
      } else {
        refusals.innerHTML = renderClampRefusals(clamp.reasons);
      }
    })();
  });

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
      factors.clear(); // document change
      input.value = documentText;
      await analyze(documentText);
    } else {
      await renderAll(); // assets only: refresh figures on the current document
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
      factors.clear();
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
