import type {
  FundAllocSegment,
  FundManagerInfo,
  FundNavPoint,
  FundProfile,
  FundTopHolding,
} from "@shared/types";

export interface EastmoneyPort {
  fetchPingzhongScript(code: string): Promise<string>;
}

export interface SdkPort {
  getFundNavHistory(code: string): Promise<{ date: string; nav: number }[]>;
  getFundQuotes(codes: string[]): Promise<{ name?: string; accNav?: number; navDate?: string }[]>;
  getSimpleQuotes(codes: string[]): Promise<{ code: string; name: string; changePercent: number }[]>;
}

function extractVar(src: string, name: string): unknown {
  const re = new RegExp(`var\\s+${name}\\s*=\\s*([\\[{][\\s\\S]*?)\\s*;`);
  const match = src.match(re);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function extractString(src: string, name: string): string | undefined {
  const match = src.match(new RegExp(`var\\s+${name}\\s*=\\s*"([^"]*)"`));
  return match?.[1];
}

function parseAlloc(raw: unknown): FundAllocSegment[] {
  const obj = raw as { series?: { name: string; data: number[] }[] } | null;
  if (!obj?.series?.length) return [];
  const pick = (label: string): number => {
    const segment = obj.series!.find((x) => x.name?.includes(label));
    const data = segment?.data;
    return data?.length ? data[data.length - 1] : 0;
  };
  return [
    { label: "股票", pct: pick("股票") },
    { label: "债券", pct: pick("债券") },
    { label: "现金", pct: pick("现金") },
  ].filter((segment) => segment.pct > 0);
}

function parseManager(raw: unknown): FundManagerInfo | undefined {
  const arr = raw as
    | { name?: string; star?: number; workTime?: string; fundSize?: string }[]
    | null;
  const manager = arr?.[0];
  if (!manager?.name) return undefined;
  return {
    name: manager.name,
    star: typeof manager.star === "number" ? manager.star : 0,
    workTime: manager.workTime ?? "",
    fundSize: manager.fundSize ?? "",
  };
}

function parseScale(raw: unknown): number | undefined {
  const obj = raw as { series?: { y: number }[] } | null;
  const y = obj?.series?.at(-1)?.y;
  return typeof y === "number" ? y : undefined;
}

function toFullCode(token: string): string | null {
  const [market, code] = token.split(".");
  if (!code) return null;
  if (market === "1") return `sh${code}`;
  if (market === "0") return `sz${code}`;
  return code;
}

export async function buildFundProfile(
  code: string,
  eastmoney: EastmoneyPort,
  sdk: SdkPort,
): Promise<FundProfile> {
  let assetAlloc: FundAllocSegment[] = [];
  let manager: FundManagerInfo | undefined;
  let fundSize: number | undefined;
  let topCodes: string[] = [];
  let name = "";

  try {
    const body = await eastmoney.fetchPingzhongScript(code);
    assetAlloc = parseAlloc(extractVar(body, "Data_assetAllocation"));
    manager = parseManager(extractVar(body, "Data_currentFundManager"));
    fundSize = parseScale(extractVar(body, "Data_fluctuationScale"));
    name = extractString(body, "fS_name") ?? "";

    const codesNew = extractVar(body, "stockCodesNew") as string[] | null;
    const codesOld = extractVar(body, "stockCodes") as string[] | null;
    if (Array.isArray(codesNew) && codesNew.length) {
      topCodes = codesNew.map(toFullCode).filter((c): c is string => Boolean(c));
    } else if (Array.isArray(codesOld)) {
      topCodes = codesOld.map((c) =>
        /^6/.test(c) ? `sh${c.slice(0, 6)}` : `sz${c.slice(0, 6)}`,
      );
    }
  } catch {
    // The profile panel can still render NAV history when Eastmoney shape shifts.
  }

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
      .then((quotes) => {
        const quote = quotes[0];
        if (!quote) return;
        accNav = quote.accNav;
        navDate = quote.navDate;
        if (!name && quote.name) name = quote.name;
      })
      .catch(() => {}),
  ]);

  let topHoldings: FundTopHolding[] = [];
  if (topCodes.length) {
    try {
      const quotes = await sdk.getSimpleQuotes(topCodes);
      const byBare = new Map<string, (typeof quotes)[number]>();
      quotes.forEach((quote) => byBare.set(quote.code, quote));
      topHoldings = topCodes.map((full) => {
        const bare = full.replace(/^(sh|sz|bj)/, "");
        const quote = byBare.get(bare);
        return {
          code: full,
          name: quote?.name ?? full,
          todayPct: quote?.changePercent ?? 0,
        };
      });
    } catch {
      topHoldings = topCodes.map((full) => ({ code: full, name: full, todayPct: 0 }));
    }
  }

  return {
    code,
    name,
    accNav,
    navDate,
    fundSize,
    assetAlloc,
    topHoldings,
    manager,
    navHistory,
  };
}
