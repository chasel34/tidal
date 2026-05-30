"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchOptions } from "@/lib/query-options";
import type { SearchResultDTO } from "@/lib/types";

/** Debounced instrument search against /api/search. */
export function useSearch(query: string): {
  results: SearchResultDTO[];
  loading: boolean;
} {
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const q = query.trim();
    const id = setTimeout(() => setDebouncedQ(q), q ? 280 : 0);
    return () => clearTimeout(id);
  }, [query]);

  const enabled = debouncedQ.length > 0;

  const { data, isFetching } = useQuery({
    ...searchOptions(debouncedQ),
    enabled,
  });

  return {
    results: enabled ? (data ?? []) : [],
    loading: isFetching || (query.trim() !== debouncedQ && query.trim().length > 0),
  };
}
