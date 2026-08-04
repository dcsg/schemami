/**
 * Bilingual chrome (FR-TOOL-005). EN and pt-PT interface strings.
 *
 * The split that matters: this file is INTERFACE language only. Recipe
 * content, registry definitions and pt-PT culinary terms are never
 * translated here — `massa velha` and `isco` are distinct ferments and
 * translating either would be a domain error, not a UI one.
 *
 * Every string is required in both languages: a missing key is a type
 * error, not a silent English fallback. A half-translated interface reads
 * as broken in a way a fully-English one does not.
 */
export type Lang = "en" | "pt";

export const LANGS: Lang[] = ["en", "pt"];

type Strings = {
  // Site chrome
  siteTagline: string;
  navSpec: string;
  navSchema: string;
  navRegistry: string;
  navPlayground: string;
  langLabel: string;
  // Entry page
  pitch: string;
  pathUnderstandTitle: string;
  pathUnderstandBody: string;
  pathImplementTitle: string;
  pathImplementBody: string;
  pathAuthorTitle: string;
  pathAuthorBody: string;
  tryItHere: string;
  // Playground
  playgroundTitle: string;
  playgroundLede: string;
  inputLabel: string;
  loadExample: string;
  filesLabel: string;
  validating: string;
  // Provenance banner
  renderedFrom: string;
  informativeNotice: string;
  // Registry
  registryLede: string;
  registryKind: string;
  registryCount: string;
  definition: string;
  backToRegistry: string;
};

const en: Strings = {
  siteTagline: "A machine-readable recipe protocol",
  navSpec: "Specification",
  navSchema: "Schema",
  navRegistry: "Registry",
  navPlayground: "Playground",
  langLabel: "Language",

  pitch:
    "Recipes are written for people to read, so software cannot rescale them, " +
    "substitute an ingredient, or tell you when the dough is actually ready. " +
    "RCP encodes what a recipe means, not just how it reads.",
  pathUnderstandTitle: "Understand it",
  pathUnderstandBody:
    "What a recipe document is, why ingredients are rows with roles, and how " +
    "one idea — basis — covers baker's percentage, brine strength, cure ppm " +
    "and brew ratio.",
  pathImplementTitle: "Implement it",
  pathImplementBody:
    "The Recipe Calculus with its rules and worked examples, the conformance " +
    "vectors your implementation must reproduce, and the versioning contract.",
  pathAuthorTitle: "Write recipes",
  pathAuthorBody:
    "The core schema, the per-category profiles, and the registry of " +
    "ingredients, techniques, equipment and step primitives.",
  tryItHere: "Paste a recipe below — nothing leaves this page.",

  playgroundTitle: "Playground",
  playgroundLede:
    "Validate and read an RCP document. Everything runs locally in your " +
    "browser; nothing is uploaded.",
  inputLabel: "Document (.rcp.yaml or JSON)",
  loadExample: "Load an example",
  filesLabel: "Files (document and/or media)",
  validating: "validating…",

  renderedFrom: "Rendered from",
  informativeNotice:
    "This page is informative. The repository is binding — where they " +
    "disagree, the repository is correct and this page is the defect.",

  registryLede:
    "Shared vocabulary. Every id here is stable, append-only, and " +
    "referenced by recipe documents.",
  registryKind: "Kind",
  registryCount: "entries",
  definition: "Definition",
  backToRegistry: "All registry entries",
};

const pt: Strings = {
  siteTagline: "Um protocolo de receitas legível por máquinas",
  navSpec: "Especificação",
  navSchema: "Esquema",
  navRegistry: "Registo",
  navPlayground: "Editor",
  langLabel: "Idioma",

  pitch:
    "As receitas são escritas para pessoas lerem, por isso o software não as " +
    "consegue reescalar, substituir um ingrediente, ou dizer quando a massa " +
    "está mesmo pronta. O RCP codifica o que uma receita significa, não " +
    "apenas como se lê.",
  pathUnderstandTitle: "Compreender",
  pathUnderstandBody:
    "O que é um documento de receita, porque é que os ingredientes são linhas " +
    "com funções, e como uma só ideia — a base — cobre a percentagem de " +
    "padeiro, a salmoura, o ppm de cura e o rácio de extração.",
  pathImplementTitle: "Implementar",
  pathImplementBody:
    "O Cálculo de Receitas com as suas regras e exemplos resolvidos, os " +
    "vetores de conformidade que a sua implementação tem de reproduzir, e o " +
    "contrato de versionamento.",
  pathAuthorTitle: "Escrever receitas",
  pathAuthorBody:
    "O esquema central, os perfis por categoria, e o registo de ingredientes, " +
    "técnicas, equipamento e primitivas de passo.",
  tryItHere: "Cole uma receita abaixo — nada sai desta página.",

  playgroundTitle: "Editor",
  playgroundLede:
    "Valide e leia um documento RCP. Tudo corre localmente no seu navegador; " +
    "nada é enviado.",
  inputLabel: "Documento (.rcp.yaml ou JSON)",
  loadExample: "Carregar um exemplo",
  filesLabel: "Ficheiros (documento e/ou media)",
  validating: "a validar…",

  renderedFrom: "Gerado a partir de",
  informativeNotice:
    "Esta página é informativa. O repositório é que vincula — em caso de " +
    "divergência, o repositório está certo e esta página é que tem o defeito.",

  registryLede:
    "Vocabulário partilhado. Cada id aqui é estável, apenas acrescentado, e " +
    "referenciado por documentos de receita.",
  registryKind: "Tipo",
  registryCount: "entradas",
  definition: "Definição",
  backToRegistry: "Todas as entradas do registo",
};

export const CHROME: Record<Lang, Strings> = { en, pt };

/** Display label for the language switch — always in its own language. */
export const LANG_LABEL: Record<Lang, string> = { en: "English", pt: "Português" };
