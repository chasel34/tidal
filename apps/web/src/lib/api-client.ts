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

export async function apiKline(code: string): Promise<KlinePoint[]> {
  const data = await jsonFetch<{ points: KlinePoint[] }>(
    `/api/kline?code=${encodeURIComponent(code)}`
  );
  return data.points ?? [];
}

export async function apiMinute(code: string): Promise<MinutePoint[]> {
  const data = await jsonFetch<{ points: MinutePoint[] }>(
    `/api/minute?code=${encodeURIComponent(code)}`
  );
  return data.points ?? [];
}

export async function apiFundNav(code: string): Promise<FundNavPoint[]> {
  const data = await jsonFetch<{ points: FundNavPoint[] }>(
    `/api/fund-nav?code=${encodeURIComponent(code)}`
  );
  return data.points ?? [];
}

export async function apiFundProfile(code: string): Promise<FundProfile | null> {
  const data = await jsonFetch<{ profile: FundProfile | null }>(
    `/api/fund-profile?code=${encodeURIComponent(code)}`
  );
  return data.profile;
}
