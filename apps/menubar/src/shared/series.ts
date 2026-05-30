import { PERIODS } from "./constants";
import type { HoldingItem, Period, Quote } from "./types";

export interface SeriesPoint {
  series: number[];
  labels: string[];
}

type QuoteMap = Record<string, Pick<Quote, "price">>;

function closeAtOrBefore(
  map: Map<string, number> | null,
  allKeys: string[],
  key: string,
  fallback: number,
): number {
  if (!map) return fallback;
  if (map.has(key)) return map.get(key)!;
  let last = 0;
  for (const k of allKeys) {
    if (k > key) break;
    if (map.has(k)) last = map.get(k)!;
  }
  return last || fallback;
}

export function buildDailySeries(
  holdings: HoldingItem[],
  cash: number,
  closesMap: Map<string, Map<string, number>>,
  period: Exclude<Period, "1D">,
  quotes: QuoteMap = {},
): SeriesPoint {
  const take = PERIODS[period];
  const perHolding = holdings.map((h) => ({
    h,
    map: closesMap.get(h.instrument.code) ?? null,
  }));
  const dateSet = new Set<string>();
  perHolding.forEach(({ map }) => {
    if (map) for (const d of map.keys()) dateSet.add(d);
  });
  const allDates = [...dateSet].sort();
  if (!allDates.length) return { series: [], labels: [] };
  const dates = allDates.slice(-take);
  return {
    series: dates.map((d) => {
      let total = cash;
      for (const { h, map } of perHolding) {
        total +=
          h.shares *
          closeAtOrBefore(map, allDates, d, quotes[h.instrument.code]?.price ?? 0);
      }
      return total;
    }),
    labels: dates.map((d) => d.slice(5)),
  };
}

export function buildIntradaySeries(
  holdings: HoldingItem[],
  cash: number,
  minuteMap: Map<string, Map<string, number>>,
  quotes: QuoteMap,
): SeriesPoint {
  const perHolding = holdings.map((h) => ({
    h,
    map: minuteMap.get(h.instrument.code) ?? null,
  }));
  const timeSet = new Set<string>();
  perHolding.forEach(({ map }) => {
    if (map) for (const t of map.keys()) timeSet.add(t);
  });
  const times = [...timeSet].sort();
  if (!times.length) {
    const hasQuotes = holdings.some((h) => quotes[h.instrument.code]?.price != null);
    if (!hasQuotes) return { series: [], labels: [] };
    const total = holdings.reduce(
      (sum, h) => sum + h.shares * (quotes[h.instrument.code]?.price ?? 0),
      cash,
    );
    return { series: [total, total], labels: ["开盘", "当前"] };
  }
  return {
    series: times.map((t) => {
      let total = cash;
      for (const { h, map } of perHolding) {
        total +=
          h.shares *
          closeAtOrBefore(map, times, t, quotes[h.instrument.code]?.price ?? 0);
      }
      return total;
    }),
    labels: times,
  };
}
