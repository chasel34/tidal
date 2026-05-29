import { getSdk, quoteSource, bareCode } from "./sdk";
import type { Category, Quote } from "./types";

export interface QuoteRequestItem {
  code: string;
  market: string;
  category: Category;
  type: string;
}

interface SimpleQuoteLike {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface FundQuoteLike {
  code: string;
  name: string;
  nav: number;
  accNav: number;
  change: number; // percent (despite SDK's "涨跌额" label — verified empirically)
  navDate: string;
}

interface FundEstimateLike {
  code: string;
  name: string;
  navDate: string | null;
  nav: number | null;
  estimatedNav: number | null;
  estimatedChangePercent: number | null;
  estimateTime: string | null;
}

/** Current calendar date in the A-share timezone (Asia/Shanghai), "YYYY-MM-DD". */
function chinaDateStr(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Short-lived cache for intraday fund estimates (protects the 8rps upstream
 *  limit and reduces churn from the 15s client poll). */
const ESTIMATE_TTL_MS = 45_000;
const estimateCache = new Map<string, { at: number; est: FundEstimateLike }>();

async function loadFundEstimate(
  sdk: ReturnType<typeof getSdk>,
  bare: string
): Promise<FundEstimateLike | null> {
  const cached = estimateCache.get(bare);
  if (cached && Date.now() - cached.at < ESTIMATE_TTL_MS) return cached.est;
  try {
    const est = (await sdk.getFundEstimate(bare)) as FundEstimateLike;
    estimateCache.set(bare, { at: Date.now(), est });
    return est;
  } catch {
    return cached?.est ?? null;
  }
}

/** Fetch + normalize quotes for a mixed list of instruments.
 *  Upstream returns bare codes (e.g. "600519") with no market info, so codes can
 *  collide across markets (sh000001 上证指数 vs sz000001 平安银行). We disambiguate
 *  by issuing per-market calls and mapping bare codes back to the original full
 *  codes within each market namespace (`${market}:${bareCode}`). */
export async function fetchQuotes(items: QuoteRequestItem[]): Promise<Quote[]> {
  const sdk = getSdk();
  const ashareByMarket = new Map<string, string[]>(); // market -> full codes
  const funds: string[] = [];
  const hk: string[] = [];
  const us: string[] = [];
  const lookup = new Map<string, string>(); // `${market}:${bareCode}` -> full code

  for (const it of items) {
    if (!it.code) continue;
    lookup.set(`${it.market}:${bareCode(it.code)}`, it.code);
    const src = quoteSource(it);
    if (src === "fund") funds.push(it.code);
    else if (src === "hk") hk.push(it.code);
    else if (src === "us") us.push(it.code);
    else {
      const arr = ashareByMarket.get(it.market) ?? [];
      arr.push(it.code);
      ashareByMarket.set(it.market, arr);
    }
  }

  const resolve = (market: string, bare: string) =>
    lookup.get(`${market}:${bare}`) ?? bare;
  const out: Quote[] = [];
  const tasks: Promise<void>[] = [];

  const pushStockLike = (market: string) => (qs: SimpleQuoteLike[]) => {
    for (const q of qs) {
      const prevClose = q.price - q.change;
      out.push({
        code: resolve(market, q.code),
        name: q.name,
        price: q.price,
        prevClose,
        change: q.change,
        changePercent: q.changePercent,
      });
    }
  };

  for (const [market, codes] of ashareByMarket) {
    tasks.push(
      sdk.getSimpleQuotes(codes).then(pushStockLike(market)).catch(() => {})
    );
  }
  if (hk.length) {
    tasks.push(
      sdk
        .getHKQuotes(hk.map(bareCode))
        .then(pushStockLike("hk"))
        .catch(() => {})
    );
  }
  if (us.length) {
    tasks.push(
      sdk
        .getUSQuotes(us.map(bareCode))
        .then(pushStockLike("us"))
        .catch(() => {})
    );
  }
  if (funds.length) {
    // funds all share market "jj" in their request items
    const fundMarket = items.find((i) => quoteSource(i) === "fund")?.market ?? "jj";
    const bareCodes = funds.map(bareCode);
    const today = chinaDateStr();
    tasks.push(
      (async () => {
        const [settledList, estimates] = await Promise.all([
          sdk.getFundQuotes(bareCodes).catch(() => [] as FundQuoteLike[]),
          Promise.all(bareCodes.map((c) => loadFundEstimate(sdk, c))),
        ]);
        const settledByCode = new Map<string, FundQuoteLike>();
        for (const f of settledList) settledByCode.set(f.code, f);
        const estByCode = new Map<string, FundEstimateLike>();
        for (const e of estimates) if (e) estByCode.set(e.code, e);

        for (const bare of bareCodes) {
          const settled = settledByCode.get(bare);
          const est = estByCode.get(bare);
          // settled NAV is the source of truth for confirmed numbers
          const settledNav = settled?.nav ?? est?.nav ?? 0;
          const settledNavDate = settled?.navDate ?? est?.navDate ?? "";
          const settledPct = settled?.change ?? 0;
          const settledPrevClose =
            settledPct === -100 ? settledNav : settledNav / (1 + settledPct / 100);
          const name = est?.name ?? settled?.name ?? bare;
          const accNav = settled?.accNav;

          // Use the intraday estimate only when: today's NAV is not yet settled,
          // an estimate exists, and the estimate timestamp is from today (CN tz).
          const estTimeDay = est?.estimateTime?.slice(0, 10) ?? "";
          const useEstimate =
            !!est &&
            est.estimatedNav != null &&
            est.nav != null &&
            settledNavDate < today &&
            estTimeDay === today;

          if (useEstimate) {
            const estNav = est!.estimatedNav!;
            const baseNav = est!.nav!;
            const estPct = est!.estimatedChangePercent ?? 0;
            out.push({
              code: resolve(fundMarket, bare),
              name,
              price: estNav,
              prevClose: baseNav,
              change: estNav - baseNav,
              changePercent: estPct,
              navDate: settledNavDate || undefined,
              nav: baseNav,
              accNav,
              estimatedNav: estNav,
              estimatedChangePercent: estPct,
              estimateTime: est!.estimateTime ?? undefined,
              estimated: true,
              baseNav,
            });
          } else {
            out.push({
              code: resolve(fundMarket, bare),
              name,
              price: settledNav,
              prevClose: settledPrevClose,
              change: settledNav - settledPrevClose,
              changePercent: settledPct,
              navDate: settledNavDate || undefined,
              nav: settledNav,
              accNav,
              estimatedNav: est?.estimatedNav ?? undefined,
              estimatedChangePercent: est?.estimatedChangePercent ?? undefined,
              estimateTime: est?.estimateTime ?? undefined,
              estimated: false,
              baseNav: settledPrevClose,
            });
          }
        }
      })().catch(() => {})
    );
  }

  await Promise.all(tasks);
  return out;
}
