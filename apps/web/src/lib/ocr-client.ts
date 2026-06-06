"use client";

import {
  buildScreenshotRequest,
  extractRowsFromResponse,
  parseResponsesText,
  type ExtractedRow,
  type ResolvedOcrConfig,
} from "@tidal/core";

/**
 * Browser-direct transport for 截图导入 (ADR 0005): the API key never leaves
 * the client — we fetch 火山 straight from the page, no proxy server.
 */
export async function ocrExtract(
  imageDataUrl: string,
  cfg: ResolvedOcrConfig,
): Promise<ExtractedRow[]> {
  const req = buildScreenshotRequest(imageDataUrl, cfg);
  let res: Response;
  try {
    res = await fetch(req.url, { method: "POST", headers: req.headers, body: req.body });
  } catch {
    throw new Error("无法连接识别服务（可能被浏览器跨域拦截）");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`识别请求失败：${res.status}${detail ? ` · ${detail.slice(0, 120)}` : ""}`);
  }
  const json = (await res.json()) as unknown;
  return extractRowsFromResponse(json);
}

/** A lightweight call that confirms the key/model are usable. */
export async function ocrTestConnection(cfg: ResolvedOcrConfig): Promise<void> {
  if (!cfg.apiKey) throw new Error("请先填写 API Key");
  const url = `${cfg.baseURL.replace(/\/+$/, "")}/responses`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.model,
        input: [{ role: "user", content: [{ type: "input_text", text: "ping，请回复 ok" }] }],
        max_output_tokens: 16,
      }),
    });
  } catch {
    throw new Error("无法连接（可能被浏览器跨域拦截）");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`连接失败：${res.status}${detail ? ` · ${detail.slice(0, 120)}` : ""}`);
  }
  // touch the body so a malformed reply still surfaces as an error
  parseResponsesText((await res.json()) as unknown);
}

/**
 * Read a screenshot file and downscale it (longest side ≤ maxDim) into a JPEG
 * data URL, to cut image tokens and speed up the call.
 */
export function fileToDownscaledDataUrl(file: File, maxDim = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("无法解析图片"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
