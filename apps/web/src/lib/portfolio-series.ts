import type { HoldingItem, Period } from "./types";
import { PERIODS } from "./constants";

export interface SeriesPoint {
  series: number[];
  labels: string[];
}

type QuoteMap = Record<string, { price: number }>;

/** Look up the close price at or before `date` in a sorted date list.
 *  Falls back to `fallback` when no earlier data exists. */
function closeAtOrBefore(
  map: Map<string, number> | null,
  allDates: string[],
  date: string,
  fallback: number
): number {
  if (!map) return fallback;
  if (map.has(date)) return map.get(date)!;
  let last = 0;
  for (const d of allDates) {
    if (d > date) break;
    if (map.has(d)) last = map.get(d)!;
  }
  return last || fallback;
}

/** Build a daily portfolio value time-series.
 *
 *  @param holdings   Current 持仓 list
 *  @param cash       Cash position
 *  @param closesMap  Pre-fetched closes: code → (date → close price)
 *  @param period     Time range (1W / 1M / 3M / 1Y)
 *  @param quotes     Optional fallback quotes for holdings without closes data
 */
export function buildDailySeries(
  holdings: HoldingItem[],
  cash: number,
  closesMap: Map<string, Map<string, number>>,
  period: Exclude<Period, "1D">,
  quotes: QuoteMap = {}
): SeriesPoint {
  const take = PERIODS[period];

  const perHolding = holdings.map((h) => {
    const map = closesMap.get(h.instrument.code) ?? null;
    return { h, map };
  });

  const dateSet = new Set<string>();
  perHolding.forEach(({ map }) => {
    if (map) for (const d of map.keys()) dateSet.add(d);
  });
  const allDates = [...dateSet].sort();
  if (!allDates.length) return { series: [], labels: [] };

  const dates = allDates.slice(-take);

  const series = dates.map((d) => {
    let total = cash;
    for (const { h, map } of perHolding) {
      const price = closeAtOrBefore(
        map,
        allDates,
        d,
        quotes[h.instrument.code]?.price ?? 0
      );
      total += h.shares * price;
    }
    return total;
  });
  const labels = dates.map((d) => d.slice(5));
  return { series, labels };
}

/** Build an intraday portfolio value time-series from minute data.
 *
 *  @param holdings   Current 持仓 list
 *  @param cash       Cash position
 *  @param minuteMap  Pre-fetched minute data: code → (time → close price)
 *  @param quotes     Fallback quotes for holdings without minute data
 */
export function buildIntradaySeries(
  holdings: HoldingItem[],
  cash: number,
  minuteMap: Map<string, Map<string, number>>,
  quotes: QuoteMap
): SeriesPoint {
  const perHolding = holdings.map((h) => {
    const map = minuteMap.get(h.instrument.code) ?? null;
    return { h, map };
  });

  const timeSet = new Set<string>();
  perHolding.forEach(({ map }) => {
    if (map) for (const t of map.keys()) timeSet.add(t);
  });
  const times = [...timeSet].sort();

  if (!times.length) {
    const hasQuotes = holdings.some(
      (h) => quotes[h.instrument.code]?.price != null
    );
    if (!hasQuotes) return { series: [], labels: [] };
    let total = cash;
    for (const h of holdings) {
      total += h.shares * (quotes[h.instrument.code]?.price ?? 0);
    }
    return { series: [total, total], labels: ["开盘", "当前"] };
  }

  const series = times.map((t) => {
    let total = cash;
    for (const { h, map } of perHolding) {
      const price = closeAtOrBefore(
        map,
        times,
        t,
        quotes[h.instrument.code]?.price ?? 0
      );
      total += h.shares * price;
    }
    return total;
  });
  return { series, labels: times };
}
