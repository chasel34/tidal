export type Theme = "light" | "dark";

export type TabId = "today" | "holdings" | "watch";

export type Period = "1D" | "1W" | "1M" | "3M" | "1Y";

export type DetailPeriod = "1M" | "3M" | "1Y";

export type Category =
  | "stock"
  | "index"
  | "fund"
  | "bond"
  | "futures"
  | "option"
  | "other";

/** Identity of an instrument, persisted locally so the UI can render before
 *  live quotes arrive. */
export interface Instrument {
  code: string; // full code, e.g. sh600519 (A股/指数/场内) or 005827 (场外基金)
  name: string;
  market: string; // sh / sz / bj / hk / us / of
  category: Category;
  type: string; // raw upstream type string, e.g. GP-A / ZS / ETF / KJ
}

export type SearchResultDTO = Instrument;

/** Normalized live quote (works for both stock-style and fund-style sources).
 *  For 场外基金 (open-ended funds) `price`/`prevClose`/`changePercent` carry the
 *  *effective* values: the intraday estimate while the day is unsettled, or the
 *  settled NAV once published. The extra fund fields below expose the raw pieces
 *  so the detail panel can render both the estimate and the confirmed NAV. */
export interface Quote {
  code: string;
  name: string;
  price: number;
  prevClose: number;
  change: number;
  changePercent: number;
  navDate?: string; // funds only — date of the latest settled unit NAV
  // ----- 场外基金 only -----
  nav?: number; // latest settled unit NAV
  accNav?: number; // 累计净值
  estimatedNav?: number; // 盘中估算净值
  estimatedChangePercent?: number; // 估算涨幅 %
  estimateTime?: string; // 估值时间, e.g. "2026-05-29 11:30"
  estimated?: boolean; // true when price reflects the intraday estimate
  baseNav?: number; // NAV the estimate is measured against (settled T-1 nav)
}

/** One asset-allocation slice (股/债/现/其他) for a fund. */
export interface FundAllocSegment {
  label: string;
  pct: number;
}

/** One top-holding stock of a fund (天天基金 only exposes codes, no weights). */
export interface FundTopHolding {
  code: string; // full code, e.g. sh600519
  name: string;
  todayPct: number; // today's change % of the stock
}

/** Fund manager summary from 天天基金 pingzhongdata. */
export interface FundManagerInfo {
  name: string;
  star: number; // 0-5
  workTime: string; // e.g. "8年又282天"
  fundSize: string; // e.g. "533.63亿(24只基金)"
}

/** One point on a fund's NAV trend. */
export interface FundNavPoint {
  date: string; // "YYYY-MM-DD"
  nav: number;
}

/** Static-ish profile for a 场外基金 detail panel. */
export interface FundProfile {
  code: string;
  name: string;
  fullType?: string;
  accNav?: number;
  navDate?: string;
  fundSize?: number; // 基金规模 (亿)
  assetAlloc: FundAllocSegment[];
  topHoldings: FundTopHolding[];
  manager?: FundManagerInfo;
  navHistory: FundNavPoint[]; // ascending by date
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
  time: string; // "HH:mm"
  close: number;
}

/** Persisted holding: identity + position. */
export interface HoldingItem {
  instrument: Instrument;
  shares: number;
  cost: number;
}

/** Persisted watch entry: just identity. */
export type WatchItem = Instrument;

export interface SortState<K extends string = string> {
  key: K;
  dir: "asc" | "desc";
}

export type HoldingSortKey = "today" | "gain" | "weight" | "value" | "name";
export type WatchSortKey = "today" | "price" | "name";

/** Holding enriched with live quote + computed aggregates. */
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

export interface AllocationSegment {
  label: string;
  value: number;
}

export interface IndexQuote {
  name: string;
  code: string;
  value: number;
  pct: number;
}
