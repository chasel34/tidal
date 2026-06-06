import { aiDefaultState } from "@tidal/core";
import type { Instrument, MenubarConfig, Period } from "./types";

export const DASHBOARD_URL = "https://tidal-murex.vercel.app/";

export const INDICES: Instrument[] = [
  { code: "sh000001", name: "上证指数", market: "sh", category: "index", type: "ZS" },
  { code: "sz399001", name: "深证成指", market: "sz", category: "index", type: "ZS" },
  { code: "sz399006", name: "创业板指", market: "sz", category: "index", type: "ZS" },
  { code: "sh000300", name: "沪深300", market: "sh", category: "index", type: "ZS" },
  { code: "sh000688", name: "科创50", market: "sh", category: "index", type: "ZS" },
];

export const PERIODS: Record<Exclude<Period, "1D">, number> = {
  "1W": 5,
  "1M": 22,
  "3M": 66,
  "1Y": 250,
};

export const DEFAULT_CONFIG: MenubarConfig = {
  schema: "tidal-menubar-config",
  version: 1,
  theme: "light",
  conv: "redUp",
  menubarMode: "icon",
  refreshSec: 15,
  launchAtLogin: false,
  notify: true,
  sections: { trend: true, holdings: true, watch: true, indices: true, actions: true },
  period: "1M",
  alerts: [],
  holdings: [],
  watch: [],
  cash: 0,
  ai: aiDefaultState(),
};
