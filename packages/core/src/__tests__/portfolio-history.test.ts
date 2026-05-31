import { describe, expect, it, vi } from "vitest";
import {
  buildDailySeries,
  buildIntradaySeries,
  createPortfolioHistory,
} from "../portfolio-history.ts";
import type { HoldingItem, PortfolioHistoryPort, Quote } from "../index.ts";

function holding(code: string, market: string, shares: number): HoldingItem {
  return {
    instrument: { code, name: code, market, category: market === "jj" ? "fund" : "stock", type: "GP-A" },
    shares,
    cost: 0,
  };
}

function fakePort(): PortfolioHistoryPort {
  return {
    getKline: vi.fn(async (code) =>
      code === "sh600519"
        ? [
            { date: "2026-05-27", open: 1790, close: 1800, high: 1810, low: 1780, volume: 1 },
            { date: "2026-05-29", open: 1800, close: 1810, high: 1820, low: 1790, volume: 1 },
          ]
        : []
    ),
    getMinute: vi.fn(async (code) =>
      code === "sh600519"
        ? [
            { time: "09:30", close: 1800 },
            { time: "09:31", close: 1802 },
          ]
        : []
    ),
    getFundNav: vi.fn(async (code) =>
      code === "jj017811"
        ? [
            { date: "2026-05-28", nav: 1.18 },
            { date: "2026-05-29", nav: 1.2 },
          ]
        : []
    ),
  };
}

describe("portfolio history builders", () => {
  it("builds daily series with union dates, forward fill, cash, and quote fallback", () => {
    const closesMap = new Map<string, Map<string, number>>();
    closesMap.set(
      "sh600519",
      new Map([
        ["2026-05-27", 1800],
        ["2026-05-29", 1810],
      ])
    );
    closesMap.set(
      "sz000858",
      new Map([
        ["2026-05-27", 100],
        ["2026-05-28", 105],
        ["2026-05-29", 110],
      ])
    );

    const result = buildDailySeries({
      holdings: [holding("sh600519", "sh", 1), holding("sz000858", "sz", 1)],
      cash: 10,
      closesMap,
      period: "1M",
    });

    expect(result.series).toEqual([1910, 1915, 1930]);
    expect(result.labels).toEqual(["05-27", "05-28", "05-29"]);
  });

  it("builds intraday fallback snapshot when minute data is unavailable", () => {
    const result = buildIntradaySeries({
      holdings: [holding("sh600519", "sh", 10)],
      cash: 5000,
      minuteMap: new Map(),
      quotes: { sh600519: { price: 1800 } as Quote },
    });

    expect(result).toEqual({ series: [23000, 23000], labels: ["开盘", "当前"] });
  });
});

describe("createPortfolioHistory", () => {
  it("uses minute data for 1D and daily kline/fund NAV for longer periods", async () => {
    const port = fakePort();
    const history = createPortfolioHistory({ port });
    const holdings = [holding("sh600519", "sh", 10), holding("jj017811", "jj", 1000)];

    const intraday = await history.buildSeries({
      holdings,
      cash: 100,
      period: "1D",
      quotes: { sh600519: { price: 1801 } as Quote, jj017811: { price: 1.19 } as Quote },
    });

    expect(intraday).toEqual({
      series: [19290, 19310],
      labels: ["09:30", "09:31"],
    });
    expect(port.getMinute).toHaveBeenCalledWith("sh600519");
    expect(port.getMinute).not.toHaveBeenCalledWith("jj017811");

    const daily = await history.buildSeries({
      holdings,
      cash: 100,
      period: "1M",
      quotes: { sh600519: { price: 1801 } as Quote, jj017811: { price: 1.19 } as Quote },
    });

    expect(daily.series).toEqual([19290, 19280, 19400]);
    expect(daily.labels).toEqual(["05-27", "05-28", "05-29"]);
    expect(port.getKline).toHaveBeenCalledWith("sh600519");
    expect(port.getFundNav).toHaveBeenCalledWith("jj017811");
  });

  it("treats per-instrument history failures as missing data and keeps consistency via quote fallback", async () => {
    const history = createPortfolioHistory({
      port: {
        getKline: vi.fn(async () => {
          throw new Error("kline down");
        }),
        getMinute: vi.fn(async () => []),
        getFundNav: vi.fn(async () => [{ date: "2026-05-29", nav: 1.2 }]),
      },
    });

    const result = await history.buildSeries({
      holdings: [holding("sh600519", "sh", 1), holding("jj017811", "jj", 1000)],
      cash: 0,
      period: "1M",
      quotes: { sh600519: { price: 1800 } as Quote },
    });

    expect(result.series).toEqual([3000]);
    expect(result.labels).toEqual(["05-29"]);
  });
});
