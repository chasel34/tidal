"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortfolioHistory, type PortfolioHistoryPort } from "@tidal/core";
import { useStore } from "@/store/useStore";
import { hasKlineMarket } from "@/lib/client-util";
import { klineOptions, minuteOptions, fundNavOptions } from "@/lib/query-options";
import type { Period } from "@/lib/types";

export interface SeriesResult {
  series: number[];
  labels: string[];
  loading: boolean;
}

const EMPTY: SeriesResult = { series: [], labels: [], loading: false };

type QC = ReturnType<typeof useQueryClient>;

function historyPort(queryClient: QC): PortfolioHistoryPort {
  return {
    getKline: (code) => queryClient.fetchQuery(klineOptions(code)),
    getMinute: (code) => queryClient.fetchQuery(minuteOptions(code)),
    getFundNav: (code) => queryClient.fetchQuery(fundNavOptions(code)),
  };
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
      const history = createPortfolioHistory({
        port: historyPort(queryClient),
        hasKlineMarket,
      });
      return history.buildSeries({ holdings, cash, period, quotes });
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
