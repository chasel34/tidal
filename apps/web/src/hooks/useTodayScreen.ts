"use client";

import { useMemo } from "react";
import { usePortfolioDerived, useStore } from "@/store/useStore";
import { usePortfolioSeries } from "@/hooks/usePortfolioSeries";
import { useDailyCloses } from "@/hooks/useDailyCloses";
import { buildMiniInstruments } from "@/lib/today-screen";
import type {
  AllocationSegment,
  HoldingFull,
  Instrument,
  Period,
  PortfolioSummary,
  TabId,
  WatchFull,
} from "@/lib/types";

export interface TodayScreenData {
  summary: PortfolioSummary;
  allocation: AllocationSegment[];
  series: number[];
  labels: string[];
  seriesLoading: boolean;
  sortedHoldings: HoldingFull[];
  sortedWatch: WatchFull[];
  miniInstruments: Instrument[];
  sparks: Record<string, number[]>;
  period: Period;
  setPeriod: (p: Period) => void;
  setTab: (t: TabId) => void;
  isEmpty: boolean;
}

export function useTodayScreen(): TodayScreenData {
  const period = useStore((state) => state.period);
  const setPeriod = useStore((state) => state.setPeriod);
  const setTab = useStore((state) => state.setTab);
  const holdings = useStore((state) => state.holdings);
  const watch = useStore((state) => state.watch);
  const { summary, allocation, sortedHoldings, sortedWatch, watchFull } =
    usePortfolioDerived();
  const { series, labels, loading } = usePortfolioSeries(period);

  const miniInstruments = useMemo(
    () => buildMiniInstruments(sortedHoldings, watchFull),
    [sortedHoldings, watchFull],
  );
  const sparks = useDailyCloses(miniInstruments);

  return {
    summary,
    allocation,
    series,
    labels,
    seriesLoading: loading,
    sortedHoldings,
    sortedWatch,
    miniInstruments,
    sparks,
    period,
    setPeriod,
    setTab,
    isEmpty: !holdings.length && !watch.length,
  };
}
