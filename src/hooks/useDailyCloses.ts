"use client";

import { useEffect, useState } from "react";
import { apiKline } from "@/lib/api-client";
import { hasKlineMarket } from "@/lib/client-util";
import type { Instrument } from "@/lib/types";

/** Fetch trailing daily closes (last `n`) for a set of instruments, for sparklines. */
export function useDailyCloses(
  instruments: Instrument[],
  n = 30
): Record<string, number[]> {
  const [map, setMap] = useState<Record<string, number[]>>({});
  const sig = instruments.map((i) => i.code).sort().join(",");

  useEffect(() => {
    let cancelled = false;
    const targets = instruments.filter((i) => hasKlineMarket(i.market));
    Promise.all(
      targets.map(async (i) => {
        const pts = await apiKline(i.code).catch(() => []);
        return [i.code, pts.slice(-n).map((p) => p.close)] as const;
      })
    ).then((entries) => {
      if (cancelled) return;
      setMap((prev) => {
        const next = { ...prev };
        for (const [code, closes] of entries) if (closes.length) next[code] = closes;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, n]);

  return map;
}
