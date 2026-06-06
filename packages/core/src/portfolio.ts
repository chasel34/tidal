import type {
  AllocationSegment,
  HoldingFull,
  HoldingItem,
  HoldingSortKey,
  Instrument,
  PortfolioSummary,
  Quote,
  SortState,
  WatchFull,
  WatchItem,
  WatchSortKey,
} from "./types.ts";

export interface PortfolioDerivationInput {
  holdings: HoldingItem[];
  watch: WatchItem[];
  cash: number;
  quotes: Record<string, Quote>;
  sortH?: SortState<HoldingSortKey>;
  sortW?: SortState<WatchSortKey>;
}

export interface PortfolioDerivation {
  holdingsFull: HoldingFull[];
  watchFull: WatchFull[];
  summary: PortfolioSummary;
  allocation: AllocationSegment[];
  sortedHoldings: HoldingFull[];
  sortedWatch: WatchFull[];
}

const DEFAULT_HOLDING_SORT: SortState<HoldingSortKey> = { key: "weight", dir: "desc" };
const DEFAULT_WATCH_SORT: SortState<WatchSortKey> = { key: "today", dir: "desc" };

export const typeLabel = (inst: Instrument): string => {
  if (inst.category === "index") return "指数";
  if (inst.category === "fund") return inst.type === "ETF" || inst.type === "LOF" ? "ETF" : "基金";
  if (inst.category === "stock") return "股票";
  return inst.type || "其他";
};

export const unitLabel = (inst: Instrument): string =>
  inst.category === "stock" ? "股" : "份";

export function derivePortfolio(input: PortfolioDerivationInput): PortfolioDerivation {
  const holdingsFull = deriveHoldingsFull(input.holdings, input.quotes);
  const watchFull = deriveWatchFull(input.watch, input.quotes);
  const summary = deriveSummary(holdingsFull, input.cash);
  const allocation = deriveAllocation(holdingsFull, input.cash);
  const sortH = input.sortH ?? DEFAULT_HOLDING_SORT;
  const sortW = input.sortW ?? DEFAULT_WATCH_SORT;

  return {
    holdingsFull,
    watchFull,
    summary,
    allocation,
    sortedHoldings: sortHoldings(holdingsFull, sortH),
    sortedWatch: sortWatch(watchFull, sortW),
  };
}

function deriveHoldingsFull(
  holdings: HoldingItem[],
  quotes: Record<string, Quote>
): HoldingFull[] {
  const list = holdings.map((h) => {
    const q = quotes[h.instrument.code];
    const price = q?.price ?? h.cost;
    const prevClose = q?.prevClose ?? price;
    const todayPct = q?.changePercent ?? 0;
    const todayDelta = q ? price - prevClose : 0;
    const marketValue = h.shares * price;
    const costValue = h.shares * h.cost;
    const gainAbs = marketValue - costValue;
    const gainPct = costValue ? (gainAbs / costValue) * 100 : 0;
    const todayDeltaTotal = h.shares * todayDelta;

    return {
      ...h.instrument,
      shares: h.shares,
      cost: h.cost,
      price,
      prevClose,
      todayPct,
      todayDelta,
      marketValue,
      costValue,
      gainAbs,
      gainPct,
      todayDeltaTotal,
      weight: 0,
    };
  });

  const totalMV = list.reduce((sum, h) => sum + h.marketValue, 0) || 1;
  return list.map((h) => ({
    ...h,
    weight: (h.marketValue / totalMV) * 100,
  }));
}

function deriveWatchFull(
  watch: WatchItem[],
  quotes: Record<string, Quote>
): WatchFull[] {
  return watch.map((w) => {
    const q = quotes[w.code];
    const price = q?.price ?? 0;
    const prevClose = q?.prevClose ?? price;

    return {
      ...w,
      price,
      prevClose,
      todayPct: q?.changePercent ?? 0,
      todayDelta: q ? price - prevClose : 0,
    };
  });
}

function deriveSummary(
  holdingsFull: HoldingFull[],
  cash: number
): PortfolioSummary {
  let marketValue = 0;
  let costValue = 0;
  let todayDelta = 0;

  holdingsFull.forEach((h) => {
    marketValue += h.marketValue;
    costValue += h.costValue;
    todayDelta += h.todayDeltaTotal;
  });

  const totalAssets = marketValue + cash;
  const totalGain = marketValue - costValue;
  const totalGainPct = costValue ? (totalGain / costValue) * 100 : 0;
  const prevMV = marketValue - todayDelta;
  const todayPct = prevMV ? (todayDelta / prevMV) * 100 : 0;

  return {
    marketValue,
    costValue,
    cash,
    totalAssets,
    todayDelta,
    todayPct,
    totalGain,
    totalGainPct,
  };
}

function deriveAllocation(
  holdingsFull: HoldingFull[],
  cash: number
): AllocationSegment[] {
  const byType: Record<string, number> = {};
  holdingsFull.forEach((h) => {
    const label = typeLabel(h);
    byType[label] = (byType[label] || 0) + h.marketValue;
  });

  const segs = Object.entries(byType).map(([label, value]) => ({ label, value }));
  if (cash > 0) segs.push({ label: "现金", value: cash });
  return segs;
}

function sortHoldings(
  holdingsFull: HoldingFull[],
  sortH: SortState<HoldingSortKey>
): HoldingFull[] {
  const arr = [...holdingsFull];
  const { key, dir } = sortH;
  const get = (h: HoldingFull): number | string =>
    ({
      today: h.todayPct,
      gain: h.gainPct,
      weight: h.weight,
      value: h.marketValue,
      name: h.code,
    })[key];

  arr.sort((a, b) => compareValues(get(a), get(b), dir));
  return arr;
}

function sortWatch(
  watchFull: WatchFull[],
  sortW: SortState<WatchSortKey>
): WatchFull[] {
  const arr = [...watchFull];
  const { key, dir } = sortW;
  const get = (w: WatchFull): number | string =>
    ({ today: w.todayPct, price: w.price, name: w.code })[key];

  arr.sort((a, b) => compareValues(get(a), get(b), dir));
  return arr;
}

function compareValues(
  av: number | string,
  bv: number | string,
  dir: "asc" | "desc"
): number {
  if (typeof av === "string" && typeof bv === "string") {
    return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  }

  return dir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
}
