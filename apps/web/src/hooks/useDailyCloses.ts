"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { hasKlineMarket } from "@/lib/client-util";
import { klineOptions } from "@/lib/query-options";
import type { Instrument } from "@/lib/types";

/** Fetch trailing daily closes (last `n`) for a set of instruments, for sparklines. */
export function useDailyCloses(
  instruments: Instrument[],
  n = 30
): Record<string, number[]> {
  const queryClient = useQueryClient();
  const sig = useMemo(
    () => instruments.map((i) => i.code).sort().join(","),
    [instruments]
  );
  const targets = useMemo(
    () => instruments.filter((i) => hasKlineMarket(i.market)),
    [instruments]
  );

  const { data } = useQuery({
    queryKey: ["dailyCloses", sig, n] as const,
    queryFn: async () => {
      const entries = await Promise.all(
        targets.map(async (i) => {
          const pts = await queryClient
            .fetchQuery(klineOptions(i.code))
            .catch(() => []);
          return [i.code, pts.slice(-n).map((p) => p.close)] as const;
        })
      );
      const map: Record<string, number[]> = {};
      for (const [code, closes] of entries) {
        if (closes.length) map[code] = closes;
      }
      return map;
    },
    enabled: targets.length > 0,
    staleTime: 5 * 60_000,
  });

  return data ?? {};
}
