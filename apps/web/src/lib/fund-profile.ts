import type {
  FundAllocSegment,
  FundManagerInfo,
  FundNavPoint,
  FundProfile,
  FundTopHolding,
} from "@/lib/types";

// ── Port interfaces ──────────────────────────────────────────────────

export interface EastmoneyPort {
  fetchPingzhongScript(code: string): Promise<string>;
}

export interface SdkPort {
  getFundNavHistory(code: string): Promise<{ date: string; nav: number }[]>;
  getFundQuotes(codes: string[]): Promise<{ name?: string; accNav?: number; navDate?: string }[]>;
  getSimpleQuotes(codes: string[]): Promise<{ code: string; name: string; changePercent: number }[]>;
}

// ── Parsing helpers ──────────────────────────────────────────────────

/** Extract `var NAME = <json>;` from a pingzhongdata script body. */
function extractVar(src: string, name: string): unknown {
  const re = new RegExp(`var\\s+${name}\\s*=\\s*([\\[{][\\s\\S]*?)\\s*;`);
  const m = src.match(re);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function extractString(src: string, name: string): string | undefined {
  const m = src.match(new RegExp(`var\\s+${name}\\s*=\\s*"([^"]*)"`));
  return m?.[1];
}

function parseAlloc(raw: unknown): FundAllocSegment[] {
  const obj = raw as { series?: { name: string; data: number[] }[] } | null;
  if (!obj?.series?.length) return [];
  const pick = (label: string): number => {
    const s = obj.series!.find((x) => x.name?.includes(label));
    const d = s?.data;
    return d?.length ? d[d.length - 1] : 0;
  };
  const segs: FundAllocSegment[] = [
    { label: "股票", pct: pick("股票") },
    { label: "债券", pct: pick("债券") },
    { label: "现金", pct: pick("现金") },
  ];
  return segs.filter((s) => s.pct > 0);
}

function parseManager(raw: unknown): FundManagerInfo | undefined {
  const arr = raw as
    | { name?: string; star?: number; workTime?: string; fundSize?: string }[]
    | null;
  const m = arr?.[0];
  if (!m?.name) return undefined;
  return {
    name: m.name,
    star: typeof m.star === "number" ? m.star : 0,
    workTime: m.workTime ?? "",
    fundSize: m.fundSize ?? "",
  };
}

function parseScale(raw: unknown): number | undefined {
  const obj = raw as { series?: { y: number }[] } | null;
  const s = obj?.series;
  if (!s?.length) return undefined;
  const y = s[s.length - 1]?.y;
  return typeof y === "number" ? y : undefined;
}

/** "1.600519" → "sh600519", "0.000858" → "sz000858". */
function toFullCode(tok: string): string | null {
  const [mkt, code] = tok.split(".");
  if (!code) return null;
  if (mkt === "1") return `sh${code}`;
  if (mkt === "0") return `sz${code}`;
  return code;
}

// ── Main entry point ─────────────────────────────────────────────────

export async function buildFundProfile(
  code: string,
  eastmoney: EastmoneyPort,
  sdk: SdkPort,
): Promise<FundProfile> {
  // 1. Fetch and parse pingzhongdata script
  let allocSeg: FundAllocSegment[] = [];
  let manager: FundManagerInfo | undefined;
  let fundSize: number | undefined;
  let topCodes: string[] = [];
  let name = "";

  try {
    const body = await eastmoney.fetchPingzhongScript(code);
    allocSeg = parseAlloc(extractVar(body, "Data_assetAllocation"));
    manager = parseManager(extractVar(body, "Data_currentFundManager"));
    fundSize = parseScale(extractVar(body, "Data_fluctuationScale"));
    name = extractString(body, "fS_name") ?? "";

    const codesNew = extractVar(body, "stockCodesNew") as string[] | null;
    const codesOld = extractVar(body, "stockCodes") as string[] | null;
    if (Array.isArray(codesNew) && codesNew.length) {
      topCodes = codesNew.map(toFullCode).filter((c): c is string => !!c);
    } else if (Array.isArray(codesOld)) {
      topCodes = codesOld.map((c) =>
        /^6/.test(c) ? `sh${c.slice(0, 6)}` : `sz${c.slice(0, 6)}`,
      );
    }
  } catch {
    /* tolerate — fall through with defaults */
  }

  // 2. NAV history + fund quotes (parallel)
  let navHistory: FundNavPoint[] = [];
  let accNav: number | undefined;
  let navDate: string | undefined;

  await Promise.all([
    sdk
      .getFundNavHistory(code)
      .then((items) => {
        navHistory = items
          .filter((p) => p.nav != null)
          .map((p) => ({ date: p.date, nav: p.nav }));
      })
      .catch(() => {}),
    sdk
      .getFundQuotes([code])
      .then((qs) => {
        const q = qs[0];
        if (q) {
          accNav = q.accNav;
          navDate = q.navDate;
          if (!name && q.name) name = q.name;
        }
      })
      .catch(() => {}),
  ]);

  // 3. Resolve top-holding names + today% via simple quotes
  let topHoldings: FundTopHolding[] = [];
  if (topCodes.length) {
    try {
      const qs = await sdk.getSimpleQuotes(topCodes);
      const byBare = new Map<string, (typeof qs)[number]>();
      for (const q of qs) byBare.set(q.code, q);
      topHoldings = topCodes.map((full) => {
        const bare = full.replace(/^(sh|sz|bj)/, "");
        const q = byBare.get(bare);
        return {
          code: full,
          name: q?.name ?? full,
          todayPct: q?.changePercent ?? 0,
        };
      });
    } catch {
      topHoldings = topCodes.map((full) => ({
        code: full,
        name: full,
        todayPct: 0,
      }));
    }
  }

  return {
    code,
    name,
    accNav,
    navDate,
    fundSize,
    assetAlloc: allocSeg,
    topHoldings,
    manager,
    navHistory,
  };
}
