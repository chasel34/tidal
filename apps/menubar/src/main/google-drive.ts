// 组合同步 — Google Drive 应用数据区 REST client for the menubar main process
// (ADR 0007). Uses Electron's net.fetch so requests go through Chromium's
// network stack (system proxy / VPN), not undici's direct connection — Google
// endpoints are often only reachable via the user's proxy.

import { net } from "electron";

const FILE_NAME = "tidal-portfolio.json";
const fetch = net.fetch;

export class DriveError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "DriveError";
    this.status = status;
  }
}

export function isAuthError(err: unknown): boolean {
  return err instanceof DriveError && (err.status === 401 || err.status === 403);
}

interface DriveFileMeta {
  id: string;
  headRevisionId?: string;
  modifiedTime?: string;
}

async function driveJson<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new DriveError(
      `Drive 请求失败：${res.status}${detail ? ` · ${detail.slice(0, 120)}` : ""}`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

async function findFile(token: string): Promise<DriveFileMeta | null> {
  const url =
    "https://www.googleapis.com/drive/v3/files" +
    "?spaces=appDataFolder&fields=files(id,headRevisionId,modifiedTime)&pageSize=10";
  const data = await driveJson<{ files?: DriveFileMeta[] }>(url, token);
  return (data.files ?? [])[0] ?? null;
}

export interface CloudFile {
  id: string;
  text: string;
  revision: string;
}

export async function pull(token: string): Promise<CloudFile | null> {
  const meta = await findFile(token);
  if (!meta) return null;
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${meta.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
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

export async function push(
  token: string,
  id: string | null,
  text: string,
): Promise<{ id: string; revision: string }> {
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
    const boundary = `tidal-${Date.now().toString(36)}`;
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
