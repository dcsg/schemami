import { createSchemamiEngine } from "./engine.ts";
import { wireApp } from "./app.ts";
import {
  EMBEDDED_EXAMPLE,
  EMBEDDED_SCHEMA,
  EMBEDDED_UNIT_LABELS,
} from "./generated.ts";

wireApp(
  createSchemamiEngine(EMBEDDED_SCHEMA),
  { unitLabels: EMBEDDED_UNIT_LABELS },
  document,
  EMBEDDED_EXAMPLE,
);
