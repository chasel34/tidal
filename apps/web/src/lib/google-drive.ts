"use client";

// Browser transport for 组合同步 (ADR 0007): pure client-side, no backend.
// Auth uses the Google Identity Services (GIS) token client; storage uses the
// Drive 应用数据区 (appDataFolder) REST API. The access token lives only in
// memory; nothing here ever leaves the user's browser except calls to Google.

const SCOPES = [
  "https://www.googleapis.com/auth/drive.appdata",
  "openid",
  "email",
  "profile",
].join(" ");

const FILE_NAME = "tidal-portfolio.json";
const GIS_SRC = "https://accounts.google.com/gsi/client";

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export function isGoogleConfigured(): boolean {
  return GOOGLE_CLIENT_ID.length > 0;
}

// ---- GIS token client -------------------------------------------------------

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

/** Thrown when the user authorized but withheld the Drive appData permission. */
export class DriveScopeError extends Error {
  constructor() {
    super("未授予 Drive 应用数据区权限。请重新连接，并在 Google 授权页勾选「应用配置数据」权限。");
    this.name = "DriveScopeError";
  }
}

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
  callback: (resp: TokenResponse) => void;
}

interface GoogleOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    prompt?: string;
    callback: (resp: TokenResponse) => void;
    error_callback?: (err: { type?: string; message?: string }) => void;
  }) => TokenClient;
}

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth2 } };
  }
}

let gisPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("无法加载 Google 登录脚本")));
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("无法加载 Google 登录脚本"));
    document.head.appendChild(script);
  });
  return gisPromise;
}

let tokenClient: TokenClient | null = null;
let pending: { resolve: (t: AccessToken) => void; reject: (e: Error) => void } | null = null;

export interface AccessToken {
  token: string;
  /** epoch ms when this token should be considered expired. */
  expiresAt: number;
}

async function ensureClient(): Promise<TokenClient> {
  await loadGis();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error("Google 登录不可用");
  if (tokenClient) return tokenClient;
  tokenClient = oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: (resp) => {
      const p = pending;
      pending = null;
      if (!p) return;
      if (resp.error || !resp.access_token) {
        p.reject(new Error(resp.error_description || resp.error || "授权失败"));
        return;
      }
      // granular consent can grant openid/email/profile while withholding
      // drive.appdata — catch it here with a clear message instead of a later 403.
      if (resp.scope !== undefined && !resp.scope.includes("drive.appdata")) {
        p.reject(new DriveScopeError());
        return;
      }
      p.resolve({
        token: resp.access_token,
        expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000 - 60_000,
      });
    },
    error_callback: (err) => {
      const p = pending;
      pending = null;
      if (p) p.reject(new Error(err.message || "授权被取消"));
    },
  });
  return tokenClient;
}

/**
 * Request an access token. `interactive` shows the Google consent popup (first
 * connect / reauth); otherwise GIS silently re-issues while the Google session
 * is alive, falling back to an error the caller turns into the reauth state.
 */
export async function requestAccessToken(interactive: boolean): Promise<AccessToken> {
  const client = await ensureClient();
  if (pending) pending.reject(new Error("授权已被新的请求取代"));
  return new Promise<AccessToken>((resolve, reject) => {
    pending = { resolve, reject };
    client.requestAccessToken({ prompt: interactive ? "consent" : "" });
  });
}

// ---- userinfo ---------------------------------------------------------------

export interface GoogleAccount {
  email: string;
  name: string;
  picture?: string;
}

export async function fetchUserInfo(token: string): Promise<GoogleAccount> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new DriveError("无法获取账户信息", res.status);
  const json = (await res.json()) as { email?: string; name?: string; picture?: string };
  return {
    email: json.email ?? "",
    name: json.name || json.email || "Google 账户",
    picture: json.picture,
  };
}

// ---- Drive appData REST -----------------------------------------------------

export class DriveError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "DriveError";
    this.status = status;
  }
}

/** True when an error means the token is no longer accepted → reauth. */
export function isAuthError(err: unknown): boolean {
  return err instanceof DriveError && (err.status === 401 || err.status === 403);
}

async function driveJson<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new DriveError(`Drive 请求失败：${res.status}${detail ? ` · ${detail.slice(0, 120)}` : ""}`, res.status);
  }
  return (await res.json()) as T;
}

interface DriveFileMeta {
  id: string;
  headRevisionId?: string;
  modifiedTime?: string;
}

async function findFile(token: string): Promise<DriveFileMeta | null> {
  const url =
    "https://www.googleapis.com/drive/v3/files" +
    "?spaces=appDataFolder&fields=files(id,headRevisionId,modifiedTime)&pageSize=10";
  const data = await driveJson<{ files?: DriveFileMeta[] }>(url, token);
  const file = (data.files ?? [])[0];
  return file ?? null;
}

export interface CloudFile {
  id: string;
  text: string;
  revision: string;
}

/** Read the current cloud document, or null when none exists yet. */
export async function pull(token: string): Promise<CloudFile | null> {
  const meta = await findFile(token);
  if (!meta) return null;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${meta.id}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new DriveError(`Drive 读取失败：${res.status}${detail ? ` · ${detail.slice(0, 80)}` : ""}`, res.status);
  }
  const text = await res.text();
  return { id: meta.id, text, revision: meta.headRevisionId ?? meta.modifiedTime ?? "" };
}

function multipartBody(metadata: object, text: string, boundary: string): string {
  return (
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    "Content-Type: application/json\r\n\r\n" +
    `${text}\r\n` +
    `--${boundary}--`
  );
}

/** Create or overwrite the cloud document. Returns the new revision. */
export async function push(
  token: string,
  id: string | null,
  text: string,
): Promise<{ id: string; revision: string }> {
  const boundary = `tidal-${Date.now().toString(36)}`;
  const fields = "id,headRevisionId";
  let url: string;
  let method: string;
  let body: string;
  let contentType: string;

  if (id) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media&fields=${fields}`;
    method = "PATCH";
    body = text;
    contentType = "application/json";
  } else {
    url = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${fields}`;
    method = "POST";
    body = multipartBody({ name: FILE_NAME, parents: ["appDataFolder"] }, text, boundary);
    contentType = `multipart/related; boundary=${boundary}`;
  }

  const data = await driveJson<DriveFileMeta>(url, token, {
    method,
    headers: { "Content-Type": contentType },
    body,
  });
  return { id: data.id, revision: data.headRevisionId ?? "" };
}

export async function remove(token: string, id: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new DriveError(`Drive 删除失败：${res.status}`, res.status);
  }
}
