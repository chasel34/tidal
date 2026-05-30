"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { apiFundNav, apiKline, apiMinute } from "@/lib/api-client";
import { PERIODS } from "@/lib/constants";
import { hasKlineMarket } from "@/lib/client-util";
import type { HoldingItem, Period } from "@/lib/types";

export interface SeriesResult {
  series: number[];
  labels: string[];
  loading: boolean;
}

const EMPTY: SeriesResult = { series: [], labels: [], loading: false };

/** Aggregate the portfolio value time-series for the given period.
 *  Daily periods sum shares × close (+ cash); 1D uses intraday minute data. */
export function usePortfolioSeries(period: Period): SeriesResult {
  const holdings = useStore((state) => state.holdings);
  const cash = useStore((state) => state.cash);
  const quotes = useStore((state) => state.quotes);
  const hydrated = useStore((state) => state.hydrated);
  const [result, setResult] = useState<SeriesResult>(EMPTY);

  // signature so we only refetch when relevant inputs change. Quote prices are
  // included because non-kline holdings (funds/hk/us) derive their whole series
  // from the live quote, which arrives after the first poll. apiKline is cached
  // so recomputing on a quote tick is cheap.
  const sig =
    period +
    "|" +
    cash +
    "|" +
    holdings
      .map(
        (h) =>
          `${h.instrument.code}:${h.shares}:${quotes[h.instrument.code]?.price ?? ""}`
      )
      .sort()
      .join(",");

  useEffect(() => {
    if (!hydrated) return;
    if (!holdings.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(EMPTY);
      return;
    }
    const snapshotHoldings = holdings;
    const snapshotCash = cash;
    const snapshotQuotes = quotes;
    let cancelled = false;
    setResult((r) => ({ ...r, loading: true }));

    const run = async () => {
      try {
        const res =
          period === "1D"
            ? await buildIntraday(snapshotHoldings, snapshotCash, snapshotQuotes)
            : await buildDaily(snapshotHoldings, snapshotCash, snapshotQuotes, period);
        if (!cancelled) setResult({ ...res, loading: false });
      } catch {
        if (!cancelled) setResult({ ...EMPTY, loading: false });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, sig]);

  return result;
}

type QuoteMap = Record<string, { price: number }>;

async function buildDaily(
  holdings: HoldingItem[],
  cash: number,
  quotes: QuoteMap,
  period: Exclude<Period, "1D">
): Promise<{ series: number[]; labels: string[] }> {
  const take = PERIODS[period];
  const perHolding = await Promise.all(
    holdings.map(async (h) => {
      if (hasKlineMarket(h.instrument.market)) {
        const pts = await apiKline(h.instrument.code).catch(() => []);
        const map = new Map<string, number>();
        pts.forEach((p) => map.set(p.date, p.close));
        return { h, map: map.size ? map : null };
      }
      if (h.instrument.market?.toLowerCase() === "jj") {
        const pts = await apiFundNav(h.instrument.code).catch(() => []);
        const map = new Map<string, number>();
        pts.forEach((p) => map.set(p.date, p.nav));
        return { h, map: map.size ? map : null };
      }
      return { h, map: null };
    })
  );

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
      const price = closeAtOrBefore(map, allDates, d, quotes[h.instrument.code]?.price ?? 0);
      total += h.shares * price;
    }
    return total;
  });
  const labels = dates.map((d) => d.slice(5));
  return { series, labels };
}

function closeAtOrBefore(
  map: Map<string, number> | null,
  allDates: string[],
  date: string,
  fallback: number
): number {
  if (!map) return fallback; // funds / hk / us: flat current price
  if (map.has(date)) return map.get(date)!;
  // carry forward last known close on or before `date`
  let last = 0;
  for (const d of allDates) {
    if (d > date) break;
    if (map.has(d)) last = map.get(d)!;
  }
  return last || fallback;
}

async function buildIntraday(
  holdings: HoldingItem[],
  cash: number,
  quotes: QuoteMap
): Promise<{ series: number[]; labels: string[] }> {
  const perHolding = await Promise.all(
    holdings.map(async (h) => {
      if (!hasKlineMarket(h.instrument.market))
        return { h, map: null as Map<string, number> | null };
      const pts = await apiMinute(h.instrument.code).catch(() => []);
      const map = new Map<string, number>();
      pts.forEach((p) => map.set(p.time, p.close));
      return { h, map };
    })
  );

  const timeSet = new Set<string>();
  perHolding.forEach(({ map }) => {
    if (map) for (const t of map.keys()) timeSet.add(t);
  });
  const times = [...timeSet].sort();

  if (!times.length) {
    const hasHoldings = holdings.some(
      (h) => quotes[h.instrument.code]?.price != null
    );
    if (!hasHoldings) return { series: [], labels: [] };
    let total = cash;
    for (const h of holdings) {
      total += h.shares * (quotes[h.instrument.code]?.price ?? 0);
    }
    return { series: [total, total], labels: ["开盘", "当前"] };
  }

  // carry-forward each holding's last known close by timestamp
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
