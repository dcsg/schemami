#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "../..");
const system = resolve(root, "design-system");

let fonts = readFileSync(resolve(system, "styles/fonts.css"), "utf8");
const fontPattern = /url\("\.\.\/assets\/fonts\/([^\"]+)"\)/g;
fonts = fonts.replace(fontPattern, (_, filename) => {
  const binary = readFileSync(resolve(system, "assets/fonts", filename));
  return `url("data:font/woff2;base64,${binary.toString("base64")}")`;
});

const tokens = readFileSync(resolve(system, "generated/schemami.css"), "utf8");
const foundation = readFileSync(resolve(system, "styles/foundation.css"), "utf8")
  .replace(/^@import[^\n]+\n/gm, "");
const css = `<style>\n${fonts}\n${tokens}\n${foundation}\n</style>`;

let html = readFileSync(resolve(system, "specimen.template.html"), "utf8")
  .replace("<!-- SCHEMAMI_FOUNDATION_CSS -->", css);

const imagePattern = /src="assets\/logos\/([^\"]+\.svg)"/g;
html = html.replace(imagePattern, (_, filename) => {
  const binary = readFileSync(resolve(system, "assets/logos", filename));
  return `src="data:image/svg+xml;base64,${binary.toString("base64")}"`;
});

writeFileSync(resolve(system, "specimen.html"), html);
console.log("generated design-system/specimen.html");
