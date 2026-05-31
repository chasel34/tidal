import type { Category, Quote } from "./types.ts";

export type QuoteSource = "ashare" | "fund" | "hk" | "us";

export interface QuoteRequestItem {
  code: string;
  market: string;
  category: Category;
  type: string;
}

export interface SimpleQuoteLike {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface FundQuoteLike {
  code: string;
  name: string;
  nav: number;
  accNav: number;
  change: number;
  navDate: string;
}

export interface FundEstimateLike {
  code: string;
  name: string;
  navDate: string | null;
  nav: number | null;
  estimatedNav: number | null;
  estimatedChangePercent: number | null;
  estimateTime: string | null;
}

export interface QuoteNormalizerPort {
  getSimpleQuotes(codes: string[]): Promise<SimpleQuoteLike[]>;
  getHKQuotes(codes: string[]): Promise<SimpleQuoteLike[]>;
  getUSQuotes(codes: string[]): Promise<SimpleQuoteLike[]>;
  getFundQuotes(codes: string[]): Promise<FundQuoteLike[]>;
  getFundEstimate(code: string): Promise<FundEstimateLike>;
}

export interface QuoteNormalizerConfig {
  fundEstimateTtlMs?: number;
}

export interface QuoteNormalizerOptions {
  port: QuoteNormalizerPort;
  config?: QuoteNormalizerConfig;
  now?: () => Date;
}

export interface QuoteNormalizer {
  fetchQuotes(items: QuoteRequestItem[]): Promise<Quote[]>;
}

export const DEFAULT_FUND_ESTIMATE_TTL_MS = 45_000;

export function createQuoteNormalizer(options: QuoteNormalizerOptions): QuoteNormalizer {
  const ttlMs = options.config?.fundEstimateTtlMs ?? DEFAULT_FUND_ESTIMATE_TTL_MS;
  const now = options.now ?? (() => new Date());
  const estimateCache = new Map<string, { at: number; estimate: FundEstimateLike }>();

  async function loadFundEstimate(bare: string): Promise<FundEstimateLike | null> {
    const nowMs = now().getTime();
    const cached = estimateCache.get(bare);
    if (cached && nowMs - cached.at < ttlMs) return cached.estimate;

    try {
      const estimate = await options.port.getFundEstimate(bare);
      estimateCache.set(bare, { at: nowMs, estimate });
      return estimate;
    } catch {
      return null;
    }
  }

  return {
    async fetchQuotes(items) {
      const ashareByMarket = new Map<string, string[]>();
      const funds: string[] = [];
      const hk: string[] = [];
      const us: string[] = [];
      const lookup = new Map<string, string>();

      for (const item of items) {
        if (!item.code) continue;
        lookup.set(`${item.market}:${bareCode(item.code)}`, item.code);
        const source = quoteSource(item);
        if (source === "fund") funds.push(item.code);
        else if (source === "hk") hk.push(item.code);
        else if (source === "us") us.push(item.code);
        else {
          const codes = ashareByMarket.get(item.market) ?? [];
          codes.push(item.code);
          ashareByMarket.set(item.market, codes);
        }
      }

      const resolve = (market: string, bare: string) =>
        lookup.get(`${market}:${bare}`) ?? bare;
      const quoteGroups: Promise<Quote[]>[] = [];

      for (const [market, codes] of ashareByMarket) {
        quoteGroups.push(
          options.port
            .getSimpleQuotes(codes)
            .then((quotes) => normalizeSimpleQuotes(market, quotes, resolve))
        );
      }
      if (hk.length) {
        quoteGroups.push(
          options.port
            .getHKQuotes(hk.map(bareCode))
            .then((quotes) => normalizeSimpleQuotes("hk", quotes, resolve))
        );
      }
      if (us.length) {
        quoteGroups.push(
          options.port
            .getUSQuotes(us.map(bareCode))
            .then((quotes) => normalizeSimpleQuotes("us", quotes, resolve))
        );
      }
      if (funds.length) {
        const fundMarket = items.find((item) => quoteSource(item) === "fund")?.market ?? "jj";
        const bareCodes = funds.map(bareCode);
        quoteGroups.push(
          normalizeFundQuotes(
            options.port,
            bareCodes,
            fundMarket,
            chinaDateStr(now()),
            resolve,
            loadFundEstimate
          )
        );
      }

      const groups = await Promise.all(quoteGroups);
      return groups.flat();
    },
  };
}

export function quoteSource(inst: QuoteRequestItem): QuoteSource {
  const market = inst.market?.toLowerCase();
  if (market === "hk") return "hk";
  if (market === "us") return "us";
  if (market === "jj") return "fund";
  if (inst.category === "fund" && market !== "sh" && market !== "sz" && market !== "bj") {
    return "fund";
  }
  return "ashare";
}

export function bareCode(code: string): string {
  return code.replace(/^(sh|sz|bj|hk|us|jj)/i, "");
}

function chinaDateStr(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
}

function normalizeSimpleQuotes(
  market: string,
  quotes: SimpleQuoteLike[],
  resolve: (market: string, bare: string) => string
): Quote[] {
  return quotes.map((quote) => {
    const prevClose = quote.price - quote.change;
    return {
      code: resolve(market, quote.code),
      name: quote.name,
      price: quote.price,
      prevClose,
      change: quote.change,
      changePercent: quote.changePercent,
    };
  });
}

async function normalizeFundQuotes(
  port: QuoteNormalizerPort,
  bareCodes: string[],
  fundMarket: string,
  today: string,
  resolve: (market: string, bare: string) => string,
  loadFundEstimate: (bare: string) => Promise<FundEstimateLike | null>
): Promise<Quote[]> {
  const [settledList, estimates] = await Promise.all([
    port.getFundQuotes(bareCodes),
    Promise.all(bareCodes.map(loadFundEstimate)),
  ]);
  const settledByCode = new Map<string, FundQuoteLike>();
  settledList.forEach((fund) => settledByCode.set(fund.code, fund));
  const estimateByCode = new Map<string, FundEstimateLike>();
  estimates.forEach((estimate) => {
    if (estimate) estimateByCode.set(estimate.code, estimate);
  });

  return bareCodes.map((bare) => {
    const settled = settledByCode.get(bare);
    const estimate = estimateByCode.get(bare);
    const settledNav = settled?.nav ?? estimate?.nav ?? 0;
    const settledNavDate = settled?.navDate ?? estimate?.navDate ?? "";
    const settledPct = settled?.change ?? 0;
    const settledPrevClose =
      settledPct === -100 ? settledNav : settledNav / (1 + settledPct / 100);
    const name = estimate?.name ?? settled?.name ?? bare;
    const accNav = settled?.accNav;
    const estimateTimeDay = estimate?.estimateTime?.slice(0, 10) ?? "";
    const useEstimate =
      Boolean(estimate) &&
      estimate?.estimatedNav != null &&
      estimate?.nav != null &&
      settledNavDate < today &&
      estimateTimeDay === today;

    if (useEstimate) {
      const estimatedNav = estimate!.estimatedNav!;
      const baseNav = estimate!.nav!;
      const estimatePct = estimate!.estimatedChangePercent ?? 0;
      return {
        code: resolve(fundMarket, bare),
        name,
        price: estimatedNav,
        prevClose: baseNav,
        change: estimatedNav - baseNav,
        changePercent: estimatePct,
        navDate: settledNavDate || undefined,
        nav: baseNav,
        accNav,
        estimatedNav,
        estimatedChangePercent: estimatePct,
        estimateTime: estimate!.estimateTime ?? undefined,
        estimated: true,
        baseNav,
      };
    }

    return {
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
    };
  });
}
