import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import type { TidalApi } from "@shared/ipc";

const api: TidalApi = {
  getView: async () => {
    const params = new URLSearchParams(globalThis.location.search);
    return params.get("view") === "settings" ? "settings" : "popover";
  },
  loadConfig: () => ipcRenderer.invoke("config:load"),
  saveConfig: (config) => ipcRenderer.invoke("config:save", config),
  importConfig: (current) => ipcRenderer.invoke("config:import", current),
  exportConfig: (config) => ipcRenderer.invoke("config:export", config),
  onConfigChanged: (callback) => {
    const listener = (_event: IpcRendererEvent, config: Parameters<typeof callback>[0]) => {
      callback(config);
    };
    ipcRenderer.on("config:changed", listener);
    return () => ipcRenderer.removeListener("config:changed", listener);
  },
  getSystemState: () => ipcRenderer.invoke("system:get"),
  setLaunchAtLogin: (enabled) => ipcRenderer.invoke("system:setLaunchAtLogin", enabled),
  setTrayImage: (payload) => ipcRenderer.invoke("tray:setImage", payload),
  openDashboard: () => ipcRenderer.invoke("shell:openDashboard"),
  resizePopover: (height) => ipcRenderer.invoke("window:resizePopover", height),
  closePopover: () => ipcRenderer.invoke("window:closePopover"),
  closeSettings: () => ipcRenderer.invoke("window:closeSettings"),
  openSettings: () => ipcRenderer.invoke("window:openSettings"),
  refreshQuotes: (items, config) => ipcRenderer.invoke("market:quotes", items, config),
  search: (q) => ipcRenderer.invoke("market:search", q),
  getKline: (code) => ipcRenderer.invoke("market:kline", code),
  getMinute: (code) => ipcRenderer.invoke("market:minute", code),
  getFundNav: (code) => ipcRenderer.invoke("market:fundNav", code),
  getFundProfile: (code) => ipcRenderer.invoke("market:fundProfile", code),
  getPortfolioSeries: (payload) => ipcRenderer.invoke("market:portfolioSeries", payload),
  getIndices: () => ipcRenderer.invoke("market:indices"),
};

contextBridge.exposeInMainWorld("tidal", api);
