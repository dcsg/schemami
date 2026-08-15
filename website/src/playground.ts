import { admit, parse, protocolFloor, type Problem } from "../../sdk/typescript/src/index.ts";

type Dict = Record<string, unknown>;

const input = document.querySelector<HTMLTextAreaElement>("[data-playground-input]")!;
const fileInput = document.querySelector<HTMLInputElement>("[data-playground-file]")!;
const status = document.querySelector<HTMLElement>("[data-playground-status]")!;
const preview = document.querySelector<HTMLElement>("[data-playground-preview]")!;
const validateButton = document.querySelector<HTMLButtonElement>("[data-playground-validate]")!;
const exampleButton = document.querySelector<HTMLButtonElement>("[data-playground-example]")!;
const example = document.querySelector<HTMLScriptElement>("#playground-example")!.textContent || "";
const encoder = new TextEncoder();
const maximumBytes = 2 * 1024 * 1024;

const esc = (value: unknown) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");
const object = (value: unknown): Dict => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Dict : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

function problems(values: Problem[]): string {
  return `<div class="playground-verdict" data-status="refused"><strong>Refused</strong><p>The submitted bytes have no Schemami identity.</p><ol>${values.map((problem) => {
    const code = problem.type.slice(problem.type.lastIndexOf("/") + 1);
    return `<li><a href="${esc(problem.type)}"><code>${esc(code)}</code></a>${problem.pointer === undefined ? "" : ` at <code>${esc(problem.pointer || "/")}</code>`}</li>`;
  }).join("")}</ol></div>`;
}

function quantity(value: unknown): string {
  const item = object(value);
  if (item.kind === "measured") return `${esc(item.value)} ${esc(item.unit)}`;
  if (item.kind === "range") return `${esc(item.minimum)}–${esc(item.maximum)} ${esc(item.unit)}`;
  if (item.kind === "open") return esc(String(item.qualifier ?? "open quantity").replaceAll("_", " "));
  return "Not measured";
}

function methodSequence(value: unknown): string {
  return `<ol class="preview-method">${list(value).map((nodeValue) => {
    const node = object(nodeValue);
    if (node.kind === "section") return `<li><strong>${esc(node.name ?? node.id)}</strong>${methodSequence(node.sequence)}</li>`;
    const actions = list(node.actions).map((action) => `<li>${esc(object(action).instruction)}</li>`).join("");
    return `<li><code>${esc(node.id)}</code> ${node.instruction ? esc(node.instruction) : `<ol>${actions}</ol>`}</li>`;
  }).join("")}</ol>`;
}

function recipePreview(value: Dict, digest: string): string {
  const ingredients = list(value.ingredients).map((ingredientValue) => {
    const ingredient = object(ingredientValue);
    return `<li><span>${quantity(ingredient.quantity)}</span> ${esc(ingredient.name ?? ingredient.id)}</li>`;
  }).join("");
  return `<article class="admitted-preview" lang="${esc(value.content_language)}">
    <p class="sm-eyebrow">Admitted recipe</p><h2>${esc(value.title)}</h2>
    <p><code>${esc(value.collection)}/${esc(value.id)}@${esc(value.revision)}</code></p>
    <p class="digest"><strong>Canonical SHA-256</strong><code>${esc(digest)}</code></p>
    <section><h3>Ingredients</h3><ul class="preview-ingredients">${ingredients || "<li>No declared ingredients.</li>"}</ul></section>
    <section><h3>Method</h3>${methodSequence(object(value.method).sequence)}</section>
  </article>`;
}

async function validate(): Promise<void> {
  const source = input.value;
  preview.replaceChildren();
  if (!source.trim()) {
    status.innerHTML = `<div class="playground-verdict"><strong>Ready</strong><p>Paste one complete <code>.schemami.json</code> document.</p></div>`;
    return;
  }
  const byteLength = encoder.encode(source).length;
  if (byteLength > maximumBytes) {
    status.innerHTML = problems([{ type: "https://schemami.dev/problems/resource-limit" }]);
    return;
  }
  validateButton.disabled = true;
  status.setAttribute("aria-busy", "true");
  try {
    const parsed = parse(source, protocolFloor);
    if (parsed.status === "refused") {
      status.innerHTML = problems(parsed.problems);
      return;
    }
    const result = await admit(parsed.parsed, protocolFloor);
    if (result.status === "refused") {
      status.innerHTML = problems(result.problems);
      return;
    }
    const handle = result.status === "recipe" ? result.recipe : result.bundle;
    status.innerHTML = `<div class="playground-verdict" data-status="ok"><strong>Admitted ${result.status}</strong><p>${byteLength.toLocaleString("en")} exact input bytes retained. Canonical identity is available.</p></div>`;
    preview.innerHTML = result.status === "recipe"
      ? recipePreview(result.recipe.value as Dict, result.recipe.sha256)
      : `<article class="admitted-preview"><p class="sm-eyebrow">Admitted bundle</p><h2>Portable recipe bundle</h2><p class="digest"><strong>Canonical SHA-256</strong><code>${esc(handle.sha256)}</code></p></article>`;
  } finally {
    validateButton.disabled = false;
    status.removeAttribute("aria-busy");
  }
}

validateButton.addEventListener("click", () => void validate());
exampleButton.addEventListener("click", () => { input.value = example.trim(); void validate(); });
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  void file.text().then((source) => { input.value = source; return validate(); });
});

