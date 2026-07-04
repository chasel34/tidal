import { StockSDK } from "stock-sdk";

// Market classification (quoteSource / hasKlineMarket / bareCode) lives in
// @tidal/core; this module only owns the main-process SDK instance.
export { bareCode, hasKlineMarket } from "@tidal/core";

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
