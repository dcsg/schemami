/**
 * PROTOTYPE site generator (PRD-005 FR-TOOL-006).
 *
 * Reads normative sources from the repo and emits dist/. Nothing is
 * hand-authored: if a page's content is not derivable from a repo file,
 * it is not a page (SP-001).
 *
 * Deliberately NOT wired into make/accept.sh — this is a spike whose job
 * is to answer whether the IA works, what a proper viewer shell needs, and
 * whether build-time rendering stays clean. It may be deleted wholesale.
 *
 * Run: bun run tools/docsite/build.ts
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { marked } from "marked";
import { parse as parseYaml } from "../viewer/node_modules/yaml/dist/index.js";
import { CHROME, LANGS, type Lang } from "./src/chrome.ts";
import { esc, page, up } from "./src/layout.ts";
import { renderSchema } from "./src/schema-render.ts";

const ROOT = join(import.meta.dir, "../..");
const DIST = join(import.meta.dir, "dist");

const problems: string[] = [];
const written: string[] = [];

function write(relPath: string, html: string): void {
  const full = join(DIST, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, html);
  written.push(relPath);
}

function read(repoRelative: string): string {
  return readFileSync(join(ROOT, repoRelative), "utf8");
}

function readJson(repoRelative: string): Record<string, unknown> {
  return JSON.parse(read(repoRelative));
}

// ── Entry page: one-line pitch, live playground, three paths ──────────────
// Daniel's IA choice 2026-08-04. Serves the three personas without making
// any of them scroll past the other two.
function entryPage(lang: Lang): string {
  const c = CHROME[lang];
  const paths: [string, string, string][] = [
    [c.pathUnderstandTitle, c.pathUnderstandBody, `${lang}/spec.html`],
    [c.pathImplementTitle, c.pathImplementBody, `${lang}/calculus.html`],
    [c.pathAuthorTitle, c.pathAuthorBody, `${lang}/schema.html`],
  ];
  const cards = paths
    .map(
      ([title, body, href]) => `<a class="path-card" href="${esc("../" + href)}">
  <h2>${esc(title)}</h2>
  <p>${esc(body)}</p>
</a>`,
    )
    .join("\n");

  const body = `<section class="hero">
  <p class="pitch">${esc(c.pitch)}</p>
</section>

<section class="playground-embed">
  <p class="try">${esc(c.tryItHere)}</p>
  <iframe src="${esc("../playground/index.html?lang=" + lang + "&example=1")}" title="${esc(c.playgroundTitle)}" class="pg-frame"></iframe>
</section>

<section class="paths">
${cards}
</section>`;

  return page(
    { lang, depth: 1, title: "RCP", pageId: "index", bodyClass: "home" },
    body,
  );
}

// ── Normative Markdown pages, rendered from source ────────────────────────
function markdownPage(lang: Lang, source: string, title: string, pageId: string, section: PageSection): string {
  const md = read(source);
  const html = marked.parse(md, { async: false }) as string;
  return page(
    { lang, depth: 1, title, pageId, section, renderedFrom: source },
    `<article class="prose">${html}</article>`,
  );
}
type PageSection = "spec" | "schema" | "registry" | "playground" | undefined;

// ── Schema reference ──────────────────────────────────────────────────────
function schemaPage(lang: Lang): string {
  const source = "schema/rcp-core-v1.schema.json";
  const result = renderSchema(readJson(source), source);
  problems.push(...result.problems);
  console.log(`  schema: ${result.defCount} defs, ${result.descriptionCount} described`);
  return page(
    { lang, depth: 1, title: "Schema", pageId: "schema", section: "schema", renderedFrom: source },
    `<article class="prose schema-doc">${result.html}</article>`,
  );
}

// ── Registry: index + a page per entry ────────────────────────────────────
interface Entry {
  id: string;
  kind: string;
  file: string;
  displayName: Record<string, string>;
  definition: string;
  raw: Record<string, unknown>;
}

function loadRegistry(): Entry[] {
  const kinds = ["ingredient", "primitive", "technique", "equipment"];
  const entries: Entry[] = [];
  for (const kind of kinds) {
    const dir = join(ROOT, "registry/entries", kind);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".yaml")).sort()) {
      const rel = `registry/entries/${kind}/${file}`;
      const raw = parseYaml(read(rel)) as Record<string, unknown>;
      entries.push({
        id: String(raw["id"] ?? file.replace(/\.yaml$/, "")),
        kind,
        file: rel,
        displayName: (raw["display_name"] as Record<string, string>) ?? {},
        definition: String(raw["definition"] ?? ""),
        raw,
      });
    }
  }
  return entries;
}

function entrySlug(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function registryIndexPage(lang: Lang, entries: Entry[]): string {
  const c = CHROME[lang];
  const byKind = new Map<string, Entry[]>();
  for (const e of entries) {
    if (!byKind.has(e.kind)) byKind.set(e.kind, []);
    byKind.get(e.kind)!.push(e);
  }
  const sections = [...byKind.entries()]
    .map(([kind, list]) => {
      const rows = list
        .map((e) => {
          const name = e.displayName[lang === "pt" ? "pt" : "en"] ?? e.displayName["en"] ?? e.id;
          return `<tr>
  <td><a href="${esc(`../registry/${entrySlug(e.id)}.${lang}.html`)}"><code>${esc(e.id)}</code></a></td>
  <td>${esc(name)}</td>
</tr>`;
        })
        .join("\n");
      return `<section class="reg-kind">
<h2>${esc(kind)} <span class="count">${list.length} ${esc(c.registryCount)}</span></h2>
<div class="table-scroll"><table class="reg"><tbody>
${rows}
</tbody></table></div>
</section>`;
    })
    .join("\n");

  return page(
    { lang, depth: 1, title: c.navRegistry, pageId: "registry", section: "registry", renderedFrom: "registry/entries/" },
    `<h1>${esc(c.navRegistry)}</h1><p class="lede">${esc(c.registryLede)}</p>${sections}`,
  );
}

function registryEntryPage(lang: Lang, e: Entry): string {
  const c = CHROME[lang];
  const name = e.displayName[lang === "pt" ? "pt" : "en"] ?? e.displayName["en"] ?? e.id;
  const other = lang === "pt" ? e.displayName["en"] : e.displayName["pt"];

  let extra = "";
  const teaches = e.raw["teaches"];
  if (Array.isArray(teaches) && teaches.length) {
    const items = teaches
      .map((t) => {
        const o = t as Record<string, unknown>;
        const quote = o["source_quote"] ? `<blockquote>${esc(o["source_quote"])}</blockquote>` : "";
        const url = typeof o["source_url"] === "string"
          ? `<p class="src"><a href="${esc(o["source_url"])}" rel="noreferrer">${esc(o["source_url"])}</a></p>`
          : "";
        const point = o["point"] ? `<p>${esc(o["point"])}</p>` : "";
        return `<li>${point}${quote}${url}</li>`;
      })
      .join("");
    extra += `<section><h2>Teaches</h2><ul class="teaches">${items}</ul></section>`;
  }

  const stages = e.raw["stages"];
  if (Array.isArray(stages) && stages.length) {
    const items = stages
      .map((s) => {
        const o = s as Record<string, unknown>;
        return `<li><code>${esc(o["id"])}</code> — ${esc(o["definition"] ?? o["note"] ?? "")}</li>`;
      })
      .join("");
    extra += `<section><h2>Graded stages</h2><ul class="stages">${items}</ul></section>`;
  }

  const body = `<p class="crumb"><a href="${esc(`../${lang}/registry.html`)}">${esc(c.backToRegistry)}</a></p>
<h1><code>${esc(e.id)}</code></h1>
<p class="display-name">${esc(name)}${other ? ` <span class="alt">· ${esc(other)}</span>` : ""}</p>
<h2>${esc(c.definition)}</h2>
<p class="definition">${esc(e.definition)}</p>
${extra}`;

  return page(
    { lang, depth: 1, title: e.id, pageId: `../registry/${entrySlug(e.id)}`, section: "registry", renderedFrom: e.file },
    body,
  );
}

// ── Build ─────────────────────────────────────────────────────────────────
console.log("building docsite prototype…");
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

copyFileSync(join(import.meta.dir, "style.css"), join(DIST, "style.css"));

const entries = loadRegistry();
console.log(`  registry: ${entries.length} entries`);

for (const lang of LANGS) {
  write(`${lang}/index.html`, entryPage(lang));
  write(`${lang}/spec.html`, markdownPage(lang, "docs/ubiquitous-language.md", "Specification", "spec", "spec"));
  write(`${lang}/calculus.html`, markdownPage(lang, "calculus/SPEC.md", "Recipe Calculus", "calculus", "spec"));
  write(`${lang}/versioning.html`, markdownPage(lang, "schema/VERSIONING.md", "Versioning", "versioning", "spec"));
  write(`${lang}/media.html`, markdownPage(lang, "schema/MEDIA.md", "Media", "media", "spec"));
  write(`${lang}/schema.html`, schemaPage(lang));
  write(`${lang}/registry.html`, registryIndexPage(lang, entries));
  for (const e of entries) {
    write(`registry/${entrySlug(e.id)}.${lang}.html`, registryEntryPage(lang, e));
  }
}

// ── Playground: bundled separately, self-contained, hash CSP ─────────────
// Kept as its own page rather than inlined into every doc page: the CSP
// hashes are computed over its exact bundle, and one page owning them is
// the only way that stays true.
async function buildPlayground(): Promise<void> {
  const built = await Bun.build({
    entrypoints: [join(import.meta.dir, "playground/main.ts")],
    minify: true,
    target: "browser",
  });
  if (!built.success) {
    for (const log of built.logs) console.error(log);
    throw new Error("playground bundle failed");
  }
  const js = await built.outputs[0]!.text();
  const css = readFileSync(join(import.meta.dir, "playground/playground.css"), "utf8");

  const hash = (s: string) =>
    "sha256-" + Buffer.from(new Bun.CryptoHasher("sha256").update(s).digest()).toString("base64");
  const csp = [
    "default-src 'none'",
    `script-src '${hash(js)}'`,
    `style-src '${hash(css)}'`,
    "img-src data: blob:",
    "media-src data: blob:",
  ].join("; ");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RCP Playground</title>
<style>${css}</style>
</head>
<body>
<header class="pg-head">
  <div>
    <h1 id="pg-title">Playground</h1>
    <p id="pg-lede"></p>
  </div>
  <button id="lang-switch" type="button" class="lang-switch"></button>
</header>
<div class="panes">
  <section class="pane">
    <div class="pane-head">
      <label id="label-source" for="input"></label>
      <div class="tools">
        <button id="load-example" type="button"></button>
        <label id="file-label" class="file-label" for="file-input"></label>
        <input id="file-input" type="file" multiple hidden>
      </div>
    </div>
    <textarea id="input" spellcheck="false" autocomplete="off"></textarea>
  </section>
  <section class="pane">
    <div class="pane-head">
      <label id="label-result"></label>
      <span id="summary"></span>
      <span id="busy" hidden></span>
    </div>
    <div id="result" aria-live="polite"></div>
  </section>
</div>
<script>${js}</script>
</body>
</html>
`;
  write("playground/index.html", html);
  console.log(`  playground: ${(html.length / 1024).toFixed(1)} KiB, hash CSP`);
}

await buildPlayground();

// Root redirect to English.
write("index.html", `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=en/index.html">
<title>RCP</title></head>
<body><p><a href="en/index.html">RCP documentation</a></p></body></html>
`);

console.log(`\n  ${written.length} pages written to tools/docsite/dist/`);

// Deduped: the schema is rendered once per language, so every problem is
// found twice. The audit is about the SOURCE, not about the rendering pass.
const distinct = [...new Set(problems)].sort();
if (distinct.length) {
  console.log(`\n  ${distinct.length} documentation-policy problem(s):`);
  for (const p of distinct) console.log(`    · ${p}`);
  console.log(
    "\n  These are findings about the schema, not about the site. A $def with" +
      "\n  no description is a field whose meaning exists only in someone's head.",
  );
}
