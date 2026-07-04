"use client";

import { useRef, useState } from "react";
import { aiResolvedModel, screenshotSearchSeed, type Instrument } from "@tidal/core";
import type { Palette } from "@/lib/theme";
import { cFmtNum } from "@/lib/format";
import { typeLabel } from "@/store/useStore";
import { useAiByok } from "@/store/useAiByok";
import { useSearch } from "@/hooks/useSearch";
import { useOcrImport, type OcrTarget, type ReviewRow } from "@/hooks/useOcrImport";
import { MSheet } from "@/components/mobile/ui/MSheet";
import { MSearchField } from "@/components/mobile/ui/MSearchField";
import { OcrScanAnim } from "@/components/shared/ui/OcrScanAnim";

function pill(P: Palette, active: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 999,
    border: "none",
    fontSize: 13.5,
    background: active ? P.accent : P.isDark ? "#16161a" : "#f0ede5",
    color: active ? "#fff" : P.muted,
  };
}

function RowSearch({
  P,
  initial,
  onPick,
}: {
  P: Palette;
  initial: string;
  onPick: (inst: Instrument) => void;
}) {
  const [q, setQ] = useState(initial);
  const { results } = useSearch(q);
  return (
    <div style={{ marginTop: 8 }}>
      <MSearchField P={P} value={q} onChange={setQ} placeholder="搜索名称 / 代码" />
      <div style={{ maxHeight: 150, overflowY: "auto", marginTop: 6 }}>
        {results.slice(0, 8).map((inst) => (
          <div
            key={inst.code}
            onClick={() => onPick(inst)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 4px",
              borderBottom: `1px solid ${P.lineSoft}`,
              fontSize: 14,
            }}
          >
            <span style={{ color: P.text }}>{inst.name}</span>
            <span style={{ color: P.subtle, fontSize: 12 }}>{inst.code}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function recognizedLine(row: ReviewRow): string {
  const parts: string[] = [];
  if (row.raw.marketValue != null) parts.push(`市值 ¥${cFmtNum(row.raw.marketValue)}`);
  if (row.raw.profit != null) parts.push(`收益 ¥${cFmtNum(row.raw.profit)}`);
  else if (row.raw.profitPct != null) parts.push(`收益率 ${row.raw.profitPct}%`);
  if (row.price > 0) parts.push(`现价 ¥${cFmtNum(row.price)}`);
  return parts.length ? `识别：${parts.join(" · ")}` : "截图未含市值/收益";
}

function MReviewRow({
  P,
  row,
  target,
  editRow,
  removeRow,
  setRowInstrument,
}: {
  P: Palette;
  row: ReviewRow;
  target: OcrTarget;
  editRow: (id: string, patch: Partial<ReviewRow>) => void;
  removeRow: (id: string) => void;
  setRowInstrument: (id: string, inst: Instrument) => void;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: P.isDark ? "#1c1c20" : "#fff",
    border: `1px solid ${P.line}`,
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 15,
    color: P.text,
    outline: "none",
  };
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 14,
        border: `1px solid ${P.line}`,
        marginBottom: 10,
        opacity: row.include ? 1 : 0.5,
        background: P.isDark ? "#16161a" : "#fcfbf8",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, color: P.text }}>
            {row.instrument ? row.instrument.name : row.name}
          </div>
          <div style={{ fontSize: 12, color: P.subtle, marginTop: 2 }}>
            {row.instrument
              ? `${row.instrument.code} · ${typeLabel(row.instrument)}`
              : "识别名称：" + row.name}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
          {row.instrument && (
            <button
              onClick={() => editRow(row.id, { include: !row.include })}
              style={{ background: "none", border: "none", color: P.muted, fontSize: 13 }}
            >
              {row.include ? "✓" : "○"}
            </button>
          )}
          <button
            onClick={() => removeRow(row.id)}
            style={{ background: "none", border: "none", color: P.subtle, fontSize: 15 }}
          >
            ✕
          </button>
        </div>
      </div>

      {!row.instrument && (
        <RowSearch
          P={P}
          initial={screenshotSearchSeed(row.name)}
          onPick={(inst) => setRowInstrument(row.id, inst)}
        />
      )}

      {row.instrument && target === "holding" && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input
              value={row.shares}
              onChange={(e) => editRow(row.id, { shares: e.target.value.replace(/[^0-9.]/g, "") })}
              placeholder="份额"
              inputMode="decimal"
              style={inputStyle}
            />
            <input
              value={row.cost}
              onChange={(e) => editRow(row.id, { cost: e.target.value.replace(/[^0-9.]/g, "") })}
              placeholder="成本价"
              inputMode="decimal"
              style={inputStyle}
            />
          </div>
          <div style={{ fontSize: 12, color: P.subtle, marginTop: 7 }}>{recognizedLine(row)}</div>
        </div>
      )}
    </div>
  );
}

export function MOcrImportSheet({
  P,
  onClose,
  onOpenSettings,
  defaultTarget = "holding",
}: {
  P: Palette;
  onClose: () => void;
  onOpenSettings: () => void;
  defaultTarget?: OcrTarget;
}) {
  const o = useOcrImport(defaultTarget);
  const state = useAiByok();
  const fileRef = useRef<HTMLInputElement>(null);
  const btn = (primary?: boolean): React.CSSProperties => ({
    padding: "12px 20px",
    borderRadius: 999,
    border: primary ? "none" : `1px solid ${P.line}`,
    background: primary ? P.accent : "transparent",
    color: primary ? "#fff" : P.text,
    fontSize: 15,
  });

  return (
    <MSheet P={P} title="截图导入" onClose={onClose}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.currentTarget.value = ""; // allow re-picking the same screenshot
          void o.pickFile(file);
        }}
      />

      {o.step === "gate" && (
        <div style={{ textAlign: "center", padding: "24px 10px 36px" }}>
          <div style={{ fontSize: 16, color: P.text, marginBottom: 8 }}>需要先配置 AI 识别</div>
          <div style={{ fontSize: 14, color: P.muted, marginBottom: 22 }}>
            请先填写 API Key 再使用截图导入。
          </div>
          <button onClick={onOpenSettings} style={btn(true)}>
            去设置填写 API Key
          </button>
        </div>
      )}

      {o.step === "upload" && (
        <div style={{ paddingBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={() => o.setTarget("holding")} style={pill(P, o.target === "holding")}>
              导入到持仓
            </button>
            <button onClick={() => o.setTarget("watch")} style={pill(P, o.target === "watch")}>
              导入到自选
            </button>
          </div>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: `1.5px dashed ${P.line}`,
              borderRadius: 16,
              padding: "48px 20px",
              textAlign: "center",
              background: P.isDark ? "#16161a" : "#faf9f5",
            }}
          >
            <div style={{ fontSize: 30, marginBottom: 10 }}>⎙</div>
            <div style={{ fontSize: 15, color: P.text, marginBottom: 6 }}>选择持仓截图</div>
            <div style={{ fontSize: 13, color: P.subtle }}>支付宝、雪球等 App 的持仓页</div>
          </div>
          <div style={{ fontSize: 12.5, color: P.subtle, marginTop: 12, textAlign: "center" }}>
            当前识别引擎：{aiResolvedModel(state)}
          </div>
        </div>
      )}

      {o.step === "scan" && o.src && (
        <div style={{ paddingBottom: 20 }}>
          <OcrScanAnim src={o.src} P={P} label={`正在用 ${aiResolvedModel(state)} 识别…`} />
        </div>
      )}

      {o.step === "review" && (
        <div style={{ paddingBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button onClick={() => o.setTarget("holding")} style={pill(P, o.target === "holding")}>
              持仓
            </button>
            <button onClick={() => o.setTarget("watch")} style={pill(P, o.target === "watch")}>
              自选
            </button>
          </div>
          {o.rows.map((row) => (
            <MReviewRow
              key={row.id}
              P={P}
              row={row}
              target={o.target}
              editRow={o.editRow}
              removeRow={o.removeRow}
              setRowInstrument={o.setRowInstrument}
            />
          ))}
          <button
            onClick={o.confirm}
            disabled={o.importableCount === 0}
            style={{
              ...btn(true),
              width: "100%",
              marginTop: 8,
              opacity: o.importableCount === 0 ? 0.45 : 1,
            }}
          >
            确认导入 {o.importableCount} 项
          </button>
        </div>
      )}

      {o.step === "done" && (
        <div style={{ textAlign: "center", padding: "24px 10px 36px" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✓</div>
          <div style={{ fontSize: 16, color: P.text, marginBottom: 6 }}>
            已导入 {o.imported.added} 项到{o.target === "holding" ? "持仓" : "自选"}
          </div>
          {o.imported.skipped > 0 && (
            <div style={{ fontSize: 13, color: P.subtle, marginBottom: 18 }}>
              {o.imported.skipped} 项已跳过
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
            <button onClick={o.reset} style={btn()}>
              再导入一张
            </button>
            <button onClick={onClose} style={btn(true)}>
              完成
            </button>
          </div>
        </div>
      )}

      {o.step === "error" && (
        <div style={{ textAlign: "center", padding: "24px 10px 36px" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⚠</div>
          <div style={{ fontSize: 14, color: P.muted, marginBottom: 22, lineHeight: 1.6 }}>
            {o.error || "识别失败"}
          </div>
          <button onClick={o.reset} style={btn(true)}>
            重新上传
          </button>
        </div>
      )}
    </MSheet>
  );
}
