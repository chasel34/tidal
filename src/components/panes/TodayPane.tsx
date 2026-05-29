"use client";

import { useMemo } from "react";
import type { Palette } from "@/lib/theme";
import { allocColors } from "@/lib/theme";
import { cFmtCompact, cFmtMoney, cFmtPct, cMove } from "@/lib/format";
import { useStore } from "@/store/useStore";
import { usePortfolioSeries } from "@/hooks/usePortfolioSeries";
import { useDailyCloses } from "@/hooks/useDailyCloses";
import { Donut } from "@/components/charts/Donut";
import { AreaChart } from "@/components/charts/AreaChart";
import { Spark } from "@/components/charts/Spark";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Period, HoldingFull, WatchFull, Instrument } from "@/lib/types";
import type { PaneProps } from "./types";

const RANGES: Period[] = ["1D", "1W", "1M", "3M", "1Y"];

export function TodayPane({ P, openModal }: { P: Palette } & PaneProps) {
  const store = useStore();
  const { summary, period, setPeriod } = store;
  const { series, labels } = usePortfolioSeries(period);

  const up = summary.todayDelta >= 0;
  const moveC = cMove(summary.todayDelta, store.theme);
  const colors = allocColors(P.isDark);
  const totalAlloc = store.allocation.reduce((s, x) => s + x.value, 0) || 1;

  const miniInstruments = useMemo<Instrument[]>(() => {
    const codes = new Map<string, Instrument>();
    store.sortedHoldings.slice(0, 5).forEach((h) => codes.set(h.code, h));
    [...store.watchFull]
      .sort((a, b) => b.todayPct - a.todayPct)
      .slice(0, 5)
      .forEach((w) => codes.set(w.code, w));
    return [...codes.values()];
  }, [store.sortedHoldings, store.watchFull]);
  const sparks = useDailyCloses(miniInstruments);

  if (!store.holdings.length && !store.watch.length) {
    return (
      <EmptyState
        P={P}
        text="欢迎使用资产看板 · 先添加你的持仓或自选标的"
        onAction={() => openModal({ type: "holding" })}
        actionLabel="添加持仓"
      />
    );
  }

  return (
    <div>
      {/* Hero + allocation */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 280px",
          gap: 24,
          alignItems: "center",
          marginBottom: 30,
        }}
      >
        <div>
          <div style={{ color: P.muted, fontSize: 13, marginBottom: 16 }}>今日盈亏</div>
          <div
            style={{
              fontSize: "clamp(46px, 5.6vw, 80px)",
              fontWeight: 300,
              letterSpacing: "-0.04em",
              color: moveC,
              lineHeight: 1,
              marginBottom: 14,
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {up ? "+" : ""}
            {cFmtMoney(summary.todayDelta, { dec: 2 })}
          </div>
          <div
            style={{
              display: "flex",
              gap: 20,
              alignItems: "baseline",
              flexWrap: "wrap",
              rowGap: 6,
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span style={{ fontSize: 15, color: moveC }}>
              {cFmtPct(summary.todayPct)} 今日
            </span>
            <span style={{ fontSize: 13, color: P.muted }}>
              账户总额 {cFmtMoney(summary.totalAssets)}
            </span>
            <span style={{ fontSize: 13, color: cMove(summary.totalGain, store.theme) }}>
              累计 {cFmtPct(summary.totalGainPct)}
            </span>
          </div>
        </div>
        {/* allocation donut */}
        <div
          style={{
            background: P.panel,
            border: `1px solid ${P.line}`,
            borderRadius: 14,
            padding: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ position: "relative", width: 110, height: 110 }}>
            <Donut segments={store.allocation} size={110} thickness={13} colors={colors} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ fontSize: 9.5, color: P.subtle, letterSpacing: "0.08em" }}>总市值</div>
              <div style={{ fontSize: 14, color: P.text, fontVariantNumeric: "tabular-nums" }}>
                ¥{cFmtCompact(summary.marketValue)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            {store.allocation.map((seg, i) => (
              <div
                key={seg.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 12,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: colors[i % colors.length],
                  }}
                />
                <span style={{ color: P.muted, flex: 1 }}>{seg.label}</span>
                <span style={{ color: P.text }}>
                  {((seg.value / totalAlloc) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
            {store.allocation.length === 0 && (
              <span style={{ color: P.subtle, fontSize: 12 }}>暂无持仓</span>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div
        style={{
          background: P.panel,
          border: `1px solid ${P.line}`,
          borderRadius: 14,
          padding: "16px 18px 10px",
          marginBottom: 26,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 13, color: P.muted }}>
            资产走势 · {period === "1D" ? "当日分时" : "近 " + period}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setPeriod(r)}
                style={{
                  background: r === period ? P.chipBg : "transparent",
                  color: r === period ? P.text : P.muted,
                  border: "none",
                  padding: "5px 11px",
                  borderRadius: 7,
                  fontSize: 11.5,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        {series.length >= 2 ? (
          <AreaChart
            series={series}
            labels={labels}
            height={210}
            color={P.accent}
            fillFrom={P.accentSoft}
            fillTo={P.isDark ? "rgba(185,166,255,0)" : "rgba(91,79,212,0)"}
            P={P}
            baseline
            formatValue={(v) => cFmtMoney(v, { dec: 0 })}
          />
        ) : (
          <div
            style={{
              height: 210,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: P.subtle,
              fontSize: 13,
            }}
          >
            {store.holdings.length ? "加载走势中…" : "添加持仓后查看资产走势"}
          </div>
        )}
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26 }}>
        <MiniList
          title="持仓 · 今日表现"
          actionLabel="全部 →"
          onAction={() => store.setTab("holdings")}
          P={P}
          rows={store.sortedHoldings.slice(0, 5)}
          sparks={sparks}
          emptyText="暂无持仓"
        />
        <MiniList
          title="自选 · 今日变动"
          actionLabel="全部 →"
          onAction={() => store.setTab("watch")}
          P={P}
          rows={[...store.watchFull].sort((a, b) => b.todayPct - a.todayPct).slice(0, 5)}
          sparks={sparks}
          emptyText="暂无自选"
        />
      </div>
    </div>
  );
}

function MiniList({
  title,
  actionLabel,
  onAction,
  rows,
  P,
  sparks,
  emptyText,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
  rows: (HoldingFull | WatchFull)[];
  P: Palette;
  sparks: Record<string, number[]>;
  emptyText: string;
}) {
  const store = useStore();
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
          padding: "0 2px",
        }}
      >
        <span style={{ fontSize: 13, color: P.muted }}>{title}</span>
        <button
          onClick={onAction}
          style={{
            background: "transparent",
            border: "none",
            color: P.subtle,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {actionLabel}
        </button>
      </div>
      <div>
        {rows.length === 0 && (
          <div style={{ color: P.subtle, fontSize: 13, padding: "12px 2px" }}>{emptyText}</div>
        )}
        {rows.map((r, i) => {
          const c = cMove(r.todayPct, store.theme);
          const spark = sparks[r.code];
          return (
            <div
              key={r.code}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 64px 70px",
                alignItems: "center",
                padding: "11px 2px",
                borderTop: i === 0 ? "none" : `1px solid ${P.lineSoft}`,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <div>
                <div style={{ fontSize: 14, color: P.text, whiteSpace: "nowrap" }}>{r.name}</div>
                <div style={{ fontSize: 11, color: P.subtle, marginTop: 1, letterSpacing: "0.04em" }}>
                  {r.code} · {store.typeLabel(r)}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                {spark ? <Spark data={spark} color={c} width={56} height={22} /> : null}
              </div>
              <div style={{ textAlign: "right", color: c, fontSize: 13 }}>
                {cFmtPct(r.todayPct)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
