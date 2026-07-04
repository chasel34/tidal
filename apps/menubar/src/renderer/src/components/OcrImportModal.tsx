import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Search } from "lucide-react";
import { aiResolvedModel, screenshotSearchSeed, type Instrument } from "@tidal/core";
import { cFmtNum } from "@shared/format";
import { typeLabel } from "@shared/portfolio";
import type { Palette } from "@shared/theme";
import { useConfig } from "@/store/useMenubarStore";
import { usePalette } from "@/hooks/usePalette";
import { useMenubarOcrImport, type OcrTarget, type ReviewRow } from "@/hooks/useOcrImport";
import { OcrScanAnim } from "./OcrScanAnim";
import { GhostButton, PrimaryButton } from "./Controls";

function inputStyle(P: Palette): CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    background: P.isDark ? "#16161a" : "#faf9f5",
    border: `1px solid ${P.line}`,
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    color: P.text,
    outline: "none",
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
  const [results, setResults] = useState<Instrument[]>([]);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      const found = await window.tidal.search(q).catch(() => []);
      if (alive) setResults(found.slice(0, 8));
    }, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);
  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: P.isDark ? "#16161a" : "#faf9f5",
          border: `1px solid ${P.line}`,
          borderRadius: 8,
          padding: "0 10px",
        }}
      >
        <Search size={14} color={P.subtle} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索名称 / 代码"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            padding: "8px 0",
            color: P.text,
            outline: "none",
            fontSize: 13,
          }}
        />
      </div>
      {results.length > 0 && (
        <div style={{ maxHeight: 130, overflowY: "auto", marginTop: 6 }}>
          {results.map((inst) => (
            <button
              key={inst.code}
              onClick={() => onPick(inst)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                padding: "8px 6px",
                border: "none",
                borderBottom: `1px solid ${P.lineSoft}`,
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ color: P.text, fontSize: 13 }}>{inst.name}</span>
              <span style={{ color: P.subtle, fontSize: 11 }}>{inst.code}</span>
            </button>
          ))}
        </div>
      )}
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

function RowCard({
  P,
  row,
  target,
  o,
}: {
  P: Palette;
  row: ReviewRow;
  target: OcrTarget;
  o: ReturnType<typeof useMenubarOcrImport>;
}) {
  return (
    <div
      style={{
        padding: "11px 12px",
        borderRadius: 10,
        border: `1px solid ${P.line}`,
        marginBottom: 8,
        opacity: row.include ? 1 : 0.5,
        background: P.isDark ? "#16161a" : "#fcfbf8",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: P.text }}>
            {row.instrument ? row.instrument.name : row.name}
          </div>
          <div style={{ fontSize: 11, color: P.subtle, marginTop: 1 }}>
            {row.instrument
              ? `${row.instrument.code} · ${typeLabel(row.instrument)}`
              : "识别名称：" + row.name}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          {row.instrument && (
            <button
              onClick={() => o.editRow(row.id, { include: !row.include })}
              style={{ background: "none", border: "none", color: P.muted, fontSize: 12, cursor: "pointer" }}
            >
              {row.include ? "✓ 导入" : "已忽略"}
            </button>
          )}
          <button
            onClick={() => o.removeRow(row.id)}
            style={{ background: "none", border: "none", color: P.subtle, fontSize: 13, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      </div>

      {!row.instrument && (
        <RowSearch
          P={P}
          initial={screenshotSearchSeed(row.name)}
          onPick={(inst) => o.setRowInstrument(row.id, inst)}
        />
      )}

      {row.instrument && target === "holding" && (
        <div style={{ marginTop: 9 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input
              value={row.shares}
              onChange={(e) => o.editRow(row.id, { shares: e.target.value.replace(/[^0-9.]/g, "") })}
              placeholder="份额"
              style={inputStyle(P)}
            />
            <input
              value={row.cost}
              onChange={(e) => o.editRow(row.id, { cost: e.target.value.replace(/[^0-9.]/g, "") })}
              placeholder="成本价"
              style={inputStyle(P)}
            />
          </div>
          <div style={{ fontSize: 11, color: P.subtle, marginTop: 6 }}>{recognizedLine(row)}</div>
        </div>
      )}
    </div>
  );
}

export function OcrImportModal({
  onClose,
  onOpenSettings,
  defaultTarget = "holding",
}: {
  onClose: () => void;
  onOpenSettings: () => void;
  defaultTarget?: OcrTarget;
}) {
  const P = usePalette();
  const config = useConfig();
  const o = useMenubarOcrImport(defaultTarget);
  const fileRef = useRef<HTMLInputElement>(null);

  const pill = (active: boolean): CSSProperties => ({
    padding: "6px 14px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    fontSize: 12.5,
    background: active ? P.accent : P.isDark ? "#16161a" : "#ece9e1",
    color: active ? "#fff" : P.muted,
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: P.overlay,
        backdropFilter: "blur(3px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          maxHeight: "84%",
          display: "flex",
          flexDirection: "column",
          background: P.panel,
          border: `1px solid ${P.line}`,
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: P.isDark ? "0 20px 60px rgba(0,0,0,0.6)" : "0 20px 60px rgba(40,30,20,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "13px 16px",
            borderBottom: `1px solid ${P.lineSoft}`,
          }}
        >
          <span style={{ fontSize: 14, color: P.text, fontWeight: 500 }}>截图导入</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: P.muted, fontSize: 15, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 16, overflowY: "auto" }}>
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
            <div style={{ textAlign: "center", padding: "20px 8px" }}>
              <div style={{ fontSize: 14, color: P.text, marginBottom: 8 }}>需要先配置 AI 识别</div>
              <div style={{ fontSize: 12.5, color: P.muted, marginBottom: 18 }}>
                请在「智能识别」里填写 API Key。
              </div>
              <PrimaryButton P={P} onClick={onOpenSettings}>
                去设置
              </PrimaryButton>
            </div>
          )}

          {o.step === "upload" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button onClick={() => o.setTarget("holding")} style={pill(o.target === "holding")}>
                  导入到持仓
                </button>
                <button onClick={() => o.setTarget("watch")} style={pill(o.target === "watch")}>
                  导入到自选
                </button>
              </div>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `1.5px dashed ${P.line}`,
                  borderRadius: 12,
                  padding: "38px 16px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: P.isDark ? "#16161a" : "#faf9f5",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>⎙</div>
                <div style={{ fontSize: 13, color: P.text }}>点击选择持仓截图</div>
                <div style={{ fontSize: 11.5, color: P.subtle, marginTop: 4 }}>
                  支付宝、雪球等 App 的持仓页
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: P.subtle, marginTop: 10, textAlign: "center" }}>
                当前识别引擎：{aiResolvedModel(config.ai)}
              </div>
            </div>
          )}

          {o.step === "scan" && o.src && (
            <OcrScanAnim src={o.src} P={P} label={`正在用 ${aiResolvedModel(config.ai)} 识别…`} />
          )}

          {o.step === "review" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button onClick={() => o.setTarget("holding")} style={pill(o.target === "holding")}>
                  持仓
                </button>
                <button onClick={() => o.setTarget("watch")} style={pill(o.target === "watch")}>
                  自选
                </button>
              </div>
              {o.rows.map((row) => (
                <RowCard key={row.id} P={P} row={row} target={o.target} o={o} />
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <GhostButton P={P} onClick={() => fileRef.current?.click()}>
                  重新上传
                </GhostButton>
                <PrimaryButton P={P} onClick={() => void o.confirm()} disabled={o.importableCount === 0}>
                  确认导入 {o.importableCount} 项
                </PrimaryButton>
              </div>
            </div>
          )}

          {o.step === "done" && (
            <div style={{ textAlign: "center", padding: "20px 8px" }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>✓</div>
              <div style={{ fontSize: 14, color: P.text, marginBottom: 4 }}>
                已导入 {o.imported.added} 项到{o.target === "holding" ? "持仓" : "自选"}
              </div>
              {o.imported.skipped > 0 && (
                <div style={{ fontSize: 12, color: P.subtle, marginBottom: 14 }}>
                  {o.imported.skipped} 项已跳过
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14 }}>
                <GhostButton P={P} onClick={o.reset}>
                  再导入一张
                </GhostButton>
                <PrimaryButton P={P} onClick={onClose}>
                  完成
                </PrimaryButton>
              </div>
            </div>
          )}

          {o.step === "error" && (
            <div style={{ textAlign: "center", padding: "20px 8px" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>⚠</div>
              <div style={{ fontSize: 12.5, color: P.muted, marginBottom: 18, lineHeight: 1.6 }}>
                {o.error || "识别失败"}
              </div>
              <PrimaryButton P={P} onClick={o.reset}>
                重新上传
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
