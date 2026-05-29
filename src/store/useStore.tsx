"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AllocationSegment,
  HoldingFull,
  HoldingItem,
  HoldingSortKey,
  Instrument,
  PortfolioSummary,
  Period,
  Quote,
  SortState,
  TabId,
  Theme,
  WatchFull,
  WatchItem,
  WatchSortKey,
} from "@/lib/types";

const STORAGE_KEY = "tidal-dashboard-v1";

interface PersistShape {
  theme: Theme;
  tab: TabId;
  period: Period;
  holdings: HoldingItem[];
  watch: WatchItem[];
  cash: number;
  sortH: SortState<HoldingSortKey>;
  sortW: SortState<WatchSortKey>;
}

const DEFAULT: PersistShape = {
  theme: "light",
  tab: "today",
  period: "1M",
  holdings: [],
  watch: [],
  cash: 0,
  sortH: { key: "weight", dir: "desc" },
  sortW: { key: "today", dir: "desc" },
};

function load(): PersistShape {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT, ...(JSON.parse(raw) as Partial<PersistShape>) };
  } catch {
    /* ignore */
  }
  return DEFAULT;
}

const typeLabel = (inst: Instrument): string => {
  if (inst.category === "index") return "指数";
  if (inst.category === "fund") return inst.type === "ETF" || inst.type === "LOF" ? "ETF" : "基金";
  if (inst.category === "stock") return "股票";
  return inst.type || "其他";
};

const unitLabel = (inst: Instrument): string =>
  inst.category === "stock" ? "股" : "份";

export interface Store {
  hydrated: boolean;
  theme: Theme;
  setTheme: (t: Theme) => void;
  tab: TabId;
  setTab: (t: TabId) => void;
  period: Period;
  setPeriod: (p: Period) => void;
  cash: number;
  setCash: (n: number) => void;

  holdings: HoldingItem[];
  watch: WatchItem[];
  quotes: Record<string, Quote>;
  setQuotes: (updater: (prev: Record<string, Quote>) => Record<string, Quote>) => void;

  holdingsFull: HoldingFull[];
  watchFull: WatchFull[];
  summary: PortfolioSummary;
  allocation: AllocationSegment[];
  sortedHoldings: HoldingFull[];
  sortedWatch: WatchFull[];

  sortH: SortState<HoldingSortKey>;
  sortW: SortState<WatchSortKey>;
  toggleSortH: (key: HoldingSortKey) => void;
  toggleSortW: (key: WatchSortKey) => void;

  addWatch: (inst: Instrument) => void;
  removeWatch: (code: string) => void;
  addHolding: (inst: Instrument, shares: number, cost: number) => void;
  updateHolding: (code: string, shares: number, cost: number) => void;
  removeHolding: (code: string) => void;
  importHoldings: (items: HoldingItem[]) => void;
  importWatch: (items: WatchItem[]) => void;
  resetAll: () => void;

  typeLabel: (inst: Instrument) => string;
  unitLabel: (inst: Instrument) => string;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<Theme>(DEFAULT.theme);
  const [tab, setTab] = useState<TabId>(DEFAULT.tab);
  const [period, setPeriod] = useState<Period>(DEFAULT.period);
  const [holdings, setHoldings] = useState<HoldingItem[]>(DEFAULT.holdings);
  const [watch, setWatch] = useState<WatchItem[]>(DEFAULT.watch);
  const [cash, setCash] = useState<number>(DEFAULT.cash);
  const [sortH, setSortH] = useState<SortState<HoldingSortKey>>(DEFAULT.sortH);
  const [sortW, setSortW] = useState<SortState<WatchSortKey>>(DEFAULT.sortW);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});

  // hydrate from localStorage on mount (client only)
  useEffect(() => {
    const s = load();
    /* eslint-disable react-hooks/set-state-in-effect */
    setTheme(s.theme);
    setTab(s.tab);
    setPeriod(s.period);
    setHoldings(s.holdings);
    setWatch(s.watch);
    setCash(s.cash);
    setSortH(s.sortH);
    setSortW(s.sortW);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // persist
  useEffect(() => {
    if (!hydrated) return;
    try {
      const data: PersistShape = {
        theme,
        tab,
        period,
        holdings,
        watch,
        cash,
        sortH,
        sortW,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [hydrated, theme, tab, period, holdings, watch, cash, sortH, sortW]);

  // reflect theme on <html> for global background
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  const holdingsFull = useMemo<HoldingFull[]>(() => {
    const list = holdings.map((h) => {
      const q = quotes[h.instrument.code];
      // before the first quote arrives, fall back to cost so the row shows a
      // neutral 0% P/L instead of a spurious -100%.
      const price = q?.price ?? h.cost;
      const prevClose = q?.prevClose ?? price;
      const todayPct = q?.changePercent ?? 0;
      const todayDelta = q ? price - prevClose : 0;
      const marketValue = h.shares * price;
      const costValue = h.shares * h.cost;
      const gainAbs = marketValue - costValue;
      const gainPct = costValue ? (gainAbs / costValue) * 100 : 0;
      const todayDeltaTotal = h.shares * todayDelta;
      return {
        ...h.instrument,
        shares: h.shares,
        cost: h.cost,
        price,
        prevClose,
        todayPct,
        todayDelta,
        marketValue,
        costValue,
        gainAbs,
        gainPct,
        todayDeltaTotal,
        weight: 0,
      };
    });
    const totalMV = list.reduce((s, h) => s + h.marketValue, 0) || 1;
    list.forEach((h) => {
      h.weight = (h.marketValue / totalMV) * 100;
    });
    return list;
  }, [holdings, quotes]);

  const watchFull = useMemo<WatchFull[]>(() => {
    return watch.map((w) => {
      const q = quotes[w.code];
      const price = q?.price ?? 0;
      const prevClose = q?.prevClose ?? price;
      return {
        ...w,
        price,
        prevClose,
        todayPct: q?.changePercent ?? 0,
        todayDelta: q ? price - prevClose : 0,
      };
    });
  }, [watch, quotes]);

  const summary = useMemo<PortfolioSummary>(() => {
    let marketValue = 0;
    let costValue = 0;
    let todayDelta = 0;
    holdingsFull.forEach((h) => {
      marketValue += h.marketValue;
      costValue += h.costValue;
      todayDelta += h.todayDeltaTotal;
    });
    const totalAssets = marketValue + cash;
    const totalGain = marketValue - costValue;
    const totalGainPct = costValue ? (totalGain / costValue) * 100 : 0;
    const prevMV = marketValue - todayDelta;
    const todayPct = prevMV ? (todayDelta / prevMV) * 100 : 0;
    return {
      marketValue,
      costValue,
      cash,
      totalAssets,
      todayDelta,
      todayPct,
      totalGain,
      totalGainPct,
    };
  }, [holdingsFull, cash]);

  const allocation = useMemo<AllocationSegment[]>(() => {
    const byType: Record<string, number> = {};
    holdingsFull.forEach((h) => {
      const label = typeLabel(h);
      byType[label] = (byType[label] || 0) + h.marketValue;
    });
    const segs = Object.entries(byType).map(([label, value]) => ({ label, value }));
    if (cash > 0) segs.push({ label: "现金", value: cash });
    return segs;
  }, [holdingsFull, cash]);

  const sortedHoldings = useMemo<HoldingFull[]>(() => {
    const arr = [...holdingsFull];
    const { key, dir } = sortH;
    const get = (h: HoldingFull): number | string =>
      ({
        today: h.todayPct,
        gain: h.gainPct,
        weight: h.weight,
        value: h.marketValue,
        name: h.code,
      }[key]);
    arr.sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (typeof av === "string" && typeof bv === "string")
        return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
    return arr;
  }, [holdingsFull, sortH]);

  const sortedWatch = useMemo<WatchFull[]>(() => {
    const arr = [...watchFull];
    const { key, dir } = sortW;
    const get = (w: WatchFull): number | string =>
      ({ today: w.todayPct, price: w.price, name: w.code }[key]);
    arr.sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (typeof av === "string" && typeof bv === "string")
        return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
    return arr;
  }, [watchFull, sortW]);

  const addWatch = useCallback((inst: Instrument) => {
    setWatch((w) => (w.some((x) => x.code === inst.code) ? w : [inst, ...w]));
  }, []);
  const removeWatch = useCallback((code: string) => {
    setWatch((w) => w.filter((c) => c.code !== code));
  }, []);
  const addHolding = useCallback(
    (inst: Instrument, shares: number, cost: number) => {
      setHoldings((hs) => {
        const exists = hs.find((h) => h.instrument.code === inst.code);
        if (exists)
          return hs.map((h) =>
            h.instrument.code === inst.code ? { instrument: inst, shares, cost } : h
          );
        return [...hs, { instrument: inst, shares, cost }];
      });
    },
    []
  );
  const updateHolding = useCallback(
    (code: string, shares: number, cost: number) => {
      setHoldings((hs) =>
        hs.map((h) => (h.instrument.code === code ? { ...h, shares, cost } : h))
      );
    },
    []
  );
  const removeHolding = useCallback((code: string) => {
    setHoldings((hs) => hs.filter((h) => h.instrument.code !== code));
  }, []);

  const importHoldings = useCallback((items: HoldingItem[]) => {
    setHoldings((hs) => {
      const map = new Map(hs.map((h) => [h.instrument.code, h]));
      items.forEach((item) => map.set(item.instrument.code, item));
      return Array.from(map.values());
    });
  }, []);

  const importWatch = useCallback((items: WatchItem[]) => {
    setWatch((ws) => {
      const existing = new Set(ws.map((w) => w.code));
      const toAdd = items.filter((item) => !existing.has(item.code));
      return [...ws, ...toAdd];
    });
  }, []);

  const toggleSortH = useCallback((key: HoldingSortKey) => {
    setSortH((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );
  }, []);
  const toggleSortW = useCallback((key: WatchSortKey) => {
    setSortW((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );
  }, []);

  const resetAll = useCallback(() => {
    setHoldings([]);
    setWatch([]);
    setCash(0);
  }, []);

  const value: Store = {
    hydrated,
    theme,
    setTheme,
    tab,
    setTab,
    period,
    setPeriod,
    cash,
    setCash,
    holdings,
    watch,
    quotes,
    setQuotes,
    holdingsFull,
    watchFull,
    summary,
    allocation,
    sortedHoldings,
    sortedWatch,
    sortH,
    sortW,
    toggleSortH,
    toggleSortW,
    addWatch,
    removeWatch,
    addHolding,
    updateHolding,
    removeHolding,
    importHoldings,
    importWatch,
    resetAll,
    typeLabel,
    unitLabel,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
