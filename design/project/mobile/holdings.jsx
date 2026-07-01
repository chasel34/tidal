// Calm Mobile — Holdings list + stock detail screen.
const { useState: useStateMH } = React;

function MHoldingsScreen({ store, P, openSheet, go }) {
  const list = store.sortedHoldings;
  const sortOpts = [
    { key: "weight", label: "仓位" },
    { key: "today", label: "今日" },
    { key: "gain", label: "盈亏" },
    { key: "value", label: "市值" },
  ];
  return (
    <div style={{ padding: "2px 14px 8px" }}>
      {/* summary strip */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <MCard P={P} pad={14} style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, color: P.subtle, marginBottom: 5 }}>持仓市值</div>
          <div style={{ fontSize: 21, color: P.text, fontVariantNumeric: "tabular-nums" }}>
            {cFmtMoney(store.summary.marketValue, { dec: 0 })}</div>
        </MCard>
        <MCard P={P} pad={14} style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, color: P.subtle, marginBottom: 5 }}>累计盈亏</div>
          <div style={{ fontSize: 21, color: cMove(store.summary.totalGain, store.theme),
            fontVariantNumeric: "tabular-nums" }}>
            {cFmtPct(store.summary.totalGainPct)}</div>
        </MCard>
      </div>

      {/* sort chips */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          {sortOpts.map(o => {
            const on = store.sortH.key === o.key;
            return (
              <button key={o.key} onClick={() => store.toggleSortH(o.key)} style={{
                background: on ? P.chipBg : "transparent", color: on ? P.text : P.muted,
                border: `1px solid ${on ? "transparent" : P.line}`, borderRadius: 999,
                padding: "6px 12px", fontSize: 12.5, cursor: "pointer",
                fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {o.label}{on && <span style={{ fontSize: 9, marginLeft: 4 }}>
                  {store.sortH.dir === "asc" ? "▲" : "▼"}</span>}
              </button>
            );
          })}
        </div>
        <MPill P={P} variant="primary" onClick={() => openSheet({ type: "holding" })}>＋</MPill>
      </div>

      {list.length === 0 ? (
        <MEmpty P={P} text="还没有持仓 · 添加你买入的标的"
          actionLabel="添加持仓" onAction={() => openSheet({ type: "holding" })} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map(row => {
            const todayC = cMove(row.todayPct, store.theme);
            const gainC = cMove(row.gainAbs, store.theme);
            return (
              <MCard key={row.code} P={P} pad={15}
                onClick={() => go({ name: "holding", code: row.code })}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 15.5, color: P.text, whiteSpace: "nowrap",
                        overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</span>
                      {row.isFund && <span style={{ fontSize: 10, color: P.subtle,
                        background: P.chipBg, padding: "1px 6px", borderRadius: 5,
                        whiteSpace: "nowrap" }}>基金</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: P.subtle, marginTop: 3,
                      fontVariantNumeric: "tabular-nums" }}>
                      {row.code} · {cFmtNum(row.shares, 0)}{row.type === "股票" ? "股" : "份"}
                      {" · 仓位 "}{row.weight.toFixed(0)}%</div>
                  </div>
                  <Spark data={row.daily.slice(-30)} color={todayC} width={56} height={26} />
                  <span style={{ color: P.subtle, fontSize: 18 }}>›</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "flex-end", marginTop: 12, paddingTop: 12,
                  borderTop: `1px solid ${P.lineSoft}`, fontVariantNumeric: "tabular-nums" }}>
                  <div>
                    <div style={{ fontSize: 10.5, color: P.subtle, marginBottom: 2 }}>市值</div>
                    <div style={{ fontSize: 15, color: P.text }}>
                      {cFmtMoney(row.marketValue, { dec: 0 })}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10.5, color: P.subtle, marginBottom: 2 }}>今日</div>
                    <div style={{ fontSize: 15, color: todayC }}>{cFmtPct(row.todayPct)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10.5, color: P.subtle, marginBottom: 2 }}>持仓盈亏</div>
                    <div style={{ fontSize: 15, color: gainC }}>
                      {row.gainAbs > 0 ? "+" : ""}{cFmtMoney(row.gainAbs, { dec: 0 })}
                      <span style={{ fontSize: 12, marginLeft: 5 }}>{cFmtPct(row.gainPct)}</span></div>
                  </div>
                </div>
              </MCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Stock detail ----------
function MStockDetail({ h, store, P, openSheet }) {
  const [period, setPeriod] = useStateMH("3M");
  const take = window.CALM.PERIODS[period] || 66;
  const series = h.daily.slice(250 - take);
  const labels = window.CALM.dailyDates.slice(250 - take);
  const todayC = cMove(h.todayPct, store.theme);

  return (
    <div style={{ padding: "6px 14px 8px", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* price hero */}
      <div>
        <div style={{ fontSize: 12, color: P.subtle, letterSpacing: "0.06em", marginBottom: 8 }}>
          {h.code} · {h.market} · {h.type}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12,
          fontVariantNumeric: "tabular-nums" }}>
          <span style={{ fontSize: 38, fontWeight: 300, color: todayC,
            letterSpacing: "-0.02em" }}>¥{cFmtNum(h.price)}</span>
          <span style={{ fontSize: 15, color: todayC }}>{cFmtPct(h.todayPct)} 今日</span>
        </div>
      </div>

      {/* candle */}
      <MCard P={P} pad={12}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <MSegmented P={P} size="sm" options={["1M", "3M", "1Y"]}
            value={period} onChange={setPeriod} />
        </div>
        <MCandleChart series={series} labels={labels} height={210} theme={store.theme} P={P} />
      </MCard>

      {/* my position */}
      <MCard P={P}>
        <div style={{ fontSize: 13, color: P.muted, marginBottom: 14 }}>我的持仓</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 14px" }}>
          <MStat P={P} label="持仓市值" value={cFmtMoney(h.marketValue, { dec: 0 })} />
          <MStat P={P} label="持仓盈亏" color={cMove(h.gainAbs, store.theme)}
            value={`${h.gainAbs > 0 ? "+" : ""}${cFmtMoney(h.gainAbs, { dec: 0 })}`}
            sub={cFmtPct(h.gainPct)} />
          <MStat P={P} label="持仓成本" value={`¥${cFmtNum(h.cost)}`} />
          <MStat P={P} label="持仓数量"
            value={`${cFmtNum(h.shares, 0)} ${h.type === "股票" ? "股" : "份"}`} />
          <MStat P={P} label="占总仓位" value={`${h.weight.toFixed(1)}%`} />
          <MStat P={P} label="今日盈亏" color={cMove(h.todayDeltaTotal, store.theme)}
            value={`${h.todayDeltaTotal > 0 ? "+" : ""}${cFmtMoney(h.todayDeltaTotal, { dec: 0 })}`} />
        </div>
      </MCard>

      <button onClick={() => openSheet({ type: "holding", code: h.code })} style={{
        width: "100%", background: "transparent", color: P.text,
        border: `1px solid ${P.line}`, borderRadius: 14, padding: "14px",
        fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>编辑持仓</button>
    </div>
  );
}

Object.assign(window, { MHoldingsScreen, MStockDetail });
