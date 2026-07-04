// 截图导入 (Screenshot Import) — shared, framework-agnostic core.
//
// Owns the parts that must stay consistent across web / menubar and need
// testing: the BYOK provider catalog + config normalization, the recognition
// prompt, building the 火山方舟 (Volcengine Ark) responses-API request, parsing
// its reply into ExtractedRow[], 持仓反推 (recovering 份额/成本 from 市值/收益),
// and matching a recognized row to a real Instrument.
//
// The actual HTTP call and instrument search are injected by each app (web does
// a direct browser fetch, menubar goes through the main process) — see ADR 0005.

import type { Instrument } from "./types.ts";

// ---- provider catalog -------------------------------------------------------

export type OcrProviderId = "volcengine";

export interface OcrProvider {
  id: OcrProviderId;
  name: string;
  blurb: string;
  defaultBaseURL: string;
  defaultModel: string;
  keyPlaceholder: string;
  modelHint: string;
  docHint: string;
}

export const OCR_PROVIDERS: OcrProvider[] = [
  {
    id: "volcengine",
    name: "火山引擎 · 豆包",
    blurb: "豆包视觉大模型 · 方舟 Ark",
    defaultBaseURL: "https://ark.cn-beijing.volces.com/api/v3",
    defaultModel: "doubao-seed-1-6-vision",
    keyPlaceholder: "输入火山方舟 API Key",
    modelHint: "填写模型名或接入点 ID（ep-…），需支持视觉",
    docHint: "火山方舟控制台 → API Key 管理",
  },
];

export const OCR_PROVIDER_MAP: Record<string, OcrProvider> = Object.fromEntries(
  OCR_PROVIDERS.map((p) => [p.id, p]),
);

// ---- BYOK config state ------------------------------------------------------

export interface OcrProviderConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export interface AiByokState {
  activeProvider: OcrProviderId;
  providers: Record<OcrProviderId, OcrProviderConfig>;
}

export function aiDefaultState(): AiByokState {
  return {
    activeProvider: "volcengine",
    providers: {
      volcengine: { apiKey: "", baseURL: "", model: "" },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeProviderConfig(value: unknown): OcrProviderConfig {
  const src = isRecord(value) ? value : {};
  return {
    apiKey: typeof src.apiKey === "string" ? src.apiKey : "",
    baseURL: typeof src.baseURL === "string" ? src.baseURL : "",
    model: typeof src.model === "string" ? src.model : "",
  };
}

/** Validate persisted BYOK config from web localStorage or menubar config. */
export function aiNormalize(input: unknown): AiByokState {
  const src = isRecord(input) ? input : {};
  const providersSrc = isRecord(src.providers) ? src.providers : {};
  const activeProvider = OCR_PROVIDER_MAP[String(src.activeProvider)]
    ? (src.activeProvider as OcrProviderId)
    : "volcengine";
  return {
    activeProvider,
    providers: {
      volcengine: normalizeProviderConfig(providersSrc.volcengine),
    },
  };
}

export function aiActiveConfig(state: AiByokState): OcrProviderConfig {
  return state.providers[state.activeProvider] ?? aiDefaultState().providers.volcengine;
}

/** The model id to send: the user's typed value, else the provider default. */
export function aiResolvedModel(state: AiByokState, providerId?: OcrProviderId): string {
  const pid = providerId ?? state.activeProvider;
  const typed = (state.providers[pid]?.model ?? "").trim();
  return typed || OCR_PROVIDER_MAP[pid].defaultModel;
}

/** The base URL to send: the user's typed value, else the provider default. */
export function aiResolvedBaseURL(state: AiByokState, providerId?: OcrProviderId): string {
  const pid = providerId ?? state.activeProvider;
  const typed = (state.providers[pid]?.baseURL ?? "").trim();
  return (typed || OCR_PROVIDER_MAP[pid].defaultBaseURL).replace(/\/+$/, "");
}

export function aiIsConfigured(state: AiByokState, providerId?: OcrProviderId): boolean {
  const pid = providerId ?? state.activeProvider;
  return (state.providers[pid]?.apiKey ?? "").trim().length > 0;
}

/** A fully-resolved request config (key + base URL + model) for one call. */
export interface ResolvedOcrConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export function aiResolve(state: AiByokState, providerId?: OcrProviderId): ResolvedOcrConfig {
  const pid = providerId ?? state.activeProvider;
  return {
    apiKey: (state.providers[pid]?.apiKey ?? "").trim(),
    baseURL: aiResolvedBaseURL(state, pid),
    model: aiResolvedModel(state, pid),
  };
}

// ---- recognition prompt + request -------------------------------------------

export const OCR_PROMPT =
  "你是持仓截图识别助手。从图片识别用户持仓标的列表。" +
  "只输出一个JSON对象，不要任何额外文字或markdown代码块。" +
  '格式：{"rows":[{"name":string,"code":string|null,"marketValue":number|null,' +
  '"profit":number|null,"profitPct":number|null,"shares":number|null,"cost":number|null}]}。' +
  "name=标的名称含A/C份额类别后缀；code=基金或股票代码若可见否则null；marketValue=持仓市值或金额；" +
  "profit=持有收益累计盈亏带正负；profitPct=持有收益率百分比数值如42.41或-4.4；" +
  "shares=份额或股数若可见否则null；cost=成本单价若可见否则null。" +
  "数字去掉千分位逗号。只识别真实持仓标的行，忽略总金额、汇总、广告、按钮、导航等非标的行。";

export interface OcrRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

/** Build the 火山方舟 responses-API request for one screenshot. */
export function buildScreenshotRequest(
  imageDataUrl: string,
  cfg: ResolvedOcrConfig,
): OcrRequest {
  const url = `${cfg.baseURL.replace(/\/+$/, "")}/responses`;
  const body = JSON.stringify({
    model: cfg.model,
    input: [
      {
        role: "user",
        content: [
          { type: "input_image", image_url: imageDataUrl },
          { type: "input_text", text: OCR_PROMPT },
        ],
      },
    ],
  });
  return {
    url,
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body,
  };
}

// ---- response parsing -------------------------------------------------------

export interface ExtractedRow {
  name: string;
  code: string | null;
  marketValue: number | null;
  profit: number | null;
  profitPct: number | null;
  shares: number | null;
  cost: number | null;
}

/** Pull the assistant text out of a 火山 responses-API reply. */
export function parseResponsesText(json: unknown): string {
  if (!isRecord(json)) return "";
  const output = json.output;
  if (!Array.isArray(output)) return "";
  const parts: string[] = [];
  for (const item of output) {
    if (!isRecord(item) || item.type !== "message") continue;
    const content = item.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (isRecord(c) && c.type === "output_text" && typeof c.text === "string") {
        parts.push(c.text);
      }
    }
  }
  return parts.join("");
}

function toNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const cleaned = value.replace(/[,，\s%¥$]/g, "");
    if (cleaned === "" || cleaned === "-" || cleaned === "+") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  return trimmed;
}

/** Tolerantly parse the model's text into ExtractedRow[]. */
export function parseExtractedRows(text: string): ExtractedRow[] {
  const body = stripJsonFence(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    // last resort: grab the first {...} block
    const m = body.match(/\{[\s\S]*\}/);
    if (!m) return [];
    try {
      parsed = JSON.parse(m[0]);
    } catch {
      return [];
    }
  }
  const rowsRaw = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.rows)
      ? parsed.rows
      : [];
  const rows: ExtractedRow[] = [];
  for (const r of rowsRaw) {
    if (!isRecord(r)) continue;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!name) continue;
    rows.push({
      name,
      code: typeof r.code === "string" && r.code.trim() ? r.code.trim() : null,
      marketValue: toNumberOrNull(r.marketValue),
      profit: toNumberOrNull(r.profit),
      profitPct: toNumberOrNull(r.profitPct),
      shares: toNumberOrNull(r.shares),
      cost: toNumberOrNull(r.cost),
    });
  }
  return rows;
}

/** Compose: 火山 reply JSON -> ExtractedRow[]. */
export function extractRowsFromResponse(json: unknown): ExtractedRow[] {
  return parseExtractedRows(parseResponsesText(json));
}

// ---- 持仓反推 (holding reconstruction) --------------------------------------

export interface Reconstructed {
  shares: number;
  cost: number;
}

/**
 * Recover the 份额 + 成本 a 持仓 needs from the fields a screenshot shows
 * (市值 + 持有收益), using a live price. Lossy by design — see ADR 0006.
 * Returns null when neither the screenshot nor the price give enough to derive
 * a positive shares & cost (caller then asks the user to fill it in).
 */
export function reconstructHolding(
  row: Pick<ExtractedRow, "marketValue" | "profit" | "profitPct" | "shares" | "cost">,
  price: number,
): Reconstructed | null {
  // shares: explicit on screenshot, else 市值 ÷ 现价
  let shares = row.shares != null && row.shares > 0 ? row.shares : 0;
  if (shares <= 0 && row.marketValue != null && price > 0) {
    shares = row.marketValue / price;
  }

  // unit cost: explicit on screenshot, else derived from 成本总额 ÷ 份额
  let cost = row.cost != null && row.cost > 0 ? row.cost : 0;
  if (cost <= 0) {
    let totalCost: number | null = null;
    if (row.marketValue != null && row.profit != null) {
      totalCost = row.marketValue - row.profit;
    } else if (row.marketValue != null && row.profitPct != null) {
      totalCost = row.marketValue / (1 + row.profitPct / 100);
    } else if (row.marketValue != null) {
      totalCost = row.marketValue; // no gain info → assume break-even
    }
    if (totalCost != null && shares > 0) cost = totalCost / shares;
  }

  // profitPct = -100 makes the totalCost denominator zero → cost = Infinity,
  // which would poison every downstream aggregate; treat it as underivable.
  if (!(shares > 0) || !(cost > 0) || !Number.isFinite(shares) || !Number.isFinite(cost)) {
    return null;
  }
  return { shares, cost };
}

// ---- search query building --------------------------------------------------

/**
 * Recognized fund names ("华泰柏瑞沪深300ETF联接A") are often too specific for
 * stock-sdk's search to match. Produce a sequence of progressively-trimmed
 * queries — the caller tries each until one returns candidates, then
 * matchInstrument picks the exact share class out of them.
 */
export function screenshotSearchQueries(row: { name: string; code?: string | null }): string[] {
  const out: string[] = [];
  const push = (s?: string | null) => {
    const t = (s || "").trim();
    if (t.length >= 2 && !out.includes(t)) out.push(t);
  };
  const name = (row.name || "").trim();
  // A visible instrument code is more precise than any OCR-recognized name.
  push(row.code ?? null);
  push(name);
  // cut before common fund-structure tokens (the most reliable trim)
  const cutTokens = ["ETF", "联接", "LOF", "（", "("];
  let cutAt = -1;
  for (const tok of cutTokens) {
    const i = name.indexOf(tok);
    if (i >= 2) cutAt = cutAt < 0 ? i : Math.min(cutAt, i);
  }
  if (cutAt > 0) push(name.slice(0, cutAt));
  // drop a trailing share-class letter (A/B/C/E/I/Y)
  push(name.replace(/[ABCEIY]$/, "").trim());
  // first six characters — Chinese fund names usually resolve on the brand + theme
  if (name.length > 6) push(name.slice(0, 6));
  return out;
}

/** A sensible pre-filled query for the in-row manual search box. */
export function screenshotSearchSeed(name: string): string {
  const qs = screenshotSearchQueries({ name });
  return qs[1] ?? qs[0] ?? name;
}

// ---- instrument matching ----------------------------------------------------

export type MatchStatus = "matched" | "ambiguous" | "unmatched";

export interface MatchResult {
  instrument: Instrument | null;
  status: MatchStatus;
}

/** Normalize a code for comparison: lowercase, drop non-alphanumerics. */
function normCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Normalize a name for comparison: drop spaces and full/half-width parens. */
function normName(name: string): string {
  return name.toLowerCase().replace(/[\s（）()]/g, "");
}

/**
 * Match a recognized row to a real instrument among search candidates.
 * Prefers an exact code hit, then a unique exact-name hit; a lone candidate is
 * accepted; anything else is left for the user to resolve in-row.
 */
export function matchInstrument(row: ExtractedRow, candidates: Instrument[]): MatchResult {
  if (!candidates.length) return { instrument: null, status: "unmatched" };

  // Placeholder codes like "--" normalize to "", and "".endsWith("") matches
  // everything — only trust the code path when something alphanumeric remains.
  const codeTarget = row.code ? normCode(row.code) : "";
  if (codeTarget) {
    const byCode = candidates.find((c) => {
      const nc = normCode(c.code);
      return nc === codeTarget || nc.endsWith(codeTarget) || codeTarget.endsWith(nc);
    });
    if (byCode) return { instrument: byCode, status: "matched" };
  }

  const target = normName(row.name);
  const exact = candidates.filter((c) => normName(c.name) === target);
  if (exact.length === 1) return { instrument: exact[0], status: "matched" };
  if (exact.length > 1) return { instrument: null, status: "ambiguous" };

  if (candidates.length === 1) return { instrument: candidates[0], status: "matched" };

  return { instrument: null, status: "ambiguous" };
}
