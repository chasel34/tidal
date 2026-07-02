// 组合同步 — Google OAuth for the menubar (ADR 0007). Desktop loopback + PKCE
// flow run from the main process: opens the system browser, captures the code
// on a localhost server, exchanges it for tokens, and persists the refresh
// token encrypted via Electron safeStorage. Pure client-side; no backend.

import { app, net, safeStorage, shell } from "electron";
import { createHash, randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import { readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { MenubarSyncAccount } from "@shared/sync";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.appdata",
  "openid",
  "email",
  "profile",
].join(" ");

const AUTH_FILE = "google-auth.json";

// electron-vite injects MAIN_VITE_* into import.meta.env; fall back to process.env.
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const CLIENT_ID = env.MAIN_VITE_GOOGLE_CLIENT_ID ?? process.env.MAIN_VITE_GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET =
  env.MAIN_VITE_GOOGLE_CLIENT_SECRET ?? process.env.MAIN_VITE_GOOGLE_CLIENT_SECRET ?? "";

export function isConfigured(): boolean {
  return CLIENT_ID.length > 0 && CLIENT_SECRET.length > 0;
}

interface StoredAuth {
  /** base64 of safeStorage-encrypted refresh token. */
  refreshTokenEnc: string;
  account: MenubarSyncAccount;
}

let stored: StoredAuth | null = null;
let memAccess: { token: string; expiresAt: number } | null = null;

function authPath(): string {
  return join(app.getPath("userData"), AUTH_FILE);
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encryptToken(token: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(token).toString("base64");
  }
  // fallback (e.g. headless test env without keychain): store reversibly-marked
  return "plain:" + Buffer.from(token, "utf8").toString("base64");
}

function decryptToken(enc: string): string {
  if (enc.startsWith("plain:")) {
    return Buffer.from(enc.slice("plain:".length), "base64").toString("utf8");
  }
  return safeStorage.decryptString(Buffer.from(enc, "base64"));
}

export async function loadFromDisk(): Promise<void> {
  try {
    const raw = await readFile(authPath(), "utf8");
    const parsed = JSON.parse(raw) as StoredAuth;
    if (parsed && typeof parsed.refreshTokenEnc === "string" && parsed.account) {
      stored = parsed;
    }
  } catch {
    stored = null;
  }
}

export function isConnected(): boolean {
  return stored !== null;
}

export function getStoredAccount(): MenubarSyncAccount | null {
  return stored?.account ?? null;
}

async function persist(refreshToken: string, account: MenubarSyncAccount): Promise<void> {
  stored = { refreshTokenEnc: encryptToken(refreshToken), account };
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(authPath(), JSON.stringify(stored), "utf8");
}

export async function disconnect(): Promise<void> {
  stored = null;
  memAccess = null;
  await rm(authPath(), { force: true }).catch(() => {});
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

async function exchange(body: Record<string, string>): Promise<TokenResponse> {
  const res = await net.fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || json.error) {
    throw new Error(json.error_description || json.error || `令牌请求失败：${res.status}`);
  }
  return json;
}

/** Run the full interactive consent flow; returns the connected account. */
export async function connect(): Promise<MenubarSyncAccount> {
  if (!isConfigured()) throw new Error("未配置 Google 客户端（client id / secret）");

  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash("sha256").update(verifier).digest());

  const { code, redirectUri } = await captureAuthCode(challenge);
  const tokens = await exchange({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code_verifier: verifier,
  });

  if (tokens.scope !== undefined && !tokens.scope.includes("drive.appdata")) {
    throw new Error("未授予 Drive 应用数据区权限，请重新连接并在授权时勾选该权限。");
  }
  if (!tokens.refresh_token) {
    throw new Error("未获得长期授权令牌，请在授权页移除旧授权后重试。");
  }
  memAccess = {
    token: tokens.access_token ?? "",
    expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000 - 60_000,
  };
  const account = await fetchUserInfo(memAccess.token);
  await persist(tokens.refresh_token, account);
  return account;
}

/** Open the browser to Google and capture the redirect code on a loopback server. */
function captureAuthCode(challenge: string): Promise<{ code: string; redirectUri: string }> {
  return new Promise((resolve, reject) => {
    let server: Server | null = null;
    const timeout = setTimeout(() => {
      server?.close();
      reject(new Error("授权超时"));
    }, 5 * 60_000);

    server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;text-align:center;padding:48px;color:#272420">` +
          `<h2>${code ? "授权完成" : "授权未完成"}</h2><p>可以关闭此页面，返回 Tidal。</p></body>`,
      );
      clearTimeout(timeout);
      server?.close();
      if (code) resolve({ code, redirectUri });
      else reject(new Error(error || "授权被取消"));
    });

    let redirectUri = "";
    server.listen(0, "127.0.0.1", () => {
      const address = server?.address();
      const port = typeof address === "object" && address ? address.port : 0;
      redirectUri = `http://127.0.0.1:${port}`;
      const authUrl =
        "https://accounts.google.com/o/oauth2/v2/auth?" +
        new URLSearchParams({
          client_id: CLIENT_ID,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: SCOPES,
          code_challenge: challenge,
          code_challenge_method: "S256",
          access_type: "offline",
          prompt: "consent",
        }).toString();
      void shell.openExternal(authUrl);
    });
    server.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/** A valid access token, refreshing via the stored refresh token when needed. */
export async function getAccessToken(): Promise<string> {
  if (memAccess && memAccess.expiresAt > Date.now()) return memAccess.token;
  if (!stored) throw new Error("未连接 Google Drive");
  const refreshToken = decryptToken(stored.refreshTokenEnc);
  const tokens = await exchange({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  memAccess = {
    token: tokens.access_token ?? "",
    expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000 - 60_000,
  };
  return memAccess.token;
}

export async function fetchUserInfo(token: string): Promise<MenubarSyncAccount> {
  const res = await net.fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("无法获取账户信息");
  const json = (await res.json()) as { email?: string; name?: string };
  return { email: json.email ?? "", name: json.name || json.email || "Google 账户" };
}
