"use client";

import { typeLabel, useStore } from "@/store/useStore";
import { usePalette } from "@/hooks/usePalette";
import { useTodayScreen } from "@/hooks/useTodayScreen";
import { cFmtMoney, cFmtPct, cFmtCompact, cMove } from "@/lib/format";
import { allocColors } from "@/lib/theme";
import { MCard } from "@/components/mobile/ui/MCard";
import { MSegmented } from "@/components/mobile/ui/MSegmented";
import { MSectionLabel } from "@/components/mobile/ui/MSectionLabel";
import { MArea } from "@/components/mobile/charts/MArea";
import { Spark } from "@/components/shared/charts/Spark";
import { Donut } from "@/components/shared/charts/Donut";
import { MIndexBar } from "@/components/mobile/ui/MIndexBar";
import type { Period } from "@/lib/types";
import type { SheetState } from "@/components/mobile/types";

interface MTodayProps {
  goDetail: (code: string) => void;
  openSheet: (s: SheetState) => void;
}

export function MToday({ goDetail }: MTodayProps) {
  const P = usePalette();
  const theme = useStore((state) => state.theme);
  const quotes = useStore((state) => state.quotes);
  const {
    summary,
    allocation,
    sortedHoldings,
    sortedWatch,
    series,
    labels,
    seriesLoading,
    sparks,
    period,
    setPeriod,
    setTab,
  } = useTodayScreen();
  const colors = allocColors(P.isDark);

  const topHoldings = sortedHoldings.slice(0, 4);
  const topWatch = [...sortedWatch].sort((a, b) => Math.abs(b.todayPct) - Math.abs(a.todayPct)).slice(0, 4);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <MIndexBar P={P} theme={theme} quotes={quotes} onGoWatch={() => setTab("watch")} />
      <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
        <div style={{ fontSize: 12, color: P.subtle, letterSpacing: "0.06em", marginBottom: 6 }}>今日盈亏</div>
        <div style={{ fontSize: 52, fontWeight: 300, color: cMove(summary.todayDelta, theme), fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
          {cFmtMoney(summary.todayDelta, { sign: true })}
        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 16, fontSize: 13, color: P.muted }}>
          <span>今日 {cFmtPct(summary.todayPct)}</span>
          <span>总资产 {cFmtMoney(summary.totalAssets, { dec: 0 })}</span>
          <span>累计 {cFmtMoney(summary.totalGain, { sign: true, dec: 0 })}</span>
        </div>
      </div>

      {/* Chart */}
      <MCard P={P}>
        <MSectionLabel P={P}>资产走势</MSectionLabel>
        {seriesLoading && series.length === 0 ? (
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: P.subtle, fontSize: 13 }}>加载中...</div>
        ) : series.length > 0 ? (
          <MArea series={series} labels={labels} height={200} P={P} formatValue={(v) => cFmtMoney(v, { dec: 0 })} formatY={cFmtCompact} />
        ) : (
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: P.subtle, fontSize: 13 }}>暂无走势数据</div>
        )}
        <div style={{ marginTop: 10 }}>
          <MSegmented P={P} options={["1W", "1M", "3M", "1Y"]} value={period} onChange={(v) => setPeriod(v as Period)} size="sm" />
        </div>
      </MCard>

      {/* Allocation */}
      {allocation.length > 0 && (
        <MCard P={P}>
          <MSectionLabel P={P}>资产配置</MSectionLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Donut segments={allocation} size={100} thickness={12} colors={colors} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              {allocation.map((seg, i) => (
                <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: colors[i % colors.length], flexShrink: 0 }} />
                  <span style={{ color: P.text }}>{seg.label}</span>
                  <span style={{ marginLeft: "auto", color: P.muted, fontVariantNumeric: "tabular-nums" }}>
                    {((seg.value / (allocation.reduce((s, x) => s + x.value, 0) || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </MCard>
      )}

      {/* Holdings mini list */}
      {topHoldings.length > 0 && (
        <div>
          <MSectionLabel
            P={P}
            action={
              <button onClick={() => setTab("holdings")} style={{ background: "none", border: "none", cursor: "pointer", color: P.accent, fontSize: 12 }}>
                全部 ›
              </button>
            }
          >
            持仓 · 今日表现
          </MSectionLabel>
          <MCard P={P} pad={0}>
            {topHoldings.map((h, i) => (
              <div
                key={h.code}
                onClick={() => goDetail(h.code)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 16px",
                  cursor: "pointer",
                  borderTop: i > 0 ? `1px solid ${P.lineSoft}` : undefined,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: P.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</div>
                  <div style={{ fontSize: 11, color: P.subtle, marginTop: 2 }}>{h.code} · {typeLabel(h)}</div>
                </div>
                <Spark data={sparks[h.code] || []} width={48} height={18} color={cMove(h.todayPct, theme)} />
                <div style={{ textAlign: "right", marginLeft: 12, minWidth: 64 }}>
                  <div style={{ fontSize: 13.5, fontVariantNumeric: "tabular-nums", color: P.text }}>{h.price.toFixed(2)}</div>
                  <div style={{ fontSize: 11.5, color: cMove(h.todayPct, theme), fontVariantNumeric: "tabular-nums" }}>{cFmtPct(h.todayPct)}</div>
                </div>
              </div>
            ))}
          </MCard>
        </div>
      )}

      {/* Watch mini list */}
      {topWatch.length > 0 && (
        <div>
          <MSectionLabel
            P={P}
            action={
              <button onClick={() => setTab("watch")} style={{ background: "none", border: "none", cursor: "pointer", color: P.accent, fontSize: 12 }}>
                全部 ›
              </button>
            }
          >
            自选 · 今日涨跌
          </MSectionLabel>
          <MCard P={P} pad={0}>
            {topWatch.map((w, i) => (
              <div
                key={w.code}
                onClick={() => goDetail(w.code)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 16px",
                  cursor: "pointer",
                  borderTop: i > 0 ? `1px solid ${P.lineSoft}` : undefined,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: P.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
                  <div style={{ fontSize: 11, color: P.subtle, marginTop: 2 }}>{w.code} · {typeLabel(w)}</div>
                </div>
                <Spark data={sparks[w.code] || []} width={48} height={18} color={cMove(w.todayPct, theme)} />
                <div style={{ textAlign: "right", marginLeft: 12, minWidth: 64 }}>
                  <div style={{ fontSize: 13.5, fontVariantNumeric: "tabular-nums", color: P.text }}>{w.price.toFixed(2)}</div>
                  <div style={{ fontSize: 11.5, color: cMove(w.todayPct, theme), fontVariantNumeric: "tabular-nums" }}>{cFmtPct(w.todayPct)}</div>
                </div>
              </div>
            ))}
          </MCard>
        </div>
      )}
    </div>
    </div>
  );
}
