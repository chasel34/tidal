import { describe, expect, it, vi } from "vitest";
import { createQuoteNormalizer, DEFAULT_FUND_ESTIMATE_TTL_MS } from "../quote-normalizer.ts";
import type { QuoteNormalizerPort } from "../quote-normalizer.ts";
import type { Instrument } from "../types.ts";

const ashare: Instrument = {
  code: "sh600519",
  name: "贵州茅台",
  market: "sh",
  category: "stock",
  type: "GP-A",
};

const hk: Instrument = {
  code: "hk00700",
  name: "腾讯控股",
  market: "hk",
  category: "stock",
  type: "HK",
};

const fund: Instrument = {
  code: "jj017811",
  name: "东方人工智能主题混合C",
  market: "jj",
  category: "fund",
  type: "基金",
};

function fakePort(overrides: Partial<QuoteNormalizerPort> = {}): QuoteNormalizerPort {
  return {
    getSimpleQuotes: vi.fn(async () => [
      { code: "600519", name: "贵州茅台", price: 1512, change: 57, changePercent: 3.92 },
    ]),
    getHKQuotes: vi.fn(async () => [
      { code: "00700", name: "腾讯控股", price: 477.5, change: 2.5, changePercent: 0.52 },
    ]),
    getUSQuotes: vi.fn(async () => []),
    getFundQuotes: vi.fn(async () => [
      {
        code: "017811",
        name: "东方人工智能主题混合C",
        nav: 1.1927,
        accNav: 1.1927,
        change: -2.22,
        navDate: "2026-05-30",
      },
    ]),
    getFundEstimate: vi.fn(async () => ({
      code: "017811",
      name: "东方人工智能主题混合C",
      navDate: "2026-05-30",
      nav: 1.1927,
      estimatedNav: 1.204,
      estimatedChangePercent: 0.95,
      estimateTime: "2026-05-31 14:55:00",
    })),
    ...overrides,
  };
}

describe("createQuoteNormalizer", () => {
  it("normalizes mixed quotes and resolves full codes without cache metadata", async () => {
    const normalizer = createQuoteNormalizer({
      port: fakePort(),
      now: () => new Date("2026-05-31T07:00:00.000Z"),
    });

    const quotes = await normalizer.fetchQuotes([ashare, hk, fund]);
    const byCode = new Map(quotes.map((quote) => [quote.code, quote]));

    expect(byCode.get("sh600519")).toMatchObject({
      name: "贵州茅台",
      price: 1512,
      prevClose: 1455,
      change: 57,
      changePercent: 3.92,
    });
    expect(byCode.get("hk00700")).toMatchObject({
      name: "腾讯控股",
      price: 477.5,
      prevClose: 475,
    });
    expect(byCode.get("jj017811")).toMatchObject({
      name: "东方人工智能主题混合C",
      price: 1.204,
      prevClose: 1.1927,
      estimated: true,
      estimatedNav: 1.204,
      baseNav: 1.1927,
    });
    expect(byCode.get("jj017811")).not.toHaveProperty("cache");
    expect(byCode.get("jj017811")).not.toHaveProperty("fromCache");
  });

  it("uses the default estimate TTL and allows overriding it", async () => {
    const port = fakePort();
    let nowMs = Date.parse("2026-05-31T07:00:00.000Z");
    const normalizer = createQuoteNormalizer({
      port,
      now: () => new Date(nowMs),
    });

    await normalizer.fetchQuotes([fund]);
    nowMs += DEFAULT_FUND_ESTIMATE_TTL_MS - 1;
    await normalizer.fetchQuotes([fund]);

    expect(port.getFundEstimate).toHaveBeenCalledTimes(1);

    const shortTtlPort = fakePort();
    let shortNowMs = Date.parse("2026-05-31T07:00:00.000Z");
    const shortTtlNormalizer = createQuoteNormalizer({
      port: shortTtlPort,
      config: { fundEstimateTtlMs: 10 },
      now: () => new Date(shortNowMs),
    });

    await shortTtlNormalizer.fetchQuotes([fund]);
    shortNowMs += 11;
    await shortTtlNormalizer.fetchQuotes([fund]);

    expect(shortTtlPort.getFundEstimate).toHaveBeenCalledTimes(2);
  });

  it("throws necessary upstream errors instead of returning stale or partial quotes", async () => {
    const normalizer = createQuoteNormalizer({
      port: fakePort({
        getSimpleQuotes: vi.fn(async () => {
          throw new Error("simple quotes unavailable");
        }),
      }),
      now: () => new Date("2026-05-31T07:00:00.000Z"),
    });

    await expect(normalizer.fetchQuotes([ashare])).rejects.toThrow("simple quotes unavailable");
  });

  it("falls back to settled fund NAV when intraday estimate fails", async () => {
    const normalizer = createQuoteNormalizer({
      port: fakePort({
        getFundEstimate: vi.fn(async () => {
          throw new Error("estimate unavailable");
        }),
      }),
      now: () => new Date("2026-05-31T07:00:00.000Z"),
    });

    const [quote] = await normalizer.fetchQuotes([fund]);

    expect(quote).toMatchObject({
      code: "jj017811",
      price: 1.1927,
      estimated: false,
      changePercent: -2.22,
      navDate: "2026-05-30",
    });
  });
});
