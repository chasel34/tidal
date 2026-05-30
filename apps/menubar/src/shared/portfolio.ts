import type {
  HoldingFull,
  HoldingItem,
  PortfolioSummary,
  Quote,
  WatchFull,
  WatchItem,
  Instrument,
} from "./types";

export interface PortfolioDerivation {
  holdingsFull: HoldingFull[];
  watchFull: WatchFull[];
  summary: PortfolioSummary;
}

export const typeLabel = (inst: Instrument): string => {
  if (inst.category === "index") return "指数";
  if (inst.category === "fund") return inst.type === "ETF" || inst.type === "LOF" ? "ETF" : "基金";
  if (inst.category === "stock") return "股票";
  return inst.type || "其他";
};

export const unitLabel = (inst: Instrument): string =>
  inst.category === "stock" ? "股" : "份";

export function derivePortfolio(
  holdings: HoldingItem[],
  watch: WatchItem[],
  cash: number,
  quotes: Record<string, Quote>,
): PortfolioDerivation {
  const holdingsFull = deriveHoldingsFull(holdings, quotes).sort(
    (a, b) => b.marketValue - a.marketValue,
  );
  const watchFull = deriveWatchFull(watch, quotes);
  const summary = deriveSummary(holdingsFull, cash);
  return { holdingsFull, watchFull, summary };
}

function deriveHoldingsFull(
  holdings: HoldingItem[],
  quotes: Record<string, Quote>,
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
  const totalMV = list.reduce((s, h) => s + h.marketValue, 0) || 1;
  return list.map((h) => ({ ...h, weight: (h.marketValue / totalMV) * 100 }));
}

function deriveWatchFull(
  watch: WatchItem[],
  quotes: Record<string, Quote>,
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
  cash: number,
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
