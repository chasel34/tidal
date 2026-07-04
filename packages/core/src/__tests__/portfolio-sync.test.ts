import { describe, expect, it } from "vitest";
import {
  buildSyncDocument,
  classifyFirstSync,
  coreFingerprint,
  detectChange,
  emptyCore,
  isEmptyCore,
  normalizeCore,
  parseSyncDocument,
  summarizeCore,
  SYNC_SCHEMA,
  type PortfolioCore,
} from "../portfolio-sync.ts";
import type { HoldingItem, Instrument } from "../types.ts";

const inst = (code: string, name = code): Instrument => ({
  code,
  name,
  market: "SH",
  category: "stock",
  type: "stock",
});

const holding = (code: string, shares = 100, cost = 10): HoldingItem => ({
  instrument: inst(code),
  shares,
  cost,
});

const sample: PortfolioCore = {
  holdings: [holding("600000"), holding("000001")],
  watch: [inst("600519")],
  cash: 48230,
};

describe("normalizeCore", () => {
  it("drops malformed holdings/watch and defaults cash", () => {
    const core = normalizeCore({
      holdings: [
        holding("600000"),
        { instrument: inst("x"), shares: -1, cost: 5 }, // negative shares -> dropped
        { shares: 1, cost: 1 }, // missing instrument -> dropped
      ],
      watch: [inst("600519"), { code: "bad" }], // second missing fields -> dropped
      cash: "nope",
    });
    expect(core.holdings).toHaveLength(1);
    expect(core.watch).toHaveLength(1);
    expect(core.cash).toBe(0);
  });

  it("returns an empty core for junk input", () => {
    expect(normalizeCore(null)).toEqual(emptyCore());
    expect(normalizeCore(42)).toEqual(emptyCore());
  });

  it("coerces unknown categories to \"other\" instead of injecting invalid values", () => {
    const core = normalizeCore({
      holdings: [],
      watch: [{ ...inst("600519"), category: "crypto" }],
      cash: 0,
    });
    expect(core.watch[0].category).toBe("other");
  });
});

describe("isEmptyCore", () => {
  it("is true only when holdings, watch, and cash are all empty/zero", () => {
    expect(isEmptyCore(emptyCore())).toBe(true);
    expect(isEmptyCore({ holdings: [], watch: [], cash: 1 })).toBe(false);
    expect(isEmptyCore(sample)).toBe(false);
  });
});

describe("summarizeCore", () => {
  it("counts holdings/watch and passes cash through", () => {
    expect(summarizeCore(sample)).toEqual({ holdings: 2, watch: 1, cash: 48230 });
  });
});

describe("build/parse round-trip", () => {
  it("parses a document this version wrote", () => {
    const text = buildSyncDocument(sample, "web");
    const parsed = parseSyncDocument(text);
    expect(parsed).not.toBeNull();
    expect(parsed!.updatedBy).toBe("web");
    expect(parsed!.core).toEqual(sample);
    expect(JSON.parse(text).schema).toBe(SYNC_SCHEMA);
  });

  it("returns null for non-JSON or a foreign schema (badCloud)", () => {
    expect(parseSyncDocument("not json")).toBeNull();
    expect(parseSyncDocument(JSON.stringify({ schema: "something-else" }))).toBeNull();
  });

  it("rejects documents from a different schema version instead of lenient-dropping rows", () => {
    const v2 = JSON.stringify({ schema: SYNC_SCHEMA, version: 2, core: {} });
    expect(parseSyncDocument(v2)).toBeNull();
    const noVersion = JSON.stringify({ schema: SYNC_SCHEMA, core: {} });
    expect(parseSyncDocument(noVersion)).toBeNull();
  });
});

describe("coreFingerprint", () => {
  it("is stable across holding/watch reordering", () => {
    const reordered: PortfolioCore = {
      holdings: [holding("000001"), holding("600000")],
      watch: [inst("600519")],
      cash: 48230,
    };
    expect(coreFingerprint(reordered)).toBe(coreFingerprint(sample));
  });

  it("changes when shares, cost, membership, or cash change", () => {
    const base = coreFingerprint(sample);
    expect(coreFingerprint({ ...sample, cash: 1 })).not.toBe(base);
    expect(
      coreFingerprint({ ...sample, holdings: [holding("600000", 200), holding("000001")] }),
    ).not.toBe(base);
    expect(coreFingerprint({ ...sample, watch: [] })).not.toBe(base);
  });
});

describe("classifyFirstSync", () => {
  it("maps the four cases", () => {
    expect(classifyFirstSync(sample, null)).toBe("A"); // local has / cloud empty
    expect(classifyFirstSync(emptyCore(), null)).toBe("B"); // both empty
    expect(classifyFirstSync(emptyCore(), sample)).toBe("C"); // cloud has / local empty
    expect(classifyFirstSync(sample, sample)).toBe("D"); // both have
  });
});

describe("detectChange", () => {
  it("flags conflict only when both sides moved since last sync", () => {
    const r = detectChange({
      localFingerprint: "b",
      syncedFingerprint: "a",
      cloudRevision: "r2",
      syncedRevision: "r1",
    });
    expect(r).toEqual({ localChanged: true, cloudChanged: true, conflict: true });
  });

  it("local-only change is not a conflict", () => {
    expect(
      detectChange({
        localFingerprint: "b",
        syncedFingerprint: "a",
        cloudRevision: "r1",
        syncedRevision: "r1",
      }),
    ).toEqual({ localChanged: true, cloudChanged: false, conflict: false });
  });

  it("never-synced (null markers) reports no changes", () => {
    expect(
      detectChange({
        localFingerprint: "b",
        syncedFingerprint: null,
        cloudRevision: "r1",
        syncedRevision: null,
      }),
    ).toEqual({ localChanged: false, cloudChanged: false, conflict: false });
  });
});
