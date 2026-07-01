// 组合同步 — shared types for the menubar IPC surface (ADR 0007). The heavy
// lifting (OAuth loopback + Drive REST) lives in the main process; the renderer
// only renders this state and calls the sync actions.

export type MenubarSyncStatus =
  | "synced"
  | "pending"
  | "syncing"
  | "conflict"
  | "reauth"
  | "failed";

export type MenubarSyncFailKind = "temp" | "badCloud" | "localWrite";

export interface MenubarSyncAccount {
  email: string;
  name: string;
}

export interface CoreCounts {
  holdings: number;
  watch: number;
  cash: number;
}

export interface MenubarSyncState {
  /** client id + secret are present, so connecting is possible. */
  configured: boolean;
  connected: boolean;
  account: MenubarSyncAccount | null;
  status: MenubarSyncStatus;
  failKind: MenubarSyncFailKind | null;
  /** ISO timestamp of last successful sync. */
  lastSyncAt: string | null;
  /** which surface last wrote the cloud copy. */
  source: "web" | "menubar" | "mobile" | null;
  /** true when local 组合核心 differs from the last synced snapshot. */
  hasLocalChanges: boolean;
  /** cloud snapshot summary, for the first-sync(D) / conflict choice. */
  cloudPreview: CoreCounts | null;
  /** transient human-readable error. */
  errorMsg: string | null;
}

export type MenubarSyncAction =
  | "connect"
  | "disconnect"
  | "syncNow"
  | "uploadOverwrite"
  | "restoreOverwrite"
  | "deleteCloud";
