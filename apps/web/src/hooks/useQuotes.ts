"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/store/useStore";
import { apiQuotes } from "@/lib/api-client";
import { INDICES, QUOTE_POLL_MS } from "@/lib/constants";
import type { IndexQuote, Instrument, Quote } from "@/lib/types";

/** Polls live quotes for holdings + watch + indices and feeds them into the store.
 *  Returns derived index quotes for the sidebar. */
export function useQuotes(): IndexQuote[] {
  const hydrated = useStore((state) => state.hydrated);
  const holdings = useStore((state) => state.holdings);
  const watch = useStore((state) => state.watch);
  const quotes = useStore((state) => state.quotes);
  const setQuotes = useStore((state) => state.setQuotes);

  const instruments = useMemo<Instrument[]>(() => {
    const map = new Map<string, Instrument>();
    holdings.forEach((h) => map.set(h.instrument.code, h.instrument));
    watch.forEach((w) => map.set(w.code, w));
    INDICES.forEach((i) => map.set(i.code, i));
    return [...map.values()];
  }, [holdings, watch]);

  // Stable signature for query key so it only changes when instrument set changes
  const sig = useMemo(
    () =>
      instruments
        .map((i) => `${i.code}|${i.market}|${i.category}|${i.type}`)
        .sort()
        .join(","),
    [instruments]
  );

  const instRef = useRef(instruments);
  useEffect(() => {
    instRef.current = instruments;
  }, [instruments]);

  const queryClient = useQueryClient();

  const { data } = useQuery<Quote[]>({
    queryKey: ["quotes", sig],
    queryFn: () => apiQuotes(instRef.current),
    refetchInterval: QUOTE_POLL_MS,
    enabled: hydrated && instruments.length > 0,
    staleTime: 0,
  });

  // Bridge: write fetched quotes into Zustand store (v5 has no onSuccess)
  useEffect(() => {
    if (!data?.length) return;
    setQuotes((prev) => {
      const next = { ...prev };
      for (const q of data) next[q.code] = q;
      return next;
    });
  }, [data, setQuotes]);

  // On unmount or when instruments change, cancel any in-flight refetch
  useEffect(() => {
    return () => {
      queryClient.cancelQueries({ queryKey: ["quotes"] });
    };
  }, [sig, queryClient]);

  return useMemo<IndexQuote[]>(
    () =>
      INDICES.map((idx) => {
        const q = quotes[idx.code];
        return {
          name: idx.name,
          code: idx.code,
          value: q?.price ?? 0,
          pct: q?.changePercent ?? 0,
        };
      }),
    [quotes]
  );
}
