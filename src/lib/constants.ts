import type { Instrument, Period } from "./types";

export const INDICES: Instrument[] = [
  { code: "sh000001", name: "上证指数", market: "sh", category: "index", type: "ZS" },
  { code: "sz399001", name: "深证成指", market: "sz", category: "index", type: "ZS" },
  { code: "sz399006", name: "创业板指", market: "sz", category: "index", type: "ZS" },
  { code: "sh000300", name: "沪深300", market: "sh", category: "index", type: "ZS" },
];

export const PERIODS: Record<Exclude<Period, "1D">, number> = {
  "1W": 5,
  "1M": 22,
  "3M": 66,
  "1Y": 250,
};

export const QUOTE_POLL_MS = 15000;
