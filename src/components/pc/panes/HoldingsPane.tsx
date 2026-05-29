"use client";

import { useRef, useState } from "react";
import type { Palette } from "@/lib/theme";
import { cFmtCompact, cFmtMoney, cFmtNum, cFmtPct, cMove } from "@/lib/format";
import { PERIODS } from "@/lib/constants";
import { useStore } from "@/store/useStore";
import { useKline } from "@/hooks/useKline";
import { isOffMarketFund } from "@/lib/client-util";
import { CandleChart } from "@/components/shared/charts/CandleChart";
import { FundDetail } from "@/components/pc/panes/FundDetail";
import { SortTh } from "@/components/shared/ui/SortTh";
import { Stat } from "@/components/shared/ui/Stat";
import { EmptyState } from "@/components/shared/ui/EmptyState";
import { tidalBtn } from "@/components/shared/ui/styles";
import { exportJSON, validateHoldings } from "@/lib/io";
import type { DetailPeriod, HoldingSortKey } from "@/lib/types";
import type { PaneProps } from "./types";

const DETAIL_RANGES: DetailPeriod[] = ["1M", "3M", "1Y"];

export function HoldingsPane({ P, openModal }: { P: Palette } & PaneProps) {
  const store = useStore();
  const [selCode, setSelCode] = useState<string | null>(null);
  const [detailPeriod, setDetailPeriod] = useState<DetailPeriod>("3M");
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const list = store.sortedHoldings;

  function showMsg(text: string, ok: boolean) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setImportMsg({ text, ok });
    timerRef.current = setTimeout(() => setImportMsg(null), 3000);
  }

  function handleExport() {
    exportJSON("holdings", store.holdings);
  }

  function handleImportClick() {
    fileRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text) as unknown;
      const items = validateHoldings(raw);
      store.importHoldings(items);
      showMsg(`已导入 ${items.length} 条持仓`, true);
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "导入失败", false);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const h =
    list.find((x) => x.code === selCode) ?? (list.length ? list[0] : null);
  const kline = useKline(h?.code ?? null, h?.market ?? null, PERIODS[detailPeriod]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ color: P.muted, fontSize: 13, marginBottom: 6 }}>持仓</div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 400,
              color: P.text,
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {list.length} 只 · 市值 {cFmtMoney(store.summary.marketValue)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={handleExport} style={tidalBtn(P)}>
            导出
          </button>
          <button onClick={handleImportClick} style={tidalBtn(P)}>
            导入
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            onClick={() => openModal({ type: "holding" })}
            style={tidalBtn(P, "primary")}
          >
            ＋ 添加持仓
          </button>
        </div>
      </div>

      {importMsg && (
        <div
          style={{
            marginBottom: 14,
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 13,
            background: importMsg.ok
              ? P.isDark
                ? "#1a2e1a"
                : "#f0faf0"
              : P.isDark
                ? "#2e1a1a"
                : "#faf0f0",
            color: importMsg.ok
              ? P.isDark
                ? "#6ecf6e"
                : "#2a7a2a"
              : P.isDark
                ? "#cf6e6e"
                : "#9a2a2a",
            border: `1px solid ${importMsg.ok ? (P.isDark ? "#2d4a2d" : "#c8e6c8") : P.isDark ? "#4a2d2d" : "#e6c8c8"}`,
          }}
        >
          {importMsg.text}
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          P={P}
          text="还没有持仓 · 点击「添加持仓」开始记录"
          onAction={() => openModal({ type: "holding" })}
          actionLabel="添加持仓"
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 22 }}>
          {/* list */}
          <div
            style={{
              background: P.panel,
              border: `1px solid ${P.line}`,
              borderRadius: 14,
              padding: "6px 0",
              alignSelf: "start",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.7fr 78px 70px 78px",
                gap: 8,
                padding: "10px 18px",
              }}
            >
              {(
                [
                  ["名称", "name", "left"],
                  ["市值", "value", "right"],
                  ["今日", "today", "right"],
                  ["盈亏", "gain", "right"],
                ] as [string, HoldingSortKey, "left" | "right"][]
              ).map(([label, key, align]) => (
                <SortTh
                  key={key}
                  label={label}
                  sortKey={key}
                  align={align}
                  P={P}
                  active={store.sortH.key === key}
                  dir={store.sortH.dir}
                  onClick={store.toggleSortH}
                />
              ))}
            </div>
            {list.map((row) => {
              const todayC = cMove(row.todayPct, store.theme);
              const gainC = cMove(row.gainAbs, store.theme);
              const active = row.code === (h && h.code);
              return (
                <div
                  key={row.code}
                  onClick={() => setSelCode(row.code)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.7fr 78px 70px 78px",
                    gap: 8,
                    padding: "12px 18px",
                    cursor: "pointer",
                    alignItems: "center",
                    fontSize: 13,
                    fontVariantNumeric: "tabular-nums",
                    background: active ? P.hoverRow : "transparent",
                    borderLeft: `2px solid ${active ? P.accent : "transparent"}`,
                  }}
                >
                  <div>
                    <div style={{ color: P.text, fontSize: 14, whiteSpace: "nowrap" }}>
                      {row.name}
                    </div>
                    <div
                      style={{
                        color: P.subtle,
                        fontSize: 11,
                        marginTop: 2,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {row.code} · {cFmtNum(row.shares, 0)}
                      {store.unitLabel(row)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", color: P.text }}>
                    {cFmtCompact(row.marketValue)}
                  </div>
                  <div style={{ textAlign: "right", color: todayC }}>
                    {cFmtPct(row.todayPct)}
                  </div>
                  <div style={{ textAlign: "right", color: gainC }}>
                    {cFmtPct(row.gainPct)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* detail */}
          {h && isOffMarketFund(h) && (
            <FundDetail h={h} P={P} openModal={openModal} />
          )}
          {h && !isOffMarketFund(h) && (
            <div
              style={{
                background: P.panel,
                border: `1px solid ${P.line}`,
                borderRadius: 14,
                padding: 20,
                alignSelf: "start",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 14,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: P.subtle,
                      letterSpacing: "0.08em",
                      marginBottom: 5,
                    }}
                  >
                    {h.code} · {h.market.toUpperCase()} · {store.typeLabel(h)}
                  </div>
                  <div style={{ fontSize: 20, color: P.text }}>{h.name}</div>
                </div>
                <button
                  onClick={() => openModal({ type: "holding", code: h.code })}
                  style={{ ...tidalBtn(P), padding: "6px 13px", fontSize: 12 }}
                >
                  编辑
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 12,
                  marginBottom: 14,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <div style={{ fontSize: 32, color: P.text, letterSpacing: "-0.02em" }}>
                  ¥{cFmtNum(h.price)}
                </div>
                <div style={{ fontSize: 14, color: cMove(h.todayPct, store.theme) }}>
                  {cFmtPct(h.todayPct)} 今日
                </div>
              </div>

              {kline.available ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 4,
                      marginBottom: 4,
                    }}
                  >
                    {DETAIL_RANGES.map((r) => (
                      <button
                        key={r}
                        onClick={() => setDetailPeriod(r)}
                        style={{
                          background: r === detailPeriod ? P.chipBg : "transparent",
                          color: r === detailPeriod ? P.text : P.muted,
                          border: "none",
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 11,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  {kline.candles.length >= 2 ? (
                    <CandleChart
                      candles={kline.candles}
                      labels={kline.labels}
                      height={170}
                      theme={store.theme}
                      P={P}
                    />
                  ) : (
                    <div
                      style={{
                        height: 170,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: P.subtle,
                        fontSize: 13,
                      }}
                    >
                      {kline.loading ? "加载 K 线中…" : "暂无 K 线数据"}
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    height: 170,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: P.subtle,
                    fontSize: 13,
                  }}
                >
                  场外基金暂不提供 K 线
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: `1px solid ${P.line}`,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <Stat label="持仓成本" value={`¥${cFmtNum(h.cost)}`} P={P} />
                <Stat
                  label="持仓数量"
                  value={`${cFmtNum(h.shares, 0)} ${store.unitLabel(h)}`}
                  P={P}
                />
                <Stat label="持仓市值" value={cFmtMoney(h.marketValue, { dec: 0 })} P={P} />
                <Stat
                  label="持仓盈亏"
                  value={`${h.gainAbs > 0 ? "+" : ""}${cFmtMoney(h.gainAbs, { dec: 0 })}`}
                  color={cMove(h.gainAbs, store.theme)}
                  P={P}
                  sub={cFmtPct(h.gainPct)}
                />
                <Stat label="占总仓位" value={`${h.weight.toFixed(1)}%`} P={P} />
                <Stat
                  label="今日盈亏"
                  value={`${h.todayDeltaTotal > 0 ? "+" : ""}${cFmtMoney(h.todayDeltaTotal, { dec: 0 })}`}
                  color={cMove(h.todayDeltaTotal, store.theme)}
                  P={P}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
