import { describe, it, expect } from "vitest";
import {
  buildDailySeries,
  buildIntradaySeries,
} from "@/lib/portfolio-series";
import type { HoldingItem } from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────

function holding(
  code: string,
  market: string,
  shares: number
): HoldingItem {
  return {
    instrument: { code, name: code, market, category: "stock", type: "GP-A" },
    shares,
    cost: 0,
  };
}

// ── buildDailySeries ─────────────────────────────────────────────────

describe("buildDailySeries", () => {
  it("returns empty when closesMap has no data", () => {
    const result = buildDailySeries(
      [holding("sh600519", "sh", 100)],
      0,
      new Map(),
      "1M"
    );
    expect(result.series).toEqual([]);
    expect(result.labels).toEqual([]);
  });

  it("computes portfolio value = shares × close + cash for each date", () => {
    const closes = new Map<string, Map<string, number>>();
    const sh600519 = new Map([
      ["2026-05-27", 1800],
      ["2026-05-28", 1820],
      ["2026-05-29", 1810],
    ]);
    closes.set("sh600519", sh600519);

    const result = buildDailySeries(
      [holding("sh600519", "sh", 10)],
      5000,
      closes,
      "1W" // take 5, but only 3 dates exist
    );

    expect(result.series).toEqual([
      10 * 1800 + 5000, // 23000
      10 * 1820 + 5000, // 23200
      10 * 1810 + 5000, // 23100
    ]);
    expect(result.labels).toEqual(["05-27", "05-28", "05-29"]);
  });

  it("trims to the period length", () => {
    const closes = new Map<string, Map<string, number>>();
    const data = new Map<string, number>();
    for (let i = 1; i <= 30; i++) {
      const d = `2026-05-${String(i).padStart(2, "0")}`;
      data.set(d, 100 + i);
    }
    closes.set("sh600519", data);

    const result = buildDailySeries(
      [holding("sh600519", "sh", 1)],
      0,
      closes,
      "1W" // PERIODS["1W"] = 5
    );

    expect(result.series).toHaveLength(5);
    // Should be the last 5 dates
    expect(result.labels).toEqual(["05-26", "05-27", "05-28", "05-29", "05-30"]);
  });

  it("sums multiple holdings per date", () => {
    const closes = new Map<string, Map<string, number>>();
    closes.set("sh600519", new Map([["2026-05-29", 1800]]));
    closes.set("sz000858", new Map([["2026-05-29", 150]]));

    const result = buildDailySeries(
      [
        holding("sh600519", "sh", 10),
        holding("sz000858", "sz", 20),
      ],
      1000,
      closes,
      "1M"
    );

    expect(result.series).toEqual([10 * 1800 + 20 * 150 + 1000]); // 22000
  });

  it("uses fallback quote when a holding has no data in closesMap", () => {
    const closes = new Map<string, Map<string, number>>();
    closes.set("sh600519", new Map([["2026-05-29", 1800]]));
    // sz000858 has no closes data

    const result = buildDailySeries(
      [
        holding("sh600519", "sh", 10),
        holding("sz000858", "sz", 20),
      ],
      0,
      closes,
      "1M",
      { sz000858: { price: 140 } } // fallback quotes
    );

    expect(result.series).toEqual([10 * 1800 + 20 * 140]); // 20800
  });

  it("forward-fills missing dates using last known close", () => {
    const closes = new Map<string, Map<string, number>>();
    // sh600519 has data for 05-27 and 05-29 but not 05-28
    const allDates = new Map([
      ["2026-05-27", 1800],
      ["2026-05-29", 1810],
    ]);
    closes.set("sh600519", allDates);
    // sz000858 has data for all 3 dates, creating the 05-28 date in the union
    closes.set(
      "sz000858",
      new Map([
        ["2026-05-27", 100],
        ["2026-05-28", 105],
        ["2026-05-29", 110],
      ])
    );

    const result = buildDailySeries(
      [
        holding("sh600519", "sh", 1),
        holding("sz000858", "sz", 1),
      ],
      0,
      closes,
      "1M"
    );

    // On 05-28, sh600519 should forward-fill from 05-27 (1800)
    expect(result.series).toEqual([
      1800 + 100, // 05-27
      1800 + 105, // 05-28: forward-filled 1800 + 105
      1810 + 110, // 05-29
    ]);
  });
});

// ── buildIntradaySeries ──────────────────────────────────────────────

describe("buildIntradaySeries", () => {
  it("returns empty when minuteMap is empty and no quotes exist", () => {
    const result = buildIntradaySeries(
      [holding("sh600519", "sh", 100)],
      0,
      new Map(),
      {}
    );
    expect(result.series).toEqual([]);
    expect(result.labels).toEqual([]);
  });

  it("returns [total, total] with labels [开盘, 当前] when no minute data but quotes exist", () => {
    const result = buildIntradaySeries(
      [holding("sh600519", "sh", 10)],
      5000,
      new Map(), // no minute data
      { sh600519: { price: 1800 } }
    );

    expect(result.series).toEqual([23000, 23000]);
    expect(result.labels).toEqual(["开盘", "当前"]);
  });

  it("computes intraday portfolio value from minute data", () => {
    const minuteMap = new Map<string, Map<string, number>>();
    minuteMap.set(
      "sh600519",
      new Map([
        ["09:30", 1800],
        ["09:31", 1802],
        ["09:32", 1798],
      ])
    );

    const result = buildIntradaySeries(
      [holding("sh600519", "sh", 10)],
      5000,
      minuteMap,
      { sh600519: { price: 1800 } }
    );

    expect(result.series).toEqual([
      10 * 1800 + 5000,
      10 * 1802 + 5000,
      10 * 1798 + 5000,
    ]);
    expect(result.labels).toEqual(["09:30", "09:31", "09:32"]);
  });

  it("uses quote fallback for holdings without minute data", () => {
    const minuteMap = new Map<string, Map<string, number>>();
    minuteMap.set("sh600519", new Map([["09:30", 1800]]));
    // sz000858 has no minute data — should use quote price

    const result = buildIntradaySeries(
      [
        holding("sh600519", "sh", 10),
        holding("sz000858", "sz", 20),
      ],
      0,
      minuteMap,
      { sh600519: { price: 1800 }, sz000858: { price: 140 } }
    );

    expect(result.series).toEqual([10 * 1800 + 20 * 140]); // 20800
  });
});
