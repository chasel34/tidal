import type { Instrument } from "./types";

/** Client-safe check (no SDK import) for whether OHLC k-line is available. */
export function hasKlineMarket(market: string): boolean {
  const m = market?.toLowerCase();
  return m === "sh" || m === "sz" || m === "bj";
}

export function hasKline(inst: Pick<Instrument, "market">): boolean {
  return hasKlineMarket(inst.market);
}

/** 场外基金 (open-ended funds, market "jj") get the estimate detail panel. */
export function isOffMarketFund(inst: Pick<Instrument, "market" | "category">): boolean {
  return inst.category === "fund" && inst.market?.toLowerCase() === "jj";
}

/** Next trading day after `from` as "MM-DD" (skips weekends only — holidays
 *  are not excluded; used for the approximate T+1 确认 label). */
export function nextTradingDay(from: Date = new Date()): string {
  const d = new Date(from);
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return (
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
