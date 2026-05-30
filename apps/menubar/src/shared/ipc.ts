import type {
  FundNavPoint,
  FundProfile,
  IndexQuote,
  Instrument,
  KlinePoint,
  MenubarConfig,
  MinutePoint,
  Period,
  Quote,
  SearchResultDTO,
} from "./types";
import type { SeriesPoint } from "./series";

export interface SaveConfigResult {
  config: MenubarConfig;
}

export interface ImportConfigResult {
  canceled: boolean;
  config?: MenubarConfig;
  message?: string;
}

export interface ExportConfigResult {
  canceled: boolean;
  path?: string;
}

export interface SystemState {
  resolvedTheme: "light" | "dark";
  launchAtLogin: boolean;
}

export interface TidalApi {
  getView: () => Promise<"popover" | "settings">;
  loadConfig: () => Promise<MenubarConfig>;
  saveConfig: (config: MenubarConfig) => Promise<SaveConfigResult>;
  importConfig: (current: MenubarConfig) => Promise<ImportConfigResult>;
  exportConfig: (config: MenubarConfig) => Promise<ExportConfigResult>;
  onConfigChanged: (callback: (config: MenubarConfig) => void) => () => void;
  getSystemState: () => Promise<SystemState>;
  setLaunchAtLogin: (enabled: boolean) => Promise<boolean>;
  setTraySummary: (payload: {
    mode: MenubarConfig["menubarMode"];
    totalAssets: number;
    todayPct: number;
    hasPortfolio: boolean;
    conv: MenubarConfig["conv"];
  }) => Promise<void>;
  openDashboard: () => Promise<void>;
  closePopover: () => Promise<void>;
  closeSettings: () => Promise<void>;
  openSettings: () => Promise<void>;
  refreshQuotes: (items: Instrument[], config: MenubarConfig) => Promise<Quote[]>;
  search: (q: string) => Promise<SearchResultDTO[]>;
  getKline: (code: string) => Promise<KlinePoint[]>;
  getMinute: (code: string) => Promise<MinutePoint[]>;
  getFundNav: (code: string) => Promise<FundNavPoint[]>;
  getFundProfile: (code: string) => Promise<FundProfile | null>;
  getPortfolioSeries: (payload: {
    holdings: MenubarConfig["holdings"];
    cash: number;
    period: Period;
    quotes: Record<string, Quote>;
  }) => Promise<SeriesPoint>;
  getIndices: () => Promise<IndexQuote[]>;
}

declare global {
  interface Window {
    tidal: TidalApi;
  }
}
