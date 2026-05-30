import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronRight, RefreshCw, Settings } from "lucide-react";
import { INDICES } from "@shared/constants";
import { cFmtCompact, cFmtMoney, cFmtNum, cFmtPct } from "@shared/format";
import { moveColor } from "@shared/theme";
import type { Palette } from "@shared/theme";
import { AreaChart } from "./AreaChart";
import { describeTray, renderTrayImage } from "@/lib/trayImage";
import { useMeasure } from "@/hooks/useMeasure";
import { usePalette } from "@/hooks/usePalette";
import { usePortfolioSeries } from "@/hooks/usePortfolioSeries";
import { useQuotes, useRefreshQuotes } from "@/hooks/useQuotes";
import {
  useConfig,
  useMenubarStore,
  usePortfolioDerived,
  useResolvedTheme,
} from "@/store/useMenubarStore";

function Divider({ P }: { P: Palette }) {
  return <div style={{ height: 1, background: P.lineSoft, margin: "5px 12px" }} />;
}

function StatCell({
  label,
  value,
  color,
  P,
}: {
  label: string;
  value: string;
  color?: string;
  P: Palette;
}) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: P.subtle, marginBottom: 2 }}>{label}</div>
      <div
        style={{
          fontSize: 14,
          color: color || P.text,
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Expand({
  title,
  right,
  rightColor,
  open,
  onToggle,
  children,
  P,
}: {
  title: string;
  right: string;
  rightColor?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  P: Palette;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "9px 14px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
          borderRadius: 8,
        }}
      >
        <span style={{ fontSize: 13, color: P.text, flex: 1 }}>{title}</span>
        <span
          style={{
            fontSize: 12,
            color: rightColor || P.muted,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {right}
        </span>
        <ChevronRight
          size={15}
          color={P.subtle}
          style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}
        />
      </button>
      {open && (
        <div style={{ maxHeight: 134, overflowY: "auto", padding: "0 0 6px" }}>{children}</div>
      )}
    </div>
  );
}

function EmptyMini({ P, text }: { P: Palette; text: string }) {
  return (
    <div style={{ padding: "10px 14px 12px 22px", color: P.subtle, fontSize: 12 }}>
      {text}
    </div>
  );
}

function MiniRow({
  name,
  code,
  mid,
  pct,
  color,
  P,
}: {
  name: string;
  code: string;
  mid: string;
  pct: string;
  color: string;
  P: Palette;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 58px",
        gap: 8,
        alignItems: "center",
        padding: "5px 14px 5px 22px",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <div style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        <span style={{ fontSize: 12.5, color: P.text }}>{name}</span>
        <span style={{ fontSize: 10, color: P.subtle, marginLeft: 6, letterSpacing: "0.02em" }}>
          {code}
        </span>
      </div>
      <span style={{ fontSize: 12, color: P.muted, textAlign: "right" }}>{mid}</span>
      <span style={{ fontSize: 12, color, textAlign: "right" }}>{pct}</span>
    </div>
  );
}

function MenuRow({
  icon,
  label,
  shortcut,
  onClick,
  P,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  P: Palette;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        width: "100%",
        padding: "8px 14px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        textAlign: "left",
        borderRadius: 8,
      }}
    >
      {icon}
      <span style={{ flex: 1, fontSize: 13, color: P.text }}>{label}</span>
      {shortcut && <span style={{ fontSize: 12, color: P.subtle }}>{shortcut}</span>}
    </button>
  );
}

export function PopoverApp() {
  const P = usePalette();
  const config = useConfig();
  const theme = useResolvedTheme();
  const quotes = useMenubarStore((state) => state.quotes);
  const { holdingsFull, watchFull, summary } = usePortfolioDerived();
  const quoteQuery = useQuotes();
  const refreshQuotes = useRefreshQuotes();
  const series = usePortfolioSeries();
  const [open, setOpen] = useState<"holdings" | "watch" | "indices" | null>("holdings");
  const [refreshing, setRefreshing] = useState(false);
  const move = (value: number) => moveColor(value, theme, config.conv);
  const hasPortfolio = holdingsFull.length > 0 || config.cash > 0;
  const asOf = quoteQuery.dataUpdatedAt
    ? new Date(quoteQuery.dataUpdatedAt).toLocaleTimeString("zh-CN", { hour12: false })
    : "--:--:--";

  const systemTheme = useMenubarStore((state) => state.resolvedTheme);
  useEffect(() => {
    const descriptor = describeTray({
      mode: config.menubarMode,
      conv: config.conv,
      hasPortfolio,
      systemTheme,
      todayPct: summary.todayPct,
      todayDelta: summary.todayDelta,
      totalAssets: summary.totalAssets,
    });
    let cancelled = false;
    void renderTrayImage(descriptor).then((bitmap) => {
      if (cancelled) return;
      void window.tidal.setTrayImage({ bitmap, label: descriptor.label, tooltip: descriptor.tooltip });
    });
    return () => {
      cancelled = true;
    };
  }, [
    config.menubarMode,
    config.conv,
    hasPortfolio,
    summary.totalAssets,
    summary.todayPct,
    summary.todayDelta,
    systemTheme,
  ]);

  // Shrink-wrap the native popover window to the rendered content height so
  // there is no empty panel below the action menu.
  const [rootRef, rootSize] = useMeasure<HTMLDivElement>();
  const lastSentHeight = useRef(0);
  useEffect(() => {
    const height = Math.ceil(rootSize.height);
    if (height <= 0 || height === lastSentHeight.current) return;
    lastSentHeight.current = height;
    void window.tidal.resizePopover?.(height);
  }, [rootSize.height]);

  const doRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await refreshQuotes();
    setTimeout(() => setRefreshing(false), 450);
  };

  const indices = INDICES.map((idx) => ({
    ...idx,
    quote: quotes[idx.code],
  }));
  const posPct = summary.totalAssets ? (summary.marketValue / summary.totalAssets) * 100 : 0;
  const trendColor = move(summary.todayDelta);
  const periods = ["1W", "1M", "3M", "1Y"] as const;

  return (
    <div
      ref={rootRef}
      style={{
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: P.isDark ? "rgba(29,29,33,0.97)" : "rgba(252,251,248,0.98)",
        backdropFilter: "blur(30px) saturate(1.4)",
        border: `1px solid ${P.isDark ? "rgba(255,255,255,0.08)" : "rgba(40,30,20,0.08)"}`,
        borderRadius: 14,
        boxShadow: P.isDark
          ? "0 16px 50px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.04)"
          : "0 16px 50px rgba(40,30,20,0.2), 0 2px 6px rgba(40,30,20,0.08)",
      }}
    >
      <div style={{ padding: "4px 0" }}>
        <div style={{ padding: "12px 14px 2px" }}>
          <div style={{ fontSize: 10.5, color: P.subtle }}>总资产</div>
          <div
            style={{
              fontSize: 26,
              color: P.text,
              fontWeight: 500,
              marginTop: 2,
              letterSpacing: "-0.01em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {cFmtMoney(summary.totalAssets, { dec: 2 })}
          </div>
          <div style={{ fontSize: 12.5, color: trendColor, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
            今日 {cFmtMoney(summary.todayDelta, { sign: true, dec: 2 })}
            <span style={{ marginLeft: 5 }}>{cFmtPct(summary.todayPct)}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 10px", padding: "12px 14px 10px" }}>
          <StatCell P={P} label="持仓市值" value={cFmtMoney(summary.marketValue, { dec: 0 })} />
          <StatCell P={P} label="现金" value={cFmtMoney(summary.cash, { dec: 0 })} />
          <StatCell P={P} label="累计盈亏" color={move(summary.totalGain)} value={cFmtPct(summary.totalGainPct)} />
          <StatCell P={P} label="仓位" value={`${posPct.toFixed(0)}%`} />
        </div>

        {config.sections.trend && (
          <div style={{ padding: "0 4px 6px" }}>
            <AreaChart
              P={P}
              series={series.data?.series ?? []}
              labels={series.data?.labels ?? []}
              color={P.accent}
              formatValue={(value) => cFmtMoney(value, { dec: 0 })}
            />
            <div style={{ display: "flex", gap: 3, padding: "0 12px", justifyContent: "center" }}>
              {periods.map((period) => (
                <button
                  key={period}
                  onClick={() => void useMenubarStore.getState().patchConfig({ period })}
                  style={{
                    padding: "2px 10px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 10.5,
                    background: config.period === period ? (P.isDark ? "#2b2b33" : "#ece9e1") : "transparent",
                    color: config.period === period ? P.text : P.subtle,
                  }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        )}

        <Divider P={P} />

        <div style={{ padding: "0 4px" }}>
          {config.sections.holdings && (
            <Expand
              P={P}
              title="持仓"
              open={open === "holdings"}
              onToggle={() => setOpen(open === "holdings" ? null : "holdings")}
              right={`${holdingsFull.length} 只 · ${cFmtCompact(summary.marketValue)}`}
            >
              {holdingsFull.length ? (
                holdingsFull.map((h) => (
                  <MiniRow
                    key={h.code}
                    P={P}
                    name={h.name}
                    code={h.code}
                    mid={cFmtCompact(h.marketValue)}
                    pct={cFmtPct(h.todayPct)}
                    color={move(h.todayPct)}
                  />
                ))
              ) : (
                <EmptyMini P={P} text="暂无持仓，可在设置里添加。" />
              )}
            </Expand>
          )}
          {config.sections.watch && (
            <Expand
              P={P}
              title="自选"
              open={open === "watch"}
              onToggle={() => setOpen(open === "watch" ? null : "watch")}
              right={`${watchFull.length} 只`}
            >
              {watchFull.length ? (
                watchFull.map((w) => (
                  <MiniRow
                    key={w.code}
                    P={P}
                    name={w.name}
                    code={w.code}
                    mid={`¥${cFmtNum(w.price)}`}
                    pct={cFmtPct(w.todayPct)}
                    color={move(w.todayPct)}
                  />
                ))
              ) : (
                <EmptyMini P={P} text="暂无自选，可在设置里添加。" />
              )}
            </Expand>
          )}
          {config.sections.indices && (
            <Expand
              P={P}
              title="大盘"
              open={open === "indices"}
              onToggle={() => setOpen(open === "indices" ? null : "indices")}
              right={`${indices[0].name.slice(0, 2)} ${cFmtPct(indices[0].quote?.changePercent ?? 0)}`}
              rightColor={move(indices[0].quote?.changePercent ?? 0)}
            >
              {indices.map((idx) => (
                <MiniRow
                  key={idx.code}
                  P={P}
                  name={idx.name}
                  code={idx.code}
                  mid={cFmtNum(idx.quote?.price ?? 0)}
                  pct={cFmtPct(idx.quote?.changePercent ?? 0)}
                  color={move(idx.quote?.changePercent ?? 0)}
                />
              ))}
            </Expand>
          )}
        </div>

        {config.sections.actions && (
          <>
            <Divider P={P} />
            <div style={{ padding: "0 4px" }}>
              <MenuRow P={P} icon={<ArrowUpRight size={16} color={P.accent} />} label="打开主看板" onClick={() => void window.tidal.openDashboard()} />
              <MenuRow
                P={P}
                icon={<RefreshCw size={16} color={P.muted} style={{ animation: refreshing ? "spin .7s linear infinite" : "none" }} />}
                label="刷新行情"
                shortcut="⌘R"
                onClick={doRefresh}
              />
              <MenuRow P={P} icon={<Settings size={16} color={P.muted} />} label="设置…" shortcut="⌘," onClick={() => void window.tidal.openSettings()} />
            </div>
          </>
        )}
      </div>

      <div
        style={{
          padding: "7px 14px",
          borderTop: `1px solid ${P.lineSoft}`,
          fontSize: 10,
          color: P.subtle,
          display: "flex",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span>实时延迟 15 秒</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>更新于 {asOf}</span>
      </div>
    </div>
  );
}
