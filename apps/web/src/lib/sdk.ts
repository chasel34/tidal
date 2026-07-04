import { StockSDK } from "stock-sdk";

// Market classification (quoteSource / hasKlineMarket) lives in @tidal/core;
// this module only owns the server-side SDK instance.
export { bareCode } from "@tidal/core";

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
