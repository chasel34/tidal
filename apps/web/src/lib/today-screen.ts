import type { Instrument } from "@/lib/types";

type WithPct = Instrument & { todayPct: number };

/**
 * Build the merged "mini instruments" list for the Today screen's sparkline
 * section. Takes the first `topN` holdings (in caller-provided order) and the
 * top `topN` watch entries sorted by todayPct descending, then deduplicates
 * by code. When a code appears in both lists the watch entry wins (overrides
 * the holding), but the Map insertion position is preserved.
 */
export function buildMiniInstruments<T extends WithPct>(
  sortedHoldings: T[],
  watchList: T[],
  topN = 5,
): T[] {
  const codes = new Map<string, T>();
  sortedHoldings.slice(0, topN).forEach((h) => codes.set(h.code, h));
  [...watchList]
    .sort((a, b) => b.todayPct - a.todayPct)
    .slice(0, topN)
    .forEach((w) => codes.set(w.code, w));
  return [...codes.values()];
}
