import { bareCode, getSdk, quoteSource } from "./sdk";
import type { Category, Quote } from "@shared/types";

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
  change: number;
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

const ESTIMATE_TTL_MS = 45_000;
const estimateCache = new Map<string, { at: number; est: FundEstimateLike }>();

function chinaDateStr(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function loadFundEstimate(bare: string): Promise<FundEstimateLike | null> {
  const cached = estimateCache.get(bare);
  if (cached && Date.now() - cached.at < ESTIMATE_TTL_MS) return cached.est;
  try {
    const est = (await getSdk().getFundEstimate(bare)) as FundEstimateLike;
    estimateCache.set(bare, { at: Date.now(), est });
    return est;
  } catch {
    return cached?.est ?? null;
  }
}

export async function fetchQuotes(items: QuoteRequestItem[]): Promise<Quote[]> {
  const sdk = getSdk();
  const ashareByMarket = new Map<string, string[]>();
  const funds: string[] = [];
  const hk: string[] = [];
  const us: string[] = [];
  const lookup = new Map<string, string>();

  for (const item of items) {
    if (!item.code) continue;
    lookup.set(`${item.market}:${bareCode(item.code)}`, item.code);
    const src = quoteSource(item);
    if (src === "fund") funds.push(item.code);
    else if (src === "hk") hk.push(item.code);
    else if (src === "us") us.push(item.code);
    else {
      const list = ashareByMarket.get(item.market) ?? [];
      list.push(item.code);
      ashareByMarket.set(item.market, list);
    }
  }

  const resolve = (market: string, bare: string) => lookup.get(`${market}:${bare}`) ?? bare;
  const out: Quote[] = [];
  const tasks: Promise<void>[] = [];

  const pushStockLike = (market: string) => (quotes: SimpleQuoteLike[]) => {
    for (const quote of quotes) {
      const prevClose = quote.price - quote.change;
      out.push({
        code: resolve(market, quote.code),
        name: quote.name,
        price: quote.price,
        prevClose,
        change: quote.change,
        changePercent: quote.changePercent,
      });
    }
  };

  for (const [market, codes] of ashareByMarket) {
    tasks.push(sdk.getSimpleQuotes(codes).then(pushStockLike(market)).catch(() => {}));
  }
  if (hk.length) {
    tasks.push(
      sdk
        .getHKQuotes(hk.map(bareCode))
        .then(pushStockLike("hk"))
        .catch(() => {}),
    );
  }
  if (us.length) {
    tasks.push(
      sdk
        .getUSQuotes(us.map(bareCode))
        .then(pushStockLike("us"))
        .catch(() => {}),
    );
  }
  if (funds.length) {
    const fundMarket = items.find((i) => quoteSource(i) === "fund")?.market ?? "jj";
    const bareCodes = funds.map(bareCode);
    const today = chinaDateStr();
    tasks.push(
      (async () => {
        const [settledList, estimates] = await Promise.all([
          sdk.getFundQuotes(bareCodes).catch(() => [] as FundQuoteLike[]),
          Promise.all(bareCodes.map(loadFundEstimate)),
        ]);
        const settledByCode = new Map<string, FundQuoteLike>();
        settledList.forEach((fund) => settledByCode.set(fund.code, fund));
        const estByCode = new Map<string, FundEstimateLike>();
        estimates.forEach((estimate) => {
          if (estimate) estByCode.set(estimate.code, estimate);
        });

        for (const bare of bareCodes) {
          const settled = settledByCode.get(bare);
          const estimate = estByCode.get(bare);
          const settledNav = settled?.nav ?? estimate?.nav ?? 0;
          const settledNavDate = settled?.navDate ?? estimate?.navDate ?? "";
          const settledPct = settled?.change ?? 0;
          const settledPrevClose =
            settledPct === -100 ? settledNav : settledNav / (1 + settledPct / 100);
          const name = estimate?.name ?? settled?.name ?? bare;
          const accNav = settled?.accNav;
          const estTimeDay = estimate?.estimateTime?.slice(0, 10) ?? "";
          const useEstimate =
            Boolean(estimate) &&
            estimate?.estimatedNav != null &&
            estimate?.nav != null &&
            settledNavDate < today &&
            estTimeDay === today;

          if (useEstimate) {
            const estNav = estimate!.estimatedNav!;
            const baseNav = estimate!.nav!;
            const estPct = estimate!.estimatedChangePercent ?? 0;
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
              estimateTime: estimate!.estimateTime ?? undefined,
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
              estimatedNav: estimate?.estimatedNav ?? undefined,
              estimatedChangePercent: estimate?.estimatedChangePercent ?? undefined,
              estimateTime: estimate?.estimateTime ?? undefined,
              estimated: false,
              baseNav: settledPrevClose,
            });
          }
        }
      })().catch(() => {}),
    );
  }

  await Promise.all(tasks);
  return out;
}
