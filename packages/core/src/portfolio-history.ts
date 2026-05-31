import type { FundNavPoint, HoldingItem, KlinePoint, MinutePoint, Period, Quote } from "./types.ts";

export interface SeriesPoint {
  series: number[];
  labels: string[];
}

export type QuotePriceMap = Record<string, Pick<Quote, "price">>;

export interface BuildDailySeriesInput {
  holdings: HoldingItem[];
  cash: number;
  closesMap: Map<string, Map<string, number>>;
  period: Exclude<Period, "1D">;
  quotes?: QuotePriceMap;
}

export interface BuildIntradaySeriesInput {
  holdings: HoldingItem[];
  cash: number;
  minuteMap: Map<string, Map<string, number>>;
  quotes: QuotePriceMap;
}

export interface PortfolioHistoryInput {
  holdings: HoldingItem[];
  cash: number;
  period: Period;
  quotes: QuotePriceMap;
}

export interface PortfolioHistoryPort {
  getKline(code: string): Promise<KlinePoint[]>;
  getMinute(code: string): Promise<MinutePoint[]>;
  getFundNav(code: string): Promise<FundNavPoint[]>;
}

export interface PortfolioHistoryOptions {
  port: PortfolioHistoryPort;
  hasKlineMarket?: (market: string) => boolean;
}

export interface PortfolioHistory {
  buildSeries(input: PortfolioHistoryInput): Promise<SeriesPoint>;
}

export const PERIOD_LENGTHS: Record<Exclude<Period, "1D">, number> = {
  "1W": 5,
  "1M": 22,
  "3M": 66,
  "1Y": 250,
};

export function createPortfolioHistory(options: PortfolioHistoryOptions): PortfolioHistory {
  const hasKlineMarket = options.hasKlineMarket ?? defaultHasKlineMarket;

  return {
    async buildSeries({ holdings, cash, period, quotes }) {
      if (!holdings.length) return { series: [], labels: [] };

      if (period === "1D") {
        const minuteMap = await fetchMinuteMap(holdings, options.port, hasKlineMarket);
        return buildIntradaySeries({ holdings, cash, minuteMap, quotes });
      }

      const closesMap = await fetchClosesMap(holdings, options.port, hasKlineMarket);
      return buildDailySeries({ holdings, cash, closesMap, period, quotes });
    },
  };
}

export function buildDailySeries(input: BuildDailySeriesInput): SeriesPoint {
  const { holdings, cash, closesMap, period, quotes = {} } = input;
  const take = PERIOD_LENGTHS[period];
  const perHolding = holdings.map((holding) => ({
    holding,
    map: closesMap.get(holding.instrument.code) ?? null,
  }));

  const dateSet = new Set<string>();
  perHolding.forEach(({ map }) => {
    if (map) for (const date of map.keys()) dateSet.add(date);
  });
  const allDates = [...dateSet].sort();
  if (!allDates.length) return { series: [], labels: [] };
  const dates = allDates.slice(-take);

  return {
    series: dates.map((date) => {
      let total = cash;
      for (const { holding, map } of perHolding) {
        const price = closeAtOrBefore(
          map,
          allDates,
          date,
          quotes[holding.instrument.code]?.price ?? 0
        );
        total += holding.shares * price;
      }
      return total;
    }),
    labels: dates.map((date) => date.slice(5)),
  };
}

export function buildIntradaySeries(input: BuildIntradaySeriesInput): SeriesPoint {
  const { holdings, cash, minuteMap, quotes } = input;
  const perHolding = holdings.map((holding) => ({
    holding,
    map: minuteMap.get(holding.instrument.code) ?? null,
  }));

  const timeSet = new Set<string>();
  perHolding.forEach(({ map }) => {
    if (map) for (const time of map.keys()) timeSet.add(time);
  });
  const times = [...timeSet].sort();

  if (!times.length) {
    const hasQuotes = holdings.some((holding) => quotes[holding.instrument.code]?.price != null);
    if (!hasQuotes) return { series: [], labels: [] };
    const total = holdings.reduce(
      (sum, holding) => sum + holding.shares * (quotes[holding.instrument.code]?.price ?? 0),
      cash
    );
    return { series: [total, total], labels: ["开盘", "当前"] };
  }

  return {
    series: times.map((time) => {
      let total = cash;
      for (const { holding, map } of perHolding) {
        const price = closeAtOrBefore(
          map,
          times,
          time,
          quotes[holding.instrument.code]?.price ?? 0
        );
        total += holding.shares * price;
      }
      return total;
    }),
    labels: times,
  };
}

async function fetchMinuteMap(
  holdings: HoldingItem[],
  port: PortfolioHistoryPort,
  hasKlineMarket: (market: string) => boolean
): Promise<Map<string, Map<string, number>>> {
  const minuteMap = new Map<string, Map<string, number>>();
  await Promise.all(
    holdings.map(async (holding) => {
      if (!hasKlineMarket(holding.instrument.market)) return;
      const points = await port.getMinute(holding.instrument.code).catch(() => []);
      if (!points.length) return;
      minuteMap.set(
        holding.instrument.code,
        new Map(points.map((point) => [point.time, point.close]))
      );
    })
  );
  return minuteMap;
}

async function fetchClosesMap(
  holdings: HoldingItem[],
  port: PortfolioHistoryPort,
  hasKlineMarket: (market: string) => boolean
): Promise<Map<string, Map<string, number>>> {
  const closesMap = new Map<string, Map<string, number>>();
  await Promise.all(
    holdings.map(async (holding) => {
      if (hasKlineMarket(holding.instrument.market)) {
        const points = await port.getKline(holding.instrument.code).catch(() => []);
        if (!points.length) return;
        closesMap.set(
          holding.instrument.code,
          new Map(points.map((point) => [point.date, point.close]))
        );
        return;
      }
      if (holding.instrument.market?.toLowerCase() === "jj") {
        const points = await port.getFundNav(holding.instrument.code).catch(() => []);
        if (!points.length) return;
        closesMap.set(
          holding.instrument.code,
          new Map(points.map((point) => [point.date, point.nav]))
        );
      }
    })
  );
  return closesMap;
}

function closeAtOrBefore(
  map: Map<string, number> | null,
  allKeys: string[],
  key: string,
  fallback: number
): number {
  if (!map) return fallback;
  if (map.has(key)) return map.get(key)!;
  let last = 0;
  for (const candidate of allKeys) {
    if (candidate > key) break;
    if (map.has(candidate)) last = map.get(candidate)!;
  }
  return last || fallback;
}

function defaultHasKlineMarket(market: string): boolean {
  const normalized = market?.toLowerCase();
  return normalized === "sh" || normalized === "sz" || normalized === "bj";
}
