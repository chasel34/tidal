// Calm Mobile — Today (overview) screen.
const { useState: useStateMT } = React;

function MTodayScreen({ store, P, openSheet, go }) {
  const { summary, period, setPeriod, portfolioSeries } = store;
  const D = window.CALM;
  const up = summary.todayDelta >= 0;
  const moveC = cMove(summary.todayDelta, store.theme);
  const { series, labels } = portfolioSeries(period);

  const allocColors = P.isDark
    ? ["#b9a6ff", "#7ad9c8", "#f5a86a", "#5a6072"]
    : ["#5b4fd4", "#2e9d8f", "#e08a3b", "#cfc7b6"];
  const totalAlloc = store.allocation.reduce((s, x) => s + x.value, 0) || 1;
  const fe = store.fundEstimate;

  const holdRows = store.sortedHoldings.slice(0, 4);
  const watchRows = [...store.watchFull].sort((a, b) => b.todayPct - a.todayPct).slice(0, 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, padding: "4px 14px 8px" }}>
      {/* Hero */}
      <div>
        <div style={{ fontSize: 12.5, color: P.muted, marginBottom: 10 }}>
          今日盈亏 · {D.asOf.split(" ")[0]}</div>
        <div style={{ fontSize: 46, fontWeight: 300, letterSpacing: "-0.03em",
          color: moveC, lineHeight: 1, marginBottom: 12, fontVariantNumeric: "tabular-nums" }}>
          {up ? "+" : ""}{cFmtMoney(summary.todayDelta, { dec: 2 })}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap",
          fontVariantNumeric: "tabular-nums" }}>
          <span style={{ fontSize: 13, color: moveC, background: P.isDark
            ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.035)", padding: "4px 10px",
            borderRadius: 999 }}>{cFmtPct(summary.todayPct)} 今日</span>
          <span style={{ fontSize: 13, color: P.muted, background: P.isDark
            ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.035)", padding: "4px 10px",
            borderRadius: 999 }}>总额 {cFmtMoney(summary.totalAssets, { dec: 0 })}</span>
          <span style={{ fontSize: 13, color: cMove(summary.totalGain, store.theme),
            background: P.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.035)",
            padding: "4px 10px", borderRadius: 999 }}>累计 {cFmtPct(summary.totalGainPct)}</span>
        </div>
      </div>

      {/* Trend chart */}
      <MCard P={P} pad={14}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: P.muted }}>资产走势</span>
          <MSegmented P={P} size="sm" options={["1D", "1W", "1M", "3M", "1Y"]}
            value={period} onChange={setPeriod} />
        </div>
        <MAreaChart series={series} labels={labels} height={190} color={P.accent}
          fillFrom={P.accentSoft} fillTo={P.isDark ? "rgba(185,166,255,0)" : "rgba(91,79,212,0)"}
          P={P} baseline formatValue={v => cFmtMoney(v, { dec: 0 })} />
      </MCard>

      {/* Allocation */}
      <MCard P={P}>
        <div style={{ fontSize: 13, color: P.muted, marginBottom: 12 }}>资产配置</div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ position: "relative", width: 104, height: 104, flexShrink: 0 }}>
            <CalmDonut segments={store.allocation} size={104} thickness={13}
              colors={allocColors} P={P} />
            <div style={{ position: "absolute", inset: 0, display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 9.5, color: P.subtle, letterSpacing: "0.06em" }}>总市值</div>
              <div style={{ fontSize: 14, color: P.text, fontVariantNumeric: "tabular-nums" }}>
                ¥{cFmtCompact(summary.marketValue)}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
            {store.allocation.map((seg, i) => (
              <div key={seg.label} style={{ display: "flex", alignItems: "center",
                gap: 8, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                <span style={{ width: 9, height: 9, borderRadius: 3,
                  background: allocColors[i % allocColors.length] }} />
                <span style={{ color: P.muted, flex: 1 }}>{seg.label}</span>
                <span style={{ color: P.text }}>{((seg.value / totalAlloc) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </MCard>

      {/* Fund estimate */}
      {fe.count > 0 && (() => {
        const c = cMove(fe.gain, store.theme);
        return (
          <MCard P={P} onClick={() => store.setTab("holdings")} style={{ display: "flex",
            alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, color: P.text, marginBottom: 3 }}>
                场外基金 · 今日预估收益</div>
              <div style={{ fontSize: 11.5, color: P.subtle }}>
                {fe.count} 只 · 盘中估算 · 净值次日确认</div>
            </div>
            <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              <div style={{ fontSize: 20, color: c }}>
                {fe.gain > 0 ? "+" : ""}{cFmtMoney(fe.gain, { dec: 2 })}</div>
              <div style={{ fontSize: 12, color: c }}>{cFmtPct(fe.pct)}</div>
            </div>
            <span style={{ color: P.subtle, fontSize: 16 }}>›</span>
          </MCard>
        );
      })()}

      {/* Holdings mini */}
      <div>
        <MSection P={P} action="全部 ›" onAction={() => store.setTab("holdings")}>
          持仓 · 今日表现</MSection>
        <MCard P={P} pad={0}>
          {holdRows.map((r, i) => {
            const c = cMove(r.todayPct, store.theme);
            return (
              <div key={r.code} onClick={() => go({ name: "holding", code: r.code })}
                style={{ display: "flex", alignItems: "center", gap: 10,
                  padding: "13px 16px", cursor: "pointer",
                  borderTop: i === 0 ? "none" : `1px solid ${P.lineSoft}`,
                  fontVariantNumeric: "tabular-nums" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, color: P.text, whiteSpace: "nowrap" }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: P.subtle, marginTop: 1 }}>{r.code}</div>
                </div>
                <Spark data={r.daily.slice(-30)} color={c} width={52} height={22} />
                <div style={{ width: 64, textAlign: "right", color: c, fontSize: 14 }}>
                  {cFmtPct(r.todayPct)}</div>
              </div>
            );
          })}
        </MCard>
      </div>

      {/* Watch mini */}
      {watchRows.length > 0 && (
        <div>
          <MSection P={P} action="全部 ›" onAction={() => store.setTab("watch")}>
            自选 · 今日变动</MSection>
          <MCard P={P} pad={0}>
            {watchRows.map((r, i) => {
              const c = cMove(r.todayPct, store.theme);
              return (
                <div key={r.code} style={{ display: "flex", alignItems: "center", gap: 10,
                  padding: "13px 16px", borderTop: i === 0 ? "none" : `1px solid ${P.lineSoft}`,
                  fontVariantNumeric: "tabular-nums" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, color: P.text, whiteSpace: "nowrap" }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: P.subtle, marginTop: 1 }}>{r.code} · {r.market}</div>
                  </div>
                  <Spark data={r.daily.slice(-30)} color={c} width={52} height={22} />
                  <div style={{ width: 64, textAlign: "right", color: c, fontSize: 14 }}>
                    {cFmtPct(r.todayPct)}</div>
                </div>
              );
            })}
          </MCard>
        </div>
      )}

      {/* market indices */}
      <div>
        <MSection P={P}>大盘</MSection>
        <MCard P={P} style={{ display: "flex", flexWrap: "wrap", gap: "12px 8px" }}>
          {D.indices.map(idx => {
            const c = cMove(idx.pct, store.theme);
            return (
              <div key={idx.code} style={{ flex: "1 1 40%", display: "flex",
                justifyContent: "space-between", fontSize: 13,
                fontVariantNumeric: "tabular-nums" }}>
                <span style={{ color: P.muted }}>{idx.name}</span>
                <span style={{ color: c }}>{cFmtPct(idx.pct)}</span>
              </div>
            );
          })}
        </MCard>
      </div>
    </div>
  );
}

window.MTodayScreen = MTodayScreen;
