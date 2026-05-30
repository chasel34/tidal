import { StockSDK } from "stock-sdk";
import type { Category, Instrument } from "@shared/types";

let sdk: StockSDK | null = null;

export function getSdk(): StockSDK {
  if (!sdk) {
    sdk = new StockSDK({
      timeout: 12000,
      retry: { maxRetries: 3, baseDelay: 600 },
      rateLimit: { requestsPerSecond: 8, maxBurst: 16 },
    });
  }
  return sdk;
}

export type QuoteSource = "ashare" | "fund" | "hk" | "us";

export function quoteSource(inst: {
  code: string;
  market: string;
  category: Category;
  type: string;
}): QuoteSource {
  const market = inst.market?.toLowerCase();
  if (market === "hk") return "hk";
  if (market === "us") return "us";
  if (market === "jj") return "fund";
  if (inst.category === "fund" && market !== "sh" && market !== "sz" && market !== "bj") {
    return "fund";
  }
  return "ashare";
}

export function bareCode(code: string): string {
  return code.replace(/^(sh|sz|bj|hk|us|jj)/i, "");
}

export function hasKlineMarket(market: string): boolean {
  const m = market?.toLowerCase();
  return m === "sh" || m === "sz" || m === "bj";
}

export function hasKline(inst: Pick<Instrument, "market">): boolean {
  return hasKlineMarket(inst.market);
}
