/**
 * Convert one Markdown report into a self-contained, printable HTML document.
 *
 * Usage (from tools/docsite):
 *   bun run md-to-html.ts ../../docs/brand/report.md ../../docs/brand/report.html
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { marked } from "marked";

const [, , inputArg, outputArg] = process.argv;

if (!inputArg || !outputArg) {
  console.error("usage: bun run md-to-html.ts <input.md> <output.html>");
  process.exit(2);
}

const input = resolve(inputArg);
const output = resolve(outputArg);
const markdown = readFileSync(input, "utf8");
const titleMatch = markdown.match(/^#\s+(.+)$/m);
const title = titleMatch?.[1]?.trim() ?? basename(input, ".md");
const fontDirectory = resolve(import.meta.dir, "../../design-system/assets/fonts");
const logoDirectory = resolve(import.meta.dir, "../../design-system/assets/logos");

function fontData(filename: string): string {
  return readFileSync(resolve(fontDirectory, filename)).toString("base64");
}

function logoData(filename: string): string {
  return readFileSync(resolve(logoDirectory, filename)).toString("base64");
}

const fonts = {
  frauncesLatin: fontData("fraunces-latin-variable.woff2"),
  frauncesLatinExt: fontData("fraunces-latin-ext-variable.woff2"),
  plexSansLatin: fontData("ibm-plex-sans-latin-400.woff2"),
  plexSansLatinExt: fontData("ibm-plex-sans-latin-ext-400.woff2"),
  plexSansSemiboldLatin: fontData("ibm-plex-sans-latin-600.woff2"),
  plexSansSemiboldLatinExt: fontData("ibm-plex-sans-latin-ext-600.woff2"),
  plexMonoLatin: fontData("ibm-plex-mono-latin-400.woff2"),
  plexMonoLatinExt: fontData("ibm-plex-mono-latin-ext-400.woff2"),
};

const logo = logoData("schemami-lockup-color.svg");

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const content = (marked.parse(markdown, { async: false }) as string).replace(
  /<(th|td) align="(left|center|right)">/g,
  '<$1 class="align-$2">',
);
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:">
  <title>${esc(title)}</title>
  <style>
    @font-face { font-family: "Fraunces"; src: url("data:font/woff2;base64,${fonts.frauncesLatinExt}") format("woff2"); font-style: normal; font-weight: 100 900; font-display: block; unicode-range: U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF; }
    @font-face { font-family: "Fraunces"; src: url("data:font/woff2;base64,${fonts.frauncesLatin}") format("woff2"); font-style: normal; font-weight: 100 900; font-display: block; unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
    @font-face { font-family: "IBM Plex Sans"; src: url("data:font/woff2;base64,${fonts.plexSansLatinExt}") format("woff2"); font-style: normal; font-weight: 400; font-display: block; unicode-range: U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF; }
    @font-face { font-family: "IBM Plex Sans"; src: url("data:font/woff2;base64,${fonts.plexSansLatin}") format("woff2"); font-style: normal; font-weight: 400; font-display: block; unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
    @font-face { font-family: "IBM Plex Sans"; src: url("data:font/woff2;base64,${fonts.plexSansSemiboldLatinExt}") format("woff2"); font-style: normal; font-weight: 600; font-display: block; unicode-range: U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF; }
    @font-face { font-family: "IBM Plex Sans"; src: url("data:font/woff2;base64,${fonts.plexSansSemiboldLatin}") format("woff2"); font-style: normal; font-weight: 600; font-display: block; unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
    @font-face { font-family: "IBM Plex Mono"; src: url("data:font/woff2;base64,${fonts.plexMonoLatinExt}") format("woff2"); font-style: normal; font-weight: 400; font-display: block; unicode-range: U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF; }
    @font-face { font-family: "IBM Plex Mono"; src: url("data:font/woff2;base64,${fonts.plexMonoLatin}") format("woff2"); font-style: normal; font-weight: 400; font-display: block; unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
    :root {
      --paper: #fbf7ef;
      --surface: #fffdf8;
      --ink: #231a20;
      --muted: #4b3943;
      --rule: #e7dac6;
      --brand: #235d73;
      --signal: #d09a22;
      --support: #a94436;
      --max: 76rem;
      color-scheme: light;
      font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
      color: var(--ink);
      background: var(--paper);
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--paper); color: var(--ink); }
    body::before { content: ""; display: block; height: .55rem; background: linear-gradient(90deg, var(--signal) 0 18%, var(--support) 18% 45%, var(--brand) 45% 100%); }
    .brand-bar { width: min(calc(100% - 2rem), var(--max)); margin: 0 auto; padding: 1.25rem clamp(0rem, 3vw, 3rem); display: flex; align-items: center; gap: 1.5rem; border-bottom: 1px solid var(--rule); }
    .brand-signature { min-width: 0; display: flex; align-items: center; gap: 1.1rem; }
    .brand-lockup { width: clamp(9.5rem, 18vw, 13.5rem); height: auto; display: block; }
    .brand-context { color: var(--support); font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: .68rem; font-weight: 600; letter-spacing: .09em; line-height: 1.35; text-transform: uppercase; }
    article { width: min(calc(100% - 2rem), var(--max)); margin: 0 auto; padding: clamp(3.5rem, 8vw, 7rem) clamp(0rem, 3vw, 3rem) 6rem; }
    article::before { content: "Schemami · production reference"; display: block; margin-bottom: 1.1rem; color: var(--support); font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: .72rem; font-weight: 600; letter-spacing: .095em; text-transform: uppercase; }
    h1, h2, h3 { line-height: 1.08; text-wrap: balance; }
    h1 { margin: 0 0 .6rem; max-width: 14ch; font-family: "Fraunces", Georgia, serif; font-size: clamp(3rem, 8vw, 6.5rem); font-variation-settings: "opsz" 90, "wght" 700, "SOFT" 76, "WONK" 1; font-weight: 700; letter-spacing: -.045em; }
    h2 { margin: 4.5rem 0 1.1rem; padding-top: 1rem; border-top: 1px solid var(--rule); color: var(--brand); font-family: "Fraunces", Georgia, serif; font-size: clamp(1.8rem, 4vw, 3rem); font-variation-settings: "opsz" 60, "wght" 700, "SOFT" 70, "WONK" 1; letter-spacing: -.035em; }
    h3 { margin: 2.2rem 0 .7rem; color: var(--brand); font-size: 1.3rem; }
    p, li { max-width: 72ch; font-size: 1.03rem; line-height: 1.68; }
    p { margin: .7rem 0 1rem; }
    a { color: inherit; text-decoration-thickness: .09em; text-underline-offset: .15em; }
    strong { font-weight: 750; }
    code { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: .88em; }
    blockquote { margin: 2rem 0; padding: 1.1rem 1.3rem 1.15rem; border-left: .45rem solid var(--signal); background: var(--surface); box-shadow: 0 .35rem 1.4rem rgb(20 37 31 / 8%); }
    blockquote p { margin: 0; font-size: 1.08rem; }
    table { width: 100%; margin: 1.4rem 0 2.2rem; border-collapse: collapse; background: var(--surface); font-size: .92rem; }
    th, td { padding: .8rem .85rem; border: 1px solid var(--rule); text-align: left; vertical-align: top; line-height: 1.45; }
    th.align-center, td.align-center { text-align: center; }
    th.align-right, td.align-right { text-align: right; }
    th { background: var(--brand); color: #fff; font-size: .76rem; letter-spacing: .055em; text-transform: uppercase; }
    td:not(:first-child) { font-variant-numeric: tabular-nums; }
    hr { margin: 4rem 0 2rem; border: 0; border-top: 1px solid var(--rule); }
    .swatches { display: grid; grid-template-columns: repeat(5, minmax(7rem, 1fr)); gap: .55rem; margin: 1.15rem 0 1.6rem; }
    .swatch { min-height: 9rem; padding: 5.5rem .75rem .75rem; border: 1px solid rgb(35 26 32 / 18%); background: var(--swatch); color: #231a20; display: flex; flex-direction: column; justify-content: flex-end; }
    .swatch.dark { color: #fff; }
    .swatch span { font-weight: 750; }
    .swatch code { margin-top: .18rem; opacity: .82; }
    .document-footer { width: min(calc(100% - 2rem), var(--max)); margin: 0 auto; padding: 1.4rem clamp(0rem, 3vw, 3rem) 2.5rem; display: flex; justify-content: space-between; gap: 1rem; border-top: 1px solid var(--rule); color: var(--muted); font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: .68rem; line-height: 1.5; }
    @media (max-width: 720px) {
      article { width: min(calc(100% - 1.25rem), var(--max)); }
      .brand-bar { width: min(calc(100% - 1.25rem), var(--max)); align-items: flex-start; }
      .brand-context { display: none; }
      .swatches { grid-template-columns: repeat(2, minmax(7rem, 1fr)); }
      table { display: block; overflow-x: auto; }
      .document-footer { width: min(calc(100% - 1.25rem), var(--max)); flex-direction: column; }
    }
    @media print {
      :root { --paper: #fff; --surface: #fff; --ink: #231a20; --muted: #4b3943; --rule: #e7dac6; --brand: #235d73; color-scheme: light; }
      body::before { height: .25rem; }
      .brand-bar { padding-block: .7cm; }
      article { width: 100%; padding: 1.25cm; }
      h2 { break-after: avoid; }
      table, blockquote, .swatches { break-inside: avoid; }
      .swatch { min-height: 6.5rem; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .document-footer { width: 100%; padding: .5cm 1.25cm; }
    }
  </style>
</head>
<body>
  <header class="brand-bar">
    <div class="brand-signature">
      <img class="brand-lockup" src="data:image/svg+xml;base64,${logo}" alt="Schemami">
      <span class="brand-context">The flexible recipe protocol for software</span>
    </div>
  </header>
  <article>
${content}
  </article>
  <footer class="document-footer"><span>Recipes, structured to taste.</span><span>Generated from the canonical Markdown source.</span></footer>
</body>
</html>
`;

writeFileSync(output, html);
console.log(`rendered ${input} -> ${output}`);
