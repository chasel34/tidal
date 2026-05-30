import { describe, it, expect } from "vitest";
import { buildMiniInstruments } from "@/lib/today-screen";
import type { Instrument } from "@/lib/types";

type Item = Instrument & { todayPct: number };

function item(code: string, todayPct: number): Item {
  return {
    code,
    name: `Name-${code}`,
    market: "sh",
    category: "stock",
    type: "GP-A",
    todayPct,
  };
}

describe("buildMiniInstruments", () => {
  it("returns empty array when both inputs are empty", () => {
    expect(buildMiniInstruments([], [])).toEqual([]);
  });

  it("returns top N holdings when watch is empty", () => {
    const holdings = [item("A", 3), item("B", 2), item("C", 1)];
    const result = buildMiniInstruments(holdings, [], 2);
    expect(result.map((r) => r.code)).toEqual(["A", "B"]);
  });

  it("returns watch sorted by todayPct desc when holdings are empty", () => {
    const watch = [item("X", -1), item("Y", 5), item("Z", 2)];
    const result = buildMiniInstruments([], watch, 5);
    // Watch is sorted desc by todayPct, so Y(5), Z(2), X(-1)
    expect(result.map((r) => r.code)).toEqual(["Y", "Z", "X"]);
  });

  it("truncates to topN per source", () => {
    const holdings = Array.from({ length: 8 }, (_, i) => item(`H${i}`, 10 - i));
    const result = buildMiniInstruments(holdings, [], 5);
    expect(result).toHaveLength(5);
    expect(result.map((r) => r.code)).toEqual(["H0", "H1", "H2", "H3", "H4"]);
  });

  it("merges holdings and watch without overlap, up to topN each", () => {
    const holdings = [item("H1", 5), item("H2", 3)];
    const watch = [item("W1", 4), item("W2", 1)];
    const result = buildMiniInstruments(holdings, watch, 5);
    expect(result.map((r) => r.code)).toEqual(["H1", "H2", "W1", "W2"]);
  });

  it("deduplicates: watch entry overwrites holding with same code", () => {
    const holdings = [item("SHARED", 2)];
    const watch = [item("SHARED", 8)];
    const result = buildMiniInstruments(holdings, watch, 5);
    expect(result).toHaveLength(1);
    // The watch version (todayPct=8) wins
    expect(result[0].todayPct).toBe(8);
  });

  it("preserves insertion order for duplicates", () => {
    const holdings = [item("A", 5), item("B", 3), item("C", 1)];
    const watch = [item("B", 9), item("D", 7)];
    const result = buildMiniInstruments(holdings, watch, 5);
    // A inserted first, B updated in-place, C inserted, D added
    expect(result.map((r) => r.code)).toEqual(["A", "B", "C", "D"]);
    // B should have the watch version
    expect(result[1].todayPct).toBe(9);
  });

  it("defaults topN to 5", () => {
    const holdings = Array.from({ length: 10 }, (_, i) => item(`H${i}`, 10 - i));
    const watch = Array.from({ length: 10 }, (_, i) => item(`W${i}`, 10 - i));
    const result = buildMiniInstruments(holdings, watch);
    // 5 from holdings + 5 from watch (no overlap) = 10
    expect(result).toHaveLength(10);
  });

  it("handles holdings already sorted by the caller", () => {
    // Holdings come pre-sorted; buildMiniInstruments should not re-sort them
    const holdings = [item("A", 1), item("B", 10), item("C", 5)];
    const result = buildMiniInstruments(holdings, [], 5);
    // Order is preserved as-is from input
    expect(result.map((r) => r.code)).toEqual(["A", "B", "C"]);
  });
});
