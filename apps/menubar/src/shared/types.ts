import type { AiByokState } from "@tidal/core";

export type ResolvedTheme = "light" | "dark";
export type ThemeMode = ResolvedTheme | "auto";
export type ColorConvention = "redUp" | "greenUp";
export type MenubarMode = "icon" | "percent" | "total";
export type Period = "1D" | "1W" | "1M" | "3M" | "1Y";

export type Category =
  | "stock"
  | "index"
  | "fund"
  | "bond"
  | "futures"
  | "option"
  | "other";

export interface Instrument {
  code: string;
  name: string;
  market: string;
  category: Category;
  type: string;
}

export type SearchResultDTO = Instrument;

export interface Quote {
  code: string;
  name: string;
  price: number;
  prevClose: number;
  change: number;
  changePercent: number;
  navDate?: string;
  nav?: number;
  accNav?: number;
  estimatedNav?: number;
  estimatedChangePercent?: number;
  estimateTime?: string;
  estimated?: boolean;
  baseNav?: number;
}

export interface KlinePoint {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export interface MinutePoint {
  time: string;
  close: number;
}

export interface FundNavPoint {
  date: string;
  nav: number;
}

export interface FundAllocSegment {
  label: string;
  pct: number;
}

export interface FundTopHolding {
  code: string;
  name: string;
  todayPct: number;
}

export interface FundManagerInfo {
  name: string;
  star: number;
  workTime: string;
  fundSize: string;
}

export interface FundProfile {
  code: string;
  name: string;
  fullType?: string;
  accNav?: number;
  navDate?: string;
  fundSize?: number;
  assetAlloc: FundAllocSegment[];
  topHoldings: FundTopHolding[];
  manager?: FundManagerInfo;
  navHistory: FundNavPoint[];
}

export interface HoldingItem {
  instrument: Instrument;
  shares: number;
  cost: number;
}

export type WatchItem = Instrument;

export interface HoldingFull extends Instrument {
  shares: number;
  cost: number;
  price: number;
  prevClose: number;
  todayPct: number;
  todayDelta: number;
  marketValue: number;
  costValue: number;
  gainAbs: number;
  gainPct: number;
  todayDeltaTotal: number;
  weight: number;
}

export interface WatchFull extends Instrument {
  price: number;
  prevClose: number;
  todayPct: number;
  todayDelta: number;
}

export interface PortfolioSummary {
  marketValue: number;
  costValue: number;
  cash: number;
  totalAssets: number;
  todayDelta: number;
  todayPct: number;
  totalGain: number;
  totalGainPct: number;
}

export interface IndexQuote {
  name: string;
  code: string;
  value: number;
  pct: number;
}

export interface SectionPrefs {
  trend: boolean;
  holdings: boolean;
  watch: boolean;
  indices: boolean;
  actions: boolean;
}

export interface PriceAlert {
  id: string;
  code: string;
  dir: "above" | "below";
  price: number;
  on: boolean;
  lastTriggeredSide?: "above" | "below";
}

export interface MenubarConfig {
  schema: "tidal-menubar-config";
  version: 1;
  theme: ThemeMode;
  conv: ColorConvention;
  menubarMode: MenubarMode;
  refreshSec: number;
  launchAtLogin: boolean;
  notify: boolean;
  sections: SectionPrefs;
  period: Period;
  alerts: PriceAlert[];
  holdings: HoldingItem[];
  watch: WatchItem[];
  cash: number;
  /** AI 识别配置 (BYOK) — local-only, excluded from MenubarExport (ADR 0005). */
  ai: AiByokState;
}

export interface MenubarExport {
  app: "tidal-menubar";
  exportedAt: string;
  config: MenubarConfig;
}
