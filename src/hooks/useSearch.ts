"use client";

import { useEffect, useState } from "react";
import { apiSearch } from "@/lib/api-client";
import type { SearchResultDTO } from "@/lib/types";

/** Debounced instrument search against /api/search. */
export function useSearch(query: string): {
  results: SearchResultDTO[];
  loading: boolean;
} {
  const [results, setResults] = useState<SearchResultDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const r = await apiSearch(q);
        if (!cancelled) setResults(r);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query]);

  return { results, loading };
}
