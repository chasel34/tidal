import { app, dialog } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { aiDefaultState, aiNormalize } from "@tidal/core";
import { DEFAULT_CONFIG } from "@shared/constants";
import type {
  HoldingItem,
  MenubarConfig,
  MenubarExport,
  Period,
  PriceAlert,
  ThemeMode,
  WatchItem,
} from "@shared/types";

const CONFIG_FILE = "menubar-config.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function configPath(): string {
  return join(app.getPath("userData"), CONFIG_FILE);
}

function isTheme(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "auto";
}

function isPeriod(value: unknown): value is Period {
  return value === "1D" || value === "1W" || value === "1M" || value === "3M" || value === "1Y";
}

function normalizeHolding(value: unknown): HoldingItem | null {
  if (!isRecord(value) || !isRecord(value.instrument)) return null;
  const { instrument } = value;
  if (
    typeof instrument.code !== "string" ||
    typeof instrument.name !== "string" ||
    typeof instrument.market !== "string" ||
    typeof instrument.category !== "string" ||
    typeof instrument.type !== "string"
  ) {
    return null;
  }
  const shares = Number(value.shares);
  const cost = Number(value.cost);
  if (!Number.isFinite(shares) || !Number.isFinite(cost) || shares < 0 || cost < 0) return null;
  return {
    instrument: {
      code: instrument.code,
      name: instrument.name,
      market: instrument.market,
      category: instrument.category as HoldingItem["instrument"]["category"],
      type: instrument.type,
    },
    shares,
    cost,
  };
}

function normalizeWatch(value: unknown): WatchItem | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.code !== "string" ||
    typeof value.name !== "string" ||
    typeof value.market !== "string" ||
    typeof value.category !== "string" ||
    typeof value.type !== "string"
  ) {
    return null;
  }
  return {
    code: value.code,
    name: value.name,
    market: value.market,
    category: value.category as WatchItem["category"],
    type: value.type,
  };
}

function normalizeAlert(value: unknown): PriceAlert | null {
  if (!isRecord(value)) return null;
  const dir = value.dir === "above" || value.dir === "below" ? value.dir : null;
  const price = Number(value.price);
  if (typeof value.code !== "string" || !dir || !Number.isFinite(price)) return null;
  return {
    id: typeof value.id === "string" ? value.id : `${value.code}-${dir}-${price}`,
    code: value.code,
    dir,
    price,
    on: typeof value.on === "boolean" ? value.on : true,
  };
}

export function normalizeConfig(input: unknown): MenubarConfig {
  const src = isRecord(input) ? input : {};
  const base = DEFAULT_CONFIG;
  const sections = isRecord(src.sections) ? src.sections : {};

  return {
    ...base,
    schema: "tidal-menubar-config",
    version: 1,
    theme: isTheme(src.theme) ? src.theme : base.theme,
    conv: src.conv === "greenUp" ? "greenUp" : "redUp",
    menubarMode:
      src.menubarMode === "icon" || src.menubarMode === "total" || src.menubarMode === "percent"
        ? src.menubarMode
        : base.menubarMode,
    refreshSec: Number.isFinite(Number(src.refreshSec)) ? Number(src.refreshSec) : base.refreshSec,
    launchAtLogin: typeof src.launchAtLogin === "boolean" ? src.launchAtLogin : base.launchAtLogin,
    notify: typeof src.notify === "boolean" ? src.notify : base.notify,
    sections: {
      trend: typeof sections.trend === "boolean" ? sections.trend : base.sections.trend,
      holdings: typeof sections.holdings === "boolean" ? sections.holdings : base.sections.holdings,
      watch: typeof sections.watch === "boolean" ? sections.watch : base.sections.watch,
      indices: typeof sections.indices === "boolean" ? sections.indices : base.sections.indices,
      actions: typeof sections.actions === "boolean" ? sections.actions : base.sections.actions,
    },
    period: isPeriod(src.period) ? src.period : base.period,
    alerts: Array.isArray(src.alerts)
      ? src.alerts.map(normalizeAlert).filter((a): a is PriceAlert => Boolean(a))
      : base.alerts,
    holdings: Array.isArray(src.holdings)
      ? src.holdings.map(normalizeHolding).filter((h): h is HoldingItem => Boolean(h))
      : base.holdings,
    watch: Array.isArray(src.watch)
      ? src.watch.map(normalizeWatch).filter((w): w is WatchItem => Boolean(w))
      : base.watch,
    cash: Number.isFinite(Number(src.cash)) ? Number(src.cash) : base.cash,
    ai: aiNormalize(src.ai),
  };
}

export async function loadConfig(): Promise<MenubarConfig> {
  try {
    const raw = await readFile(configPath(), "utf8");
    return normalizeConfig(JSON.parse(raw));
  } catch {
    const config = normalizeConfig(DEFAULT_CONFIG);
    await saveConfig(config);
    return config;
  }
}

export async function saveConfig(config: MenubarConfig): Promise<MenubarConfig> {
  const normalized = normalizeConfig(config);
  const file = configPath();
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(file, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

function fromMenubarImport(current: MenubarConfig, input: unknown): MenubarConfig | null {
  if (!isRecord(input)) return null;
  if (input.app === "tidal-menubar" && isRecord(input.config)) {
    return normalizeConfig({ ...input.config, ai: current.ai });
  }
  if (input.schema === "tidal-menubar-config") {
    return normalizeConfig({ ...input, ai: current.ai });
  }
  return null;
}

function mergeWebState(current: MenubarConfig, input: unknown): MenubarConfig | null {
  if (!isRecord(input) || !isRecord(input.state)) return null;
  const state = input.state;
  return normalizeConfig({
    ...current,
    holdings: state.holdings,
    watch: state.watch,
    cash: state.cash,
    theme: state.theme,
    period: state.period,
  });
}

function mergeWebExportEnvelope(current: MenubarConfig, input: unknown): MenubarConfig | null {
  if (!isRecord(input) || input.version !== 1 || !Array.isArray(input.data)) return null;
  if (input.type === "holdings") {
    return normalizeConfig({
      ...current,
      menubarMode: "icon",
      holdings: input.data,
    });
  }
  if (input.type === "watch") {
    return normalizeConfig({
      ...current,
      menubarMode: "icon",
      watch: input.data,
    });
  }
  return null;
}

export async function importConfigFromDialog(current: MenubarConfig): Promise<{
  canceled: boolean;
  config?: MenubarConfig;
  message?: string;
}> {
  const result = await dialog.showOpenDialog({
    title: "导入 Tidal 数据",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  try {
    const raw = await readFile(result.filePaths[0], "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const menubar = fromMenubarImport(current, parsed);
    const config = menubar ?? mergeWebState(current, parsed) ?? mergeWebExportEnvelope(current, parsed);
    if (!config) {
      return { canceled: false, message: "无法识别的 Tidal JSON 格式" };
    }
    const saved = await saveConfig(config);
    return { canceled: false, config: saved };
  } catch (error) {
    return {
      canceled: false,
      message: `导入失败：${(error as Error).message}`,
    };
  }
}

export async function exportConfigToDialog(config: MenubarConfig): Promise<{
  canceled: boolean;
  path?: string;
}> {
  const d = new Date();
  const fileName = `tidal-menubar-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.json`;
  const result = await dialog.showSaveDialog({
    title: "导出 Tidal 菜单栏数据",
    defaultPath: fileName,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };

  const payload: MenubarExport = {
    app: "tidal-menubar",
    exportedAt: new Date().toISOString(),
    // AI 识别配置 (含 API Key) 不进可分享的备份文件 (ADR 0005)。
    config: { ...normalizeConfig(config), ai: aiDefaultState() },
  };
  await writeFile(result.filePath, JSON.stringify(payload, null, 2), "utf8");
  return { canceled: false, path: result.filePath };
}
