import { describe, expect, it } from "vitest";
import { derivePortfolio } from "../portfolio";
import type { HoldingItem, Quote, WatchItem } from "../types";

const stock = {
  code: "sh600519",
  name: "贵州茅台",
  market: "sh",
  category: "stock",
  type: "GP-A",
} as const;

describe("derivePortfolio", () => {
  it("derives menu bar portfolio summary from holdings, cash, watch, and quotes", () => {
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

    const result = derivePortfolio(holdings, watch, 50, quotes);

    expect(result.summary.totalAssets).toBe(290);
    expect(result.summary.marketValue).toBe(240);
    expect(result.summary.todayDelta).toBe(20);
    expect(result.holdingsFull[0].gainPct).toBe(20);
    expect(result.watchFull[0].todayPct).toBe(1.01);
  });
});
