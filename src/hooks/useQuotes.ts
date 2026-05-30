"use client";

import { useEffect, useMemo, useRef } from "react";
import { useStore } from "@/store/useStore";
import { apiQuotes } from "@/lib/api-client";
import { INDICES, QUOTE_POLL_MS } from "@/lib/constants";
import type { IndexQuote, Instrument } from "@/lib/types";

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

  // stable signature for the effect dependency
  const sig = useMemo(
    () => instruments.map((i) => i.code).sort().join(","),
    [instruments]
  );
  const instRef = useRef(instruments);
  useEffect(() => {
    instRef.current = instruments;
  }, [instruments]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const qs = await apiQuotes(instRef.current);
        if (cancelled || !qs.length) return;
        setQuotes((prev) => {
          const next = { ...prev };
          for (const q of qs) next[q.code] = q;
          return next;
        });
      } catch {
        /* ignore transient errors */
      }
    };

    tick();
    const id = setInterval(tick, QUOTE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [hydrated, sig, setQuotes]);

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
