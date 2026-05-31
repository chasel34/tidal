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

export interface HoldingItem {
  instrument: Instrument;
  shares: number;
  cost: number;
}

export type WatchItem = Instrument;

export interface SortState<K extends string = string> {
  key: K;
  dir: "asc" | "desc";
}

export type HoldingSortKey = "today" | "gain" | "weight" | "value" | "name";
export type WatchSortKey = "today" | "price" | "name";

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
