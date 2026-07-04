"use client";

import { useState } from "react";
import { typeLabel, usePortfolioDerived, useStore } from "@/store/useStore";
import { usePalette } from "@/hooks/usePalette";
import { useFundProfile } from "@/hooks/useFundProfile";
import { cFmtMoney, cFmtNum, cFmtPct, cMove } from "@/lib/format";
import { MCard } from "@/components/mobile/ui/MCard";
import { MSegmented } from "@/components/mobile/ui/MSegmented";
import { MStat } from "@/components/mobile/ui/MStat";
import { MSectionLabel } from "@/components/mobile/ui/MSectionLabel";
import { MArea } from "@/components/mobile/charts/MArea";
import type { FundAllocSegment } from "@/lib/types";
import type { SheetState } from "@/components/mobile/types";

interface MFundDetailProps {
  code: string;
  onBack: () => void;
  openSheet: (s: SheetState) => void;
}

function MAllocBar({ segments, P }: { segments: FundAllocSegment[]; P: ReturnType<typeof usePalette> }) {
  const total = segments.reduce((s, x) => s + x.pct, 0) || 1;
  const colors = ["#5b4fd4", "#2e9d8f", "#e08a3b", "#cfc7b6"];
  if (P.isDark) {
    colors[0] = "#b9a6ff";
    colors[1] = "#7ad9c8";
    colors[2] = "#f5a86a";
    colors[3] = "#5a6072";
  }
  return (
    <div>
      <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 10, marginBottom: 10 }}>
        {segments.map((seg, i) => (
          <div key={seg.label} style={{ width: `${(seg.pct / total) * 100}%`, background: colors[i % colors.length] }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
        {segments.map((seg, i) => (
          <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length] }} />
            <span style={{ color: P.text }}>{seg.label}</span>
            <span style={{ color: P.muted }}>{seg.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MFundDetail({ code, openSheet }: MFundDetailProps) {
  const P = usePalette();
  const theme = useStore((state) => state.theme);
  const quotes = useStore((state) => state.quotes);
  const { holdingsFull, watchFull } = usePortfolioDerived();
  const { profile, loading: profileLoading } = useFundProfile(code);
  const [navPeriod, setNavPeriod] = useState("3M");

  const holding = holdingsFull.find((h) => h.code === code);
  const watchItem = watchFull.find((w) => w.code === code);
  const inst = holding || watchItem;
  const q = quotes[code];

  const estNav = q?.estimatedNav ?? q?.price ?? 0;
  const estPct = q?.estimatedChangePercent ?? q?.changePercent ?? 0;
  // 单位净值 must not fall back to 累计净值 — show "--" instead of a wrong figure
  const nav = q?.nav ?? 0;
  const accNav = q?.accNav ?? profile?.accNav;

  const navHistory = profile?.navHistory ?? [];
  const periodTake: Record<string, number> = { "1M": 22, "3M": 66, "6M": 132, "1Y": 250 };
  const take = periodTake[navPeriod] ?? 66;
  const navSlice = navHistory.slice(-take);
  const navSeries = navSlice.map((p) => p.nav);
  const navLabels = navSlice.map((p) => p.date.slice(5));

  const move = (v: number) => cMove(v, theme);

  return (
    <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ padding: "12px 0 0" }}>
        {inst && <div style={{ fontSize: 11, color: P.subtle, marginBottom: 4 }}>{inst.code} · {typeLabel(inst)}</div>}
      </div>

      {/* Estimate card */}
      <MCard P={P} style={{ background: P.panelAlt }}>
        <div style={{ fontSize: 11, color: P.subtle, marginBottom: 6 }}>盘中估值</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 28, fontWeight: 300, color: cMove(estPct, theme), fontVariantNumeric: "tabular-nums" }}>{cFmtNum(estNav, 4)}</span>
          <span style={{ fontSize: 14, color: cMove(estPct, theme) }}>{cFmtPct(estPct)}</span>
        </div>
        {holding && (
          <div style={{ fontSize: 12.5, color: cMove(estPct, theme), marginTop: 6 }}>
            估算盈亏 {cFmtMoney(holding.shares * (estNav - holding.cost), { sign: true })}
          </div>
        )}
        <div style={{ fontSize: 11, color: P.subtle, marginTop: 6 }}>确认日 T+1{q?.estimateTime ? ` · ${q.estimateTime}` : ""}</div>
      </MCard>

      {/* Confirmed NAV */}
      <MCard P={P}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <MStat P={P} label="单位净值" value={nav ? cFmtNum(nav, 4) : "--"} />
          <MStat P={P} label="累计净值" value={accNav ? cFmtNum(accNav, 4) : "--"} />
          <MStat P={P} label="基金规模" value={profile?.fundSize ? `${profile.fundSize.toFixed(1)}亿` : "--"} />
        </div>
      </MCard>

      {/* NAV trend */}
      <MCard P={P}>
        <MSectionLabel P={P}>净值走势</MSectionLabel>
        {navSeries.length >= 2 ? (
          <MArea series={navSeries} labels={navLabels} height={180} P={P} formatValue={(v) => v.toFixed(4)} />
        ) : (
          <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: P.subtle, fontSize: 13 }}>
            {profileLoading ? "加载中..." : "暂无数据"}
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          <MSegmented P={P} options={["1M", "3M", "6M", "1Y"]} value={navPeriod} onChange={setNavPeriod} size="sm" />
        </div>
      </MCard>

      {/* Position */}
      {holding && (
        <MCard P={P}>
          <MSectionLabel P={P}>我的持仓</MSectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <MStat P={P} label="成本价" value={cFmtNum(holding.cost, 4)} />
            <MStat P={P} label="份额" value={holding.shares.toFixed(2)} />
            <MStat P={P} label="市值" value={cFmtMoney(holding.marketValue, { dec: 0 })} />
            <MStat P={P} label="仓位" value={holding.weight.toFixed(1) + "%"} />
            <MStat P={P} label="累计盈亏" value={cFmtMoney(holding.gainAbs, { sign: true })} color={move(holding.gainAbs)} />
            <MStat P={P} label="收益率" value={cFmtPct(holding.gainPct)} color={move(holding.gainPct)} />
          </div>
        </MCard>
      )}

      {/* Asset allocation */}
      {profile && profile.assetAlloc.length > 0 && (
        <MCard P={P}>
          <MSectionLabel P={P}>资产配置</MSectionLabel>
          <MAllocBar segments={profile.assetAlloc} P={P} />
        </MCard>
      )}

      {/* Top holdings */}
      {profile && profile.topHoldings.length > 0 && (
        <MCard P={P}>
          <MSectionLabel P={P}>重仓股票</MSectionLabel>
          {profile.topHoldings.map((th) => (
            <div key={th.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${P.lineSoft}` }}>
              <div>
                <div style={{ fontSize: 13, color: P.text }}>{th.name}</div>
                <div style={{ fontSize: 11, color: P.subtle }}>{th.code}</div>
              </div>
              <span style={{ fontSize: 12, color: cMove(th.todayPct, theme), fontVariantNumeric: "tabular-nums" }}>{cFmtPct(th.todayPct)}</span>
            </div>
          ))}
        </MCard>
      )}

      {/* Fund info */}
      {profile && (
        <MCard P={P}>
          <MSectionLabel P={P}>基金信息</MSectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <MStat P={P} label="基金经理" value={profile.manager?.name ?? "--"} />
            <MStat P={P} label="管理年限" value={profile.manager?.workTime ?? "--"} />
            <MStat P={P} label="基金类型" value={profile.fullType ?? "--"} />
            <MStat P={P} label="净值日期" value={profile.navDate ?? "--"} />
          </div>
        </MCard>
      )}

      {/* Action */}
      <button
        onClick={() => openSheet({ type: "holding", code: holding ? code : undefined })}
        style={{
          padding: "14px",
          borderRadius: 14,
          background: holding ? P.chipBg : P.accent,
          color: holding ? P.text : "#fff",
          fontSize: 15,
          fontWeight: 600,
          border: "none",
          cursor: "pointer",
        }}
      >
        {holding ? "编辑持仓" : "＋ 加入持仓"}
      </button>
    </div>
  );
}
