#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "../..");
const sourcePath = resolve(root, "design-system/tokens/schemami.tokens.json");
const generatedDir = resolve(root, "design-system/generated");
const source = JSON.parse(readFileSync(sourcePath, "utf8"));

const tokens = new Map();

function visit(node, path = [], inheritedType) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  const type = node.$type ?? inheritedType;
  if (Object.hasOwn(node, "$value")) {
    const name = path.join(".");
    if (tokens.has(name)) throw new Error(`duplicate token ${name}`);
    tokens.set(name, { value: node.$value, type, description: node.$description });
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (!key.startsWith("$")) visit(value, [...path, key], type);
  }
}

visit(source);

const referencePattern = /^\{([^}]+)\}$/;

for (const [name, token] of tokens) {
  if (typeof token.value !== "string") continue;
  const match = token.value.match(referencePattern);
  if (match && !tokens.has(match[1])) {
    throw new Error(`${name} references missing token ${match[1]}`);
  }
}

function genericPath(path) {
  return path.startsWith("mode.dark.") ? path.slice("mode.dark.".length) : path;
}

function effectiveToken(path, dark) {
  const generic = genericPath(path);
  const override = `mode.dark.${generic}`;
  if (dark && tokens.has(override)) return [override, tokens.get(override)];
  const token = tokens.get(generic) ?? tokens.get(path);
  if (!token) throw new Error(`unknown token ${path}`);
  return [generic, token];
}

function resolveValue(path, dark = false, stack = []) {
  const [effectivePath, token] = effectiveToken(path, dark);
  if (stack.includes(effectivePath)) {
    throw new Error(`token cycle: ${[...stack, effectivePath].join(" -> ")}`);
  }
  if (typeof token.value === "string") {
    const match = token.value.match(referencePattern);
    if (match) return resolveValue(match[1], dark, [...stack, effectivePath]);
  }
  return token.value;
}

function kebabSegment(segment) {
  return segment.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function cssName(path) {
  return `--sm-${genericPath(path).split(".").map(kebabSegment).join("-")}`;
}

function cssValue(value) {
  if (typeof value === "string") {
    const match = value.match(referencePattern);
    return match ? `var(${cssName(match[1])})` : value;
  }
  if (Array.isArray(value)) return `cubic-bezier(${value.join(", ")})`;
  return String(value);
}

function cssBlock(selector, entries) {
  const lines = [`${selector} {`];
  for (const [path, token] of entries) {
    if (token.description) lines.push(`  /* ${token.description} */`);
    lines.push(`  ${cssName(path)}: ${cssValue(token.value)};`);
  }
  lines.push("}");
  return lines.join("\n");
}

const baseEntries = [...tokens.entries()]
  .filter(([path]) => !path.startsWith("mode."))
  .sort(([a], [b]) => a.localeCompare(b));
const darkEntries = [...tokens.entries()]
  .filter(([path]) => path.startsWith("mode.dark."))
  .sort(([a], [b]) => a.localeCompare(b));

const css = `/* Generated from tokens/schemami.tokens.json. Do not edit directly. */
${cssBlock(":root, [data-theme=\"light\"]", baseEntries)}

${cssBlock("[data-theme=\"dark\"]", darkEntries)}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme=\"light\"]) {
${darkEntries.map(([path, token]) => `    ${cssName(path)}: ${cssValue(token.value)};`).join("\n")}
  }
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --sm-motion-duration-fast: 0ms;
    --sm-motion-duration-normal: 0ms;
    --sm-motion-duration-slow: 0ms;
  }
}
`;

function hexToRgb(hex) {
  const normalized = hex.slice(1);
  if (normalized.length !== 6) throw new Error(`expected opaque six-digit color, got ${hex}`);
  return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
}

function channel(value) {
  const unit = value / 255;
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [red, green, blue] = hexToRgb(hex).map(channel);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const contrastPairs = [
  ["text.primary/canvas", "semantic.color.text.primary", "semantic.color.background.canvas", 4.5],
  ["text.secondary/canvas", "semantic.color.text.secondary", "semantic.color.background.canvas", 4.5],
  ["text.muted/canvas", "semantic.color.text.muted", "semantic.color.background.canvas", 4.5],
  ["link/canvas", "semantic.color.text.link", "semantic.color.background.canvas", 4.5],
  ["primary action", "semantic.color.action.primary.foreground", "semantic.color.action.primary.background", 4.5],
  ["focus/canvas", "semantic.color.border.focus", "semantic.color.background.canvas", 3],
  ["default border/surface", "semantic.color.border.default", "semantic.color.background.surface", 3],
  ["success", "semantic.color.status.success.foreground", "semantic.color.status.success.background", 4.5],
  ["warning", "semantic.color.status.warning.foreground", "semantic.color.status.warning.background", 4.5],
  ["danger", "semantic.color.status.danger.foreground", "semantic.color.status.danger.background", 4.5],
  ["info", "semantic.color.status.info.foreground", "semantic.color.status.info.background", 4.5]
];

const contrastReport = [];
for (const mode of ["light", "dark"]) {
  for (const [label, foregroundPath, backgroundPath, minimum] of contrastPairs) {
    const foreground = resolveValue(foregroundPath, mode === "dark");
    const background = resolveValue(backgroundPath, mode === "dark");
    const ratio = contrast(foreground, background);
    contrastReport.push({ mode, label, foreground, background, ratio: Number(ratio.toFixed(2)), minimum });
    if (ratio < minimum) {
      throw new Error(`${mode} ${label} contrast ${ratio.toFixed(2)} is below ${minimum}`);
    }
  }
}

const resolved = { light: {}, dark: {}, contrast: contrastReport };
for (const [path] of baseEntries) {
  resolved.light[path] = resolveValue(path, false);
  resolved.dark[path] = resolveValue(path, true);
}

function swiftIdentifier(path) {
  const segments = path.split(".");
  return segments[0] + segments.slice(1).map((segment) => segment[0].toUpperCase() + segment.slice(1)).join("");
}

function swiftColor(hex) {
  const normalized = hex.slice(1);
  if (normalized.length !== 6 && normalized.length !== 8) {
    throw new Error(`expected six- or eight-digit Swift color, got ${hex}`);
  }
  const [red, green, blue] = [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16) / 255);
  const alpha = normalized.length === 8 ? Number.parseInt(normalized.slice(6, 8), 16) / 255 : 1;
  return `Color(.sRGB, red: ${red.toFixed(6)}, green: ${green.toFixed(6)}, blue: ${blue.toFixed(6)}, opacity: ${alpha.toFixed(6)})`;
}

const primitiveColors = baseEntries.filter(([path, token]) => path.startsWith("color.") && token.type === "color" && /^#[0-9A-F]{6}$/i.test(resolveValue(path)));
const semanticColors = baseEntries.filter(([path, token]) => path.startsWith("semantic.color.") && token.type === "color");
const swift = `// Generated from tokens/schemami.tokens.json. Do not edit directly.
import SwiftUI

public enum SchemamiPrimitiveColor {
${primitiveColors.map(([path]) => `  public static let ${swiftIdentifier(path.slice("color.".length))} = ${swiftColor(resolveValue(path))}`).join("\n")}
}

public struct SchemamiThemeColors {
${semanticColors.map(([path]) => `  public let ${swiftIdentifier(path.slice("semantic.color.".length))}: Color`).join("\n")}

  public static let light = SchemamiThemeColors(
${semanticColors.map(([path], index) => `    ${swiftIdentifier(path.slice("semantic.color.".length))}: ${swiftColor(resolveValue(path, false))}${index === semanticColors.length - 1 ? "" : ","}`).join("\n")}
  )

  public static let dark = SchemamiThemeColors(
${semanticColors.map(([path], index) => `    ${swiftIdentifier(path.slice("semantic.color.".length))}: ${swiftColor(resolveValue(path, true))}${index === semanticColors.length - 1 ? "" : ","}`).join("\n")}
  )
}
`;

mkdirSync(generatedDir, { recursive: true });
writeFileSync(resolve(generatedDir, "schemami.css"), css);
writeFileSync(resolve(generatedDir, "schemami.resolved.json"), `${JSON.stringify(resolved, null, 2)}\n`);
writeFileSync(resolve(generatedDir, "SchemamiTokens.swift"), swift);

console.log(`validated ${tokens.size} tokens`);
console.log(`validated ${contrastReport.length} contrast pairs`);
console.log("generated design-system/generated/schemami.css");
console.log("generated design-system/generated/schemami.resolved.json");
console.log("generated design-system/generated/SchemamiTokens.swift");
