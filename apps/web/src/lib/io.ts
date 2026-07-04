import type { Category, HoldingItem, WatchItem } from "@/lib/types";

const KNOWN_CATEGORIES: Category[] = [
  "stock",
  "index",
  "fund",
  "bond",
  "futures",
  "option",
  "other",
];

export interface ExportEnvelope<T> {
  version: 1;
  type: "holdings" | "watch";
  exportedAt: string;
  data: T;
}

export function exportJSON(
  type: "holdings" | "watch",
  data: HoldingItem[] | WatchItem[]
): void {
  const envelope: ExportEnvelope<typeof data> = {
    version: 1,
    type,
    exportedAt: new Date().toISOString(),
    data,
  };
  const blob = new Blob([JSON.stringify(envelope, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isPositiveFinite(v: unknown): v is number {
  return typeof v === "number" && isFinite(v) && v > 0;
}

function validateInstrument(obj: unknown): void {
  if (!obj || typeof obj !== "object") throw new Error("无效的 instrument 对象");
  const o = obj as Record<string, unknown>;
  if (!isNonEmptyString(o.code)) throw new Error("instrument.code 缺失或无效");
  if (!isNonEmptyString(o.name)) throw new Error("instrument.name 缺失或无效");
  if (!isNonEmptyString(o.market)) throw new Error("instrument.market 缺失或无效");
  if (!isNonEmptyString(o.type)) throw new Error("instrument.type 缺失或无效");
  if (!KNOWN_CATEGORIES.includes(o.category as Category))
    throw new Error(`instrument.category "${o.category}" 无效`);
}

export function validateHoldings(raw: unknown): HoldingItem[] {
  if (!raw || typeof raw !== "object") throw new Error("文件格式错误");
  const envelope = raw as Record<string, unknown>;
  if (envelope.version !== 1) throw new Error("不支持的版本号");
  if (envelope.type !== "holdings") throw new Error("文件类型不匹配，请选择持仓导出文件");
  if (!Array.isArray(envelope.data)) throw new Error("data 字段必须为数组");

  return (envelope.data as unknown[]).map((item, i) => {
    if (!item || typeof item !== "object") throw new Error(`第 ${i + 1} 条记录格式错误`);
    const h = item as Record<string, unknown>;
    validateInstrument(h.instrument);
    if (!isPositiveFinite(h.shares)) throw new Error(`第 ${i + 1} 条记录 shares 无效`);
    if (!isPositiveFinite(h.cost)) throw new Error(`第 ${i + 1} 条记录 cost 无效`);
    return h as unknown as HoldingItem;
  });
}

export function validateWatch(raw: unknown): WatchItem[] {
  if (!raw || typeof raw !== "object") throw new Error("文件格式错误");
  const envelope = raw as Record<string, unknown>;
  if (envelope.version !== 1) throw new Error("不支持的版本号");
  if (envelope.type !== "watch") throw new Error("文件类型不匹配，请选择自选导出文件");
  if (!Array.isArray(envelope.data)) throw new Error("data 字段必须为数组");

  return (envelope.data as unknown[]).map((item) => {
    validateInstrument(item);
    return item as WatchItem;
  });
}
