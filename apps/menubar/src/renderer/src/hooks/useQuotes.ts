import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useConfig, useMenubarStore, useQuoteInstruments } from "@/store/useMenubarStore";

export function useQuotes() {
  const config = useConfig();
  const hydrated = useMenubarStore((state) => state.hydrated);
  const setQuotes = useMenubarStore((state) => state.setQuotes);
  const instruments = useQuoteInstruments();
  const interval = config.refreshSec > 0 ? config.refreshSec * 1000 : false;
  const sig = useMemo(
    () =>
      instruments
        .map((i) => `${i.code}|${i.market}|${i.category}|${i.type}`)
        .sort()
        .join(","),
    [instruments],
  );

  const query = useQuery({
    queryKey: ["quotes", sig, config.refreshSec] as const,
    queryFn: () => window.tidal.refreshQuotes(instruments, config),
    enabled: hydrated && instruments.length > 0,
    refetchInterval: interval,
    staleTime: 0,
  });

  useEffect(() => {
    if (query.data?.length) setQuotes(query.data);
  }, [query.data, setQuotes]);

  return query;
}

export function useRefreshQuotes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["quotes"] });
}
