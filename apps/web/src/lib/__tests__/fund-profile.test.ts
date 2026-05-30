import { describe, it, expect, vi } from "vitest";
import {
  buildFundProfile,
  type EastmoneyPort,
  type SdkPort,
} from "@/lib/fund-profile";

// ── stub data ────────────────────────────────────────────────────────

const PINGZHONG_SCRIPT = `
var fS_name = "易方达蓝筹精选混合";
var Data_assetAllocation = {
  "series": [
    {"name": "股票占净比", "data": [85.2, 88.1, 90.5]},
    {"name": "债券占净比", "data": [2.1, 1.8, 1.5]},
    {"name": "现金占净比", "data": [5.0, 4.2, 3.8]}
  ]
};
var Data_currentFundManager = [{"name":"张坤","star":5,"workTime":"8年又282天","fundSize":"533.63亿(24只基金)"}];
var Data_fluctuationScale = {"series": [{"y": 533.63}, {"y": 480.12}]};
var stockCodesNew = ["1.600519","0.000858","1.601318"];
`;

const NAV_ITEMS = [
  { date: "2026-05-28", nav: 2.15 },
  { date: "2026-05-29", nav: 2.18 },
];

const FUND_QUOTES = [
  { name: "易方达蓝筹精选混合", accNav: 2.45, navDate: "2026-05-29" },
];

const SIMPLE_QUOTES = [
  { code: "600519", name: "贵州茅台", changePercent: 1.5 },
  { code: "000858", name: "五粮液", changePercent: -0.8 },
  { code: "601318", name: "中国平安", changePercent: 0.3 },
];

function makeEastmoneyPort(script = PINGZHONG_SCRIPT): EastmoneyPort {
  return {
    fetchPingzhongScript: vi.fn().mockResolvedValue(script),
  };
}

function makeSdkPort(
  opts: {
    navItems?: typeof NAV_ITEMS;
    fundQuotes?: typeof FUND_QUOTES;
    simpleQuotes?: typeof SIMPLE_QUOTES;
  } = {},
): SdkPort {
  return {
    getFundNavHistory: vi.fn().mockResolvedValue(opts.navItems ?? NAV_ITEMS),
    getFundQuotes: vi.fn().mockResolvedValue(opts.fundQuotes ?? FUND_QUOTES),
    getSimpleQuotes: vi.fn().mockResolvedValue(opts.simpleQuotes ?? SIMPLE_QUOTES),
  };
}

// ── tests ────────────────────────────────────────────────────────────

describe("buildFundProfile", () => {
  it("assembles a complete profile from all sources", async () => {
    const profile = await buildFundProfile("005827", makeEastmoneyPort(), makeSdkPort());

    expect(profile.code).toBe("005827");
    expect(profile.name).toBe("易方达蓝筹精选混合");
    expect(profile.accNav).toBe(2.45);
    expect(profile.navDate).toBe("2026-05-29");
    expect(profile.fundSize).toBe(480.12);
    expect(profile.navHistory).toHaveLength(2);
    expect(profile.navHistory[0]).toEqual({ date: "2026-05-28", nav: 2.15 });
  });

  it("parses asset allocation correctly", async () => {
    const profile = await buildFundProfile("005827", makeEastmoneyPort(), makeSdkPort());

    expect(profile.assetAlloc).toEqual([
      { label: "股票", pct: 90.5 },
      { label: "债券", pct: 1.5 },
      { label: "现金", pct: 3.8 },
    ]);
  });

  it("parses fund manager info", async () => {
    const profile = await buildFundProfile("005827", makeEastmoneyPort(), makeSdkPort());

    expect(profile.manager).toEqual({
      name: "张坤",
      star: 5,
      workTime: "8年又282天",
      fundSize: "533.63亿(24只基金)",
    });
  });

  it("resolves top holding codes to names and todayPct", async () => {
    const profile = await buildFundProfile("005827", makeEastmoneyPort(), makeSdkPort());

    expect(profile.topHoldings).toHaveLength(3);
    expect(profile.topHoldings[0]).toEqual({
      code: "sh600519",
      name: "贵州茅台",
      todayPct: 1.5,
    });
    expect(profile.topHoldings[1]).toEqual({
      code: "sz000858",
      name: "五粮液",
      todayPct: -0.8,
    });
  });

  it("falls back to empty allocation when script has no data", async () => {
    const port = makeEastmoneyPort('var fS_name = "Test";');
    const profile = await buildFundProfile("005827", port, makeSdkPort());

    expect(profile.assetAlloc).toEqual([]);
    expect(profile.manager).toBeUndefined();
    expect(profile.fundSize).toBeUndefined();
    expect(profile.topHoldings).toEqual([]);
  });

  it("uses SDK fund name when pingzhongdata has none", async () => {
    const port = makeEastmoneyPort("// empty script");
    const profile = await buildFundProfile("005827", port, makeSdkPort());

    expect(profile.name).toBe("易方达蓝筹精选混合");
  });

  it("tolerates eastmoney fetch failure", async () => {
    const port: EastmoneyPort = {
      fetchPingzhongScript: vi.fn().mockRejectedValue(new Error("network")),
    };
    const profile = await buildFundProfile("005827", port, makeSdkPort());

    expect(profile.code).toBe("005827");
    expect(profile.navHistory).toHaveLength(2);
    expect(profile.assetAlloc).toEqual([]);
  });

  it("tolerates SDK failures gracefully", async () => {
    const sdkPort: SdkPort = {
      getFundNavHistory: vi.fn().mockRejectedValue(new Error("timeout")),
      getFundQuotes: vi.fn().mockRejectedValue(new Error("timeout")),
      getSimpleQuotes: vi.fn().mockRejectedValue(new Error("timeout")),
    };
    const profile = await buildFundProfile("005827", makeEastmoneyPort(), sdkPort);

    expect(profile.code).toBe("005827");
    expect(profile.name).toBe("易方达蓝筹精选混合");
    expect(profile.navHistory).toEqual([]);
    expect(profile.topHoldings).toHaveLength(3);
    // When simpleQuotes fails, topHoldings should still have codes but fallback names
    expect(profile.topHoldings[0].code).toBe("sh600519");
    expect(profile.topHoldings[0].name).toBe("sh600519");
    expect(profile.topHoldings[0].todayPct).toBe(0);
  });

  it("handles legacy stockCodes format (bare codes)", async () => {
    const script = `
var fS_name = "TestFund";
var stockCodes = ["600519","000858"];
`;
    const profile = await buildFundProfile("999999", makeEastmoneyPort(script), makeSdkPort());

    expect(profile.topHoldings).toHaveLength(2);
    expect(profile.topHoldings[0].code).toBe("sh600519");
    expect(profile.topHoldings[1].code).toBe("sz000858");
  });

  it("filters out nav points with null nav", async () => {
    const sdkPort = makeSdkPort({
      navItems: [
        { date: "2026-05-28", nav: 2.15 },
        { date: "2026-05-29", nav: null as unknown as number },
        { date: "2026-05-30", nav: 2.20 },
      ],
    });
    const profile = await buildFundProfile("005827", makeEastmoneyPort(), sdkPort);

    expect(profile.navHistory).toHaveLength(2);
    expect(profile.navHistory.map((p) => p.date)).toEqual(["2026-05-28", "2026-05-30"]);
  });
});
