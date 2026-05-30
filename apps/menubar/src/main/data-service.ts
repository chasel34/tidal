import { INDICES } from "@shared/constants";
import type {
  FundNavPoint,
  FundProfile,
  IndexQuote,
  Instrument,
  KlinePoint,
  MenubarConfig,
  MinutePoint,
  Quote,
  SearchResultDTO,
} from "@shared/types";
import type { SeriesPoint } from "@shared/series";
import { buildDailySeries, buildIntradaySeries } from "@shared/series";
import { checkPriceAlerts } from "./alerts";
import { buildFundProfile, type EastmoneyPort, type SdkPort } from "./fund-profile";
import { bareCode, getSdk, hasKlineMarket } from "./sdk";
import { fetchQuotes } from "./quote-service";

interface RawSearchResult {
  code: string;
  name: string;
  market: string;
  type: string;
  category?: SearchResultDTO["category"];
}

interface RawKline {
  date: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
}

interface RawMinute {
  time: string;
  close: number | null;
}

const NAV_TTL_MS = 10 * 60_000;
const PROFILE_TTL_MS = 10 * 60_000;
const navCache = new Map<string, { at: number; points: FundNavPoint[] }>();
const profileCache = new Map<string, { at: number; profile: FundProfile }>();

export async function refreshQuotes(
  items: Instrument[],
  config: MenubarConfig,
): Promise<Quote[]> {
  const quotes = await fetchQuotes(items);
  checkPriceAlerts(config, quotes);
  return quotes;
}

export async function search(q: string): Promise<SearchResultDTO[]> {
  if (!q.trim()) return [];
  const raw = (await getSdk().search(q.trim())) as RawSearchResult[];
  return raw.map((r) => ({
    code: r.code,
    name: r.name,
    market: r.market,
    type: r.type,
    category: r.category ?? "other",
  }));
}

function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 420);
  return (
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0")
  );
}

export async function getKline(code: string): Promise<KlinePoint[]> {
  if (!code) return [];
  const raw = (await getSdk().getHistoryKline(code, {
    period: "daily",
    adjust: "qfq",
    startDate: defaultStart(),
  })) as RawKline[];
  return raw
    .filter((k) => k.close != null)
    .map((k) => ({
      date: k.date,
      open: k.open ?? k.close!,
      close: k.close!,
      high: k.high ?? k.close!,
      low: k.low ?? k.close!,
      volume: k.volume ?? 0,
    }));
}

export async function getMinute(code: string): Promise<MinutePoint[]> {
  if (!code) return [];
  const raw = (await getSdk().getMinuteKline(code)) as RawMinute[];
  if (!raw.length) return [];
  const lastDay = (raw.at(-1)?.time ?? "").split(" ")[0];
  return raw
    .filter((p) => p.time?.startsWith(lastDay) && p.close != null)
    .map((p) => ({ time: p.time.split(" ")[1] ?? p.time, close: p.close! }));
}

export async function getFundNav(code: string): Promise<FundNavPoint[]> {
  const bare = bareCode(code);
  const cached = navCache.get(bare);
  if (cached && Date.now() - cached.at < NAV_TTL_MS) return cached.points;
  const h = (await getSdk().getFundNavHistory(bare)) as {
    items?: { date: string; nav: number }[];
  };
  const points = (h.items ?? [])
    .filter((p) => p.nav != null)
    .map((p) => ({ date: p.date, nav: p.nav }));
  navCache.set(bare, { at: Date.now(), points });
  return points;
}

const eastmoneyAdapter: EastmoneyPort = {
  async fetchPingzhongScript(code) {
    const res = await fetch(`https://fund.eastmoney.com/pingzhongdata/${code}.js`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: `https://fund.eastmoney.com/${code}.html`,
      },
      cache: "no-store",
    });
    if (!res.ok) return "";
    return res.text();
  },
};

function sdkAdapter(): SdkPort {
  const sdk = getSdk();
  return {
    getFundNavHistory: async (code) => {
      const h = (await sdk.getFundNavHistory(code)) as {
        items?: { date: string; nav: number }[];
      };
      return h.items ?? [];
    },
    getFundQuotes: (codes) =>
      sdk.getFundQuotes(codes) as Promise<
        { name?: string; accNav?: number; navDate?: string }[]
      >,
    getSimpleQuotes: (codes) =>
      sdk.getSimpleQuotes(codes) as Promise<
        { code: string; name: string; changePercent: number }[]
      >,
  };
}

export async function getFundProfile(code: string): Promise<FundProfile | null> {
  const bare = bareCode(code);
  if (!bare || !/^[a-zA-Z0-9]{4,10}$/.test(bare)) return null;
  const cached = profileCache.get(bare);
  if (cached && Date.now() - cached.at < PROFILE_TTL_MS) return cached.profile;
  const profile = await buildFundProfile(bare, eastmoneyAdapter, sdkAdapter());
  profileCache.set(bare, { at: Date.now(), profile });
  return profile;
}

export async function getPortfolioSeries(payload: {
  holdings: MenubarConfig["holdings"];
  cash: number;
  period: MenubarConfig["period"];
  quotes: Record<string, Quote>;
}): Promise<SeriesPoint> {
  const { holdings, cash, period, quotes } = payload;
  if (!holdings.length) return { series: [], labels: [] };
  if (period === "1D") {
    const minuteMap = new Map<string, Map<string, number>>();
    await Promise.all(
      holdings.map(async (holding) => {
        if (!hasKlineMarket(holding.instrument.market)) return;
        const points = await getMinute(holding.instrument.code).catch(() => []);
        if (!points.length) return;
        minuteMap.set(
          holding.instrument.code,
          new Map(points.map((point) => [point.time, point.close])),
        );
      }),
    );
    return buildIntradaySeries(holdings, cash, minuteMap, quotes);
  }

  const closesMap = new Map<string, Map<string, number>>();
  await Promise.all(
    holdings.map(async (holding) => {
      if (hasKlineMarket(holding.instrument.market)) {
        const points = await getKline(holding.instrument.code).catch(() => []);
        if (points.length) {
          closesMap.set(
            holding.instrument.code,
            new Map(points.map((point) => [point.date, point.close])),
          );
        }
      } else if (holding.instrument.market?.toLowerCase() === "jj") {
        const points = await getFundNav(holding.instrument.code).catch(() => []);
        if (points.length) {
          closesMap.set(
            holding.instrument.code,
            new Map(points.map((point) => [point.date, point.nav])),
          );
        }
      }
    }),
  );
  return buildDailySeries(holdings, cash, closesMap, period, quotes);
}

export async function getIndices(quotes: Record<string, Quote> = {}): Promise<IndexQuote[]> {
  return INDICES.map((idx) => ({
    name: idx.name,
    code: idx.code,
    value: quotes[idx.code]?.price ?? 0,
    pct: quotes[idx.code]?.changePercent ?? 0,
  }));
}
