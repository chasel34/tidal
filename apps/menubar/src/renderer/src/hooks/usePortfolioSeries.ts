import { useQuery } from "@tanstack/react-query";
import { useConfig, useMenubarStore } from "@/store/useMenubarStore";

export function usePortfolioSeries() {
  const config = useConfig();
  const quotes = useMenubarStore((state) => state.quotes);
  const hydrated = useMenubarStore((state) => state.hydrated);
  const sig =
    config.period +
    "|" +
    config.cash +
    "|" +
    config.holdings
      .map((h) => `${h.instrument.code}:${h.shares}:${quotes[h.instrument.code]?.price ?? ""}`)
      .sort()
      .join(",");
  return useQuery({
    queryKey: ["portfolioSeries", sig] as const,
    queryFn: () =>
      window.tidal.getPortfolioSeries({
        holdings: config.holdings,
        cash: config.cash,
        period: config.period,
        quotes,
      }),
    enabled: hydrated && config.holdings.length > 0,
    staleTime: 60_000,
    // live prices are baked into the key — keep the last chart while the new
    // key computes so every quote poll doesn't flash the empty state
    placeholderData: (previous) => previous,
  });
}
