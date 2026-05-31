import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  ipcMain,
  nativeImage,
  nativeTheme,
  screen,
  shell,
} from "electron";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { DASHBOARD_URL, INDICES } from "@shared/constants";
import type { TrayImagePayload } from "@shared/ipc";
import type { Instrument, MenubarConfig, Quote } from "@shared/types";
import {
  exportConfigToDialog,
  importConfigFromDialog,
  loadConfig,
  saveConfig,
} from "./config-store";
import {
  getFundNav,
  getFundProfile,
  getKline,
  getMinute,
  getPortfolioSeries,
  refreshQuotes,
  search,
} from "./data-service";

let tray: Tray | null = null;
let popoverWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let latestQuotes: Record<string, Quote> = {};

function plotPixel(buffer: Buffer, size: number, x: number, y: number, alpha: number) {
  if (x < 0 || y < 0 || x >= size || y >= size || alpha <= 0) return;
  const offset = (y * size + x) * 4;
  buffer[offset] = 0;
  buffer[offset + 1] = 0;
  buffer[offset + 2] = 0;
  buffer[offset + 3] = Math.max(buffer[offset + 3], Math.round(alpha * 255));
}

function drawSegment(buffer: Buffer, size: number, from: [number, number], to: [number, number]) {
  const radius = 1.35;
  const minX = Math.floor(Math.min(from[0], to[0]) - radius - 1);
  const maxX = Math.ceil(Math.max(from[0], to[0]) + radius + 1);
  const minY = Math.floor(Math.min(from[1], to[1]) - radius - 1);
  const maxY = Math.ceil(Math.max(from[1], to[1]) + radius + 1);
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const lenSq = dx * dx + dy * dy;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const t = Math.max(0, Math.min(1, ((x - from[0]) * dx + (y - from[1]) * dy) / lenSq));
      const px = from[0] + t * dx;
      const py = from[1] + t * dy;
      const distance = Math.hypot(x - px, y - py);
      const alpha = Math.max(0, Math.min(1, radius + 0.8 - distance));
      plotPixel(buffer, size, x, y, alpha);
    }
  }
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length);
  return chunk;
}

function encodePng(rgba: Buffer, size: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  const rowLength = size * 4;
  const scanlines = Buffer.alloc((rowLength + 1) * size);
  for (let y = 0; y < size; y += 1) {
    scanlines[y * (rowLength + 1)] = 0;
    rgba.copy(scanlines, y * (rowLength + 1) + 1, y * rowLength, (y + 1) * rowLength);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(scanlines)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function drawWave(buffer: Buffer, size: number, y: number) {
  const points: [number, number][] = [
    [11, y],
    [15, y - 2.4],
    [19, y],
    [23, y + 2.4],
    [27, y],
    [31, y - 2.4],
    [35, y],
  ];
  points.slice(1).forEach((point, index) => {
    drawSegment(buffer, size, points[index], point);
  });
}

function createTrayImage() {
  const size = 44;
  const buffer = Buffer.alloc(size * size * 4);
  drawWave(buffer, size, 13);
  drawWave(buffer, size, 22);
  drawWave(buffer, size, 31);
  const image = nativeImage.createFromBuffer(encodePng(buffer, size)).resize({
    width: 22,
    height: 22,
    quality: "best",
  });
  image.setTemplateImage(true);
  return image;
}

function loadRenderer(window: BrowserWindow, view: "popover" | "settings") {
  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    void window.loadURL(`${rendererUrl}?view=${view}`);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"), {
      query: { view },
    });
  }
}

function createPopoverWindow(): BrowserWindow {
  if (popoverWindow && !popoverWindow.isDestroyed()) return popoverWindow;
  popoverWindow = new BrowserWindow({
    width: 320,
    height: 640,
    show: false,
    frame: false,
    resizable: false,
    transparent: true,
    hasShadow: false,
    vibrancy: "popover",
    visualEffectState: "active",
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  popoverWindow.on("blur", () => {
    if (!settingsWindow?.isFocused()) popoverWindow?.hide();
  });
  popoverWindow.on("closed", () => {
    popoverWindow = null;
  });
  loadRenderer(popoverWindow, "popover");
  return popoverWindow;
}

function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) return settingsWindow;
  settingsWindow = new BrowserWindow({
    width: 760,
    height: 544,
    show: false,
    frame: false,
    resizable: false,
    title: "Tidal 设置",
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#1d1d21" : "#fbfaf6",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
  loadRenderer(settingsWindow, "settings");
  return settingsWindow;
}

function displayForTray() {
  const bounds = tray?.getBounds() ?? { x: 0, y: 0, width: 0, height: 24 };
  const display = screen.getDisplayNearestPoint({
    x: Math.round(bounds.x + bounds.width / 2),
    y: Math.round(bounds.y + bounds.height / 2),
  });
  return { bounds, display };
}

function positionPopover(window: BrowserWindow) {
  const { bounds, display } = displayForTray();
  const winBounds = window.getBounds();
  const workArea = display.workArea;
  // Align the popover's right edge to the tray item (design anchors right, not center).
  const x = Math.round(bounds.x + bounds.width - winBounds.width + 4);
  const y = Math.round(bounds.y + bounds.height + 6);
  const minX = workArea.x + 6;
  const minY = workArea.y + 6;
  const maxX = workArea.x + workArea.width - winBounds.width - 6;
  const maxY = workArea.y + workArea.height - winBounds.height - 6;
  const finalX = maxX >= minX ? Math.min(Math.max(minX, x), maxX) : minX;
  const finalY = maxY >= minY ? Math.min(Math.max(minY, y), maxY) : minY;
  window.setPosition(finalX, finalY, false);
}

function togglePopover() {
  const window = createPopoverWindow();
  if (window.isVisible()) {
    window.hide();
    return;
  }
  positionPopover(window);
  window.show();
  window.focus();
}

function openSettings() {
  const window = createSettingsWindow();
  window.center();
  window.show();
  window.focus();
}

function applyTrayImage(payload: TrayImagePayload) {
  if (!tray) return;
  let applied = false;
  if (payload.bitmap) {
    try {
      const image = nativeImage.createEmpty();
      image.addRepresentation(payload.bitmap);
      if (!image.isEmpty()) {
        image.setTemplateImage(payload.template ?? false);
        tray.setImage(image);
        if (process.platform === "darwin") tray.setTitle("");
        applied = true;
      }
    } catch (error) {
      console.warn("Unable to apply rendered tray image, falling back to text.", error);
    }
  }
  if (!applied) {
    // Fallback: monochrome glyph + plain title.
    tray.setImage(createTrayImage());
    if (process.platform === "darwin") tray.setTitle(payload.label ? ` ${payload.label}` : "");
  }
  tray.setToolTip(payload.tooltip || "Tidal 菜单栏看板");
}

function setLoginItem(enabled: boolean): boolean {
  try {
    app.setLoginItemSettings({ openAtLogin: enabled });
  } catch (error) {
    console.warn("Unable to update login item settings.", error);
  }
  return app.getLoginItemSettings().openAtLogin;
}

function broadcastConfigChanged(config: MenubarConfig) {
  [popoverWindow, settingsWindow].forEach((window) => {
    if (!window || window.isDestroyed()) return;
    window.webContents.send("config:changed", config);
  });
}

function setupIpc() {
  ipcMain.handle("config:load", () => loadConfig());
  ipcMain.handle("config:save", async (_event, config: MenubarConfig) => {
    const saved = await saveConfig(config);
    broadcastConfigChanged(saved);
    return { config: saved };
  });
  ipcMain.handle("config:import", async (_event, current: MenubarConfig) => {
    const result = await importConfigFromDialog(current);
    if (result.config) {
      const launchAtLogin = setLoginItem(result.config.launchAtLogin);
      const config =
        launchAtLogin === result.config.launchAtLogin
          ? result.config
          : await saveConfig({ ...result.config, launchAtLogin });
      broadcastConfigChanged(config);
      return { ...result, config };
    }
    return result;
  });
  ipcMain.handle("config:export", async (_event, config: MenubarConfig) =>
    exportConfigToDialog(config),
  );
  ipcMain.handle("system:get", () => ({
    resolvedTheme: nativeTheme.shouldUseDarkColors ? "dark" : "light",
    launchAtLogin: app.getLoginItemSettings().openAtLogin,
  }));
  ipcMain.handle("system:setLaunchAtLogin", (_event, enabled: boolean) => {
    return setLoginItem(enabled);
  });
  ipcMain.handle("tray:setImage", (_event, payload: TrayImagePayload) => {
    applyTrayImage(payload);
  });
  ipcMain.handle("shell:openDashboard", () => shell.openExternal(DASHBOARD_URL));
  ipcMain.handle("window:resizePopover", (_event, height: number) => {
    if (!popoverWindow || popoverWindow.isDestroyed()) return;
    const [width, current] = popoverWindow.getSize();
    const { display } = displayForTray();
    const next = Math.max(160, Math.min(Math.round(height), display.workArea.height - 12));
    if (next === current) return;
    popoverWindow.setSize(width, next, false);
    if (popoverWindow.isVisible()) positionPopover(popoverWindow);
  });
  ipcMain.handle("window:closePopover", () => {
    popoverWindow?.hide();
  });
  ipcMain.handle("window:closeSettings", () => {
    settingsWindow?.hide();
  });
  ipcMain.handle("window:openSettings", () => {
    popoverWindow?.hide();
    openSettings();
  });
  ipcMain.handle("market:quotes", async (_event, items: Instrument[], config: MenubarConfig) => {
    const quotes = await refreshQuotes(items, config);
    latestQuotes = { ...latestQuotes };
    quotes.forEach((quote) => {
      latestQuotes[quote.code] = quote;
    });
    return quotes;
  });
  ipcMain.handle("market:search", (_event, q: string) => search(q));
  ipcMain.handle("market:kline", (_event, code: string) => getKline(code));
  ipcMain.handle("market:minute", (_event, code: string) => getMinute(code));
  ipcMain.handle("market:fundNav", (_event, code: string) => getFundNav(code));
  ipcMain.handle("market:fundProfile", (_event, code: string) => getFundProfile(code));
  ipcMain.handle("market:portfolioSeries", (_event, payload) => getPortfolioSeries(payload));
  ipcMain.handle("market:indices", () =>
    INDICES.map((idx) => ({
      name: idx.name,
      code: idx.code,
      value: latestQuotes[idx.code]?.price ?? 0,
      pct: latestQuotes[idx.code]?.changePercent ?? 0,
    })),
  );
}

app.setName("Tidal");
if (process.env.TIDAL_E2E_USER_DATA) {
  app.setPath("userData", process.env.TIDAL_E2E_USER_DATA);
}
setupIpc();

void app.whenReady().then(async () => {
  if (process.platform === "darwin") app.dock?.hide();
  tray = new Tray(createTrayImage());
  tray.setIgnoreDoubleClickEvents(true);
  const trayMenu = Menu.buildFromTemplate([
    { label: "打开 Tidal", click: togglePopover },
    { label: "设置…", click: openSettings },
    { type: "separator" },
    { label: "退出", click: () => app.quit() },
  ]);
  tray.on("click", togglePopover);
  if (process.platform === "darwin") {
    tray.on("right-click", () => {
      trayMenu.popup();
    });
  } else {
    tray.setContextMenu(trayMenu);
  }
  const popover = createPopoverWindow();
  const config = await loadConfig();
  if (config.launchAtLogin) setLoginItem(true);
  if (process.env.TIDAL_E2E_SHOW === "popover") {
    positionPopover(popover);
    popover.show();
    popover.focus();
  }
});

app.on("window-all-closed", () => {});

app.on("before-quit", () => {
  popoverWindow?.removeAllListeners("close");
  settingsWindow?.removeAllListeners("close");
});
