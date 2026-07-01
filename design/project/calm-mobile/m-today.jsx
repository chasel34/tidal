// Calm Mobile — 今天 (Today) overview screen.
function MToday({ store, T, openSheet, goDetail }) {
  const P = T.P;
  const { summary, period, setPeriod, portfolioSeries } = store;
  const up = summary.todayDelta >= 0;
  const moveC = T.move(summary.todayDelta);
  const { series, labels } = portfolioSeries(period);

  const allocColors = P.isDark
    ? [T.accent, "#7ad9c8", "#f5a86a", "#5a6072"]
    : [T.accent, "#2e9d8f", "#e08a3b", "#cfc7b6"];
  const totalAlloc = store.allocation.reduce((s, x) => s + x.value, 0) || 1;
  const fe = store.fundEstimate;

  return (
    <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Hero */}
      <div style={{ padding: "6px 4px 2px" }}>
        <div style={{ fontSize: 13, color: P.muted, marginBottom: 10 }}>
          今日盈亏 · 周四 {window.CALM.asOf.split(" ")[0]}</div>
        <div style={{ fontSize: 52, fontWeight: 300, letterSpacing: "-0.03em", color: moveC,
          lineHeight: 1, marginBottom: 12, fontVariantNumeric: "tabular-nums" }}>
          {up ? "+" : ""}{cFmtMoney(summary.todayDelta, { dec: 2 })}</div>
        <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap",
          fontVariantNumeric: "tabular-nums" }}>
          <span style={{ fontSize: 16, color: moveC, fontWeight: 500 }}>{cFmtPct(summary.todayPct)}</span>
          <span style={{ fontSize: 13.5, color: P.muted }}>总额 {cFmtMoney(summary.totalAssets, { dec: 0 })}</span>
          <span style={{ fontSize: 13.5, color: T.move(summary.totalGain) }}>累计 {cFmtPct(summary.totalGainPct)}</span>
        </div>
      </div>

      {/* Chart card */}
      <MCard T={T} pad={14}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 12, padding: "0 2px" }}>
          <span style={{ fontSize: 13.5, color: P.muted }}>
            资产走势 · {period === "1D" ? "当日分时" : "近 " + period}</span>
        </div>
        <MArea series={series} labels={labels} height={200} T={T}
          formatValue={v => cFmtMoney(v, { dec: 0 })} />
        <div style={{ marginTop: 12 }}>
          <MSegmented T={T} options={["1D", "1W", "1M", "3M", "1Y"]} value={period} onChange={setPeriod} size="sm" />
        </div>
      </MCard>

      {/* 场外基金 预估收益 */}
      {fe.count > 0 && (() => {
        const c = T.move(fe.gain);
        return (
          <MCard T={T} pad={16} onClick={() => store.setTab("holdings")} style={{ display: "flex",
            alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: P.text, marginBottom: 3, fontWeight: 500 }}>场外基金 · 今日预估</div>
              <div style={{ fontSize: 12, color: P.subtle }}>{fe.count} 只 · 盘中估算 · 净值次日确认</div>
            </div>
            <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              <div style={{ fontSize: 21, color: c, letterSpacing: "-0.01em" }}>
                {fe.gain > 0 ? "+" : ""}{cFmtMoney(fe.gain, { dec: 2 })}</div>
              <div style={{ fontSize: 12.5, color: c }}>{cFmtPct(fe.pct)}</div>
            </div>
            <span style={{ color: P.subtle, fontSize: 20 }}>›</span>
          </MCard>
        );
      })()}

      {/* Allocation */}
      <MCard T={T} pad={16}>
        <div style={{ fontSize: 13.5, color: P.muted, marginBottom: 14, fontWeight: 500 }}>资产配置</div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ position: "relative", width: 104, height: 104, flexShrink: 0 }}>
            <CalmDonut segments={store.allocation} size={104} thickness={13} colors={allocColors} P={P} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 9.5, color: P.subtle, letterSpacing: "0.06em" }}>总市值</div>
              <div style={{ fontSize: 14, color: P.text, fontVariantNumeric: "tabular-nums" }}>
                ¥{cFmtCompact(summary.marketValue)}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
            {store.allocation.map((seg, i) => (
              <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 9,
                fontSize: 13.5, fontVariantNumeric: "tabular-nums" }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: allocColors[i % allocColors.length] }} />
                <span style={{ color: P.muted, flex: 1 }}>{seg.label}</span>
                <span style={{ color: P.text }}>{((seg.value / totalAlloc) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </MCard>

      {/* mini lists */}
      <MMiniList T={T} store={store} title="持仓 · 今日表现" goDetail={goDetail}
        onAll={() => store.setTab("holdings")}
        rows={store.sortedHoldings.slice(0, 4)} />
      <MMiniList T={T} store={store} title="自选 · 今日变动" goDetail={goDetail}
        onAll={() => store.setTab("watch")}
        rows={[...store.watchFull].sort((a, b) => b.todayPct - a.todayPct).slice(0, 4)} />
    </div>
  );
}

function MMiniList({ T, store, title, rows, onAll, goDetail }) {
  const P = T.P;
  return (
    <div>
      <MSectionLabel T={T} action={
        <button onClick={onAll} style={{ background: "transparent", border: "none", color: P.accent,
          fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>全部 ›</button>
      }>{title}</MSectionLabel>
      <MCard T={T} pad={4}>
        {rows.map((r, i) => {
          const c = T.move(r.todayPct);
          return (
            <div key={r.code} onClick={() => goDetail && goDetail(r.code)} style={{ display: "flex",
              alignItems: "center", gap: 12, padding: "12px 12px", cursor: goDetail ? "pointer" : "default",
              borderTop: i === 0 ? "none" : `1px solid ${P.lineSoft}`, fontVariantNumeric: "tabular-nums" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, color: P.text, whiteSpace: "nowrap", overflow: "hidden",
                  textOverflow: "ellipsis" }}>{r.name}</div>
                <div style={{ fontSize: 11.5, color: P.subtle, marginTop: 2, letterSpacing: "0.03em" }}>
                  {r.code} · {r.type}</div>
              </div>
              <Spark data={r.daily.slice(-30)} color={c} width={54} height={24} />
              <div style={{ textAlign: "right", minWidth: 62 }}>
                <div style={{ fontSize: 14.5, color: P.text }}>¥{cFmtNum(r.price)}</div>
                <div style={{ fontSize: 12.5, color: c }}>{cFmtPct(r.todayPct)}</div>
              </div>
            </div>
          );
        })}
      </MCard>
    </div>
  );
}

Object.assign(window, { MToday, MMiniList });
