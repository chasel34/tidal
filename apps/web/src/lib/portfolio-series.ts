import {
  buildDailySeries as buildCoreDailySeries,
  buildIntradaySeries as buildCoreIntradaySeries,
  type SeriesPoint,
} from "@tidal/core";

import type { HoldingItem, Period } from "./types";

export type { SeriesPoint };

type QuoteMap = Record<string, { price: number }>;

export function buildDailySeries(
  holdings: HoldingItem[],
  cash: number,
  closesMap: Map<string, Map<string, number>>,
  period: Exclude<Period, "1D">,
  quotes: QuoteMap = {}
): SeriesPoint {
  return buildCoreDailySeries({ holdings, cash, closesMap, period, quotes });
}

export function buildIntradaySeries(
  holdings: HoldingItem[],
  cash: number,
  minuteMap: Map<string, Map<string, number>>,
  quotes: QuoteMap
): SeriesPoint {
  return buildCoreIntradaySeries({ holdings, cash, minuteMap, quotes });
}
