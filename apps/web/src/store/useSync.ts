"use client";

// 组合同步 orchestration for the web surface (ADR 0007). Holds the durable sync
// bookkeeping (account, cloud file id, last-synced revision/fingerprint) plus
// transient status, and drives the Google Drive transport. The 组合核心 itself
// lives in the main store (useStore); this store only reads/replaces it.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  buildSyncDocument,
  classifyFirstSync,
  coreFingerprint,
  detectChange,
  isEmptyCore,
  normalizeCore,
  parseSyncDocument,
  type FirstSyncCase,
  type PortfolioCore,
  type SyncSurface,
} from "@tidal/core";
import {
  fetchUserInfo,
  isAuthError,
  isGoogleConfigured,
  pull as drivePull,
  push as drivePush,
  remove as driveRemove,
  requestAccessToken,
  type AccessToken,
  type GoogleAccount,
} from "@/lib/google-drive";
import { useTidalStore } from "@/store/useStore";

export type SyncStatus =
  | "synced"
  | "pending"
  | "syncing"
  | "conflict"
  | "reauth"
  | "failed";

export type SyncScreen = "disconnected" | "firstSync" | "connected";
export type FailKind = "temp" | "badCloud" | "localWrite";
export type SyncDialog =
  | { type: "content" }
  | { type: "conflict" }
  | { type: "disconnect" }
  | { type: "confirm"; kind: ConfirmKind };

export type ConfirmKind =
  | "uploadOverwrite"
  | "restoreOverwrite"
  | "emptyOverwrite"
  | "badCloudOverwrite"
  | "deleteCloud";

interface SyncPersist {
  connected: boolean;
  account: GoogleAccount | null;
  fileId: string | null;
  syncedRevision: string | null;
  syncedFingerprint: string | null;
  lastSyncAt: string | null;
  source: SyncSurface | null;
}

interface SyncState extends SyncPersist {
  hydrated: boolean;
  screen: SyncScreen;
  status: SyncStatus;
  failKind: FailKind | null;
  fsCase: FirstSyncCase | null;
  cloudPreview: PortfolioCore | null;
  dialog: SyncDialog | null;
  oauth: boolean;
  errorMsg: string | null;

  setHydrated: (v: boolean) => void;
  openDialog: (d: SyncDialog) => void;
  closeDialog: () => void;

  connect: () => Promise<void>;
  cancelOauth: () => void;
  reauthLogin: () => Promise<void>;
  firstSync: (action: "upload" | "restore" | "syncEmpty" | "finish" | "later") => Promise<void>;
  syncNow: () => Promise<void>;
  resolveConflict: (keep: "local" | "cloud") => Promise<void>;
  confirm: (kind: ConfirmKind) => Promise<void>;
  disconnect: () => void;
  markLocalDirty: () => void;
  bootstrapPull: () => Promise<void>;
}

const STORAGE_KEY = "tidal-sync-v1";

function localCore(): PortfolioCore {
  const s = useTidalStore.getState();
  return normalizeCore({ holdings: s.holdings, watch: s.watch, cash: s.cash });
}

function applyCore(core: PortfolioCore): void {
  useTidalStore.getState().replacePortfolio(core);
}

function currentSurface(): SyncSurface {
  if (typeof window !== "undefined" && window.innerWidth < 768) return "mobile";
  return "web";
}

// in-memory only (never persisted): the access token + debounce timer.
let memToken: AccessToken | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function clearPushTimer() {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

/** Signals that no popup-free token is available → the caller must reauth. */
class NeedsAuthError extends Error {}

/** The in-memory token if still valid, else null. Never opens a popup. */
function cachedToken(): string | null {
  return memToken && memToken.expiresAt > Date.now() ? memToken.token : null;
}

/**
 * A valid token without ever opening a popup. Throws `NeedsAuthError` when none
 * is cached — the GIS token popup can only open from a user gesture, so
 * background paths (bootstrap, debounced push) surface reauth instead of a
 * browser-blocked popup.
 */
function requireCachedToken(): string {
  const token = cachedToken();
  if (!token) throw new NeedsAuthError();
  return token;
}

/**
 * Acquire a token via the GIS popup. The popup can ONLY open from a user
 * gesture, so this must be called from a click handler (connect / reauth) —
 * never from a background path like bootstrap or the debounced push.
 */
async function acquireToken(): Promise<string> {
  memToken = await requestAccessToken(true);
  return memToken.token;
}

export const useSync = create<SyncState>()(
  persist(
    (set, get) => {
      const fail = (kind: FailKind, msg?: string) =>
        set({ status: "failed", failKind: kind, errorMsg: msg ?? null });

      const onError = (err: unknown) => {
        if (err instanceof NeedsAuthError || isAuthError(err)) {
          memToken = null;
          set({ status: "reauth", errorMsg: null });
          return;
        }
        fail("temp", err instanceof Error ? err.message : String(err));
      };

      const markSynced = (revision: string, fingerprint: string) =>
        set({
          screen: "connected",
          status: "synced",
          failKind: null,
          errorMsg: null,
          syncedRevision: revision,
          syncedFingerprint: fingerprint,
          lastSyncAt: new Date().toISOString(),
          source: currentSurface(),
          cloudPreview: null,
        });

      // upload local 组合核心 as the new cloud truth
      const uploadLocal = async () => {
        const core = localCore();
        const token = requireCachedToken();
        const text = buildSyncDocument(core, currentSurface());
        const { id, revision } = await drivePush(token, get().fileId, text);
        set({ fileId: id });
        markSynced(revision, coreFingerprint(core));
      };

      // take the cloud 组合核心 and overwrite local
      const restoreCloud = async () => {
        const token = requireCachedToken();
        const file = await drivePull(token);
        if (!file) {
          // nothing in cloud → treat as upload of local
          await uploadLocal();
          return;
        }
        const parsed = parseSyncDocument(file.text);
        if (!parsed) {
          fail("badCloud");
          return;
        }
        applyCore(parsed.core);
        set({ fileId: file.id });
        markSynced(file.revision, coreFingerprint(parsed.core));
      };

      return {
        connected: false,
        account: null,
        fileId: null,
        syncedRevision: null,
        syncedFingerprint: null,
        lastSyncAt: null,
        source: null,

        hydrated: false,
        screen: "disconnected",
        status: "synced",
        failKind: null,
        fsCase: null,
        cloudPreview: null,
        dialog: null,
        oauth: false,
        errorMsg: null,

        setHydrated: (v) => set({ hydrated: v }),
        openDialog: (d) => set({ dialog: d }),
        closeDialog: () => set({ dialog: null }),

        connect: async () => {
          if (!isGoogleConfigured()) {
            set({ errorMsg: "未配置 Google Client ID" });
            return;
          }
          set({ oauth: true, errorMsg: null });
          try {
            const token = await acquireToken();
            // account info and the cloud file are independent — fetch concurrently
            const [account, file] = await Promise.all([fetchUserInfo(token), drivePull(token)]);
            const cloud = file ? parseSyncDocument(file.text) : null;
            const cloudCore = cloud?.core ?? null;
            const fsCase = classifyFirstSync(localCore(), cloudCore);
            set({
              oauth: false,
              connected: true,
              account,
              fileId: file?.id ?? null,
              screen: "firstSync",
              fsCase,
              cloudPreview: cloudCore,
              // remember the revision we observed so a later push isn't a false conflict
              syncedRevision: file?.revision ?? null,
            });
          } catch (err) {
            set({ oauth: false });
            if (isAuthError(err)) {
              // fresh token but Drive refused → the drive.appdata scope wasn't granted
              set({
                errorMsg:
                  "Google 拒绝了 Drive 访问：缺少「应用数据区」权限。请确认同意屏幕已添加 drive.appdata，并在授权时勾选该权限。",
              });
            } else {
              set({ errorMsg: err instanceof Error ? err.message : "连接失败" });
            }
          }
        },

        cancelOauth: () => {
          // keep any token already obtained (memToken lives outside the store)
          set({ oauth: false });
        },

        reauthLogin: async () => {
          set({ oauth: true });
          try {
            await acquireToken();
            set({ oauth: false, status: "syncing" });
            await get().syncNow();
          } catch {
            set({ oauth: false, status: "reauth" });
          }
        },

        firstSync: async (action) => {
          if (action === "later") {
            const localHasData = !isEmptyCore(localCore());
            set({
              screen: "connected",
              status: localHasData ? "pending" : "synced",
              dialog: null,
              cloudPreview: null,
            });
            return;
          }
          if (action === "finish") {
            // case B: nothing to sync, just settle as connected
            markSynced(get().syncedRevision ?? "", coreFingerprint(localCore()));
            set({ dialog: null });
            return;
          }
          set({ screen: "connected", status: "syncing", dialog: null });
          try {
            if (action === "restore") await restoreCloud();
            else await uploadLocal(); // "upload" | "syncEmpty"
          } catch (err) {
            onError(err);
          }
        },

        syncNow: async () => {
          if (!get().connected) return;
          set({ status: "syncing", errorMsg: null });
          clearPushTimer();
          try {
            const token = requireCachedToken();
            const file = await drivePull(token);
            const cloudRevision = file?.revision ?? null;
            const change = detectChange({
              localFingerprint: coreFingerprint(localCore()),
              syncedFingerprint: get().syncedFingerprint,
              cloudRevision,
              syncedRevision: get().syncedRevision,
            });

            if (change.conflict) {
              const parsed = file ? parseSyncDocument(file.text) : null;
              if (file && !parsed) {
                fail("badCloud");
                return;
              }
              set({
                status: "conflict",
                cloudPreview: parsed?.core ?? null,
                fileId: file?.id ?? get().fileId,
              });
              return;
            }
            if (change.cloudChanged) {
              // cloud moved, local didn't → adopt cloud
              const parsed = file ? parseSyncDocument(file.text) : null;
              if (file && !parsed) {
                fail("badCloud");
                return;
              }
              if (parsed) {
                applyCore(parsed.core);
                set({ fileId: file!.id });
                markSynced(file!.revision, coreFingerprint(parsed.core));
                return;
              }
            }
            if (!change.localChanged) {
              // nothing moved on either side → settle without a redundant write
              set({
                status: "synced",
                failKind: null,
                errorMsg: null,
                fileId: file?.id ?? get().fileId,
                syncedRevision: cloudRevision ?? get().syncedRevision,
              });
              return;
            }
            // local newer → push local
            await uploadLocal();
          } catch (err) {
            onError(err);
          }
        },

        resolveConflict: async (keep) => {
          set({ status: "syncing", dialog: null });
          try {
            if (keep === "local") await uploadLocal();
            else await restoreCloud();
          } catch (err) {
            onError(err);
          }
        },

        confirm: async (kind) => {
          set({ dialog: null });
          if (kind === "deleteCloud") {
            try {
              const token = requireCachedToken();
              const id = get().fileId;
              if (id) await driveRemove(token, id);
            } catch {
              /* deletion best-effort; disconnect regardless */
            }
            get().disconnect();
            return;
          }
          set({ status: "syncing" });
          try {
            if (kind === "restoreOverwrite") await restoreCloud();
            else await uploadLocal(); // upload / empty / badCloud overwrite
          } catch (err) {
            onError(err);
          }
        },

        disconnect: () => {
          memToken = null;
          clearPushTimer();
          set({
            connected: false,
            account: null,
            fileId: null,
            syncedRevision: null,
            syncedFingerprint: null,
            lastSyncAt: null,
            source: null,
            screen: "disconnected",
            status: "synced",
            failKind: null,
            cloudPreview: null,
            dialog: null,
            oauth: false,
            errorMsg: null,
          });
        },

        markLocalDirty: () => {
          const s = get();
          if (!s.connected || s.screen !== "connected") return;
          if (s.status === "syncing" || s.status === "conflict" || s.status === "reauth") return;
          const fp = coreFingerprint(localCore());
          if (fp === s.syncedFingerprint) return;
          set({ status: "pending" });
          clearPushTimer();
          pushTimer = setTimeout(() => {
            void get().syncNow();
          }, 2500);
        },

        bootstrapPull: async () => {
          if (!get().connected) return;
          // A fresh page load has no in-memory token, and the GIS popup can't
          // open without a user gesture. Skip the auto-pull instead of forcing a
          // blocked popup; the user's next sync/edit acquires a token via a click.
          if (!cachedToken()) return;
          await get().syncNow();
        },

      };
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): SyncPersist => ({
        connected: s.connected,
        account: s.account,
        fileId: s.fileId,
        syncedRevision: s.syncedRevision,
        syncedFingerprint: s.syncedFingerprint,
        lastSyncAt: s.lastSyncAt,
        source: s.source,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SyncPersist>;
        return {
          ...current,
          ...p,
          // a persisted "connected" account resumes on the connected screen
          screen: p.connected ? "connected" : "disconnected",
        };
      },
      skipHydration: true,
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

if (typeof window !== "undefined") {
  void useSync.persist.rehydrate();
  // Dev-only handle for driving sync states in E2E/CDP checks. Stripped from
  // production builds; never rely on this outside local verification.
  if (process.env.NODE_ENV !== "production") {
    (window as unknown as { __sync?: typeof useSync }).__sync = useSync;
  }
}
