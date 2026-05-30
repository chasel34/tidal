"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { hasKlineMarket } from "@/lib/client-util";
import { klineOptions } from "@/lib/query-options";
import type { Candle } from "@/components/shared/charts/CandleChart";

export interface KlineView {
  candles: Candle[];
  labels: string[];
  loading: boolean;
  available: boolean;
}

/** Load OHLC candles for a code, trimmed to the last `take` points. */
export function useKline(
  code: string | null,
  market: string | null,
  take: number
): KlineView {
  const available = !!market && hasKlineMarket(market);
  const enabled = !!code && available;

  const { data, isLoading } = useQuery({
    ...klineOptions(code ?? ""),
    enabled,
  });

  return useMemo(() => {
    if (!enabled || !data?.length) {
      return { candles: [], labels: [], loading: enabled && isLoading, available };
    }
    const pts = data.slice(-take);
    return {
      candles: pts.map((p) => ({
        open: p.open,
        close: p.close,
        high: p.high,
        low: p.low,
      })),
      labels: pts.map((p) => p.date.slice(5)),
      loading: false,
      available,
    };
  }, [enabled, data, take, isLoading, available]);
}
