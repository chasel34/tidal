import { queryOptions } from "@tanstack/react-query";
import { apiKline, apiMinute, apiFundNav, apiFundProfile, apiSearch } from "./api-client";

// ── kline (daily OHLC) ─────────────────────────────────────────────
export const klineOptions = (code: string) =>
  queryOptions({
    queryKey: ["kline", code] as const,
    queryFn: () => apiKline(code),
    staleTime: 5 * 60_000,
  });

// ── minute (intraday) ──────────────────────────────────────────────
export const minuteOptions = (code: string) =>
  queryOptions({
    queryKey: ["minute", code] as const,
    queryFn: () => apiMinute(code),
    staleTime: 60_000,
  });

// ── fund NAV history ───────────────────────────────────────────────
export const fundNavOptions = (code: string) =>
  queryOptions({
    queryKey: ["fundNav", code] as const,
    queryFn: () => apiFundNav(code),
    staleTime: 5 * 60_000,
  });

// ── fund profile ───────────────────────────────────────────────────
export const fundProfileOptions = (code: string) =>
  queryOptions({
    queryKey: ["fundProfile", code] as const,
    queryFn: () => apiFundProfile(code),
    staleTime: Infinity,
  });

// ── search ─────────────────────────────────────────────────────────
export const searchOptions = (q: string) =>
  queryOptions({
    queryKey: ["search", q] as const,
    queryFn: () => apiSearch(q),
    staleTime: 30_000,
  });
