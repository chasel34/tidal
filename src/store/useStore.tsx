"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import {
  derivePortfolio,
  type PortfolioDerivation,
  typeLabel,
  unitLabel,
} from "@/lib/portfolio-derivation";
import type {
  HoldingItem,
  HoldingSortKey,
  Period,
  Quote,
  SortState,
  TabId,
  Theme,
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

interface TidalStore extends PersistShape {
  hydrated: boolean;
  quotes: Record<string, Quote>;

  setHydrated: (hydrated: boolean) => void;
  setTheme: (theme: Theme) => void;
  setTab: (tab: TabId) => void;
  setPeriod: (period: Period) => void;
  setCash: (cash: number) => void;
  setQuotes: (updater: (prev: Record<string, Quote>) => Record<string, Quote>) => void;

  toggleSortH: (key: HoldingSortKey) => void;
  toggleSortW: (key: WatchSortKey) => void;

  addWatch: (inst: WatchItem) => void;
  removeWatch: (code: string) => void;
  addHolding: (inst: HoldingItem["instrument"], shares: number, cost: number) => void;
  updateHolding: (code: string, shares: number, cost: number) => void;
  removeHolding: (code: string) => void;
  importHoldings: (items: HoldingItem[]) => void;
  importWatch: (items: WatchItem[]) => void;
  resetAll: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPersistShape(state: TidalStore): PersistShape {
  return {
    theme: state.theme,
    tab: state.tab,
    period: state.period,
    holdings: state.holdings,
    watch: state.watch,
    cash: state.cash,
    sortH: state.sortH,
    sortW: state.sortW,
  };
}

function wrapLegacyPersistValue(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isRecord(parsed) && "state" in parsed) return raw;
    if (isRecord(parsed)) return JSON.stringify({ state: parsed, version: 0 });
    console.warn("Ignoring invalid tidal store payload: expected an object.");
    return null;
  } catch (error) {
    console.warn("Ignoring invalid tidal store payload.", error);
    return null;
  }
}

function unwrapPersistValue(value: string): string {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (isRecord(parsed) && isRecord(parsed.state)) {
      return JSON.stringify(parsed.state);
    }
  } catch (error) {
    console.warn("Writing raw tidal store payload because persist value could not be decoded.", error);
  }
  return value;
}

const legacyStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(name);
    return raw ? wrapLegacyPersistValue(raw) : null;
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(name, unwrapPersistValue(value));
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(name);
  },
};

export const useTidalStore = create<TidalStore>()(
  persist(
    (set) => ({
      ...DEFAULT,
      hydrated: false,
      quotes: {},

      setHydrated: (hydrated) => set({ hydrated }),
      setTheme: (theme) => set({ theme }),
      setTab: (tab) => set({ tab }),
      setPeriod: (period) => set({ period }),
      setCash: (cash) => set({ cash }),
      setQuotes: (updater) =>
        set((state) => ({
          quotes: updater(state.quotes),
        })),

      toggleSortH: (key) =>
        set((state) => ({
          sortH:
            state.sortH.key === key
              ? { key, dir: state.sortH.dir === "asc" ? "desc" : "asc" }
              : { key, dir: "desc" },
        })),
      toggleSortW: (key) =>
        set((state) => ({
          sortW:
            state.sortW.key === key
              ? { key, dir: state.sortW.dir === "asc" ? "desc" : "asc" }
              : { key, dir: "desc" },
        })),

      addWatch: (inst) =>
        set((state) => ({
          watch: state.watch.some((x) => x.code === inst.code)
            ? state.watch
            : [inst, ...state.watch],
        })),
      removeWatch: (code) =>
        set((state) => ({
          watch: state.watch.filter((c) => c.code !== code),
        })),
      addHolding: (inst, shares, cost) =>
        set((state) => {
          const exists = state.holdings.find((h) => h.instrument.code === inst.code);
          return {
            holdings: exists
              ? state.holdings.map((h) =>
                  h.instrument.code === inst.code ? { instrument: inst, shares, cost } : h
                )
              : [...state.holdings, { instrument: inst, shares, cost }],
          };
        }),
      updateHolding: (code, shares, cost) =>
        set((state) => ({
          holdings: state.holdings.map((h) =>
            h.instrument.code === code ? { ...h, shares, cost } : h
          ),
        })),
      removeHolding: (code) =>
        set((state) => ({
          holdings: state.holdings.filter((h) => h.instrument.code !== code),
        })),
      importHoldings: (items) =>
        set((state) => {
          const map = new Map(state.holdings.map((h) => [h.instrument.code, h]));
          items.forEach((item) => map.set(item.instrument.code, item));
          return { holdings: Array.from(map.values()) };
        }),
      importWatch: (items) =>
        set((state) => {
          const existing = new Set(state.watch.map((w) => w.code));
          const toAdd = items.filter((item) => !existing.has(item.code));
          return { watch: [...state.watch, ...toAdd] };
        }),
      resetAll: () => set({ holdings: [], watch: [], cash: 0 }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => legacyStorage),
      partialize: toPersistShape,
      skipHydration: true,
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error("Failed to hydrate tidal store.", error);
        state?.setHydrated(true);
      },
    }
  )
);

export function useStore<T>(selector: (state: TidalStore) => T): T {
  return useTidalStore(selector);
}

export function usePortfolioDerived(): PortfolioDerivation {
  const { holdings, watch, cash, quotes, sortH, sortW } = useTidalStore(
    useShallow((state) => ({
      holdings: state.holdings,
      watch: state.watch,
      cash: state.cash,
      quotes: state.quotes,
      sortH: state.sortH,
      sortW: state.sortW,
    }))
  );

  return useMemo(
    () => derivePortfolio({ holdings, watch, cash, quotes, sortH, sortW }),
    [holdings, watch, cash, quotes, sortH, sortW]
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    if (useTidalStore.persist.hasHydrated()) {
      useTidalStore.getState().setHydrated(true);
      return;
    }
    void useTidalStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  return <>{children}</>;
}

export { typeLabel, unitLabel };
