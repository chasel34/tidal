// 组合同步 — orchestration for the menubar main process (ADR 0007). Owns the
// sync state machine and bookkeeping, drives the Drive transport, and applies
// the cloud 组合核心 to MenubarConfig with read-modify-write so non-core fields
// (theme, alerts, sections, ai…) are preserved.

import { app } from "electron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  buildSyncDocument,
  classifyFirstSync,
  coreFingerprint,
  detectChange,
  normalizeCore,
  parseSyncDocument,
  summarizeCore,
  type PortfolioCore,
} from "@tidal/core";
import type { MenubarConfig } from "@shared/types";
import type { MenubarSyncFailKind, MenubarSyncState, MenubarSyncStatus } from "@shared/sync";
import { loadConfig, saveConfig } from "./config-store";
import * as auth from "./google-auth";
import { isAuthError, pull as drivePull, push as drivePush, remove as driveRemove } from "./google-drive";

const STATE_FILE = "sync-state.json";
const SURFACE = "menubar" as const;

interface Bookkeeping {
  fileId: string | null;
  syncedRevision: string | null;
  syncedFingerprint: string | null;
  lastSyncAt: string | null;
  source: MenubarSyncState["source"];
}

const book: Bookkeeping = {
  fileId: null,
  syncedRevision: null,
  syncedFingerprint: null,
  lastSyncAt: null,
  source: null,
};

let status: MenubarSyncStatus = "synced";
let failKind: MenubarSyncFailKind | null = null;
let cloudPreview: PortfolioCore | null = null;
let errorMsg: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let notifier: ((state: MenubarSyncState) => void) | null = null;
let configNotifier: ((config: MenubarConfig) => void) | null = null;

function statePath(): string {
  return join(app.getPath("userData"), STATE_FILE);
}

function coreFromConfig(config: MenubarConfig): PortfolioCore {
  return normalizeCore({ holdings: config.holdings, watch: config.watch, cash: config.cash });
}

async function localCore(): Promise<PortfolioCore> {
  return coreFromConfig(await loadConfig());
}

/** Apply a cloud 组合核心 to the local config, preserving every other field. */
async function applyCore(core: PortfolioCore): Promise<void> {
  const current = await loadConfig();
  const saved = await saveConfig({
    ...current,
    holdings: core.holdings,
    watch: core.watch,
    cash: core.cash,
  });
  // Notify renderers so the popover list, quote polling, and tray title refresh.
  // (This is a remote-originated write, so it must NOT re-enter onLocalConfigSaved.)
  configNotifier?.(saved);
}

export function getState(): MenubarSyncState {
  return {
    configured: auth.isConfigured(),
    connected: auth.isConnected(),
    account: auth.getStoredAccount(),
    status,
    failKind,
    lastSyncAt: book.lastSyncAt,
    source: book.source,
    hasLocalChanges: status === "pending" || status === "conflict",
    cloudPreview: cloudPreview ? summarizeCore(cloudPreview) : null,
    errorMsg,
  };
}

export function setNotifier(cb: (state: MenubarSyncState) => void): void {
  notifier = cb;
}

/** Called when a pull applies cloud data locally, so the UI can refresh. */
export function setConfigNotifier(cb: (config: MenubarConfig) => void): void {
  configNotifier = cb;
}

function emit(): void {
  notifier?.(getState());
}

async function persistBook(): Promise<void> {
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(statePath(), JSON.stringify(book), "utf8");
}

export async function init(): Promise<void> {
  await auth.loadFromDisk();
  try {
    const raw = await readFile(statePath(), "utf8");
    Object.assign(book, JSON.parse(raw) as Bookkeeping);
  } catch {
    /* no prior state */
  }
  status = "synced";
}

function clearPushTimer(): void {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

async function markSynced(revision: string, fingerprint: string): Promise<void> {
  book.syncedRevision = revision;
  book.syncedFingerprint = fingerprint;
  book.lastSyncAt = new Date().toISOString();
  book.source = SURFACE;
  status = "synced";
  failKind = null;
  errorMsg = null;
  cloudPreview = null;
  await persistBook();
  emit();
  // A config save that landed while this sync was in flight was skipped by
  // onLocalConfigSaved (status was "syncing") — re-check so it isn't lost.
  const config = await loadConfig();
  if (coreFingerprint(coreFromConfig(config)) !== fingerprint) onLocalConfigSaved(config);
}

function onError(err: unknown): void {
  if (isAuthError(err)) {
    status = "reauth";
    errorMsg = null;
  } else {
    status = "failed";
    failKind = "temp";
    errorMsg = err instanceof Error ? err.message : String(err);
  }
  emit();
}

async function uploadLocal(): Promise<void> {
  const core = await localCore();
  const token = await auth.getAccessToken();
  const text = buildSyncDocument(core, SURFACE);
  const { id, revision } = await drivePush(token, book.fileId, text);
  book.fileId = id;
  await markSynced(revision, coreFingerprint(core));
}

async function restoreCloud(): Promise<void> {
  const token = await auth.getAccessToken();
  const file = await drivePull(token);
  if (!file) {
    await uploadLocal();
    return;
  }
  const parsed = parseSyncDocument(file.text);
  if (!parsed) {
    status = "failed";
    failKind = "badCloud";
    emit();
    return;
  }
  await applyCore(parsed.core);
  book.fileId = file.id;
  await markSynced(file.revision, coreFingerprint(parsed.core));
}

export async function connect(): Promise<void> {
  status = "syncing";
  errorMsg = null;
  emit();
  try {
    await auth.connect();
    const token = await auth.getAccessToken();
    const file = await drivePull(token);
    const cloud = file ? parseSyncDocument(file.text) : null;
    book.fileId = file?.id ?? null;
    book.syncedRevision = file?.revision ?? null;
    const local = await localCore();
    const fsCase = classifyFirstSync(local, cloud?.core ?? null);
    if (fsCase === "A" || fsCase === "B") {
      await uploadLocal();
    } else if (fsCase === "C") {
      await restoreCloud();
    } else {
      // D — both have data; let the user choose a whole snapshot
      cloudPreview = cloud?.core ?? null;
      status = "conflict";
      emit();
    }
  } catch (err) {
    if (isAuthError(err)) {
      status = "reauth";
    } else {
      status = "failed";
      failKind = "temp";
      errorMsg = err instanceof Error ? err.message : "连接失败";
    }
    emit();
  }
}

export async function syncNow(): Promise<void> {
  if (!auth.isConnected()) return;
  clearPushTimer();
  status = "syncing";
  errorMsg = null;
  emit();
  try {
    const token = await auth.getAccessToken();
    const file = await drivePull(token);
    const cloudRevision = file?.revision ?? null;
    const change = detectChange({
      localFingerprint: coreFingerprint(await localCore()),
      syncedFingerprint: book.syncedFingerprint,
      cloudRevision,
      syncedRevision: book.syncedRevision,
    });

    if (change.conflict) {
      const parsed = file ? parseSyncDocument(file.text) : null;
      if (file && !parsed) {
        status = "failed";
        failKind = "badCloud";
        emit();
        return;
      }
      cloudPreview = parsed?.core ?? null;
      book.fileId = file?.id ?? book.fileId;
      status = "conflict";
      emit();
      return;
    }
    if (change.cloudChanged) {
      const parsed = file ? parseSyncDocument(file.text) : null;
      if (file && !parsed) {
        status = "failed";
        failKind = "badCloud";
        emit();
        return;
      }
      if (parsed) {
        await applyCore(parsed.core);
        book.fileId = file!.id;
        await markSynced(file!.revision, coreFingerprint(parsed.core));
        return;
      }
    }
    if (!change.localChanged) {
      // nothing moved → settle without a redundant write
      status = "synced";
      failKind = null;
      errorMsg = null;
      book.fileId = file?.id ?? book.fileId;
      book.syncedRevision = cloudRevision ?? book.syncedRevision;
      await persistBook();
      emit();
      return;
    }
    await uploadLocal();
  } catch (err) {
    onError(err);
  }
}

export async function uploadOverwrite(): Promise<void> {
  status = "syncing";
  emit();
  try {
    await uploadLocal();
  } catch (err) {
    onError(err);
  }
}

export async function restoreOverwrite(): Promise<void> {
  status = "syncing";
  emit();
  try {
    await restoreCloud();
  } catch (err) {
    onError(err);
  }
}

export async function deleteCloud(): Promise<void> {
  try {
    const token = await auth.getAccessToken();
    if (book.fileId) await driveRemove(token, book.fileId);
  } catch {
    /* best effort */
  }
  await disconnect();
}

export async function disconnect(): Promise<void> {
  clearPushTimer();
  await auth.disconnect();
  book.fileId = null;
  book.syncedRevision = null;
  book.syncedFingerprint = null;
  book.lastSyncAt = null;
  book.source = null;
  status = "synced";
  failKind = null;
  cloudPreview = null;
  errorMsg = null;
  await persistBook();
  emit();
}

/** Called after the renderer saves config — schedules a debounced push. */
export function onLocalConfigSaved(config: MenubarConfig): void {
  if (!auth.isConnected()) return;
  if (status === "syncing" || status === "conflict" || status === "reauth") return;
  const fp = coreFingerprint(coreFromConfig(config));
  if (fp === book.syncedFingerprint) return;
  status = "pending";
  emit();
  clearPushTimer();
  pushTimer = setTimeout(() => {
    void syncNow();
  }, 2500);
}

/** Pull-on-launch: reconcile once at startup if connected. */
export async function bootstrap(): Promise<void> {
  if (!auth.isConnected()) return;
  await syncNow();
}
