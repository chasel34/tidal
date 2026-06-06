"use client";

import { useRef, useState } from "react";
import { aiResolvedModel, screenshotSearchSeed, type Instrument } from "@tidal/core";
import type { Palette } from "@/lib/theme";
import { cFmtNum } from "@/lib/format";
import { typeLabel } from "@/store/useStore";
import { useAiByok } from "@/store/useAiByok";
import { useSearch } from "@/hooks/useSearch";
import { useOcrImport, type OcrTarget, type ReviewRow } from "@/hooks/useOcrImport";
import { Modal } from "@/components/shared/ui/Modal";
import { SearchField } from "@/components/shared/ui/SearchField";
import { OcrScanAnim } from "@/components/shared/ui/OcrScanAnim";
import { tidalBtn, tidalInput } from "@/components/shared/ui/styles";

function TargetToggle({
  P,
  target,
  setTarget,
}: {
  P: Palette;
  target: OcrTarget;
  setTarget: (t: OcrTarget) => void;
}) {
  const opts: { id: OcrTarget; label: string }[] = [
    { id: "holding", label: "导入到持仓" },
    { id: "watch", label: "导入到自选" },
  ];
  return (
    <div
      style={{
        display: "inline-flex",
        padding: 3,
        gap: 3,
        borderRadius: 999,
        background: P.isDark ? "#16161a" : "#f0ede5",
        marginBottom: 16,
      }}
    >
      {opts.map((o) => {
        const active = target === o.id;
        return (
          <button
            key={o.id}
            onClick={() => setTarget(o.id)}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontSize: 12.5,
              fontFamily: "inherit",
              background: active ? P.accent : "transparent",
              color: active ? "#fff" : P.muted,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** In-row instrument picker for unmatched / ambiguous rows. */
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
  const { results, loading } = useSearch(q);
  return (
    <div>
      <SearchField P={P} value={q} onChange={setQ} placeholder="搜索名称 / 代码" />
      <div style={{ maxHeight: 132, overflowY: "auto", marginTop: 8 }}>
        {loading && (
          <div style={{ color: P.subtle, fontSize: 12, padding: "8px 4px" }}>搜索中…</div>
        )}
        {!loading && q.trim() && results.length === 0 && (
          <div style={{ color: P.subtle, fontSize: 12, padding: "8px 4px" }}>无匹配标的</div>
        )}
        {results.slice(0, 8).map((inst) => (
          <div
            key={inst.code}
            onClick={() => onPick(inst)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 6px",
              borderBottom: `1px solid ${P.lineSoft}`,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <span style={{ color: P.text }}>{inst.name}</span>
            <span style={{ color: P.subtle, fontSize: 11 }}>
              {inst.code} · {typeLabel(inst)}
            </span>
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

function ReviewRowCard({
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
  const needsMatch = !row.instrument;

  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        border: `1px solid ${P.line}`,
        marginBottom: 10,
        opacity: row.include ? 1 : 0.5,
        background: P.isDark ? "#16161a" : "#fcfbf8",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, color: P.text }}>
            {row.instrument ? row.instrument.name : row.name}
          </div>
          <div style={{ fontSize: 11, color: P.subtle, marginTop: 2 }}>
            {row.instrument
              ? `${row.instrument.code} · ${typeLabel(row.instrument)}`
              : "识别名称：" + row.name}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          {row.instrument && (
            <button
              onClick={() => editRow(row.id, { include: !row.include })}
              style={{
                background: "transparent",
                border: "none",
                color: P.muted,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {row.include ? "✓ 导入" : "已忽略"}
            </button>
          )}
          <button
            onClick={() => removeRow(row.id)}
            style={{ background: "transparent", border: "none", color: P.subtle, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      </div>

      {needsMatch && (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              fontSize: 11.5,
              color: P.isDark ? "#d6a84f" : "#9a6a1a",
              marginBottom: 6,
            }}
          >
            未自动匹配到标的，请手动搜索选择
          </div>
          <RowSearch
            P={P}
            initial={screenshotSearchSeed(row.name)}
            onPick={(inst) => setRowInstrument(row.id, inst)}
          />
        </div>
      )}

      {row.instrument && target === "holding" && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: P.muted, display: "block", marginBottom: 4 }}>
                份额
              </label>
              <input
                value={row.shares}
                onChange={(e) => editRow(row.id, { shares: e.target.value.replace(/[^0-9.]/g, "") })}
                style={{ ...tidalInput(P), padding: "8px 10px" }}
                placeholder="份额"
                inputMode="decimal"
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: P.muted, display: "block", marginBottom: 4 }}>
                成本价（¥）
              </label>
              <input
                value={row.cost}
                onChange={(e) => editRow(row.id, { cost: e.target.value.replace(/[^0-9.]/g, "") })}
                style={{ ...tidalInput(P), padding: "8px 10px" }}
                placeholder="成本价"
                inputMode="decimal"
              />
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: P.subtle, marginTop: 8 }}>
            {recognizedLine(row)}
            {row.price <= 0 && "（缺现价，份额请手动核对）"}
          </div>
        </div>
      )}
    </div>
  );
}

export function OcrImportModal({
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

  return (
    <Modal P={P} title="截图导入" onClose={onClose} width={520}>
      {o.step === "gate" && (
        <div style={{ textAlign: "center", padding: "20px 10px" }}>
          <div style={{ fontSize: 15, color: P.text, marginBottom: 8 }}>需要先配置 AI 识别</div>
          <div style={{ fontSize: 13, color: P.muted, marginBottom: 20, lineHeight: 1.6 }}>
            截图导入由你自己的多模态模型驱动，请先填写 API Key。
          </div>
          <button onClick={onOpenSettings} style={tidalBtn(P, "primary")}>
            去设置填写 API Key
          </button>
        </div>
      )}

      {o.step === "upload" && (
        <div>
          <TargetToggle P={P} target={o.target} setTarget={o.setTarget} />
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void o.pickFile(e.dataTransfer.files?.[0]);
            }}
            style={{
              border: `1.5px dashed ${P.line}`,
              borderRadius: 14,
              padding: "44px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: P.isDark ? "#16161a" : "#faf9f5",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>⎙</div>
            <div style={{ fontSize: 14, color: P.text, marginBottom: 6 }}>
              点击选择，或拖拽 / 粘贴持仓截图
            </div>
            <div style={{ fontSize: 12, color: P.subtle }}>
              支持支付宝、雪球等 App 的持仓页截图
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => void o.pickFile(e.target.files?.[0])}
          />
          <div style={{ fontSize: 11.5, color: P.subtle, marginTop: 12, textAlign: "center" }}>
            当前识别引擎：{aiResolvedModel(state)}
          </div>
        </div>
      )}

      {o.step === "scan" && o.src && (
        <OcrScanAnim
          src={o.src}
          P={P}
          label={`正在用 ${aiResolvedModel(state)} 识别截图…`}
        />
      )}

      {o.step === "review" && (
        <div>
          <TargetToggle P={P} target={o.target} setTarget={o.setTarget} />
          <div style={{ maxHeight: 380, overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
            {o.rows.map((row) => (
              <ReviewRowCard
                key={row.id}
                P={P}
                row={row}
                target={o.target}
                editRow={o.editRow}
                removeRow={o.removeRow}
                setRowInstrument={o.setRowInstrument}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 16,
            }}
          >
            <button onClick={() => fileRef.current?.click()} style={tidalBtn(P)}>
              重新上传
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => void o.pickFile(e.target.files?.[0])}
            />
            <button
              onClick={o.confirm}
              disabled={o.importableCount === 0}
              style={{
                ...tidalBtn(P, "primary"),
                opacity: o.importableCount === 0 ? 0.45 : 1,
                cursor: o.importableCount === 0 ? "not-allowed" : "pointer",
              }}
            >
              确认导入 {o.importableCount} 项
            </button>
          </div>
        </div>
      )}

      {o.step === "done" && (
        <div style={{ textAlign: "center", padding: "20px 10px" }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>✓</div>
          <div style={{ fontSize: 15, color: P.text, marginBottom: 6 }}>
            已导入 {o.imported.added} 项到{o.target === "holding" ? "持仓" : "自选"}
          </div>
          {o.imported.skipped > 0 && (
            <div style={{ fontSize: 12.5, color: P.subtle, marginBottom: 18 }}>
              {o.imported.skipped} 项已跳过
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14 }}>
            <button onClick={o.reset} style={tidalBtn(P)}>
              再导入一张
            </button>
            <button onClick={onClose} style={tidalBtn(P, "primary")}>
              完成
            </button>
          </div>
        </div>
      )}

      {o.step === "error" && (
        <div style={{ textAlign: "center", padding: "20px 10px" }}>
          <div style={{ fontSize: 26, marginBottom: 10 }}>⚠</div>
          <div style={{ fontSize: 13.5, color: P.muted, marginBottom: 20, lineHeight: 1.6 }}>
            {o.error || "识别失败"}
          </div>
          <button onClick={o.reset} style={tidalBtn(P, "primary")}>
            重新上传
          </button>
        </div>
      )}
    </Modal>
  );
}
