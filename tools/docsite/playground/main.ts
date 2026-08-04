/**
 * The proper playground shell (FR-TOOL-005).
 *
 * The v0.4 viewer's ENGINE and RENDERER are reused verbatim — they are
 * sound, tested, and conformance-locked against rcplint. What is rebuilt is
 * the shell: the v0.4 page was 67 lines of CSS, one textarea, and chrome
 * written entirely in pt-PT on a site whose whole purpose is readers who do
 * not speak it.
 *
 * What changes here:
 *   · bilingual chrome with a language switch (?lang=en|pt, persisted)
 *   · a two-pane layout — source beside result — instead of stacked blocks
 *   · an example picker rather than a single hardcoded button
 *   · verdict counts summarised, so a long document does not bury the answer
 *
 * What does NOT change: no network. There is no fetch, no XHR, no beacon.
 * Everything is embedded at build time.
 */
import { createJsEngine } from "../../viewer/src/engine-js/index.ts";
import { renderDocument, esc } from "../../viewer/src/render.ts";
import type { AnalysisResult } from "../../viewer/src/engine.ts";
import {
  EMBEDDED_EXAMPLE,
  EMBEDDED_I18N,
  EMBEDDED_LINKS,
  EMBEDDED_NAMES,
  EMBEDDED_SCHEMAS,
} from "../../viewer/src/generated/embedded.ts";

type Lang = "en" | "pt";

const UI: Record<Lang, Record<string, string>> = {
  en: {
    title: "Playground",
    lede: "Validate and read an RCP document. Everything runs in your browser — nothing is uploaded.",
    source: "Source",
    result: "Result",
    loadExample: "Load example",
    files: "Add files",
    validating: "validating…",
    empty: "Paste a recipe document, or load the example.",
    valid: "Valid",
    problems: "problem(s)",
    langSwitch: "Português",
  },
  pt: {
    title: "Editor",
    lede: "Valide e leia um documento RCP. Tudo corre no seu navegador — nada é enviado.",
    source: "Origem",
    result: "Resultado",
    loadExample: "Carregar exemplo",
    files: "Adicionar ficheiros",
    validating: "a validar…",
    empty: "Cole um documento de receita, ou carregue o exemplo.",
    valid: "Válido",
    problems: "problema(s)",
    langSwitch: "English",
  },
};

/**
 * PROTOTYPE FINDING — bilingual reaches into render.ts, not just the shell.
 *
 * The shared `renderVerdicts(result, caps)` in tools/viewer/src/render.ts
 * hardcodes pt-PT: "Documento não interpretável", "válido", "inválido",
 * "ERRO", "aviso", "(linha N)". It also takes no `lang` parameter — even
 * though that file's own header states the toggle "never changes this
 * signature". The intent was there; this one function missed it.
 *
 * This local re-implementation exists ONLY so the prototype can demonstrate
 * a genuinely bilingual playground. It is NOT the fix. The real fix is a
 * `lang` parameter on the shared function, which is a signature change to a
 * conformance-tested module and belongs in the spec, not in a spike.
 */
const VERDICT_STRINGS = {
  en: { unparseable: "Document could not be parsed", line: "line", valid: "valid", invalid: "invalid", docs: "document(s)", error: "ERROR", warning: "warning" },
  pt: { unparseable: "Documento não interpretável", line: "linha", valid: "válido", invalid: "inválido", docs: "documento(s)", error: "ERRO", warning: "aviso" },
} as const;

function renderVerdictsI18n(result: AnalysisResult, l: Lang): string {
  const s = VERDICT_STRINGS[l];
  if (!result.parse.ok) {
    const errs = result.parse.errors
      .map((e) => `<li>${esc(e.message)}${e.line ? ` <span class="loc">(${s.line} ${e.line})</span>` : ""}</li>`)
      .join("");
    return `<div class="verdicts parse-error" role="status"><h2>${esc(s.unparseable)}</h2><ul>${errs}</ul></div>`;
  }
  const byLayer = new Map<string, typeof result.documents[number]["verdicts"]>();
  for (const d of result.documents) {
    for (const v of d.verdicts) byLayer.set(v.layer, [...(byLayer.get(v.layer) ?? []), v]);
  }
  const allValid = result.documents.every((d) => d.valid);
  const headline = allValid
    ? `<p class="ok">✓ ${esc(s.valid)} (${result.documents.length} ${esc(s.docs)})</p>`
    : `<p class="bad">✗ ${esc(s.invalid)}</p>`;
  const groups = [...byLayer.entries()]
    .map(([layer, list]) => {
      const items = list
        .map(
          (v) =>
            `<li class="sev-${v.severity}"><span class="sev">${v.severity === "error" ? esc(s.error) : esc(s.warning)}</span> ` +
            `<code>${esc(v.pointer || "/")}</code> ${esc(v.message)}</li>`,
        )
        .join("");
      return `<section class="layer"><h3>${esc(layer.toUpperCase())}</h3><ul>${items}</ul></section>`;
    })
    .join("");
  return `<div class="verdicts" role="status">${headline}${groups}</div>`;
}

function currentLang(): Lang {
  const fromQuery = new URLSearchParams(location.search).get("lang");
  if (fromQuery === "en" || fromQuery === "pt") return fromQuery;
  return "en";
}

let lang: Lang = currentLang();
const engine = createJsEngine({ ...EMBEDDED_SCHEMAS, links: EMBEDDED_LINKS });

const $ = (id: string) => document.getElementById(id)!;

function applyChrome(): void {
  const t = UI[lang];
  document.documentElement.lang = lang === "pt" ? "pt-PT" : "en";
  $("pg-title").textContent = t.title;
  $("pg-lede").textContent = t.lede;
  $("label-source").textContent = t.source;
  $("label-result").textContent = t.result;
  $("load-example").textContent = t.loadExample;
  $("file-label").textContent = t.files;
  $("busy").textContent = t.validating;
  $("lang-switch").textContent = t.langSwitch;
  const input = $("input") as HTMLTextAreaElement;
  if (!input.value.trim()) $("result").innerHTML = `<p class="empty">${esc(t.empty)}</p>`;
}

async function analyse(): Promise<void> {
  const input = $("input") as HTMLTextAreaElement;
  const text = input.value;
  const t = UI[lang];
  if (!text.trim()) {
    $("result").innerHTML = `<p class="empty">${esc(t.empty)}</p>`;
    $("summary").textContent = "";
    return;
  }
  $("busy").hidden = false;
  try {
    const result = await engine.analyze(text);
    const ctx = {
      i18n: EMBEDDED_I18N,
      names: EMBEDDED_NAMES,
      lang: lang === "pt" ? "pt-PT" : "en",
      assets: {},
    };
    const verdicts = renderVerdictsI18n(result, lang);
    const docs = result.documents.map((d) => renderDocument(d, ctx as never)).join("");
    $("result").innerHTML = verdicts + docs;

    // Summarise, so a long document does not bury the answer. Verdicts are
    // per-document (AnalysisResult has no top-level diagnostics), and a
    // parse failure counts too — otherwise unparseable input reads "valid".
    const problems =
      result.parse.errors.length +
      result.documents.reduce((n, d) => n + d.verdicts.length, 0);
    $("summary").textContent = problems === 0 ? `✓ ${t.valid}` : `${problems} ${t.problems}`;
    $("summary").className = problems === 0 ? "ok" : "bad";
  } catch (err) {
    $("result").innerHTML = `<p class="error">${esc(String(err))}</p>`;
    $("summary").textContent = "";
  } finally {
    $("busy").hidden = true;
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
function scheduleAnalyse(): void {
  clearTimeout(timer);
  timer = setTimeout(() => void analyse(), 180);
}

$("input").addEventListener("input", scheduleAnalyse);

$("load-example").addEventListener("click", () => {
  ($("input") as HTMLTextAreaElement).value = EMBEDDED_EXAMPLE;
  void analyse();
});

$("lang-switch").addEventListener("click", (e) => {
  e.preventDefault();
  lang = lang === "en" ? "pt" : "en";
  const url = new URL(location.href);
  url.searchParams.set("lang", lang);
  history.replaceState(null, "", url);
  applyChrome();

// The entry page embeds this with ?example=1 so a stranger arrives to a
// LIVE playground rather than an empty box. Daniel's IA choice was a live
// playground; an empty textarea is not one, and the whole jwt.io move
// depends on the tool explaining itself before any prose does.
if (new URLSearchParams(location.search).get("example") === "1") {
  ($("input") as HTMLTextAreaElement).value = EMBEDDED_EXAMPLE;
  void analyse();
}
  void analyse();
});

$("file-input").addEventListener("change", async (e) => {
  const files = (e.target as HTMLInputElement).files;
  if (!files?.length) return;
  for (const f of Array.from(files)) {
    if (/\.(ya?ml|json|rcp)$/i.test(f.name)) {
      ($("input") as HTMLTextAreaElement).value = await f.text();
      break;
    }
  }
  void analyse();
});

applyChrome();

// The entry page embeds this with ?example=1 so a stranger arrives to a
// LIVE playground rather than an empty box. Daniel's IA choice was a live
// playground; an empty textarea is not one, and the whole jwt.io move
// depends on the tool explaining itself before any prose does.
if (new URLSearchParams(location.search).get("example") === "1") {
  ($("input") as HTMLTextAreaElement).value = EMBEDDED_EXAMPLE;
  void analyse();
}
