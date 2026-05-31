import { create } from "zustand";
import { DEFAULT_CONFIG, INDICES } from "@shared/constants";
import { derivePortfolio } from "@shared/portfolio";
import type {
  Instrument,
  MenubarConfig,
  Quote,
  ResolvedTheme,
  SectionPrefs,
} from "@shared/types";

interface StoreState {
  hydrated: boolean;
  view: "popover" | "settings";
  config: MenubarConfig;
  resolvedTheme: ResolvedTheme;
  quotes: Record<string, Quote>;
  setView: (view: "popover" | "settings") => void;
  setResolvedTheme: (theme: ResolvedTheme) => void;
  setConfig: (config: MenubarConfig) => void;
  load: () => Promise<void>;
  saveConfig: (config: MenubarConfig) => Promise<void>;
  patchConfig: (patch: Partial<MenubarConfig>) => Promise<void>;
  setQuotes: (quotes: Quote[]) => void;
}

export const useMenubarStore = create<StoreState>((set, get) => ({
  hydrated: false,
  view: "popover",
  config: DEFAULT_CONFIG,
  resolvedTheme: "light",
  quotes: {},
  setView: (view) => set({ view }),
  setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
  setConfig: (config) => set({ config }),
  load: async () => {
    const [view, config, system] = await Promise.all([
      window.tidal.getView(),
      window.tidal.loadConfig(),
      window.tidal.getSystemState(),
    ]);
    set({
      view,
      config: { ...config, launchAtLogin: system.launchAtLogin },
      resolvedTheme: system.resolvedTheme,
      hydrated: true,
    });
  },
  saveConfig: async (config) => {
    const { config: saved } = await window.tidal.saveConfig(config);
    set({ config: saved });
  },
  patchConfig: async (patch) => {
    const next = mergeConfig(get().config, patch);
    const { config } = await window.tidal.saveConfig(next);
    set({ config });
  },
  setQuotes: (quotes) =>
    set((state) => {
      const next = { ...state.quotes };
      quotes.forEach((quote) => {
        next[quote.code] = quote;
      });
      return { quotes: next };
    }),
}));

function mergeConfig(config: MenubarConfig, patch: Partial<MenubarConfig>): MenubarConfig {
  return {
    ...config,
    ...patch,
    sections: { ...config.sections, ...(patch.sections ?? {}) },
  };
}

export function useConfig(): MenubarConfig {
  return useMenubarStore((state) => state.config);
}

export function useResolvedTheme(): ResolvedTheme {
  const config = useConfig();
  const systemTheme = useMenubarStore((state) => state.resolvedTheme);
  return config.theme === "auto" ? systemTheme : config.theme;
}

export function usePortfolioDerived() {
  const config = useConfig();
  const quotes = useMenubarStore((state) => state.quotes);
  return derivePortfolio({
    holdings: config.holdings,
    watch: config.watch,
    cash: config.cash,
    quotes,
  });
}

export function useQuoteInstruments(): Instrument[] {
  const config = useConfig();
  const map = new Map<string, Instrument>();
  config.holdings.forEach((holding) => map.set(holding.instrument.code, holding.instrument));
  config.watch.forEach((watch) => map.set(watch.code, watch));
  INDICES.forEach((index) => map.set(index.code, index));
  return [...map.values()];
}

export function patchSections(sections: Partial<SectionPrefs>) {
  const state = useMenubarStore.getState();
  return state.patchConfig({ sections: { ...state.config.sections, ...sections } });
}
