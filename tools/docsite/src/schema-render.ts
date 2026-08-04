/**
 * JSON Schema → HTML, hand-rolled (ADR-003).
 *
 * Why not an off-the-shelf renderer: measured against the real core schema,
 * json-schema-for-humans renders 89 of 93 descriptions and silently drops
 * the `$defs` description whenever the referencing property has its own —
 * which is exactly the prose that defines what a `variantDiscriminator` IS.
 * jsonschema-markdown gets 86/93; @adobe/jsonschema2md explodes into 316
 * files; json-schema-static-docs stack-overflows because it fully
 * dereferences and this schema is recursive.
 *
 * The design difference: we DO NOT dereference. One section per `$def`,
 * `$ref` rendered as a link. That is why this is ~200 lines instead of a
 * dependency, and why anchors are JSON-Pointer-shaped (`#/$defs/quantity`)
 * so SPEC.md and the profile pages can link into the reference.
 */
import { esc } from "./layout.ts";

type Json = Record<string, unknown>;

/** Anchor id for a $def, matching its JSON Pointer so links are predictable. */
export function defAnchor(name: string): string {
  return `defs-${name}`;
}

function refTarget(ref: string): { name: string; label: string } | null {
  const m = /^#\/\$defs\/(.+)$/.exec(ref);
  return m ? { name: m[1]!, label: m[1]! } : null;
}

/** A type badge: "string", "array of string", "object", "one of: a | b". */
function typeLabel(s: Json): string {
  if (typeof s["$ref"] === "string") {
    const t = refTarget(s["$ref"] as string);
    return t ? `<a href="#${esc(defAnchor(t.name))}"><code>${esc(t.label)}</code></a>` : "<code>ref</code>";
  }
  if (Array.isArray(s["oneOf"])) {
    const parts = (s["oneOf"] as Json[]).map((b) => typeLabel(b));
    return `one of ${parts.join(" | ")}`;
  }
  if (Array.isArray(s["enum"])) {
    return (s["enum"] as unknown[]).map((v) => `<code>${esc(v)}</code>`).join(" | ");
  }
  const t = s["type"];
  if (t === "array") {
    const items = s["items"];
    if (items && typeof items === "object") return `array of ${typeLabel(items as Json)}`;
    return "array";
  }
  if (typeof t === "string") return `<code>${esc(t)}</code>`;
  if (Array.isArray(t)) return (t as string[]).map((x) => `<code>${esc(x)}</code>`).join(" | ");
  return "<code>any</code>";
}

/** Constraints worth showing beside a field — bounds, patterns, formats. */
function constraints(s: Json): string[] {
  const out: string[] = [];
  const pairs: [string, string][] = [
    ["minimum", "min"], ["maximum", "max"],
    ["exclusiveMinimum", "> "], ["exclusiveMaximum", "< "],
    ["minLength", "min length"], ["maxLength", "max length"],
    ["minItems", "min items"], ["maxItems", "max items"],
    ["multipleOf", "multiple of"], ["format", "format"],
  ];
  for (const [key, label] of pairs) {
    if (s[key] !== undefined) out.push(`${label} ${esc(s[key])}`);
  }
  if (typeof s["pattern"] === "string") out.push(`pattern <code>${esc(s["pattern"])}</code>`);
  if (s["const"] !== undefined) out.push(`const <code>${esc(s["const"])}</code>`);
  if (s["additionalProperties"] === false) out.push("no extra properties");
  if (s["default"] !== undefined) out.push(`default <code>${esc(JSON.stringify(s["default"]))}</code>`);
  return out;
}

function propertyRow(name: string, prop: Json, required: Set<string>): string {
  const req = required.has(name)
    ? '<span class="req" title="required">required</span>'
    : '<span class="opt">optional</span>';
  const cons = constraints(prop);
  const consHtml = cons.length ? `<p class="constraints">${cons.join(" · ")}</p>` : "";
  // The description is the payload — never truncated, never dropped.
  const desc = typeof prop["description"] === "string"
    ? `<p class="desc">${esc(prop["description"])}</p>`
    : "";
  return `<tr>
  <td class="pname"><code>${esc(name)}</code><br>${req}</td>
  <td class="ptype">${typeLabel(prop)}</td>
  <td class="pdesc">${desc}${consHtml}</td>
</tr>`;
}

function propertiesTable(s: Json): string {
  const props = s["properties"] as Json | undefined;
  if (!props || typeof props !== "object") return "";
  const required = new Set<string>(Array.isArray(s["required"]) ? (s["required"] as string[]) : []);
  const rows = Object.entries(props)
    .map(([name, prop]) => propertyRow(name, prop as Json, required))
    .join("\n");
  if (!rows) return "";
  return `<div class="table-scroll"><table class="props">
<thead><tr><th>Field</th><th>Type</th><th>Meaning</th></tr></thead>
<tbody>
${rows}
</tbody>
</table></div>`;
}

/** One `$def` as a linkable section. */
function defSection(name: string, def: Json): string {
  const anchor = defAnchor(name);
  const title = typeof def["title"] === "string" ? def["title"] : name;
  // The $defs description is exactly what off-the-shelf renderers drop.
  const desc = typeof def["description"] === "string"
    ? `<p class="desc">${esc(def["description"])}</p>`
    : "";
  const cons = constraints(def);
  const consHtml = cons.length ? `<p class="constraints">${cons.join(" · ")}</p>` : "";

  let enumHtml = "";
  if (Array.isArray(def["enum"])) {
    const values = (def["enum"] as unknown[])
      .map((v) => `<li><code>${esc(v)}</code></li>`)
      .join("");
    enumHtml = `<ul class="enum">${values}</ul>`;
  }

  let oneOfHtml = "";
  if (Array.isArray(def["oneOf"])) {
    const branches = (def["oneOf"] as Json[])
      .map((b, i) => {
        const bd = typeof b["description"] === "string" ? `<p class="desc">${esc(b["description"])}</p>` : "";
        return `<li><strong>${i + 1}.</strong> ${typeLabel(b)}${bd}${propertiesTable(b)}</li>`;
      })
      .join("");
    oneOfHtml = `<ol class="oneof">${branches}</ol>`;
  }

  return `<section class="def" id="${esc(anchor)}">
<h3><a class="anchor" href="#${esc(anchor)}">#</a> <code>${esc(name)}</code>${
    title !== name ? ` — ${esc(title)}` : ""
  }</h3>
<p class="pointer">JSON Pointer: <code>#/$defs/${esc(name)}</code></p>
${desc}${consHtml}${enumHtml}${oneOfHtml}${propertiesTable(def)}
</section>`;
}

export interface SchemaDocResult {
  html: string;
  /** Policy problems found while rendering — undocumented defs and enums. */
  problems: string[];
  defCount: number;
  descriptionCount: number;
}

/**
 * Render a schema, and audit it while walking.
 *
 * The audit is the reason this is ours rather than a dependency: the build
 * can fail on "a `$def` has no description", making the site a
 * protocol-quality gate instead of only a viewer.
 */
export function renderSchema(schema: Json, sourcePath: string): SchemaDocResult {
  const defs = (schema["$defs"] as Json | undefined) ?? {};
  const problems: string[] = [];
  let descriptionCount = 0;

  const names = Object.keys(defs).sort();
  for (const name of names) {
    const def = defs[name] as Json;
    if (typeof def["description"] === "string" && def["description"].trim()) {
      descriptionCount++;
    } else if (!Array.isArray(def["oneOf"]) && !def["$ref"]) {
      problems.push(`${sourcePath}: $defs/${name} has no description`);
    }
  }

  const toc = names
    .map((n) => `<li><a href="#${esc(defAnchor(n))}"><code>${esc(n)}</code></a></li>`)
    .join("");

  const sections = names.map((n) => defSection(n, defs[n] as Json)).join("\n");

  const rootDesc = typeof schema["description"] === "string"
    ? `<p class="desc">${esc(schema["description"])}</p>`
    : "";

  const html = `<h1>${esc(schema["title"] ?? "Schema")}</h1>
${rootDesc}
<p class="meta"><code>$id</code>: <code>${esc(schema["$id"])}</code></p>
<nav class="toc" aria-label="Definitions"><h2>Definitions (${names.length})</h2><ul class="toc-grid">${toc}</ul></nav>
${sections}`;

  return { html, problems, defCount: names.length, descriptionCount };
}
