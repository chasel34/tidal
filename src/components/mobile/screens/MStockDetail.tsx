"use client";

import { useState } from "react";
import { typeLabel, unitLabel, usePortfolioDerived, useStore } from "@/store/useStore";
import { usePalette } from "@/hooks/usePalette";
import { useKline } from "@/hooks/useKline";
import { cFmtMoney, cFmtNum, cFmtPct, cMove } from "@/lib/format";
import { MCard } from "@/components/mobile/ui/MCard";
import { MSegmented } from "@/components/mobile/ui/MSegmented";
import { MStat } from "@/components/mobile/ui/MStat";
import { MSectionLabel } from "@/components/mobile/ui/MSectionLabel";
import { MCandle } from "@/components/mobile/charts/MCandle";
import type { DetailPeriod } from "@/lib/types";

type SheetState = { type: "watch" } | { type: "holding"; code?: string } | null;

interface MStockDetailProps {
  code: string;
  onBack: () => void;
  openSheet: (s: SheetState) => void;
}

const TAKE_MAP: Record<DetailPeriod, number> = { "1M": 22, "3M": 66, "1Y": 250 };

export function MStockDetail({ code, onBack: _onBack, openSheet }: MStockDetailProps) {
  const P = usePalette();
  const theme = useStore((state) => state.theme);
  const quotes = useStore((state) => state.quotes);
  const { holdingsFull, watchFull } = usePortfolioDerived();
  const [period, setPeriod] = useState<DetailPeriod>("1M");

  const holding = holdingsFull.find((h) => h.code === code);
  const watchItem = watchFull.find((w) => w.code === code);
  const q = quotes[code];

  const inst = holding || watchItem;
  const market = inst?.market ?? null;
  const price = holding?.price ?? watchItem?.price ?? q?.price ?? 0;
  const todayPct = holding?.todayPct ?? watchItem?.todayPct ?? q?.changePercent ?? 0;

  const { candles, labels, loading } = useKline(code, market, TAKE_MAP[period]);

  const move = (v: number) => cMove(v, theme);

  return (
    <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Price hero */}
      <div style={{ padding: "12px 0" }}>
        {inst && <div style={{ fontSize: 11, color: P.subtle, marginBottom: 4 }}>{inst.code} · {inst.market?.toUpperCase()} · {typeLabel(inst)}</div>}
        <div style={{ fontSize: 40, fontWeight: 300, color: cMove(todayPct, theme), fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
          {cFmtNum(price)}
        </div>
        <div style={{ fontSize: 14, color: cMove(todayPct, theme), marginTop: 6 }}>{cFmtPct(todayPct)}</div>
      </div>

      {/* Candle chart */}
      <MCard P={P}>
        {loading && candles.length === 0 ? (
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: P.subtle, fontSize: 13 }}>加载中...</div>
        ) : candles.length > 0 ? (
          <MCandle candles={candles} labels={labels} height={200} P={P} move={move} />
        ) : (
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: P.subtle, fontSize: 13 }}>暂无K线数据</div>
        )}
        <div style={{ marginTop: 10 }}>
          <MSegmented P={P} options={["1M", "3M", "1Y"]} value={period} onChange={(v) => setPeriod(v as DetailPeriod)} size="sm" />
        </div>
      </MCard>

      {/* Position section */}
      {holding && (
        <MCard P={P}>
          <MSectionLabel P={P}>我的持仓</MSectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <MStat P={P} label="成本价" value={cFmtNum(holding.cost)} />
            <MStat P={P} label="持有" value={`${holding.shares.toFixed(0)}${unitLabel(holding)}`} />
            <MStat P={P} label="市值" value={cFmtMoney(holding.marketValue, { dec: 0 })} />
            <MStat P={P} label="仓位" value={holding.weight.toFixed(1) + "%"} />
            <MStat P={P} label="累计盈亏" value={cFmtMoney(holding.gainAbs, { sign: true })} color={cMove(holding.gainAbs, theme)} />
            <MStat P={P} label="今日盈亏" value={cFmtMoney(holding.todayDeltaTotal, { sign: true })} color={cMove(holding.todayDeltaTotal, theme)} />
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
