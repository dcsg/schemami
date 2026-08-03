// Browser entry: JS engine + build-time-embedded schemas and i18n vocab.
import { createJsEngine } from "./engine-js/index.ts";
import { wireApp } from "./app.ts";
import { EMBEDDED_I18N, EMBEDDED_SCHEMAS } from "./generated/embedded.ts";

wireApp(createJsEngine(EMBEDDED_SCHEMAS), { i18n: EMBEDDED_I18N, lang: "pt-PT" }, document);
