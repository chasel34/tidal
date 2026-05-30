"use client";

import { useState } from "react";
import type { Palette } from "@/lib/theme";
import type { FundAllocSegment, HoldingFull } from "@/lib/types";
import { cFmtMoney, cFmtNum, cFmtPct, cMove } from "@/lib/format";
import { nextTradingDay } from "@/lib/client-util";
import { useStore } from "@/store/useStore";
import { useFundProfile } from "@/hooks/useFundProfile";
import { AreaChart } from "@/components/shared/charts/AreaChart";
import { Stat } from "@/components/shared/ui/Stat";
import { tidalBtn } from "@/components/shared/ui/styles";
import type { DetailPeriod } from "@/lib/types";
import type { ModalState } from "./types";

const RANGES: { key: DetailPeriod; take: number }[] = [
  { key: "1M", take: 22 },
  { key: "3M", take: 66 },
  { key: "1Y", take: 250 },
];

function SectionLabel({
  children,
  P,
  action,
}: {
  children: React.ReactNode;
  P: Palette;
  action?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        margin: "22px 0 12px",
        paddingTop: 18,
        borderTop: `1px solid ${P.line}`,
      }}
    >
      <span style={{ fontSize: 12.5, color: P.text, fontWeight: 500 }}>
        {children}
      </span>
      {action && <span style={{ fontSize: 11, color: P.subtle }}>{action}</span>}
    </div>
  );
}

/** Stacked 股/债/现 allocation bar with legend. */
function AllocBar({ segments, P }: { segments: FundAllocSegment[]; P: Palette }) {
  const colors = P.isDark
    ? ["#b9a6ff", "#7ad9c8", "#5a6072"]
    : ["#5b4fd4", "#2e9d8f", "#cfc7b6"];
  const total = segments.reduce((s, x) => s + x.pct, 0) || 1;
  return (
    <div>
      <div
        style={{
          display: "flex",
          height: 9,
          borderRadius: 6,
          overflow: "hidden",
          gap: 2,
        }}
      >
        {segments.map(
          (s, i) =>
            s.pct > 0 && (
              <div
                key={s.label}
                style={{
                  width: `${(s.pct / total) * 100}%`,
                  background: colors[i % colors.length],
                }}
              />
            )
        )}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 9, flexWrap: "wrap" }}>
        {segments.map((s, i) => (
          <div
            key={s.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11.5,
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
            <span style={{ color: P.muted }}>{s.label}</span>
            <span style={{ color: P.text }}>{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 盘中估值 + 今日预估收益 card. */
function FundEstimateCard({
  estimated,
  estNav,
  estPct,
  estTime,
  todayGain,
  P,
}: {
  estimated: boolean;
  estNav: number;
  estPct: number;
  estTime: string;
  todayGain: number;
  P: Palette;
}) {
  const theme = P.isDark ? "dark" : "light";
  const estC = cMove(estPct, theme);
  const gainC = cMove(todayGain, theme);
  return (
    <div
      style={{
        background: P.isDark ? "#16161a" : "#faf9f5",
        border: `1px solid ${P.line}`,
        borderRadius: 13,
        padding: "15px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: P.subtle,
              letterSpacing: "0.04em",
              marginBottom: 5,
            }}
          >
            {estimated ? "盘中估算净值" : "最新单位净值"}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span
              style={{
                fontSize: 30,
                color: estC,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ¥{cFmtNum(estNav, 4)}
            </span>
            <span
              style={{
                fontSize: 14,
                color: estC,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {cFmtPct(estPct)}
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: 10.5,
            color: P.subtle,
            background: P.chipBg,
            padding: "3px 9px",
            borderRadius: 999,
            whiteSpace: "nowrap",
          }}
        >
          {estimated ? `${estTime} 估算` : "已结算"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 14,
          paddingTop: 13,
          borderTop: `1px solid ${P.line}`,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: P.subtle, marginBottom: 3 }}>
            {estimated ? "今日预估收益" : "今日收益"}
          </div>
          <div
            style={{
              fontSize: 19,
              color: gainC,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {todayGain > 0 ? "+" : ""}
            {cFmtMoney(todayGain, { dec: 2 })}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: P.subtle, marginBottom: 3 }}>
            预计确认
          </div>
          <div
            style={{
              fontSize: 13,
              color: P.muted,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {nextTradingDay()} (T+1)
          </div>
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: P.subtle, marginTop: 11, lineHeight: 1.5 }}>
        盘中估值仅供参考 · 实际收益以当日收盘公布的单位净值为准
      </div>
    </div>
  );
}

export function FundDetail({
  h,
  P,
  openModal,
}: {
  h: HoldingFull;
  P: Palette;
  openModal: (m: ModalState) => void;
}) {
  const quotes = useStore((state) => state.quotes);
  const theme = useStore((state) => state.theme);
  const [period, setPeriod] = useState<DetailPeriod>("3M");
  const { profile, loading } = useFundProfile(h.code);
  const q = quotes[h.code];

  const estimated = !!q?.estimated;
  // headline NAV: estimate while unsettled, else effective settled price
  const estNav = q?.estimatedNav ?? h.price;
  const estPct = q?.estimatedChangePercent ?? h.todayPct;
  const estTime = (q?.estimateTime ?? "").slice(11) || (q?.estimateTime ?? "");
  // store already computes shares × (price − prevClose); price/prevClose reflect
  // estimate-vs-settled, so this is the right "today" figure either way.
  const todayGain = h.todayDeltaTotal;

  const nav = q?.nav ?? h.price;
  const navDate = q?.navDate ?? profile?.navDate ?? "";
  const accNav = q?.accNav ?? profile?.accNav;
  const m = profile?.manager;

  const take = RANGES.find((r) => r.key === period)?.take ?? 66;
  const navSeries = (profile?.navHistory ?? []).slice(-take);
  const series = navSeries.map((p) => p.nav);
  const labels = navSeries.map((p) => p.date.slice(5));
  const gainC = cMove(h.gainAbs, theme);

  return (
    <div
      style={{
        background: P.panel,
        border: `1px solid ${P.line}`,
        borderRadius: 14,
        padding: 20,
        alignSelf: "start",
      }}
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11.5,
              color: P.subtle,
              letterSpacing: "0.08em",
              marginBottom: 6,
            }}
          >
            {h.code} · 场外基金
          </div>
          <div style={{ fontSize: 20, color: P.text }}>{h.name}</div>
          {m && (
            <div style={{ fontSize: 11.5, color: P.subtle, marginTop: 4 }}>
              {"★".repeat(m.star)}
              <span style={{ opacity: 0.3 }}>{"★".repeat(5 - m.star)}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => openModal({ type: "holding", code: h.code })}
          style={{ ...tidalBtn(P), padding: "6px 13px", fontSize: 12 }}
        >
          编辑
        </button>
      </div>

      <FundEstimateCard
        estimated={estimated}
        estNav={estNav}
        estPct={estPct}
        estTime={estTime}
        todayGain={todayGain}
        P={P}
      />

      {/* confirmed nav row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
          marginTop: 16,
        }}
      >
        <Stat label="单位净值" value={`¥${cFmtNum(nav, 4)}`} sub={navDate.slice(5)} P={P} />
        <Stat
          label="累计净值"
          value={accNav != null ? `¥${cFmtNum(accNav, 4)}` : "—"}
          P={P}
        />
        <Stat
          label="基金规模"
          value={profile?.fundSize != null ? `${cFmtNum(profile.fundSize, 1)}亿` : "—"}
          P={P}
        />
      </div>

      {/* NAV trend */}
      <SectionLabel P={P}>净值走势</SectionLabel>
      <div
        style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginBottom: 2 }}
      >
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setPeriod(r.key)}
            style={{
              background: r.key === period ? P.chipBg : "transparent",
              color: r.key === period ? P.text : P.muted,
              border: "none",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {r.key}
          </button>
        ))}
      </div>
      {series.length >= 2 ? (
        <AreaChart
          series={series}
          labels={labels}
          height={170}
          color={P.accent}
          fillFrom={P.accentSoft}
          fillTo={P.isDark ? "rgba(185,166,255,0)" : "rgba(91,79,212,0)"}
          P={P}
          baseline
          formatValue={(v) => "¥" + cFmtNum(v, 4)}
        />
      ) : (
        <div style={{ fontSize: 12, color: P.subtle, padding: "20px 0" }}>
          {loading ? "加载净值走势…" : "暂无净值走势"}
        </div>
      )}

      {/* 我的持仓 */}
      <SectionLabel P={P}>我的持仓</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
          rowGap: 16,
        }}
      >
        <Stat label="持有份额" value={`${cFmtNum(h.shares, 0)} 份`} P={P} />
        <Stat label="持仓成本" value={`¥${cFmtNum(h.cost, 4)}`} P={P} />
        <Stat label="持仓市值" value={cFmtMoney(h.marketValue, { dec: 0 })} P={P} />
        <Stat
          label="持有收益"
          value={`${h.gainAbs > 0 ? "+" : ""}${cFmtMoney(h.gainAbs, { dec: 0 })}`}
          color={gainC}
          sub={cFmtPct(h.gainPct)}
          P={P}
        />
        <Stat label="占总仓位" value={`${h.weight.toFixed(1)}%`} P={P} />
      </div>

      {/* 资产配置 */}
      {profile?.assetAlloc.length ? (
        <>
          <SectionLabel P={P} action={navDate ? `截至 ${navDate.slice(5)}` : undefined}>
            资产配置
          </SectionLabel>
          <AllocBar segments={profile.assetAlloc} P={P} />
        </>
      ) : null}

      {/* 重仓股今日表现 */}
      {profile?.topHoldings.length ? (
        <>
          <SectionLabel P={P} action="前十大重仓">
            重仓股今日表现
          </SectionLabel>
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "20px 1fr 64px",
                gap: 10,
                padding: "0 0 8px",
                fontSize: 10.5,
                color: P.subtle,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <span />
              <span>名称</span>
              <span style={{ textAlign: "right" }}>今日</span>
            </div>
            {profile.topHoldings.map((s, i) => (
              <div
                key={s.code}
                style={{
                  display: "grid",
                  gridTemplateColumns: "20px 1fr 64px",
                  gap: 10,
                  alignItems: "center",
                  padding: "8px 0",
                  borderTop: `1px solid ${P.lineSoft}`,
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span style={{ color: P.subtle, fontSize: 11 }}>{i + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: P.text,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {s.name}
                  </div>
                  <div
                    style={{
                      color: P.subtle,
                      fontSize: 10.5,
                      letterSpacing: "0.03em",
                    }}
                  >
                    {s.code}
                  </div>
                </div>
                <span style={{ textAlign: "right", color: cMove(s.todayPct, theme) }}>
                  {cFmtPct(s.todayPct)}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* 基金信息 */}
      {m ? (
        <>
          <SectionLabel P={P}>基金信息</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              rowGap: 14,
            }}
          >
            <Stat label="基金经理" value={m.name} sub={m.workTime} P={P} />
            <Stat label="经理规模" value={m.fundSize || "—"} P={P} />
          </div>
        </>
      ) : null}
    </div>
  );
}
