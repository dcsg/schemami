import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const website = import.meta.dir;
const root = resolve(website, "..");
const dist = join(website, "dist");

type Section = "home" | "start" | "ai" | "sdks" | "playground" | "reference" | "locale";
type Page = {
  path: string;
  title: string;
  description: string;
  section: Section;
  body: string;
  keywords?: string;
  language?: string;
  referencePath?: string;
  script?: string;
};

const esc = (value: unknown) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const code = (value: string, id?: string) => `<pre class="sm-code"${id ? ` id="${esc(id)}" tabindex="0"` : ""}><code>${esc(value.trim())}</code></pre>${id ? `<button class="copy-button" type="button" data-copy="${esc(id)}">Copy</button>` : ""}`;
const callout = (title: string, content: string, tone: "info" | "danger" | "warning" = "info") => `<aside class="callout" data-tone="${tone}"><strong>${esc(title)}</strong><p>${content}</p></aside>`;
const card = (title: string, text: string, href: string, accent = "marine") => `<article class="sdk-card" data-accent="${accent}"><p class="sm-eyebrow">${esc(title)}</p><p>${text}</p><a href="${href}">Open guide →</a></article>`;

const recipeExample = `{
  "schemami": "1",
  "collection": "personal",
  "id": "pao-de-centeio",
  "revision": 1,
  "content_language": "pt-PT",
  "title": "Pão de centeio",
  "ingredients": [
    {
      "id": "rye-flour",
      "name": "Farinha de centeio",
      "quantity": { "kind": "measured", "value": "300", "unit": "g" }
    }
  ],
  "method": {
    "sequence": [
      {
        "kind": "step",
        "id": "mix",
        "instruction": "Misturar a farinha com os restantes ingredientes."
      }
    ]
  }
}`;

const tsExample = `import { parse, admit, protocolFloor, evaluate } from "@schemami/sdk";

const bytes = new TextEncoder().encode(recipeJSON);
const parsed = parse(bytes, protocolFloor);

if (parsed.status === "parsed") {
  const admitted = await admit(parsed.parsed, protocolFloor);
  if (admitted.status === "recipe") {
    const result = evaluate(
      { operation: "schedule", arguments: {} },
      admitted.recipe,
      protocolFloor,
    );
  }
}`;

const goExample = `parsed := schemami.Parse(raw, schemami.ProtocolFloor)
if !parsed.OK() { /* display parsed.Problems */ }

admitted := schemami.Admit(parsed.Parsed, schemami.ProtocolFloor)
if !admitted.OK() { /* display admitted.Problems */ }

result := schemami.Evaluate(
    schemami.OperationRequest{Operation: "schedule", Arguments: map[string]any{}},
    schemami.OperationInput{Recipe: admitted.Recipe},
    schemami.ProtocolFloor,
)`;

const swiftExample = `let parsed = SchemamiCore.parse(data)
guard case .parsed(let document) = parsed else { return }
guard case .recipe(let recipe) = SchemamiCore.admit(document) else { return }

let result = SchemamiCalculus.evaluate(
    .schedule(arguments: .object([])),
    input: .recipe(recipe)
)`;

const referenceNav = [
  ["Overview", "/reference/"],
  ["Recipe document", "/reference/document/"],
  ["Quantities & formulas", "/reference/quantities/"],
  ["Structured method", "/reference/method/"],
  ["Conditions & alternatives", "/reference/variation/"],
  ["Bundles & components", "/reference/bundles/"],
  ["Recipe Calculus", "/reference/calculus/"],
  ["Problems", "/reference/problems/"],
  ["Conformance", "/reference/conformance/"],
] as const;

const pages: Page[] = [
  {
    path: "/",
    title: "Recipes, structured to taste",
    description: "A deterministic recipe protocol for AI workflows, applications, and exact calculation.",
    section: "home",
    keywords: "recipe protocol AI SDK JSON schema deterministic",
    body: `<section class="hero shell">
      <p class="sm-eyebrow">Schemami v1.0.0 · stable release</p>
      <h1>Recipes, structured to taste.</h1>
      <p class="lede">Turn recipes into portable data without flattening what makes them recipes: exact quantities, authored methods, choices, dependencies, evidence, and explicit refusal when facts are missing.</p>
      <div class="hero-actions"><a class="sm-button" data-variant="primary" href="/ai/">Use with AI</a><a class="sm-button" data-variant="secondary" href="/sdks/">Integrate an SDK</a></div>
      <div class="trust-line"><span>No runtime AI required</span><span>No global ingredient registry</span><span>Offline deterministic core</span></div>
    </section>
    <section class="shell">
      <p class="sm-eyebrow">Choose your path</p>
      <div class="path-grid wide">
        <a class="path-card" href="/ai/"><div><p class="sm-eyebrow">I have a recipe</p><h2>Convert it with an AI you choose.</h2><p>Give a capable chat a photo, PDF, page, transcription, or text. It asks only necessary questions and returns an untrusted candidate for deterministic validation.</p></div><span class="path-card__arrow" aria-hidden="true">→</span></a>
        <a class="path-card" href="/sdks/"><div><p class="sm-eyebrow">I build software</p><h2>Parse, admit, calculate, and compare.</h2><p>Use the TypeScript, Go, or Swift SDK. Exact source bytes enter; typed results or stable pointer-addressed problems come out.</p></div><span class="path-card__arrow" aria-hidden="true">→</span></a>
      </div>
    </section>
    <section class="shell">
      <div class="fact-grid wide">
        <div class="fact-card"><strong>6</strong><span>deterministic Calculus operations</span></div>
        <div class="fact-card"><strong>3</strong><span>SDK implementations</span></div>
        <div class="fact-card"><strong>1</strong><span>shared conformance authority</span></div>
        <div class="fact-card"><strong>0</strong><span>network calls in the core</span></div>
      </div>
    </section>
    <section class="shell article">
      <p class="sm-eyebrow">A recipe stays a recipe</p><h2>Structure where structure earns its keep.</h2>
      <p class="lede">Schemami preserves source-language prose while giving quantities, formulas, method order, conditions, alternatives, components, evidence, and lineage machine-readable shapes.</p>
      <div class="code-compare wide"><div class="code-panel"><header><h3>Portable recipe</h3></header>${code(recipeExample)}</div><div class="code-panel"><header><h3>Deterministic boundary</h3></header>${code(`source or application data\n  → untrusted Schemami candidate\n  → strict parse + admission\n  → Calculus / Diff\n  → application presentation`)}</div></div>
    </section>`,
  },
  {
    path: "/start/",
    title: "Start with Schemami",
    description: "Choose the shortest verified route from a recipe source to admitted Schemami data.",
    section: "start",
    keywords: "quick start tutorial first recipe",
    body: `<article class="article"><p class="sm-eyebrow">Quick start</p><h1>From source to admitted recipe.</h1><p class="lede">Schemami is a compilation target, not a blank form. Start with the recipe you already have or the application data you already own.</p>
      <ol class="steps"><li><h2>Produce a candidate</h2><p>Use the <a href="/ai/">AI workflow</a>, an importer, OCR, a parser, or your own adapter. Candidate bytes are always untrusted.</p></li><li><h2>Admit exact JSON</h2><p>Pass the exact bytes through a conformant SDK or the <a href="/playground/">browser playground</a>. Strict parsing, schema rules, and semantic rules decide the result.</p></li><li><h2>Compute only from admitted handles</h2><p>Recipe Calculus never parses prose and never runs over raw, invalid, or unresolved data.</p></li><li><h2>Present in your product</h2><p>Your application owns translations, mappings, UI, storage, timers, recommendations, and domain-specific knowledge.</p></li></ol>
      ${callout("The key boundary", "An AI can propose Schemami. It cannot make its own output valid, canonical, scalable, or schedulable. Deterministic admission remains the authority.")}
      <h2>Minimal recipe</h2>${code(recipeExample, "start-recipe")}
      <p><a class="sm-button" data-variant="primary" href="/playground/">Validate this example</a></p>
    </article>`,
  },
  {
    path: "/ai/",
    title: "Use Schemami with AI",
    description: "Convert an authorized recipe source into an untrusted Schemami v1 candidate and validate it deterministically.",
    section: "ai",
    keywords: "AI Claude ChatGPT Gemini photo PDF prompt convert recipe",
    body: `<article class="article"><p class="sm-eyebrow">Use with AI</p><h1>Bring the recipe. Keep the truth boundary.</h1><p class="lede">Use any capable AI that can read your authorized source. Schemami supplies a versioned interview and output workflow; the AI supplies no validation authority.</p>
      <h2>One prompt</h2><p>Attach or paste the recipe, then send:</p>${code(`Follow https://schemami.dev/ai and help me convert the attached recipe into one source-faithful, untrusted Schemami v1 JSON candidate. Interview me only when a fact is illegible, materially ambiguous, or required; never guess. Preserve the source language and authored order. After the JSON candidate, show a readable recipe preview if your interface supports it, but keep the JSON authoritative.`, "ai-prompt")}
      <div class="hero-actions"><a class="sm-button" data-variant="secondary" href="https://chatgpt.com/">Open ChatGPT</a><a class="sm-button" data-variant="secondary" href="https://claude.ai/new">Open Claude</a><a class="sm-button" data-variant="secondary" href="https://gemini.google.com/app">Open Gemini</a></div>
      <h2>What the interview may ask</h2><ul><li>Text or a value is illegible.</li><li>Two readings materially change the recipe.</li><li>A required envelope value, such as the BCP 47 source language, is unknown.</li><li>You explicitly ask to select one authored alternative for evaluation.</li></ul><p>It asks at most three blocker questions at a time. <em>Unknown</em>, <em>not stated</em>, and <em>keep unresolved</em> remain valid answers when the protocol permits them.</p>
      <h2>Then validate</h2><ol><li>Save the complete JSON candidate.</li><li>Open the <a href="/playground/">playground</a> or use an SDK.</li><li>If admission refuses, return the complete candidate and stable problems to the AI.</li><li>Request a complete replacement, not a patch.</li></ol>
      ${callout("Privacy and ownership", "Schemami hosts no model, OCR, recipe database, source material, account, or provider credential. You choose what to send and where.")}
      <h2>Versioned resources</h2><ul><li><a href="/ai/v1/INSTRUCTIONS.md">AI workflow v1</a></li><li><a href="/ai/v1/RENDERING.md">Rendering profile</a></li><li><a href="/ai/v1/recipe-card.html">Portable recipe-card template</a></li><li><a href="/ai/v1/manifest.json">Exact-byte manifest</a></li><li><a href="/schema/schemami/1/core.schema.json">Core schema</a></li></ul>
    </article>`,
  },
  {
    path: "/sdks/",
    title: "Schemami SDKs",
    description: "Deterministic Schemami Core, Recipe Calculus, and Diff for TypeScript, Go, and Swift.",
    section: "sdks",
    keywords: "SDK TypeScript Go Swift install API",
    body: `<article class="article"><p class="sm-eyebrow">SDKs</p><h1>One protocol. Three native implementations.</h1><p class="lede">Every SDK preserves exact input bytes, performs strict admission, exposes stable problems, and requires an admitted handle for Recipe Calculus.</p>
      <div class="sdk-grid wide">${card("TypeScript", "Browser and server ESM with declarations, Core, Calculus, and Diff.", "/sdks/typescript/")}${card("Go", "Typed deterministic APIs for services, CLIs, and offline pipelines.", "/sdks/go/", "clay")}${card("Swift", "SchemamiCore, SchemamiCalculus, and SchemamiDiff for iOS and macOS.", "/sdks/swift/", "brass")}</div>
      <h2>Shared boundary</h2>${code(`bytes → parse → ParsedDocument → admit → AdmittedRecipe / AdmittedBundle\n                                         ↓\n                              Calculus and structural Diff`)}
      <table class="wide"><thead><tr><th>Owned by Schemami</th><th>Owned by your application</th></tr></thead><tbody><tr><td>Strict JSON, schema and semantic admission</td><td>OCR, AI providers and source access</td></tr><tr><td>Canonical JCS identity and stable problems</td><td>Persistence, accounts and sync</td></tr><tr><td>Exact Calculus and structural Diff</td><td>Catalog mappings, translations and presentation</td></tr></tbody></table>
    </article>`,
  },
  {
    path: "/sdks/typescript/",
    title: "TypeScript SDK",
    description: "Install and admit the first Schemami recipe with the browser and server TypeScript SDK.",
    section: "sdks",
    keywords: "TypeScript Bun npm parse admit evaluate diff",
    body: `<article class="article"><div class="breadcrumb"><a href="/sdks/">SDKs</a> / TypeScript</div><p class="sm-eyebrow">TypeScript</p><h1>Strict recipe data for browser and server.</h1><p class="lede">ESM-first Core, Calculus, and Diff with generated declarations and no runtime network calls.</p>
      ${callout("Publication status", "The 1.0.0 package is version-ready in the source release. npm publication is the owner-assisted follow-up.", "warning")}
      <h2>Install after publication</h2>${code(`bun add @schemami/sdk@1.0.0`, "ts-install")}
      <h2>Admit and schedule</h2>${code(tsExample, "ts-example")}
      <h2>Imports</h2>${code(`import { parse, admit, protocolFloor } from "@schemami/sdk";\nimport { evaluate } from "@schemami/sdk/calculus";\nimport { compare } from "@schemami/sdk/diff";`)}
      ${callout("Expected refusal is data", "Parsing, admission, and operations return stable result objects. Do not turn ordinary recipe problems into uncaught exceptions.")}
      <h2>What remains outside</h2><p>The SDK performs no model execution, file access, registry lookup, storage, UI, translation, or application mapping.</p>
    </article>`,
  },
  {
    path: "/sdks/go/",
    title: "Go SDK",
    description: "Admit Schemami recipes and run exact Recipe Calculus from Go.",
    section: "sdks",
    keywords: "Go module Parse Admit Evaluate Diff",
    body: `<article class="article"><div class="breadcrumb"><a href="/sdks/">SDKs</a> / Go</div><p class="sm-eyebrow">Go</p><h1>Deterministic admission for services and tools.</h1><p class="lede">The Go SDK exposes strict parsing, admission, canonical identity, Recipe Calculus, and structural Diff without file or network policy.</p>
      ${callout("Publication status", "The Go module is version-ready in the source release. The sdk/go/v1.0.0 tag is the owner-assisted follow-up.", "warning")}
      <h2>Install after publication</h2>${code(`go get github.com/dcsg/schemami/sdk/go@v1.0.0`, "go-install")}
      <h2>Admit and schedule</h2>${code(goExample, "go-example")}
      <h2>Operational rule</h2><p>Use the SDK with bytes your application already obtained. YAML, files, HTTP, OCR, storage, and provider calls remain adapter responsibilities.</p>
      ${callout("One request, one budget", "Admission and operations aggregate semantic and analysis safety budgets across the complete recipe or bundle request.")}
    </article>`,
  },
  {
    path: "/sdks/swift/",
    title: "Swift SDK",
    description: "Use SchemamiCore, SchemamiCalculus, and SchemamiDiff from Swift 6.1, iOS 17, and macOS 14.",
    section: "sdks",
    keywords: "Swift iOS macOS SwiftPM SchemamiCore",
    body: `<article class="article"><div class="breadcrumb"><a href="/sdks/">SDKs</a> / Swift</div><p class="sm-eyebrow">Swift</p><h1>Recipe protocol support for Apple platforms.</h1><p class="lede">Synchronous, offline, result-oriented APIs for Swift 6.1+, iOS 17+, and macOS 14+.</p>
      ${callout("Publication status", "The root Swift Package is version-ready in the source release. The v1.0.0 repository tag is the owner-assisted follow-up.", "warning")}
      <h2>Install after publication</h2>${code(`dependencies: [\n  .package(url: "https://github.com/dcsg/schemami.git", from: "1.0.0")\n]`, "swift-install")}
      <h2>Admit and schedule</h2>${code(swiftExample, "swift-example")}
      <h2>Products</h2><ul><li><code>SchemamiCore</code> — strict parsing, admission, identity, problems.</li><li><code>SchemamiCalculus</code> — six exact operations.</li><li><code>SchemamiDiff</code> — structural comparison of admitted documents.</li></ul>
    </article>`,
  },
  {
    path: "/playground/",
    title: "Schemami Playground",
    description: "Validate and explore strict Schemami JSON locally in the browser.",
    section: "playground",
    keywords: "playground verifier validate JSON browser",
    script: "/playground.js",
    body: `<article class="article wide"><p class="sm-eyebrow">Playground</p><h1>Check the exact bytes before you compute.</h1><p class="lede">The verifier runs locally in your browser using the TypeScript SDK. Nothing is uploaded by Schemami, and no YAML conversion or AI repair occurs inside this boundary.</p>${callout("Deterministic boundary", "A readable card or AI answer is not admission. Only strict JSON parsing, schema admission, and semantic admission can create a canonical identity.")}
      <div class="playground-workbench"><section class="playground-editor"><div class="playground-toolbar"><button class="sm-button" data-variant="primary" type="button" data-playground-validate>Validate JSON</button><button class="sm-button" data-variant="secondary" type="button" data-playground-example>Load example</button><label for="playground-file">Open JSON</label><input id="playground-file" type="file" accept=".json,.schemami.json,application/json" data-playground-file></div><label class="visually-hidden" for="playground-input">Schemami JSON</label><textarea id="playground-input" spellcheck="false" autocomplete="off" placeholder="Paste one complete .schemami.json document" data-playground-input></textarea></section><section class="playground-result"><div aria-live="polite" data-playground-status><div class="playground-verdict"><strong>Ready</strong><p>Paste one complete <code>.schemami.json</code> document.</p></div></div><div data-playground-preview></div></section></div>
      <script type="application/json" id="playground-example">${readFileSync(join(root, "ai/v1/examples/candidate.schemami.json"), "utf8").replaceAll("<", "\\u003c")}</script>
    </article>`,
  },
  {
    path: "/reference/",
    title: "Schemami v1 Reference",
    description: "Navigate the Schemami v1 document model, operations, problems, and conformance contracts.",
    section: "reference",
    referencePath: "/reference/",
    keywords: "reference schema model calculus problems conformance",
    body: `<article class="article"><p class="sm-eyebrow">Reference</p><h1>The technical map of Schemami v1.</h1><p class="lede">Start with the recipe document, then follow only the parts your integration needs. Every page distinguishes portable recipe facts from application policy.</p>
      <div class="card-grid wide">${referenceNav.slice(1).map(([name, href], index) => `<a class="sm-card" href="${href}" style="grid-column:span 6;text-decoration:none"><p class="sm-eyebrow">${String(index + 1).padStart(2, "0")}</p><h3>${name}</h3><span>Open reference →</span></a>`).join("")}</div>
      <h2>Normative artifacts</h2><ul><li><a href="/schema/schemami/1/core.schema.json">Core JSON Schema 2020-12</a></li><li><a href="/schema/schemami/1/bundle.schema.json">Bundle schema</a></li><li><a href="/conformance/schemami/1/validation.json">Validation corpus</a></li><li><a href="/conformance/schemami/1/structured-calculus.json">Structured Calculus corpus</a></li></ul>
    </article>`,
  },
  {
    path: "/reference/document/",
    title: "Recipe document",
    description: "Identity, language, local concepts, sources, lineage, ingredients, formulas, and method in one Schemami recipe.",
    section: "reference",
    referencePath: "/reference/document/",
    keywords: "document fields collection id revision content_language ingredients sources lineage",
    body: `<article class="article"><p class="sm-eyebrow">Reference · document</p><h1>One portable recipe revision.</h1><p class="lede">A Schemami recipe is source-language culinary content plus stable local structure. It is not an application record, translation store, or execution session.</p>
      <h2>Required envelope</h2><table class="wide"><thead><tr><th>Field</th><th>Meaning</th></tr></thead><tbody><tr><td><code>schemami</code></td><td>Closed wire marker, exactly <code>"1"</code>.</td></tr><tr><td><code>collection</code> + <code>id</code></td><td>Portable document identity using lowercase local IDs.</td></tr><tr><td><code>revision</code></td><td>Positive integer revision of this recipe identity.</td></tr><tr><td><code>content_language</code></td><td>BCP 47 language of authored prose, such as <code>pt-PT</code>.</td></tr><tr><td><code>title</code></td><td>Source-language recipe title.</td></tr><tr><td><code>ingredients</code></td><td>Ordered recipe-local ingredient declarations.</td></tr><tr><td><code>method</code></td><td>Recursive ordered method sequence.</td></tr></tbody></table>
      <h2>Local concepts</h2><p>Ingredients, techniques, equipment, preparations, and outputs use IDs scoped to the recipe. An application may map them to its own catalog without asserting a global equivalence.</p>
      <h2>Optional portable facts</h2><p>Formulas, components, parameters, sources, evidence, origin, outputs, and lineage appear only when authored or supported by the source.</p>
      ${callout("Not canonical recipe content", "Translations, UI state, timers, account data, catalog bindings, cooking history, provider metadata, and recommendations stay in the presentation or application layer.")}
      <h2>Example</h2>${code(recipeExample, "document-example")}
    </article>`,
  },
  {
    path: "/reference/quantities/",
    title: "Quantities and formulas",
    description: "Measured, range, open, ratio, and percentage structures with exact decimal and UCUM rules.",
    section: "reference",
    referencePath: "/reference/quantities/",
    keywords: "quantity measured range open ratio percentage UCUM unit decimal",
    body: `<article class="article"><p class="sm-eyebrow">Reference · quantities</p><h1>Exact values without invented equivalence.</h1><p class="lede">Decimals are JSON strings. Ratios preserve authored parts. Percentages store percentage points. Unit conversion is explicit and bounded.</p>
      <h2>Quantity shapes</h2><div class="code-compare wide"><div>${code(`{ "kind": "measured", "value": "250", "unit": "g" }\n\n{ "kind": "range", "minimum": "20", "maximum": "25", "unit": "Cel" }`)}</div><div>${code(`{ "kind": "open", "qualifier": "to_taste" }\n\n{ "kind": "measured", "value": "1.5", "unit": "kg" }`)}</div></div>
      <h2>Ratios are not decimals</h2>${code(`{\n  "id": "starter-feed",\n  "kind": "ratio",\n  "terms": [\n    { "input": { "kind": "ingredient", "id": "starter" }, "parts": "1" },\n    { "input": { "kind": "ingredient", "id": "flour" }, "parts": "2" },\n    { "input": { "kind": "ingredient", "id": "water" }, "parts": "2" }\n  ],\n  "target": { "kind": "measured", "value": "500", "unit": "g" }\n}`)}
      <h2>Conversion boundary</h2><ul><li>Compatible same-dimension UCUM conversions use exact rational arithmetic.</li><li>Temperature conversion is supported.</li><li>Bare regional units such as <code>cup</code> refuse as ambiguous.</li><li>Mass-to-volume conversion refuses without an explicit future physical profile.</li><li>No operation assumes <code>1 g = 1 mL</code>.</li></ul>
    </article>`,
  },
  {
    path: "/reference/method/",
    title: "Structured method",
    description: "Ordered recursive sections, steps, actions, techniques, durations, completion cues, and environment facts.",
    section: "reference",
    referencePath: "/reference/method/",
    keywords: "method order section step action technique duration completion cue environment",
    body: `<article class="article"><p class="sm-eyebrow">Reference · method</p><h1>Authored order with structure where it matters.</h1><p class="lede">The method is a recursive sequence of sections and steps. Steps may retain prose directly or contain ordered named actions.</p>
      <h2>Order</h2><p>Array declaration order is authored reading order. Explicit <code>after</code> dependencies constrain Calculus without replacing that order.</p>
      <h2>Sections, steps, actions</h2>${code(`"method": {\n  "sequence": [\n    {\n      "kind": "section",\n      "id": "day-before",\n      "name": "Na véspera",\n      "sequence": [\n        {\n          "kind": "step",\n          "id": "feed-starter",\n          "actions": [\n            { "id": "mix-feed", "instruction": "Misturar a cultura, a farinha e a água." }\n          ],\n          "duration": "PT6H",\n          "completion": { "kind": "observation", "cue": "A cultura flutua em água." }\n        }\n      ]\n    }\n  ]\n}`)}
      <h2>Recipe fact versus application policy</h2><p>“Ferment for 12 hours in the refrigerator at 4 °C” is a recipe fact. Predicting fermentation speed, adjusting the schedule for a 6 °C fridge, or choosing timer defaults is application knowledge.</p>
      ${callout("No prose parsing", "Calculus uses structured duration, dependency, selection, and resource facts. It never searches an instruction string for hidden timing or readiness semantics.")}
    </article>`,
  },
  {
    path: "/reference/variation/",
    title: "Conditions and alternatives",
    description: "Optional content, one-for-one alternatives, closed parameters, activations, and derived recipe lineage.",
    section: "reference",
    referencePath: "/reference/variation/",
    keywords: "condition alternative optional substitution parameter activation lineage variant",
    body: `<article class="article"><p class="sm-eyebrow">Reference · variation</p><h1>Keep honest choices inside the recipe.</h1><p class="lede">Schemami can represent authored optional content and true alternatives without turning every adjustment into a single shape-shifting recipe.</p>
      <h2>One-for-one alternatives</h2><p>A source-authored ingredient alternative belongs in one recipe when selecting it does not require recalculating other quantities or changing the method.</p>
      <h2>When it becomes another recipe</h2><p>If replacing sugar with stevia changes quantities, structure, or method, publish a derived recipe with lineage. Do not hide a materially different recipe behind a substitution list.</p>
      <h2>Conditional directions</h2><p>Closed parameters and activations can select explicitly authored branches—for example cold versus ambient fermentation—while admission validates every distinct reachable active graph.</p>
      ${callout("Selection is evaluation metadata", "Resolving one active view does not rewrite the source recipe or fabricate a new publishable recipe document.")}
    </article>`,
  },
  {
    path: "/reference/bundles/",
    title: "Bundles and components",
    description: "Portable offline composition with exact embedded bytes, canonical digests, and instance-scoped selection.",
    section: "reference",
    referencePath: "/reference/bundles/",
    keywords: "bundle component nested recipe digest offline composition",
    body: `<article class="article"><p class="sm-eyebrow">Reference · bundles</p><h1>Compose recipes without network resolution.</h1><p class="lede">A bundle carries exact admitted recipe bytes and their canonical digests. Cooking or calculation never depends on a registry or network lookup.</p>
      <h2>Why component paths matter</h2><p>The same child recipe can appear more than once. Selections and evaluation identify each instance by an ordered <code>component_path</code> of component IDs, not only by child recipe identity.</p>
      <h2>Closure</h2><ul><li>Every referenced recipe is embedded.</li><li>Every embedded digest matches canonical Schemami bytes.</li><li>Cycles, missing documents, and identity mismatch refuse.</li><li>Component results report identity and calculated quantities, never rewritten recipe documents.</li></ul>
      <h2>Scheduling composition</h2><p>Child output placement follows explicit producer and consumer facts. Names, prose, or formula participation never invent a dependency. Active but unconsumed components are reported as unscheduled.</p>
    </article>`,
  },
  {
    path: "/reference/calculus/",
    title: "Recipe Calculus",
    description: "Six deterministic Schemami operations with exact result and refusal contracts.",
    section: "reference",
    referencePath: "/reference/calculus/",
    keywords: "resolve_selection resolve_formula scale convert_quantity reading_order schedule",
    body: `<article class="article"><p class="sm-eyebrow">Reference · Calculus</p><h1>Six operations. Explicit success or refusal.</h1><p class="lede">Recipe Calculus evaluates admitted recipes and bundles. Results are non-publishable evaluation artifacts tied to exact input identity and effective selection.</p>
      <table class="wide"><thead><tr><th>Operation</th><th>Purpose</th></tr></thead><tbody><tr><td><code>resolve_selection</code></td><td>Return the deterministic active recipe and component-instance view.</td></tr><tr><td><code>resolve_formula</code></td><td>Resolve one active ratio or percentage formula to ordered quantities.</td></tr><tr><td><code>scale</code></td><td>Apply one exact factor, or derive it from one root formula target.</td></tr><tr><td><code>convert_quantity</code></td><td>Perform exact supported UCUM same-dimension or temperature conversion.</td></tr><tr><td><code>reading_order</code></td><td>Topologically order selected active steps with authored tie order.</td></tr><tr><td><code>schedule</code></td><td>Calculate earliest starts from explicit dependencies and durations.</td></tr></tbody></table>
      <h2>Closed requests</h2>${code(`{\n  "operation": "scale",\n  "arguments": {\n    "formula_target": {\n      "formula_id": "main-dough",\n      "target": { "kind": "measured", "value": "2", "unit": "kg" }\n    }\n  }\n}`)}
      <h2>Numeric discipline</h2><p>Internal work uses exact rational arithmetic. Public decimals are independently quantized half-to-even with at most four fractional digits. Schemami never redistributes rounding residuals to make displayed line items add up cosmetically.</p>
      <h2>Scheduling is not a calendar</h2><p><code>schedule</code> is an earliest-start projection. “Na véspera” remains authored section language; date, timezone, reminders, and operational placement belong to an application.</p>
    </article>`,
  },
  {
    path: "/reference/problems/",
    title: "Problems and refusals",
    description: "Stable Schemami problem identities and RFC 6901 pointers for deterministic recovery.",
    section: "reference",
    referencePath: "/reference/problems/",
    keywords: "problem refusal diagnostics JSON pointer invalid missing unknown resource limit",
    body: `<article class="article"><p class="sm-eyebrow">Reference · problems</p><h1>Refusal is a supported result.</h1><p class="lede">Problems have stable type URIs and RFC 6901 pointers. Prose is for people; type and pointer are the machine contract.</p>
      <h2>Shape</h2>${code(`{\n  "type": "https://schemami.dev/problems/ambiguous-unit",\n  "pointer": "/ingredients/2/quantity/unit"\n}`)}
      <h2>Recovery rules</h2><ul><li>Display every independent blocker after cascade suppression.</li><li>Preserve the original candidate bytes.</li><li>Never silently normalize or delete content to obtain admission.</li><li>At an HTTP boundary, an application may wrap these fields in RFC 9457 Problem Details.</li></ul>
      <h2>Published problem pages</h2><div class="card-grid wide">${["ambiguous-unit", "dependency-cycle", "dimension-mismatch", "duplicate-object-member", "inactive-reference", "invalid-decimal", "invalid-document", "invalid-json", "invalid-operation-arguments", "missing-fact", "missing-producer", "multiple-producers", "relative-timing-conflict", "resource-limit", "unknown-unit", "unresolved-reference", "unsupported-legacy", "unsupported-quantity-kind"].map((problem) => `<a class="sm-card" style="grid-column:span 6" href="/problems/${problem}.html"><code>${problem}</code></a>`).join("")}</div>
    </article>`,
  },
  {
    path: "/reference/conformance/",
    title: "Conformance",
    description: "Shared cross-language vectors for admission, canonicalization, Calculus, resources, and Diff.",
    section: "reference",
    referencePath: "/reference/conformance/",
    keywords: "conformance corpus vectors cross language exact parity",
    body: `<article class="article"><p class="sm-eyebrow">Reference · conformance</p><h1>Implementations prove the same behavior.</h1><p class="lede">The schema is necessary, but not sufficient. Schemami conformance includes semantic admission, exact identity, operations, resource limits, and structural Diff.</p>
      <table class="wide"><thead><tr><th>Corpus</th><th>What it proves</th></tr></thead><tbody><tr><td><a href="/conformance/schemami/1/validation.json">validation</a></td><td>Structural and semantic admission verdicts.</td></tr><tr><td><a href="/conformance/schemami/1/canonicalization.json">canonicalization</a></td><td>RFC 8785 bytes and SHA-256 identity.</td></tr><tr><td><a href="/conformance/schemami/1/calculus.json">calculus</a></td><td>Exact quantities, conversion, scaling, order, and schedule.</td></tr><tr><td><a href="/conformance/schemami/1/structured-calculus.json">structured-calculus</a></td><td>Selection, formula, component, and composed operation envelopes.</td></tr><tr><td><a href="/conformance/schemami/1/resource-budgets.json">resource-budgets</a></td><td>Portable semantic floor and analysis safety behavior.</td></tr><tr><td><a href="/conformance/schemami/1/diff.json">diff</a></td><td>Cross-language structural comparison.</td></tr></tbody></table>
      <h2>Conformant means more than generated types</h2><p>A generated model that accepts JSON is not a Schemami SDK. A conformant implementation preserves exact input, enforces strict I-JSON, admits semantic graphs, canonicalizes identically, implements the operation contract, and replays the shared corpora.</p>
    </article>`,
  },
];

const locales = {
  "pt-PT": { name: "Português (Portugal)", title: "Receitas estruturadas, sem perder o sabor.", lede: "Converta uma receita com a IA que escolher ou integre o protocolo através de um SDK determinístico.", ai: "Usar com IA", sdk: "Integrar um SDK", note: "A referência técnica completa está disponível em inglês." },
  es: { name: "Español", title: "Recetas estructuradas, sin perder su carácter.", lede: "Convierte una receta con la IA que elijas o integra el protocolo mediante un SDK determinista.", ai: "Usar con IA", sdk: "Integrar un SDK", note: "La referencia técnica completa está disponible en inglés." },
  fr: { name: "Français", title: "Des recettes structurées, sans perdre leur caractère.", lede: "Convertissez une recette avec l’IA de votre choix ou intégrez le protocole avec un SDK déterministe.", ai: "Utiliser avec une IA", sdk: "Intégrer un SDK", note: "La référence technique complète est disponible en anglais." },
  de: { name: "Deutsch", title: "Rezepte strukturiert, ohne ihren Charakter zu verlieren.", lede: "Konvertiere ein Rezept mit einer KI deiner Wahl oder integriere das Protokoll über ein deterministisches SDK.", ai: "Mit KI verwenden", sdk: "SDK integrieren", note: "Die vollständige technische Referenz ist auf Englisch verfügbar." },
  it: { name: "Italiano", title: "Ricette strutturate, senza perderne il carattere.", lede: "Converti una ricetta con l’IA che preferisci oppure integra il protocollo tramite un SDK deterministico.", ai: "Usa con l’IA", sdk: "Integra un SDK", note: "La documentazione tecnica completa è disponibile in inglese." },
} as const;

for (const [language, copy] of Object.entries(locales)) {
  pages.push({
    path: `/${language}/`,
    title: copy.title,
    description: copy.lede,
    section: "locale",
    language,
    keywords: `${copy.ai} ${copy.sdk} Schemami`,
    body: `<article class="article"><p class="sm-eyebrow">Schemami v1</p><h1>${copy.title}</h1><p class="lede">${copy.lede}</p><div class="hero-actions"><a class="sm-button" data-variant="primary" href="/ai/">${copy.ai}</a><a class="sm-button" data-variant="secondary" href="/sdks/">${copy.sdk}</a></div><div class="callout" data-tone="info"><strong>English reference</strong><p>${copy.note}</p></div><h2>Two verified paths</h2><div class="path-grid wide"><a class="path-card" href="/ai/"><div><p class="sm-eyebrow">AI</p><h3>${copy.ai}</h3><p>Photo, PDF, page, transcription or text → untrusted candidate → deterministic validation.</p></div><span class="path-card__arrow">→</span></a><a class="path-card" href="/sdks/"><div><p class="sm-eyebrow">SDK</p><h3>${copy.sdk}</h3><p>Exact bytes → parse → admission → Calculus or stable refusal.</p></div><span class="path-card__arrow">→</span></a></div></article>`,
  });
}

const nav = [
  ["Start", "/start/", "start"],
  ["Use with AI", "/ai/", "ai"],
  ["SDKs", "/sdks/", "sdks"],
  ["Playground", "/playground/", "playground"],
  ["Reference", "/reference/", "reference"],
] as const;

const searchIndex = pages.map((page) => ({ title: page.title, description: page.description, keywords: page.keywords || "", path: page.path }));

function sectionNavigation(page: Page) {
  if (page.section !== "reference") return "";
  return `<aside class="section-nav"><h2>Reference</h2><nav aria-label="Reference topics">${referenceNav.map(([label, href]) => `<a href="${href}"${page.referencePath === href ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav></aside>`;
}

function layout(page: Page) {
  const language = page.language || "en";
  const canonical = `https://schemami.dev${page.path}`;
  const navigation = nav.map(([label, href, section]) => `<a href="${href}" data-nav-path="${href}"${page.section === section ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  const content = page.section === "home" ? page.body : `<div class="shell ${page.section === "reference" ? "prose-shell" : ""}">${sectionNavigation(page)}${page.body}</div>`;
  const logo = `<span class="site-logo"><img class="site-logo__light" src="/design-system/assets/logos/schemami-lockup-color.svg" alt="Schemami"><span class="site-logo__dark" aria-hidden="true"><img class="site-logo__mark" src="/design-system/assets/logos/schemami-mark-tile.svg" alt=""><span class="site-logo__wordmark">schemami</span></span></span>`;
  return `<!doctype html>
<html lang="${esc(language)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${esc(page.description)}">
  <meta name="color-scheme" content="light dark">
  <link rel="canonical" href="${canonical}">
  <link rel="stylesheet" href="/site.css">
  <link rel="icon" href="/design-system/assets/logos/schemami-icon-32.svg" type="image/svg+xml">
  <title>${esc(page.title)} — Schemami</title>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><div class="site-header__inner">
    <a href="/" aria-label="Schemami home">${logo}</a>
    <div class="site-search"><label class="visually-hidden" for="site-search">Search documentation</label><input class="sm-field" id="site-search" type="search" placeholder="Search docs" autocomplete="off" data-site-search><div class="search-results" data-search-results hidden></div></div>
    <nav class="site-nav" aria-label="Primary">${navigation}<button type="button" data-theme-toggle>Theme: system</button></nav>
    <details class="nav-menu"><summary>Menu</summary><div class="nav-menu__panel">${navigation}<button type="button" data-theme-toggle>Theme: system</button></div></details>
  </div></header>
  <main class="site-main" id="main">${content}</main>
  <footer class="site-footer"><div class="site-footer__inner"><div>${logo}<p>Recipes, structured to taste. Apache-2.0.</p></div><div><h2>Build</h2><a href="/ai/">Use with AI</a><a href="/sdks/">SDKs</a><a href="/playground/">Playground</a></div><div><h2>Understand</h2><a href="/reference/">Reference</a><a href="/reference/problems/">Problems</a><a href="/reference/conformance/">Conformance</a></div></div><div class="shell locale-bar" aria-label="Languages"><a href="/">English</a>${Object.entries(locales).map(([tag, value]) => `<a href="/${tag}/" lang="${tag}">${value.name}</a>`).join("")}</div></footer>
  <script src="/search-index.js"></script>
  <script src="/site.js"></script>${page.script ? `\n  <script type="module" src="${page.script}"></script>` : ""}
</body>
</html>`;
}

function write(path: string, content: string | Uint8Array) {
  const target = join(dist, path.replace(/^\//, ""));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function copy(source: string, target: string) {
  const destination = join(dist, target);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(join(root, source), destination, { recursive: true });
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

for (const page of pages) write(join(page.path, "index.html"), layout(page));
write("404.html", layout({ path: "/404.html", title: "Page not found", description: "The requested Schemami page does not exist.", section: "start", body: `<article class="article"><p class="sm-eyebrow">404</p><h1>That route is not in the recipe.</h1><p class="lede">Use the navigation or return to the documentation start.</p><p><a class="sm-button" data-variant="primary" href="/start/">Go to Start</a></p></article>` }));
write("site.css", readFileSync(join(website, "src/site.css")));
write("site.js", readFileSync(join(website, "src/site.js")));
write("search-index.js", `window.__SCHEMAMI_SEARCH__=${JSON.stringify(searchIndex).replaceAll("<", "\\u003c")};\n`);

copy("design-system/assets", "design-system/assets");
copy("design-system/generated", "design-system/generated");
copy("design-system/styles", "design-system/styles");
copy("ai/v1", "ai/v1");
copy("schema/schemami-v1-core.schema.json", "schema/schemami/1/core.schema.json");
copy("schema/schemami-v1-bundle.schema.json", "schema/schemami/1/bundle.schema.json");
copy("conformance/schemami-v1", "conformance/schemami/1");
copy("release/schemami-v1.0.0/problems", "problems");

const releaseManifest = process.env.SCHEMAMI_RELEASE_MANIFEST;
if (process.env.CF_PAGES === "1" && !releaseManifest) {
  throw new Error("Cloudflare release build requires SCHEMAMI_RELEASE_MANIFEST");
}
if (releaseManifest) {
  if (!existsSync(releaseManifest)) throw new Error(`release manifest not found: ${releaseManifest}`);
  write("releases/schemami-v1.0.0.json", readFileSync(releaseManifest));
}

const playgroundBundle = await Bun.build({ entrypoints: [join(website, "src/playground.ts")], target: "browser", format: "esm", minify: true });
if (!playgroundBundle.success) throw new Error(`playground build failed: ${playgroundBundle.logs.join("\n")}`);
write("playground.js", await playgroundBundle.outputs[0]!.text());

write("_redirects", `/docs /start/ 301\n/ai/v1 /ai/v1/ 301\n/reference /reference/ 301\n/sdks /sdks/ 301\n/playground /playground/ 301\n`);
write("_headers", `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Cross-Origin-Opener-Policy: same-origin\n\n/schema/*\n  Content-Type: application/schema+json; charset=utf-8\n\n/conformance/*\n  Content-Type: application/json; charset=utf-8\n\n/ai/v1/*.md\n  Content-Type: text/markdown; charset=utf-8\n`);
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((page) => `<url><loc>https://schemami.dev${page.path}</loc></url>`).join("")}</urlset>\n`);
write("robots.txt", "User-agent: *\nAllow: /\nSitemap: https://schemami.dev/sitemap.xml\n");

const requiredRoutes = ["index.html", "start/index.html", "ai/index.html", "sdks/index.html", "sdks/typescript/index.html", "sdks/go/index.html", "sdks/swift/index.html", "playground/index.html", "reference/index.html", "pt-PT/index.html", "es/index.html", "fr/index.html", "de/index.html", "it/index.html"];
for (const route of requiredRoutes) if (!existsSync(join(dist, route))) throw new Error(`missing route ${route}`);

const htmlFiles: string[] = [];
const walk = (directory: string) => {
  for (const entry of new Bun.Glob("**/*.html").scanSync({ cwd: directory, onlyFiles: true })) htmlFiles.push(entry);
};
walk(dist);
for (const file of htmlFiles) {
  const html = readFileSync(join(dist, file), "utf8");
  if (!html.includes("<html lang=")) throw new Error(`${file}: missing language`);
  if (!html.includes("<title>")) throw new Error(`${file}: missing title`);
  if (!file.startsWith("ai/v1/") && !html.includes("<main")) throw new Error(`${file}: missing main landmark`);
  if (!file.startsWith("ai/v1/") && /\bRCP\b|Recipes Protocol/.test(html)) throw new Error(`${file}: active RCP terminology`);
  for (const match of html.matchAll(/href="(\/[^"]*)"/g)) {
    const href = match[1].split("#")[0].split("?")[0];
    if (!href || href === "/") continue;
    const candidate = href.endsWith("/") ? join(dist, href, "index.html") : join(dist, href.replace(/^\//, ""));
    if (!existsSync(candidate)) throw new Error(`${file}: broken local link ${href}`);
  }
}

const generatedCSS = readFileSync(join(root, "design-system/generated/schemami.css"));
const publishedCSS = readFileSync(join(dist, "design-system/generated/schemami.css"));
if (!generatedCSS.equals(publishedCSS)) throw new Error("published design tokens differ from authority");

console.log(`Schemami website: ${pages.length} pages, ${htmlFiles.length} HTML artifacts, design-system and local links verified`);
