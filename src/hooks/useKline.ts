"use client";

import { useEffect, useState } from "react";
import { apiKline } from "@/lib/api-client";
import { hasKlineMarket } from "@/lib/client-util";
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
  const [all, setAll] = useState<{ candles: Candle[]; labels: string[] }>({
    candles: [],
    labels: [],
  });
  const [loading, setLoading] = useState(false);
  const available = !!market && hasKlineMarket(market);

  useEffect(() => {
    if (!code || !available) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAll({ candles: [], labels: [] });
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiKline(code)
      .then((pts) => {
        if (cancelled) return;
        setAll({
          candles: pts.map((p) => ({
            open: p.open,
            close: p.close,
            high: p.high,
            low: p.low,
          })),
          labels: pts.map((p) => p.date.slice(5)),
        });
      })
      .catch(() => {
        if (!cancelled) setAll({ candles: [], labels: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code, available]);

  return {
    candles: all.candles.slice(-take),
    labels: all.labels.slice(-take),
    loading,
    available,
  };
}
