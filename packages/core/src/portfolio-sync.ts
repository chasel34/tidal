// 组合同步 (Portfolio Sync) — shared, framework-agnostic core.
//
// Owns the parts that must stay consistent across web / menubar and need
// testing: the cloud document schema + normalization, a stable fingerprint for
// "本机有更改" detection, the first-sync case classifier (A/B/C/D), and the
// 同步冲突 detector (本机与云端都变过). See docs/adr/0007.
//
// The actual Google Drive transport + OAuth are injected by each app (web uses
// a browser GIS token client, menubar uses loopback PKCE) — this module never
// touches the network. AI 识别配置 / API keys are NEVER part of 组合核心.

import type { HoldingItem, Instrument, WatchItem } from "./types.ts";

// ---- 组合核心 (the synced unit) --------------------------------------------

/** The only data 组合同步 carries between devices: 持仓 + 自选 + 现金. */
export interface PortfolioCore {
  holdings: HoldingItem[];
  watch: WatchItem[];
  cash: number;
}

export const SYNC_SCHEMA = "tidal-portfolio-sync" as const;
export const SYNC_VERSION = 1 as const;

/** The serialized cloud document stored in the Drive 应用数据区. */
export interface SyncDocument {
  schema: typeof SYNC_SCHEMA;
  version: typeof SYNC_VERSION;
  core: PortfolioCore;
  /** ISO timestamp of the write. */
  updatedAt: string;
  /** Surface that produced the write — shown as "最近同步来源". */
  updatedBy: SyncSurface;
}

export type SyncSurface = "web" | "menubar" | "mobile";

export const SYNC_SURFACE_LABEL: Record<SyncSurface, string> = {
  web: "网页端",
  menubar: "菜单栏客户端",
  mobile: "移动网页",
};

// ---- normalization ----------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const KNOWN_CATEGORIES: readonly Instrument["category"][] = [
  "stock",
  "index",
  "fund",
  "bond",
  "futures",
  "option",
  "other",
];

function normalizeCategory(value: string): Instrument["category"] {
  return (KNOWN_CATEGORIES as readonly string[]).includes(value)
    ? (value as Instrument["category"])
    : "other";
}

function normalizeInstrument(value: unknown): Instrument | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.code !== "string" ||
    typeof value.name !== "string" ||
    typeof value.market !== "string" ||
    typeof value.category !== "string" ||
    typeof value.type !== "string"
  ) {
    return null;
  }
  return {
    code: value.code,
    name: value.name,
    market: value.market,
    category: normalizeCategory(value.category),
    type: value.type,
  };
}

function normalizeHolding(value: unknown): HoldingItem | null {
  if (!isRecord(value)) return null;
  const instrument = normalizeInstrument(value.instrument);
  if (!instrument) return null;
  const shares = Number(value.shares);
  const cost = Number(value.cost);
  if (!Number.isFinite(shares) || !Number.isFinite(cost) || shares < 0 || cost < 0) return null;
  return { instrument, shares, cost };
}

/** Lenient: drops malformed rows rather than failing the whole document. */
export function normalizeCore(input: unknown): PortfolioCore {
  const src = isRecord(input) ? input : {};
  const cash = Number(src.cash);
  return {
    holdings: Array.isArray(src.holdings)
      ? src.holdings.map(normalizeHolding).filter((h): h is HoldingItem => Boolean(h))
      : [],
    watch: Array.isArray(src.watch)
      ? src.watch.map(normalizeInstrument).filter((w): w is WatchItem => Boolean(w))
      : [],
    cash: Number.isFinite(cash) ? cash : 0,
  };
}

export function emptyCore(): PortfolioCore {
  return { holdings: [], watch: [], cash: 0 };
}

export function isEmptyCore(core: PortfolioCore): boolean {
  return core.holdings.length === 0 && core.watch.length === 0 && core.cash === 0;
}

export interface CoreSummary {
  holdings: number;
  watch: number;
  cash: number;
}

export function summarizeCore(core: PortfolioCore): CoreSummary {
  return { holdings: core.holdings.length, watch: core.watch.length, cash: core.cash };
}

// ---- cloud document (build / parse) ----------------------------------------

export function buildSyncDocument(core: PortfolioCore, surface: SyncSurface): string {
  const doc: SyncDocument = {
    schema: SYNC_SCHEMA,
    version: SYNC_VERSION,
    core: normalizeCore(core),
    updatedAt: new Date().toISOString(),
    updatedBy: surface,
  };
  return JSON.stringify(doc);
}

export interface ParsedSyncDocument {
  core: PortfolioCore;
  updatedAt: string | null;
  updatedBy: SyncSurface | null;
}

/**
 * Parse a cloud document. Returns null when the text is not a recognizable
 * tidal sync document — the app maps that to the "云端数据无法识别" (badCloud)
 * failure rather than silently treating it as empty. A document written by a
 * newer schema version is also rejected: lenient-normalizing an unknown shape
 * could drop rows and then overwrite the cloud copy with the truncated result.
 */
export function parseSyncDocument(text: string): ParsedSyncDocument | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(raw) || raw.schema !== SYNC_SCHEMA || raw.version !== SYNC_VERSION) return null;
  const surface =
    raw.updatedBy === "web" || raw.updatedBy === "menubar" || raw.updatedBy === "mobile"
      ? raw.updatedBy
      : null;
  return {
    core: normalizeCore(raw.core),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
    updatedBy: surface,
  };
}

// ---- fingerprint (本机有更改 detection) -------------------------------------

function canonicalInstrument(i: Instrument): unknown {
  return [i.code, i.name, i.market, i.category, i.type];
}

/**
 * A stable string fingerprint of a 组合核心, order-independent for holdings and
 * watch (sorted by code) so reordering alone is not treated as a change.
 */
export function coreFingerprint(core: PortfolioCore): string {
  const holdings = [...core.holdings]
    .sort((a, b) => a.instrument.code.localeCompare(b.instrument.code))
    .map((h) => [canonicalInstrument(h.instrument), h.shares, h.cost]);
  const watch = [...core.watch]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(canonicalInstrument);
  return JSON.stringify({ holdings, watch, cash: core.cash });
}

// ---- first-sync case + 同步冲突 --------------------------------------------

/**
 * III · 首次同步 case:
 *  A — 本机有 / 云端空  → upload local
 *  B — 两边都空
 *  C — 云端有 / 本机空  → restore cloud
 *  D — 两边都有        → user picks a whole snapshot
 */
export type FirstSyncCase = "A" | "B" | "C" | "D";

export function classifyFirstSync(
  local: PortfolioCore,
  cloud: PortfolioCore | null,
): FirstSyncCase {
  const localEmpty = isEmptyCore(local);
  const cloudEmpty = !cloud || isEmptyCore(cloud);
  if (!localEmpty && cloudEmpty) return "A";
  if (localEmpty && cloudEmpty) return "B";
  if (localEmpty && !cloudEmpty) return "C";
  return "D";
}

export interface SyncChange {
  /** local 组合核心 differs from the last successfully synced snapshot. */
  localChanged: boolean;
  /** cloud revision differs from the one observed at the last sync. */
  cloudChanged: boolean;
  /** both sides moved since the last sync → 同步冲突. */
  conflict: boolean;
}

/**
 * Decide what moved since the last sync. `syncedFingerprint` / `syncedRevision`
 * are what this device recorded the last time it successfully synced; null on
 * either means "never synced", which is handled by the first-sync flow instead.
 */
export function detectChange(args: {
  localFingerprint: string;
  syncedFingerprint: string | null;
  cloudRevision: string | null;
  syncedRevision: string | null;
}): SyncChange {
  const localChanged =
    args.syncedFingerprint !== null && args.localFingerprint !== args.syncedFingerprint;
  const cloudChanged =
    args.syncedRevision !== null &&
    args.cloudRevision !== null &&
    args.cloudRevision !== args.syncedRevision;
  return { localChanged, cloudChanged, conflict: localChanged && cloudChanged };
}
