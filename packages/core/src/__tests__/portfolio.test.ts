import { describe, expect, it } from "vitest";
import { derivePortfolio } from "../portfolio.ts";
import type { HoldingItem, Quote, WatchItem } from "../types.ts";

const stock = {
  code: "sh600519",
  name: "贵州茅台",
  market: "sh",
  category: "stock",
  type: "GP-A",
} as const;

describe("derivePortfolio", () => {
  it("derives enriched 持仓, 自选, summary, allocation, and default sorted rows", () => {
    const holdings: HoldingItem[] = [{ instrument: stock, shares: 2, cost: 100 }];
    const watch: WatchItem[] = [
      { code: "sz399001", name: "深证成指", market: "sz", category: "index", type: "ZS" },
    ];
    const quotes: Record<string, Quote> = {
      sh600519: {
        code: "sh600519",
        name: "贵州茅台",
        price: 120,
        prevClose: 110,
        change: 10,
        changePercent: 9.09,
      },
      sz399001: {
        code: "sz399001",
        name: "深证成指",
        price: 10000,
        prevClose: 9900,
        change: 100,
        changePercent: 1.01,
      },
    };

    const result = derivePortfolio({ holdings, watch, cash: 50, quotes });

    expect(result.summary.totalAssets).toBe(290);
    expect(result.summary.marketValue).toBe(240);
    expect(result.summary.todayDelta).toBe(20);
    expect(result.holdingsFull[0].gainPct).toBe(20);
    expect(result.watchFull[0].todayPct).toBe(1.01);
    expect(result.allocation).toEqual([
      { label: "股票", value: 240 },
      { label: "现金", value: 50 },
    ]);
    expect(result.sortedHoldings.map((item) => item.code)).toEqual(["sh600519"]);
    expect(result.sortedWatch.map((item) => item.code)).toEqual(["sz399001"]);
  });

  it("uses cost as the fallback price when a 持仓 has no Quote", () => {
    const holdings: HoldingItem[] = [{ instrument: stock, shares: 3, cost: 88 }];

    const result = derivePortfolio({ holdings, watch: [], cash: 12, quotes: {} });

    expect(result.holdingsFull[0]).toMatchObject({
      code: "sh600519",
      price: 88,
      prevClose: 88,
      todayPct: 0,
      todayDelta: 0,
      marketValue: 264,
    });
    expect(result.summary.totalAssets).toBe(276);
  });

  it("honors explicit sort state while defaulting omitted sort state", () => {
    const holdings: HoldingItem[] = [
      { instrument: stock, shares: 1, cost: 100 },
      {
        instrument: {
          code: "sz000858",
          name: "五粮液",
          market: "sz",
          category: "stock",
          type: "GP-A",
        },
        shares: 1,
        cost: 100,
      },
    ];
    const watch: WatchItem[] = [
      { code: "sh000001", name: "上证指数", market: "sh", category: "index", type: "ZS" },
      { code: "sz399006", name: "创业板指", market: "sz", category: "index", type: "ZS" },
    ];
    const quotes: Record<string, Quote> = {
      sh600519: { code: "sh600519", name: "贵州茅台", price: 110, prevClose: 100, change: 10, changePercent: 10 },
      sz000858: { code: "sz000858", name: "五粮液", price: 150, prevClose: 100, change: 50, changePercent: 50 },
      sh000001: { code: "sh000001", name: "上证指数", price: 3000, prevClose: 3030, change: -30, changePercent: -1 },
      sz399006: { code: "sz399006", name: "创业板指", price: 2000, prevClose: 1900, change: 100, changePercent: 5 },
    };

    const result = derivePortfolio({
      holdings,
      watch,
      cash: 0,
      quotes,
      sortH: { key: "gain", dir: "asc" },
    });

    expect(result.sortedHoldings.map((item) => item.code)).toEqual(["sh600519", "sz000858"]);
    expect(result.sortedWatch.map((item) => item.code)).toEqual(["sz399006", "sh000001"]);
  });
});
