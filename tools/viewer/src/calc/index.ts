/**
 * TypeScript implementation of the Recipe Calculus (calculus/SPEC.md).
 * ZERO imports — purity is law (structural check in bun test). The Go
 * reference writes calculus/vectors/; this implementation replays them:
 * a disagreement is a bug HERE unless the SPEC changed.
 *
 * Message formats mirror the reference verbatim (they are part of the
 * enforceConstraints parity surface: authored reasons opaque, resolved
 * math formatted %.4f / %.2f / %g equivalently).
 */

type Dict = Record<string, unknown>;
const asDict = (v: unknown): Dict => (v && typeof v === "object" && !Array.isArray(v) ? (v as Dict) : {});
const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const toF = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const isTrue = (v: unknown): boolean => v === true;

/** Go's %g for the value ranges the Calculus emits. */
const g = (n: number): string => String(n);
const f4 = (n: number): string => n.toFixed(4);
const f2 = (n: number): string => n.toFixed(2);

export interface Findings {
  refusals: string[];
  warnings: string[];
}

export function renderReason(v: unknown): string {
  const rm = asDict(v);
  const parts: string[] = [];
  for (const lang of ["pt", "en"]) {
    if (typeof rm[lang] === "string") parts.push(`${lang}: ${rm[lang]}`);
  }
  return parts.join(" | ");
}

// ── fn: fixedQuantityTransform ────────────────────────────────────────
export function fixedQuantityTransform(amount: Dict, k: number): Dict {
  const out: Dict = { ...amount };
  const v = toF(amount["value"]);
  if (v === null) return out; // R-MODEL-2..4
  const factor = amount["scaling"] === "fixed" ? 1 : k; // R-MODEL-1
  out["value"] = v * factor;
  return out;
}

// ── fn: scale ─────────────────────────────────────────────────────────
export function scale(scope: Dict, k: number): Dict | null {
  if (!(k > 0) || !Number.isFinite(k)) return null; // R-MODEL-5
  return scaleScope(scope, k);
}

function scaleScope(m: Dict, k: number): Dict {
  const out: Dict = { ...m };
  if (Array.isArray(m["ingredients"])) {
    out["ingredients"] = m["ingredients"].map((iv) => {
      if (!iv || typeof iv !== "object" || Array.isArray(iv)) return iv;
      const im = iv as Dict;
      const ni: Dict = { ...im };
      const am = im["amount"];
      if (am && typeof am === "object" && !Array.isArray(am)) ni["amount"] = fixedQuantityTransform(am as Dict, k);
      return ni;
    });
  }
  if (Array.isArray(m["components"])) {
    out["components"] = m["components"].map((cv) => {
      if (!cv || typeof cv !== "object" || Array.isArray(cv)) return cv;
      const cm = cv as Dict;
      if ("ref" in cm) return cm; // R-SCALE-3
      if (isTrue(cm["maintenance"])) return cm; // R-SCALE-2
      return scaleScope(cm, k);
    });
  }
  return out;
}

// ── fn: resolveBases ──────────────────────────────────────────────────
export interface BasisResult {
  Grams: number;
  OK: boolean;
  Why: string;
}

export function resolveBases(scope: Dict, k: number): Record<string, BasisResult> {
  const out: Record<string, BasisResult> = {};
  const bm = asDict(scope["bases"]);
  for (const name of Object.keys(bm)) {
    const [grams, ok, why] = basisGramTotal(scope, name, k);
    out[name] = { Grams: grams, OK: ok, Why: why };
  }
  return out;
}

function basisDeclared(scope: Dict, name: string): boolean {
  return name in asDict(scope["bases"]);
}

function basisGramTotal(scope: Dict, name: string, k: number): [number, boolean, string] {
  const bm = scope["bases"];
  if (!bm || typeof bm !== "object" || Array.isArray(bm)) {
    return [0, false, `basis ${JSON.stringify(name)} unresolvable`];
  }
  const rawSpec = (bm as Dict)[name];
  if (!rawSpec || typeof rawSpec !== "object" || Array.isArray(rawSpec)) {
    return [0, false, `basis ${JSON.stringify(name)} unresolvable`];
  }
  const spec = rawSpec as Dict;
  const roles = roleFilter(spec);
  let [total, ok, why] = sumScope(scope, roles, k);
  if (!ok) return [0, false, why];
  if (isTrue(spec["include_components"])) {
    for (const cv of asList(scope["components"])) {
      const cm = asDict(cv);
      if ("ref" in cm) return [0, false, `basis ${JSON.stringify(name)} unresolvable`]; // R-BASIS-2
      const [sub, sOK, sWhy] = sumComponentTree(cm, roles, k);
      if (!sOK) return [0, false, sWhy];
      total += sub;
    }
  }
  return [total, true, ""];
}

function sumComponentTree(cm: Dict, roles: string[], k: number): [number, boolean, string] {
  const factor = isTrue(cm["maintenance"]) ? 1 : k; // R-SCALE-2
  let [total, ok, why] = sumScope(cm, roles, factor);
  if (!ok) return [0, false, why];
  for (const cv of asList(cm["components"])) {
    const sub = asDict(cv);
    if ("ref" in sub) return [0, false, "basis unresolvable"];
    const [s, sOK, sWhy] = sumComponentTree(sub, roles, factor);
    if (!sOK) return [0, false, sWhy];
    total += s;
  }
  return [total, true, ""];
}

function sumScope(m: Dict, roles: string[], k: number): [number, boolean, string] {
  let total = 0;
  for (const iv of asList(m["ingredients"])) {
    const im = asDict(iv);
    if (!matchesRoles(im, roles)) continue;
    const am = im["amount"];
    if (!am || typeof am !== "object") return [0, false, "basis contribution missing amount"];
    const amd = asDict(am);
    const v = toF(amd["value"]);
    if (v === null || amd["unit"] !== "g") {
      // SPEC Units rule: never a partial sum
      return [0, false, `basis contribution ${String(im["id"] ?? "")} not gram-valued`];
    }
    const factor = amd["scaling"] === "fixed" ? 1 : k; // R-BASIS-3
    total += v * factor;
  }
  return [total, true, ""];
}

function roleFilter(spec: Dict): string[] {
  return asList(asDict(spec["where"])["roles"]).filter((r): r is string => typeof r === "string");
}

function matchesRoles(im: Dict, roles: string[]): boolean {
  if (roles.length === 0) return true; // R-BASIS-1
  const have = asList(im["roles"]);
  return roles.some((r) => have.includes(r));
}

function resolvedRatio(scope: Dict, im: Dict, k: number): [number, string, boolean] {
  const am = im["amount"];
  if (!am || typeof am !== "object") return [0, "missing amount", false];
  const amd = asDict(am);
  const r = toF(amd["ratio"]);
  if (r !== null) {
    if (typeof amd["of"] === "string") {
      if (!basisDeclared(scope, amd["of"])) return [0, `basis ${JSON.stringify(amd["of"])} unresolvable`, false];
      return [r, "", true]; // R-MODEL-2
    }
    return [0, "ratio without basis", false];
  }
  if (amd["unit"] === "g") {
    const v = toF(amd["value"]);
    if (v !== null) {
      const of = constraintBasis(im);
      if (of === "") return [0, "no basis named", false];
      const [total, ok, why] = basisGramTotal(scope, of, k);
      if (!ok) return [0, why, false];
      if (total <= 0) return [0, `basis ${JSON.stringify(of)} not gram-resolvable`, false];
      const amtScale = amd["scaling"] === "fixed" ? 1 : k;
      return [(v * amtScale) / total, "", true];
    }
  }
  if ("parts" in amd) return [0, "parts-based (ratio-first): no gram semantics", false];
  return [0, "quantity form not resolvable", false];
}

function constraintBasis(im: Dict): string {
  for (const cv of asList(im["constraints"])) {
    const cm = asDict(cv);
    if (typeof cm["of"] === "string") return cm["of"];
  }
  return "";
}

// ── fn: enforceConstraints + fn: minBatchFloor ────────────────────────
export function enforceConstraints(loc: string, scope: Dict, k: number, f: Findings): void {
  minBatchFloor(loc, scope, k, f);
  for (const iv of asList(scope["ingredients"])) {
    const im = asDict(iv);
    const id = String(im["id"] ?? "");
    const cs = asList(im["constraints"]);
    if (cs.length === 0) continue;
    const [val, kind, resolvable] = resolvedRatio(scope, im, k);
    for (const cv of cs) {
      if (!cv || typeof cv !== "object" || Array.isArray(cv)) continue;
      const cm = cv as Dict;
      const sev = typeof cm["severity"] === "string" ? cm["severity"] : "";
      const reason = renderReason(cm["reason"]);
      if (!resolvable) {
        if (sev === "critical") {
          f.refusals.push(
            `${loc}: ingredient ${JSON.stringify(id)} critical constraint cannot be verified (${kind}) — uncertainty defaults to refusal (AC-SAFE-001-2). ${reason}`,
          );
        } else {
          f.warnings.push(`${loc}: ingredient ${JSON.stringify(id)} ${sev} constraint unverifiable (${kind})`);
        }
        continue;
      }
      const minR = toF(cm["min_ratio"]);
      if (minR !== null && val < minR) {
        route(f, sev, `${loc}: ingredient ${JSON.stringify(id)} resolved ratio ${f4(val)} < min_ratio ${f4(minR)}. ${reason}`);
      }
      const maxR = toF(cm["max_ratio"]);
      if (maxR !== null && val > maxR) {
        route(f, sev, `${loc}: ingredient ${JSON.stringify(id)} resolved ratio ${f4(val)} > max_ratio ${f4(maxR)}. ${reason}`);
      }
      const mv = toF(cm["min_value"]);
      if (mv !== null) {
        const abs = absoluteValue(im);
        if (abs) {
          const scaled = abs[0] * amountFactor(im, k);
          if (scaled < mv) route(f, sev, `${loc}: ingredient ${JSON.stringify(id)} scaled ${abs[1]} ${f2(scaled)} < min_value ${f2(mv)}. ${reason}`);
        }
      }
      const xv = toF(cm["max_value"]);
      if (xv !== null) {
        const abs = absoluteValue(im);
        if (abs) {
          const scaled = abs[0] * amountFactor(im, k);
          if (scaled > xv) route(f, sev, `${loc}: ingredient ${JSON.stringify(id)} scaled ${abs[1]} ${f2(scaled)} > max_value ${f2(xv)}. ${reason}`);
        }
      }
    }
  }
  for (const cv of asList(scope["components"])) {
    const cm = asDict(cv);
    if (!("ref" in cm)) {
      enforceConstraints(`${loc}/${String(cm["id"] ?? "")}`, cm, k, f);
    }
  }
}

export function minBatchFloor(loc: string, scope: Dict, k: number, f: Findings): void {
  const mb = asDict(scope["min_batch"]);
  if (!isTrue(scope["maintenance"])) return;
  const v = toF(mb["value"]);
  if (v === null) return;
  if (k < 1) {
    const implied = v * k;
    if (implied < v) {
      f.refusals.push(
        `${loc}: maintenance culture min_batch ${g(v)} g floors the draw — scale ×${g(k)} implies ${g(implied)} g (cannot build less than the minimum viable batch; DS-SAFE-001/min_batch)`,
      );
    }
  }
}

function route(f: Findings, sev: string, msg: string): void {
  if (sev === "critical") f.refusals.push(msg);
  else f.warnings.push(msg);
}

function absoluteValue(im: Dict): [number, string] | null {
  const am = asDict(im["amount"]);
  const v = toF(am["value"]);
  if (v === null) return null;
  return [v, String(am["unit"] ?? "")];
}

function amountFactor(im: Dict, k: number): number {
  return asDict(im["amount"])["scaling"] === "fixed" ? 1 : k;
}

// ── fn: reestimateDurations ───────────────────────────────────────────
export function reestimateDurations(window: Dict, _k: number): Dict {
  return window; // R-DUR-1: identity, the named extension point
}

// ── fn: selectGuardPath ───────────────────────────────────────────────
export interface Selection {
  options?: Record<string, unknown>;
  executionMode?: string;
  equipment?: string[];
  substitution?: string[];
  diet?: string[];
}

export function selectGuardPath(scope: Dict, sel: Selection): Dict[] {
  const resolved = resolveSelection(scope, sel); // throws on unsatisfiable (R-GUARD-2)
  const active: Dict[] = [];
  for (const sv of asList(scope["steps"])) {
    const sm = asDict(sv);
    const gd = sm["when"];
    if (!gd || typeof gd !== "object" || guardMatches(asDict(gd), resolved, sel)) active.push(sm);
  }
  return active;
}

function resolveSelection(scope: Dict, sel: Selection): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  const known: Record<string, Dict> = {};
  for (const ov of asList(scope["options"])) {
    const om = asDict(ov);
    const id = String(om["id"] ?? "");
    known[id] = om;
    if ("default" in om) resolved[id] = om["default"];
    else if (om["kind"] === "toggle") resolved[id] = false;
  }
  for (const [id, v] of Object.entries(sel.options ?? {})) {
    const om = known[id];
    if (!om) throw new Error(`selection names unknown option "${id}"`);
    if (om["kind"] === "choice") {
      if (typeof v !== "string" || !asList(om["choices"]).includes(v)) {
        throw new Error(`selection ${String(v)} not among option "${id}" choices`);
      }
    }
    resolved[id] = v;
  }
  return resolved;
}

function guardMatches(gd: Dict, resolved: Record<string, unknown>, sel: Selection): boolean {
  for (const [key, val] of Object.entries(gd)) {
    switch (key) {
      case "not": {
        if (typeof val === "object" && val && guardMatches(asDict(val), resolved, sel)) return false;
        break;
      }
      case "option":
        if (!anyOf(val, (s) => optionMatches(s, resolved))) return false;
        break;
      case "execution_mode":
        if (!anyOf(val, (s) => s === sel.executionMode)) return false;
        break;
      case "equipment":
        if (!anyOf(val, (s) => (sel.equipment ?? []).includes(s))) return false;
        break;
      case "substitution":
        if (!anyOf(val, (s) => (sel.substitution ?? []).includes(s))) return false;
        break;
      case "diet":
        if (!anyOf(val, (s) => (sel.diet ?? []).includes(s))) return false;
        break;
    }
  }
  return true;
}

function optionMatches(expr: string, resolved: Record<string, unknown>): boolean {
  const i = expr.indexOf(":");
  if (i >= 0) return resolved[expr.slice(0, i)] === expr.slice(i + 1);
  return resolved[expr] === true;
}

function anyOf(val: unknown, match: (s: string) => boolean): boolean {
  if (typeof val === "string") return match(val);
  if (Array.isArray(val)) return val.some((e) => typeof e === "string" && match(e));
  return false;
}

// ── timeline: fn readingOrder / interleave / schedule ─────────────────
export interface Window {
  Min: number;
  Target: number;
  Max: number;
}
const zeroW = (): Window => ({ Min: 0, Target: 0, Max: 0 });
const plus = (a: Window, b: Window): Window => ({ Min: a.Min + b.Min, Target: a.Target + b.Target, Max: a.Max + b.Max });
const minusConservative = (a: Window, b: Window): Window => ({ Min: a.Min - b.Max, Target: a.Target - b.Target, Max: a.Max - b.Min }); // R-SCHED-2
const wMax = (a: Window, b: Window): Window => ({
  Min: Math.max(a.Min, b.Min),
  Target: Math.max(a.Target, b.Target),
  Max: Math.max(a.Max, b.Max),
});

export function parseDurationSeconds(s: string): number | null {
  if (!s) return null;
  const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
  let total = 0;
  let num = "";
  let seen = false;
  for (const c of s) {
    if ((c >= "0" && c <= "9") || c === ".") {
      num += c;
      continue;
    }
    if (!(c in units) || num === "") return null;
    const v = pureParseFloat(num);
    if (v === null) return null;
    total += v * units[c];
    num = "";
    seen = true;
  }
  if (num !== "" || !seen) return null;
  return total;
}

/** Mirror of the reference's pure float parser: digits with one optional dot. */
function pureParseFloat(s: string): number | null {
  let intPart = s;
  let fracPart = "";
  const i = s.indexOf(".");
  if (i >= 0) {
    intPart = s.slice(0, i);
    fracPart = s.slice(i + 1);
    if (fracPart.includes(".")) return null;
  }
  let v = 0;
  for (const c of intPart) {
    if (c < "0" || c > "9") return null;
    v = v * 10 + (c.charCodeAt(0) - 48);
  }
  let frac = 0.1;
  for (const c of fracPart) {
    if (c < "0" || c > "9") return null;
    v += (c.charCodeAt(0) - 48) * frac;
    frac /= 10;
  }
  return v;
}

function durationWindow(m: Dict): Window {
  const dm = asDict(m["duration"]);
  const get = (key: string): number | null => (typeof dm[key] === "string" ? parseDurationSeconds(dm[key] as string) : null);
  let target = get("target");
  const min = get("min");
  const max = get("max");
  if (target === null) {
    if (min === null) return zeroW();
    target = min;
  }
  return { Min: min ?? target, Target: target, Max: max ?? target };
}

export function readingOrder(scope: Dict): string[] {
  const comps = asList(scope["components"]).map(asDict);
  const ids = comps.map((c) => String(c["id"] ?? "")).filter(Boolean);
  const deps: Record<string, string[]> = {};
  for (const c of comps) {
    const id = String(c["id"] ?? "");
    for (const u of scopeUses(c)) {
      if (ids.includes(u) && u !== id) (deps[id] ??= []).push(u);
    }
  }
  const pos: Record<string, number> = Object.fromEntries(ids.map((id, i) => [id, i]));
  const visited: Record<string, number> = {};
  const out: string[] = [];
  const visit = (id: string): void => {
    if (visited[id]) return;
    visited[id] = 1;
    for (const d of (deps[id] ?? []).slice().sort((a, b) => pos[a] - pos[b])) visit(d);
    visited[id] = 2;
    out.push(id);
  };
  ids.forEach(visit);
  for (const sv of asList(scope["steps"])) {
    const id = asDict(sv)["id"];
    if (typeof id === "string") out.push(id);
  }
  return out;
}

function scopeUses(m: Dict): string[] {
  const out: string[] = [];
  for (const sv of asList(m["steps"])) {
    for (const u of asList(asDict(sv)["uses"])) if (typeof u === "string") out.push(u);
  }
  return out;
}

export interface TrackedStep {
  id: string;
  track: string;
}

export function interleave(scope: Dict): TrackedStep[] {
  const { nodes, deps, trackOf, declOrder, trackOrder } = stepGraph(scope);
  const indeg: Record<string, number> = {};
  for (const n of nodes) indeg[n] = uniq(deps[n] ?? []).length;
  const out: TrackedStep[] = [];
  const done: Record<string, boolean> = {};
  while (out.length < nodes.length) {
    let best = "";
    for (const n of nodes) {
      if (done[n] || indeg[n] > 0) continue;
      if (best === "") {
        best = n;
        continue;
      }
      const tb = trackOrder[trackOf[best]];
      const tn = trackOrder[trackOf[n]];
      if (tn < tb || (tn === tb && declOrder[n] < declOrder[best])) best = n;
    }
    if (best === "") break; // R-SCHED-3: cycles cannot occur when admitted
    done[best] = true;
    out.push({ id: best, track: trackOf[best] });
    for (const n of nodes) {
      if (!done[n] && uniq(deps[n] ?? []).includes(best)) indeg[n]--;
    }
  }
  return out;
}

function uniq(ss: string[]): string[] {
  return [...new Set(ss)];
}

function stepGraph(scope: Dict): {
  nodes: string[];
  deps: Record<string, string[]>;
  trackOf: Record<string, string>;
  declOrder: Record<string, number>;
  trackOrder: Record<string, number>;
} {
  const nodes: string[] = [];
  const deps: Record<string, string[]> = {};
  const trackOf: Record<string, string> = {};
  const declOrder: Record<string, number> = {};
  const trackOrder: Record<string, number> = {};
  const produced: Record<string, string> = {};
  const compTerminals: Record<string, string[]> = {};
  let decl = 0;
  let nextTrack = 0;
  const track = (name: string): string => {
    if (!(name in trackOrder)) trackOrder[name] = nextTrack++;
    return name;
  };
  const addSteps = (m: Dict, lane: string): void => {
    for (const sv of asList(m["steps"])) {
      const sm = asDict(sv);
      const id = String(sm["id"] ?? "");
      nodes.push(id);
      declOrder[id] = decl++;
      trackOf[id] = track(typeof sm["track"] === "string" ? sm["track"] : lane);
      if (typeof sm["produces"] === "string") produced[sm["produces"]] = id;
      for (const a of asList(sm["after"])) if (typeof a === "string") (deps[id] ??= []).push(a);
    }
  };
  const comps = asList(scope["components"]).map(asDict);
  for (const cm of comps) {
    if ("ref" in cm) continue;
    const cid = String(cm["id"] ?? "");
    addSteps(cm, cid);
    const consumed = new Set<string>();
    for (const sv of asList(cm["steps"])) {
      for (const a of asList(asDict(sv)["after"])) if (typeof a === "string") consumed.add(a);
    }
    compTerminals[cid] = asList(cm["steps"])
      .map((sv) => String(asDict(sv)["id"] ?? ""))
      .filter((id) => id && !consumed.has(id));
  }
  addSteps(scope, "main");
  const resolveUses = (m: Dict): void => {
    for (const sv of asList(m["steps"])) {
      const sm = asDict(sv);
      const id = String(sm["id"] ?? "");
      for (const u of asList(sm["uses"])) {
        if (typeof u !== "string") continue;
        if (u in produced && produced[u] !== id) (deps[id] ??= []).push(produced[u]);
        if (u in compTerminals) (deps[id] ??= []).push(...compTerminals[u]);
      }
    }
  };
  for (const cm of comps) if (!("ref" in cm)) resolveUses(cm);
  resolveUses(scope);
  return { nodes, deps, trackOf, declOrder, trackOrder };
}

export interface ScheduleEntry {
  item: string;
  start: Window;
  duration: Window;
}

export interface ScheduleResult {
  entries: ScheduleEntry[];
  refusals: string[];
}

/**
 * R-SCHED-5: `resolved` supplies the bodies of documents included BY
 * REFERENCE, keyed by ref id. Resolution is an INPUT, never a guess —
 * an unsupplied reference is refused and placed nowhere, because a
 * zero-window fallback would silently claim a multi-day ferment takes
 * no time.
 */
export function schedule(scope: Dict, resolved: Record<string, Dict> = {}): ScheduleResult {
  const [parentStarts, parentDur] = scopeSchedule(scope);
  const out: ScheduleEntry[] = [];
  const refusals: string[] = [];
  for (const sv of asList(scope["steps"])) {
    const id = String(asDict(sv)["id"] ?? "");
    out.push({ item: id, start: parentStarts[id] ?? zeroW(), duration: parentDur[id] ?? zeroW() });
  }
  for (const cv of asList(scope["components"])) {
    const cm = asDict(cv);
    const cid = String(cm["id"] ?? "");
    let inner = cm;
    if ("ref" in cm) {
      const refID = String(cm["ref"] ?? "");
      const body = resolved[refID];
      if (body === undefined) {
        refusals.push(`referenced preparation ${JSON.stringify(refID)} unresolvable`);
        continue;
      }
      inner = body;
    }
    const [innerStarts, innerDur] = scopeSchedule(inner);
    let total = zeroW();
    for (const [id, s] of Object.entries(innerStarts)) total = wMax(total, plus(s, innerDur[id] ?? zeroW()));
    const consumer = earliestConsumer(scope, cid, parentStarts);
    if (consumer === "") continue;
    const placement = minusConservative(parentStarts[consumer] ?? zeroW(), total);
    out.push({ item: cid, start: placement, duration: total });
    for (const sv of asList(inner["steps"])) {
      const id = String(asDict(sv)["id"] ?? "");
      out.push({ item: id, start: plus(placement, innerStarts[id] ?? zeroW()), duration: innerDur[id] ?? zeroW() });
    }
  }
  return { entries: out, refusals };
}

function scopeSchedule(m: Dict): [Record<string, Window>, Record<string, Window>] {
  const starts: Record<string, Window> = {};
  const dur: Record<string, Window> = {};
  const produced: Record<string, string> = {};
  const order: string[] = [];
  const deps: Record<string, string[]> = {};
  for (const sv of asList(m["steps"])) {
    const sm = asDict(sv);
    const id = String(sm["id"] ?? "");
    order.push(id);
    dur[id] = durationWindow(sm);
    if (typeof sm["produces"] === "string") produced[sm["produces"]] = id;
    for (const a of asList(sm["after"])) if (typeof a === "string") (deps[id] ??= []).push(a);
  }
  for (const sv of asList(m["steps"])) {
    const sm = asDict(sv);
    const id = String(sm["id"] ?? "");
    for (const u of asList(sm["uses"])) {
      if (typeof u === "string" && u in produced && produced[u] !== id) (deps[id] ??= []).push(produced[u]);
    }
  }
  for (const id of order) starts[id] = zeroW();
  for (let pass = 0; pass <= order.length; pass++) {
    let changed = false;
    for (const id of order) {
      let s = zeroW();
      for (const d of uniq(deps[id] ?? [])) s = wMax(s, plus(starts[d] ?? zeroW(), dur[d] ?? zeroW()));
      const cur = starts[id];
      if (s.Min !== cur.Min || s.Target !== cur.Target || s.Max !== cur.Max) {
        starts[id] = s;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return [starts, dur];
}

function earliestConsumer(scope: Dict, cid: string, starts: Record<string, Window>): string {
  let best = "";
  for (const sv of asList(scope["steps"])) {
    const sm = asDict(sv);
    if (asList(sm["uses"]).includes(cid)) {
      const id = String(sm["id"] ?? "");
      if (best === "" || (starts[id]?.Target ?? 0) < (starts[best]?.Target ?? 0)) best = id;
    }
  }
  return best;
}
