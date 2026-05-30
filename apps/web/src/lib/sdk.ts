import { StockSDK } from "stock-sdk";
import type { Category, Instrument } from "./types";

let _sdk: StockSDK | null = null;

/** Shared, server-only SDK instance (reused across requests). */
export function getSdk(): StockSDK {
  if (!_sdk) {
    _sdk = new StockSDK({
      timeout: 12000,
      retry: { maxRetries: 3, baseDelay: 600 },
      rateLimit: { requestsPerSecond: 8, maxBurst: 16 },
    });
  }
  return _sdk;
}

export type QuoteSource = "ashare" | "fund" | "hk" | "us";

/** Decide which upstream API a code belongs to, based on market + category. */
export function quoteSource(inst: {
  code: string;
  market: string;
  category: Category;
  type: string;
}): QuoteSource {
  const m = inst.market?.toLowerCase();
  if (m === "hk") return "hk";
  if (m === "us") return "us";
  // 场外基金 (open-ended funds) carry market "jj"; 场内 ETF/LOF use sh/sz.
  if (m === "jj") return "fund";
  if (inst.category === "fund" && (m !== "sh" && m !== "sz" && m !== "bj")) {
    return "fund";
  }
  return "ashare"; // stock / index / 场内ETF on sh/sz/bj
}

/** Strip the leading market prefix used by the search API. */
export function bareCode(code: string): string {
  return code.replace(/^(sh|sz|bj|hk|us|jj)/i, "");
}

/** Whether OHLC k-line is available for this instrument (A-share style only). */
export function hasKline(inst: Pick<Instrument, "market">): boolean {
  const m = inst.market?.toLowerCase();
  return m === "sh" || m === "sz" || m === "bj";
}
