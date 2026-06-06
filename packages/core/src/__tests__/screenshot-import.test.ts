import { describe, expect, it } from "vitest";
import type { Instrument } from "../types.ts";
import {
  aiNormalize,
  aiResolve,
  aiResolvedModel,
  buildScreenshotRequest,
  extractRowsFromResponse,
  matchInstrument,
  OCR_PROVIDER_MAP,
  parseExtractedRows,
  reconstructHolding,
  screenshotSearchQueries,
  screenshotSearchSeed,
} from "../screenshot-import.ts";

function inst(p: Partial<Instrument> & { code: string; name: string }): Instrument {
  return { market: "jj", category: "fund", type: "ETF", ...p };
}

describe("aiNormalize", () => {
  it("falls back to defaults on garbage", () => {
    const s = aiNormalize(null);
    expect(s.activeProvider).toBe("volcengine");
    expect(s.providers.volcengine).toEqual({ apiKey: "", baseURL: "", model: "" });
  });

  it("keeps saved provider config", () => {
    const s = aiNormalize({
      activeProvider: "volcengine",
      providers: { volcengine: { apiKey: "k", baseURL: "", model: "ep-1" } },
    });
    expect(s.providers.volcengine.apiKey).toBe("k");
    expect(aiResolvedModel(s)).toBe("ep-1");
  });

  it("uses provider default model when blank", () => {
    const s = aiNormalize({});
    expect(aiResolvedModel(s)).toBe(OCR_PROVIDER_MAP.volcengine.defaultModel);
  });
});

describe("buildScreenshotRequest", () => {
  it("targets the responses endpoint with bearer auth and image+text input", () => {
    const cfg = aiResolve(
      aiNormalize({ providers: { volcengine: { apiKey: "secret", baseURL: "", model: "" } } }),
    );
    const req = buildScreenshotRequest("data:image/png;base64,AAAA", cfg);
    expect(req.url).toBe("https://ark.cn-beijing.volces.com/api/v3/responses");
    expect(req.headers.Authorization).toBe("Bearer secret");
    const body = JSON.parse(req.body);
    expect(body.model).toBe(OCR_PROVIDER_MAP.volcengine.defaultModel);
    expect(body.input[0].content[0]).toEqual({
      type: "input_image",
      image_url: "data:image/png;base64,AAAA",
    });
    expect(body.input[0].content[1].type).toBe("input_text");
  });
});

describe("response parsing", () => {
  it("extracts rows from a real 火山 responses reply", () => {
    const reply = {
      output: [
        {
          type: "message",
          role: "assistant",
          content: [
            {
              type: "output_text",
              text: '{"rows":[{"name":"华泰柏瑞沪深300ETF联接A","code":null,"marketValue":18352.18,"profit":5465.29,"profitPct":42.41,"shares":null,"cost":null}]}',
            },
          ],
        },
      ],
    };
    const rows = extractRowsFromResponse(reply);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "华泰柏瑞沪深300ETF联接A",
      marketValue: 18352.18,
      profit: 5465.29,
      profitPct: 42.41,
    });
  });

  it("tolerates markdown fences and comma-grouped numbers", () => {
    const rows = parseExtractedRows(
      '```json\n{"rows":[{"name":"国联安半导体ETF联接C","marketValue":"20,819.00","profitPct":"4.10"}]}\n```',
    );
    expect(rows[0].marketValue).toBe(20819);
    expect(rows[0].profitPct).toBe(4.1);
  });

  it("returns [] when there is no JSON", () => {
    expect(parseExtractedRows("抱歉，我无法识别")).toEqual([]);
  });
});

describe("reconstructHolding", () => {
  it("derives shares from market value and cost from profit", () => {
    // 华泰柏瑞: 市值 18352.18, 收益 5465.29, 现价(净值) 2 => 份额 ~9176.09
    const r = reconstructHolding(
      { marketValue: 18352.18, profit: 5465.29, profitPct: 42.41, shares: null, cost: null },
      2,
    );
    expect(r).not.toBeNull();
    expect(r!.shares).toBeCloseTo(9176.09, 2);
    // 成本总额 = 18352.18 - 5465.29 = 12886.89 ; 单价 = /份额
    expect(r!.cost).toBeCloseTo(12886.89 / 9176.09, 4);
  });

  it("uses profitPct when absolute profit is absent", () => {
    const r = reconstructHolding(
      { marketValue: 1421, profit: null, profitPct: 42.1, shares: null, cost: null },
      10,
    );
    expect(r!.shares).toBeCloseTo(142.1, 4);
    expect(r!.cost).toBeCloseTo(1421 / 1.421 / 142.1, 6);
  });

  it("prefers explicit shares & cost when the screenshot shows them", () => {
    const r = reconstructHolding(
      { marketValue: 24580, profit: null, profitPct: null, shares: 100, cost: 245.8 },
      300,
    );
    expect(r).toEqual({ shares: 100, cost: 245.8 });
  });

  it("returns null when price is missing and no shares are given", () => {
    const r = reconstructHolding(
      { marketValue: 1000, profit: 100, profitPct: 10, shares: null, cost: null },
      0,
    );
    expect(r).toBeNull();
  });
});

describe("screenshotSearchQueries", () => {
  it("tries a visible instrument code before name-based queries", () => {
    const qs = screenshotSearchQueries({ name: "识别可能有误的名称", code: "017641" });
    expect(qs[0]).toBe("017641");
  });

  it("trims fund-structure tokens so stock-sdk can match", () => {
    const qs = screenshotSearchQueries({ name: "华泰柏瑞沪深300ETF联接A", code: null });
    expect(qs[0]).toBe("华泰柏瑞沪深300ETF联接A");
    // the verified working query — cut before "ETF"
    expect(qs).toContain("华泰柏瑞沪深300");
  });

  it("drops a trailing share-class letter for non-ETF funds", () => {
    const qs = screenshotSearchQueries({ name: "东方人工智能主题混合C" });
    expect(qs).toContain("东方人工智能主题混合");
  });

  it("seed prefers a trimmed query over the full name", () => {
    expect(screenshotSearchSeed("华泰柏瑞沪深300ETF联接A")).toBe("华泰柏瑞沪深300");
  });
});

describe("matchInstrument", () => {
  const candidates = [
    inst({ code: "017641", name: "华泰柏瑞纳斯达克100ETF发起式联接（QDII）A" }),
    inst({ code: "017642", name: "华泰柏瑞纳斯达克100ETF发起式联接（QDII）C" }),
  ];

  it("disambiguates A/C share classes by exact name", () => {
    const m = matchInstrument(
      { name: "华泰柏瑞纳斯达克100ETF发起式联接（QDII）C", code: null, marketValue: null, profit: null, profitPct: null, shares: null, cost: null },
      candidates,
    );
    expect(m.status).toBe("matched");
    expect(m.instrument?.code).toBe("017642");
  });

  it("matches by code when present", () => {
    const m = matchInstrument(
      { name: "随便", code: "017641", marketValue: null, profit: null, profitPct: null, shares: null, cost: null },
      candidates,
    );
    expect(m.instrument?.code).toBe("017641");
  });

  it("is unmatched with no candidates", () => {
    const m = matchInstrument(
      { name: "腾讯控股", code: "00700", marketValue: null, profit: null, profitPct: null, shares: null, cost: null },
      [],
    );
    expect(m.status).toBe("unmatched");
  });

  it("flags ambiguity when several names collide and none is exact", () => {
    const m = matchInstrument(
      { name: "华泰柏瑞纳斯达克", code: null, marketValue: null, profit: null, profitPct: null, shares: null, cost: null },
      candidates,
    );
    expect(m.status).toBe("ambiguous");
    expect(m.instrument).toBeNull();
  });

  it("does not preselect an instrument when exact names are ambiguous", () => {
    const duplicateNames = [
      inst({ code: "000001", name: "同名基金" }),
      inst({ code: "000002", name: "同名基金" }),
    ];
    const m = matchInstrument(
      { name: "同名基金", code: null, marketValue: null, profit: null, profitPct: null, shares: null, cost: null },
      duplicateNames,
    );
    expect(m.status).toBe("ambiguous");
    expect(m.instrument).toBeNull();
  });
});
