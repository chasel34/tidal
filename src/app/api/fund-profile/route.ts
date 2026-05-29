import { NextResponse } from "next/server";
import { getSdk, bareCode } from "@/lib/sdk";
import type {
  FundAllocSegment,
  FundManagerInfo,
  FundNavPoint,
  FundProfile,
  FundTopHolding,
} from "@/lib/types";

export const runtime = "nodejs";

interface SimpleQuoteLike {
  code: string;
  name: string;
  changePercent: number;
}

interface NavHistoryItem {
  date: string;
  nav: number;
}

const PROFILE_TTL_MS = 10 * 60_000;
const profileCache = new Map<string, { at: number; data: FundProfile }>();

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

/** Latest 股/债/现 allocation from Data_assetAllocation. */
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

/** Latest fund scale (亿) from Data_fluctuationScale. */
function parseScale(raw: unknown): number | undefined {
  const obj = raw as { series?: { y: number }[] } | null;
  const s = obj?.series;
  if (!s?.length) return undefined;
  const y = s[s.length - 1]?.y;
  return typeof y === "number" ? y : undefined;
}

/** "1.600519" -> "sh600519", "0.000858" -> "sz000858". */
function toFullCode(tok: string): string | null {
  const [mkt, code] = tok.split(".");
  if (!code) return null;
  if (mkt === "1") return `sh${code}`;
  if (mkt === "0") return `sz${code}`;
  return code;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = bareCode((searchParams.get("code") ?? "").trim());
  if (!code || !/^[a-zA-Z0-9]{4,10}$/.test(code))
    return NextResponse.json({ profile: null }, { status: 400 });

  const cached = profileCache.get(code);
  if (cached && Date.now() - cached.at < PROFILE_TTL_MS) {
    return NextResponse.json({ profile: cached.data });
  }

  const sdk = getSdk();

  // 1. pingzhongdata (asset allocation + manager + top-holding codes + name)
  let allocSeg: FundAllocSegment[] = [];
  let manager: FundManagerInfo | undefined;
  let fundSize: number | undefined;
  let topCodes: string[] = [];
  let name = "";
  try {
    const res = await fetch(
      `https://fund.eastmoney.com/pingzhongdata/${code}.js`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: `https://fund.eastmoney.com/${code}.html`,
        },
        cache: "no-store",
      }
    );
    if (res.ok) {
      const body = await res.text();
      allocSeg = parseAlloc(extractVar(body, "Data_assetAllocation"));
      manager = parseManager(extractVar(body, "Data_currentFundManager"));
      fundSize = parseScale(extractVar(body, "Data_fluctuationScale"));
      name = extractString(body, "fS_name") ?? "";
      const codesNew = extractVar(body, "stockCodesNew") as string[] | null;
      const codesOld = extractVar(body, "stockCodes") as string[] | null;
      if (Array.isArray(codesNew) && codesNew.length) {
        topCodes = codesNew.map(toFullCode).filter((c): c is string => !!c);
      } else if (Array.isArray(codesOld)) {
        // legacy: bare codes; infer market by leading digit (6->sh else sz)
        topCodes = codesOld.map((c) =>
          /^6/.test(c) ? `sh${c.slice(0, 6)}` : `sz${c.slice(0, 6)}`
        );
      }
    }
  } catch {
    /* tolerate — fall through with whatever we have */
  }

  // 2. NAV history + accNav + settled navDate (SDK)
  let navHistory: FundNavPoint[] = [];
  let accNav: number | undefined;
  let navDate: string | undefined;
  await Promise.all([
    sdk
      .getFundNavHistory(code)
      .then((h: { items?: NavHistoryItem[] }) => {
        navHistory = (h.items ?? [])
          .filter((p) => p.nav != null)
          .map((p) => ({ date: p.date, nav: p.nav }));
      })
      .catch(() => {}),
    sdk
      .getFundQuotes([code])
      .then((qs: { name?: string; accNav?: number; navDate?: string }[]) => {
        const q = qs[0];
        if (q) {
          accNav = q.accNav;
          navDate = q.navDate;
          if (!name && q.name) name = q.name;
        }
      })
      .catch(() => {}),
  ]);

  // 3. resolve top-holding names + today% via simple quotes
  let topHoldings: FundTopHolding[] = [];
  if (topCodes.length) {
    try {
      const qs = (await sdk.getSimpleQuotes(topCodes)) as SimpleQuoteLike[];
      const byBare = new Map<string, SimpleQuoteLike>();
      for (const q of qs) byBare.set(q.code, q);
      topHoldings = topCodes.map((full) => {
        const q = byBare.get(bareCode(full));
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

  const profile: FundProfile = {
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
  profileCache.set(code, { at: Date.now(), data: profile });
  return NextResponse.json({ profile });
}
