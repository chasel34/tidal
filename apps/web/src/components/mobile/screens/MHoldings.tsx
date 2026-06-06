"use client";

import { unitLabel, usePortfolioDerived, useStore } from "@/store/useStore";
import { usePalette } from "@/hooks/usePalette";
import { cFmtMoney, cFmtPct, cMove } from "@/lib/format";
import { MCard } from "@/components/mobile/ui/MCard";
import { MEmpty } from "@/components/mobile/ui/MEmpty";
import type { HoldingSortKey } from "@/lib/types";

type SheetState =
  | { type: "watch" }
  | { type: "holding"; code?: string }
  | { type: "ocr"; target?: "holding" | "watch" }
  | { type: "aiSettings" }
  | null;

interface MHoldingsProps {
  goDetail: (code: string) => void;
  openSheet: (s: SheetState) => void;
}

const SORT_CHIPS: { key: HoldingSortKey; label: string }[] = [
  { key: "weight", label: "仓位" },
  { key: "today", label: "今日" },
  { key: "gain", label: "盈亏" },
  { key: "value", label: "市值" },
];

export function MHoldings({ goDetail, openSheet }: MHoldingsProps) {
  const P = usePalette();
  const theme = useStore((state) => state.theme);
  const sortH = useStore((state) => state.sortH);
  const toggleSortH = useStore((state) => state.toggleSortH);
  const { sortedHoldings, summary } = usePortfolioDerived();

  if (sortedHoldings.length === 0) {
    return (
      <div style={{ padding: "60px 0" }}>
        <MEmpty P={P} text="还没有持仓 · 添加标的开始记录" actionLabel="＋ 添加持仓" onAction={() => openSheet({ type: "holding" })} />
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Summary */}
      <MCard P={P} style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, color: P.subtle, marginBottom: 4 }}>持仓总市值</div>
        <div style={{ fontSize: 30, fontWeight: 300, fontVariantNumeric: "tabular-nums", color: P.text }}>{cFmtMoney(summary.marketValue, { dec: 0 })}</div>
        <div style={{ fontSize: 13, color: cMove(summary.totalGain, theme), marginTop: 6 }}>
          累计盈亏 {cFmtMoney(summary.totalGain, { sign: true })} ({cFmtPct(summary.totalGainPct)})
        </div>
      </MCard>

      {/* Sort chips */}
      <div style={{ display: "flex", gap: 8, padding: "0 2px" }}>
        {SORT_CHIPS.map((chip) => {
          const active = sortH.key === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => toggleSortH(chip.key)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                background: active ? P.accentSoft : P.chipBg,
                color: active ? P.accent : P.muted,
                border: "none",
                cursor: "pointer",
              }}
            >
              {chip.label}{active ? (sortH.dir === "desc" ? " ↓" : " ↑") : ""}
            </button>
          );
        })}
      </div>

      {/* Holdings list */}
      <MCard P={P} pad={0}>
        {sortedHoldings.map((h, i) => (
          <div
            key={h.code}
            onClick={() => goDetail(h.code)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "13px 16px",
              cursor: "pointer",
              borderTop: i > 0 ? `1px solid ${P.lineSoft}` : undefined,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: P.text }}>{h.name}</span>
                {h.category === "fund" && (
                  <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: P.accentSoft, color: P.accent }}>基金</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: P.subtle, marginTop: 2 }}>
                {h.code} · {h.shares.toFixed(0)}{unitLabel(h)} · {h.weight.toFixed(1)}%
              </div>
            </div>
            <div style={{ textAlign: "right", minWidth: 80 }}>
              <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: P.text }}>{cFmtMoney(h.marketValue, { dec: 0 })}</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 2 }}>
                <span style={{ fontSize: 11, color: cMove(h.gainPct, theme), fontVariantNumeric: "tabular-nums" }}>{cFmtPct(h.gainPct)}</span>
                <span style={{
                  fontSize: 10.5,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: cMove(h.todayPct, theme) + "18",
                  color: cMove(h.todayPct, theme),
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {cFmtPct(h.todayPct)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </MCard>

      {/* Add buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => openSheet({ type: "ocr", target: "holding" })}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: 14,
            border: `2px dashed ${P.line}`,
            background: "transparent",
            color: P.muted,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ⎙ 截图导入
        </button>
        <button
          onClick={() => openSheet({ type: "holding" })}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: 14,
            border: `2px dashed ${P.line}`,
            background: "transparent",
            color: P.accent,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ＋ 添加持仓
        </button>
      </div>
    </div>
  );
}
