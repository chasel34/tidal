import type {
  FundNavPoint,
  FundProfile,
  Instrument,
  KlinePoint,
  MinutePoint,
  Quote,
  SearchResultDTO,
} from "./types";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function apiSearch(q: string): Promise<SearchResultDTO[]> {
  if (!q.trim()) return [];
  const data = await jsonFetch<{ results: SearchResultDTO[] }>(
    `/api/search?q=${encodeURIComponent(q.trim())}`
  );
  return data.results ?? [];
}

export async function apiQuotes(items: Instrument[]): Promise<Quote[]> {
  if (!items.length) return [];
  const payload = items.map((i) => ({
    code: i.code,
    market: i.market,
    category: i.category,
    type: i.type,
  }));
  const data = await jsonFetch<{ quotes: Quote[] }>("/api/quotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: payload }),
  });
  return data.quotes ?? [];
}

const KLINE_TTL_MS = 5 * 60_000;
const klineCache = new Map<string, { at: number; points: KlinePoint[] }>();

export async function apiKline(code: string): Promise<KlinePoint[]> {
  const cached = klineCache.get(code);
  if (cached && Date.now() - cached.at < KLINE_TTL_MS) return cached.points;
  const data = await jsonFetch<{ points: KlinePoint[] }>(
    `/api/kline?code=${encodeURIComponent(code)}`
  );
  const points = data.points ?? [];
  if (points.length) klineCache.set(code, { at: Date.now(), points });
  return points;
}

const MINUTE_TTL_MS = 60_000;
const minuteCache = new Map<string, { at: number; points: MinutePoint[] }>();

export async function apiMinute(code: string): Promise<MinutePoint[]> {
  const cached = minuteCache.get(code);
  if (cached && Date.now() - cached.at < MINUTE_TTL_MS) return cached.points;
  const data = await jsonFetch<{ points: MinutePoint[] }>(
    `/api/minute?code=${encodeURIComponent(code)}`
  );
  const points = data.points ?? [];
  if (points.length) minuteCache.set(code, { at: Date.now(), points });
  return points;
}

const FUND_NAV_TTL_MS = 5 * 60_000;
const fundNavCache = new Map<string, { at: number; points: FundNavPoint[] }>();

export async function apiFundNav(code: string): Promise<FundNavPoint[]> {
  const cached = fundNavCache.get(code);
  if (cached && Date.now() - cached.at < FUND_NAV_TTL_MS) return cached.points;
  const data = await jsonFetch<{ points: FundNavPoint[] }>(
    `/api/fund-nav?code=${encodeURIComponent(code)}`
  );
  const points = data.points ?? [];
  if (points.length) fundNavCache.set(code, { at: Date.now(), points });
  return points;
}

const profileCache = new Map<string, FundProfile>();

export async function apiFundProfile(code: string): Promise<FundProfile | null> {
  if (profileCache.has(code)) return profileCache.get(code)!;
  const data = await jsonFetch<{ profile: FundProfile | null }>(
    `/api/fund-profile?code=${encodeURIComponent(code)}`
  );
  if (data.profile) profileCache.set(code, data.profile);
  return data.profile;
}
