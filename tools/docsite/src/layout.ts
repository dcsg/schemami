/**
 * Page shell: navigation, language switch, provenance banner.
 *
 * ADR-003 rejected a themed framework, so navigation and typography are
 * engineering deliverables here rather than a theme's defaults (SP-007).
 * This file is where that debt is paid.
 *
 * Every URL emitted is RELATIVE, computed from the page's own depth, so
 * the site works from file:// and from any subdirectory. That is the
 * constraint Astro/Starlight/Docusaurus could not meet.
 */
import { CHROME, LANG_LABEL, LANGS, type Lang } from "./chrome.ts";

export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface PageOpts {
  lang: Lang;
  /** Directory depth below dist/ — 0 for index.html, 1 for registry/x.html. */
  depth: number;
  title: string;
  /** Repo-relative path this page was generated from, if any (FR-DOC-002). */
  renderedFrom?: string;
  /** Slug identifying this page across languages, for the language switch. */
  pageId: string;
  /** Marks the active nav item. */
  section?: "spec" | "schema" | "registry" | "playground";
  bodyClass?: string;
}

/** Relative prefix back to dist/ root: "", "../", "../../" … */
export function up(depth: number): string {
  return depth === 0 ? "" : "../".repeat(depth);
}

/** The same page in the other language, as a relative href. */
function langHref(pageId: string, lang: Lang, depth: number): string {
  const root = up(depth);
  return pageId === "index" ? `${root}${lang}/index.html` : `${root}${lang}/${pageId}.html`;
}

function nav(o: PageOpts): string {
  const c = CHROME[o.lang];
  const root = up(o.depth);
  const items: [string, string, NonNullable<PageOpts["section"]>][] = [
    [c.navSpec, `${root}${o.lang}/spec.html`, "spec"],
    [c.navSchema, `${root}${o.lang}/schema.html`, "schema"],
    [c.navRegistry, `${root}${o.lang}/registry.html`, "registry"],
    [c.navPlayground, `${root}${o.lang}/playground.html`, "playground"],
  ];
  const links = items
    .map(([label, href, id]) => {
      const active = o.section === id ? ' aria-current="page"' : "";
      return `<a href="${esc(href)}"${active}>${esc(label)}</a>`;
    })
    .join("");

  const switcher = LANGS.map((l) => {
    const active = l === o.lang ? ' aria-current="true"' : "";
    return `<a href="${esc(langHref(o.pageId, l, o.depth))}" lang="${l}"${active}>${esc(LANG_LABEL[l])}</a>`;
  }).join("");

  return `<header class="site-header">
  <a class="brand" href="${esc(root + o.lang + "/index.html")}">
    <strong>RCP</strong> <span>${esc(CHROME[o.lang].siteTagline)}</span>
  </a>
  <nav aria-label="${esc(o.lang === "en" ? "Sections" : "Secções")}">${links}</nav>
  <nav class="lang" aria-label="${esc(CHROME[o.lang].langLabel)}">${switcher}</nav>
</header>`;
}

/**
 * FR-DOC-002 / SP-002: a rendered page reads as more authoritative than the
 * JSON it came from, so it says which file it came from and that the repo
 * is what binds. Never omitted on a generated page.
 */
function provenance(o: PageOpts): string {
  if (!o.renderedFrom) return "";
  const c = CHROME[o.lang];
  return `<aside class="provenance" role="note">
  <p><span class="prov-label">${esc(c.renderedFrom)}</span> <code>${esc(o.renderedFrom)}</code></p>
  <p class="prov-notice">${esc(c.informativeNotice)}</p>
</aside>`;
}

export function page(o: PageOpts, body: string): string {
  const root = up(o.depth);
  const htmlLang = o.lang === "pt" ? "pt-PT" : "en";
  return `<!doctype html>
<html lang="${htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)} — RCP</title>
<link rel="stylesheet" href="${esc(root)}style.css">
</head>
<body${o.bodyClass ? ` class="${esc(o.bodyClass)}"` : ""}>
${nav(o)}
<main>
${provenance(o)}
${body}
</main>
<footer class="site-footer">
  <p>RCP — ${esc(CHROME[o.lang].siteTagline)}.</p>
</footer>
</body>
</html>
`;
}
