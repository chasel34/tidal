"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/store/useStore";
import { hasKlineMarket } from "@/lib/client-util";
import { klineOptions, minuteOptions, fundNavOptions } from "@/lib/query-options";
import { buildDailySeries, buildIntradaySeries } from "@/lib/portfolio-series";
import type { HoldingItem, Period } from "@/lib/types";

export interface SeriesResult {
  series: number[];
  labels: string[];
  loading: boolean;
}

const EMPTY: SeriesResult = { series: [], labels: [], loading: false };

type QC = ReturnType<typeof useQueryClient>;

/** Fetch kline/fundNav closes for each holding, returning code → (date → close). */
async function fetchClosesMap(
  holdings: HoldingItem[],
  queryClient: QC
): Promise<Map<string, Map<string, number>>> {
  const closesMap = new Map<string, Map<string, number>>();
  await Promise.all(
    holdings.map(async (h) => {
      if (hasKlineMarket(h.instrument.market)) {
        const pts = await queryClient
          .fetchQuery(klineOptions(h.instrument.code))
          .catch(() => []);
        const map = new Map<string, number>();
        pts.forEach((p) => map.set(p.date, p.close));
        if (map.size) closesMap.set(h.instrument.code, map);
      } else if (h.instrument.market?.toLowerCase() === "jj") {
        const pts = await queryClient
          .fetchQuery(fundNavOptions(h.instrument.code))
          .catch(() => []);
        const map = new Map<string, number>();
        pts.forEach((p) => map.set(p.date, p.nav));
        if (map.size) closesMap.set(h.instrument.code, map);
      }
    })
  );
  return closesMap;
}

/** Fetch minute data for each holding, returning code → (time → close). */
async function fetchMinuteMap(
  holdings: HoldingItem[],
  queryClient: QC
): Promise<Map<string, Map<string, number>>> {
  const minuteMap = new Map<string, Map<string, number>>();
  await Promise.all(
    holdings.map(async (h) => {
      if (!hasKlineMarket(h.instrument.market)) return;
      const pts = await queryClient
        .fetchQuery(minuteOptions(h.instrument.code))
        .catch(() => []);
      const map = new Map<string, number>();
      pts.forEach((p) => map.set(p.time, p.close));
      if (map.size) minuteMap.set(h.instrument.code, map);
    })
  );
  return minuteMap;
}

/** Aggregate the portfolio value time-series for the given period.
 *  Daily periods sum shares × close (+ cash); 1D uses intraday minute data. */
export function usePortfolioSeries(period: Period): SeriesResult {
  const holdings = useStore((state) => state.holdings);
  const cash = useStore((state) => state.cash);
  const quotes = useStore((state) => state.quotes);
  const hydrated = useStore((state) => state.hydrated);
  const queryClient = useQueryClient();

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

  const { data, isLoading } = useQuery({
    queryKey: ["portfolioSeries", sig] as const,
    queryFn: async () => {
      const snapshotQuotes = quotes;
      if (period === "1D") {
        const minuteMap = await fetchMinuteMap(holdings, queryClient);
        return buildIntradaySeries(holdings, cash, minuteMap, snapshotQuotes);
      }
      const closesMap = await fetchClosesMap(holdings, queryClient);
      return buildDailySeries(holdings, cash, closesMap, period, snapshotQuotes);
    },
    enabled: hydrated && holdings.length > 0,
    staleTime: 60_000,
  });

  if (!hydrated || !holdings.length) return EMPTY;

  return {
    series: data?.series ?? [],
    labels: data?.labels ?? [],
    loading: isLoading,
  };
}
