// Calm Mobile — 持仓 (Holdings) list + stock detail screen.
const { useState: useStateMH } = React;

// ---------- list ----------
function MHoldings({ store, T, openSheet, goDetail }) {
  const P = T.P;
  const list = store.sortedHoldings;
  const sortOpts = [
    { key: "weight", label: "仓位" }, { key: "today", label: "今日" },
    { key: "gain", label: "盈亏" }, { key: "value", label: "市值" },
  ];

  if (list.length === 0) {
    return <div style={{ paddingTop: 12 }}>
      <MEmpty T={T} text="还没有持仓 · 添加标的开始记录" actionLabel="添加持仓"
        onAction={() => openSheet({ type: "holding" })} />
    </div>;
  }

  return (
    <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* summary card */}
      <MCard T={T} pad={18} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 12.5, color: P.subtle, marginBottom: 6 }}>持仓总市值</div>
          <div style={{ fontSize: 30, fontWeight: 400, color: P.text, letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums" }}>{cFmtMoney(store.summary.marketValue, { dec: 0 })}</div>
        </div>
        <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          <div style={{ fontSize: 12.5, color: P.subtle, marginBottom: 6 }}>累计盈亏</div>
          <div style={{ fontSize: 18, color: T.move(store.summary.totalGain) }}>
            {store.summary.totalGain > 0 ? "+" : ""}{cFmtMoney(store.summary.totalGain, { dec: 0 })}</div>
        </div>
      </MCard>

      {/* sort chips */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 2px 2px", WebkitOverflowScrolling: "touch" }}>
        {sortOpts.map(o => {
          const active = store.sortH.key === o.key;
          return (
            <button key={o.key} onClick={() => store.toggleSortH(o.key)} style={{ flexShrink: 0,
              display: "flex", alignItems: "center", gap: 4, padding: "7px 14px", borderRadius: 999,
              border: `1px solid ${active ? "transparent" : P.line}`,
              background: active ? P.accentSoft : "transparent", color: active ? P.accent : P.muted,
              fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: active ? 600 : 500 }}>
              {o.label}{active && <span style={{ fontSize: 9 }}>{store.sortH.dir === "asc" ? "▲" : "▼"}</span>}
            </button>
          );
        })}
      </div>

      {/* rows */}
      <MCard T={T} pad={4}>
        {list.map((row, i) => {
          const todayC = T.move(row.todayPct);
          const gainC = T.move(row.gainAbs);
          return (
            <div key={row.code} onClick={() => goDetail(row.code)} style={{ display: "flex",
              alignItems: "center", gap: 12, padding: "14px 12px", cursor: "pointer",
              borderTop: i === 0 ? "none" : `1px solid ${P.lineSoft}`, fontVariantNumeric: "tabular-nums" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 15.5, color: P.text, whiteSpace: "nowrap", overflow: "hidden",
                    textOverflow: "ellipsis" }}>{row.name}</span>
                  {row.isFund && <span style={{ fontSize: 9.5, color: P.accent, background: P.accentSoft,
                    padding: "1px 6px", borderRadius: 4, flexShrink: 0 }}>基金</span>}
                </div>
                <div style={{ fontSize: 11.5, color: P.subtle, marginTop: 3, letterSpacing: "0.03em" }}>
                  {row.code} · {cFmtNum(row.shares, 0)}{row.type === "股票" ? "股" : "份"} · {row.weight.toFixed(1)}%</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, color: P.text }}>{cFmtCompact(row.marketValue)}</div>
                <div style={{ fontSize: 12, color: gainC, marginTop: 2 }}>
                  {row.gainAbs > 0 ? "+" : ""}{cFmtPct(row.gainPct)}</div>
              </div>
              <div style={{ minWidth: 62, textAlign: "right" }}>
                <span style={{ display: "inline-block", padding: "5px 9px", borderRadius: 8,
                  background: todayC, color: "#fff", fontSize: 13, fontWeight: 500 }}>
                  {cFmtPct(row.todayPct)}</span>
              </div>
            </div>
          );
        })}
      </MCard>

      <div style={{ display: "flex", gap: 10, margin: "0 2px" }}>
        <button onClick={() => openSheet({ type: "holding" })} style={{ flex: 1, background: "transparent",
          border: `1px dashed ${P.line}`, borderRadius: T.rad, padding: "14px", fontSize: 14.5,
          color: P.muted, cursor: "pointer", fontFamily: "inherit" }}>＋ 添加持仓</button>
        <button onClick={() => openSheet({ type: "ocr", target: "holding" })} style={{ flex: 1, background: "transparent",
          border: `1px dashed ${P.line}`, borderRadius: T.rad, padding: "14px", fontSize: 14.5,
          color: P.muted, cursor: "pointer", fontFamily: "inherit" }}>⎙ 截图导入</button>
      </div>
    </div>
  );
}

// ---------- stock detail screen ----------
function MStockDetail({ h, isHeld, store, T, openSheet }) {
  const P = T.P;
  const [period, setPeriod] = useStateMH("3M");
  const take = window.CALM.PERIODS[period] || 66;
  const series = h.daily.slice(250 - take);
  const labels = window.CALM.dailyDates.slice(250 - take);
  const moveC = T.move(h.todayPct);

  return (
    <div style={{ padding: "4px 16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* price hero */}
      <div style={{ padding: "2px 4px 4px" }}>
        <div style={{ fontSize: 12, color: P.subtle, letterSpacing: "0.06em", marginBottom: 8 }}>
          {h.code} · {h.market} · {h.type}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, fontVariantNumeric: "tabular-nums" }}>
          <span style={{ fontSize: 40, fontWeight: 300, color: P.text, letterSpacing: "-0.02em" }}>
            ¥{cFmtNum(h.price)}</span>
          <span style={{ fontSize: 16, color: moveC }}>{cFmtPct(h.todayPct)} 今日</span>
        </div>
      </div>

      {/* K-line */}
      <MCard T={T} pad={14}>
        <MCandle series={series} labels={labels} height={210} T={T} />
        <div style={{ marginTop: 12 }}>
          <MSegmented T={T} options={["1M", "3M", "1Y"]} value={period} onChange={setPeriod} size="sm" />
        </div>
      </MCard>

      {/* my position */}
      {isHeld && <>
        <MSectionLabel T={T}>我的持仓</MSectionLabel>
        <MCard T={T} pad={18}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, rowGap: 18 }}>
            <MStat T={T} label="持仓成本" value={`¥${cFmtNum(h.cost)}`} />
            <MStat T={T} label="持仓数量" value={`${cFmtNum(h.shares, 0)} ${h.type === "股票" ? "股" : "份"}`} />
            <MStat T={T} label="持仓市值" value={cFmtMoney(h.marketValue, { dec: 0 })} />
            <MStat T={T} label="占总仓位" value={`${h.weight.toFixed(1)}%`} />
            <MStat T={T} label="持仓盈亏" color={T.move(h.gainAbs)} sub={cFmtPct(h.gainPct)}
              value={`${h.gainAbs > 0 ? "+" : ""}${cFmtMoney(h.gainAbs, { dec: 0 })}`} />
            <MStat T={T} label="今日盈亏" color={T.move(h.todayDeltaTotal)}
              value={`${h.todayDeltaTotal > 0 ? "+" : ""}${cFmtMoney(h.todayDeltaTotal, { dec: 0 })}`} />
          </div>
        </MCard>
      </>}

      <button onClick={() => openSheet({ type: "holding", code: isHeld ? h.code : undefined })}
        style={{ background: isHeld ? P.accent : "transparent", color: isHeld ? "#fff" : P.accent,
          border: isHeld ? "none" : `1px solid ${P.accent}`, borderRadius: 14, padding: "15px", fontSize: 16,
          fontWeight: 600, cursor: "pointer", fontFamily: "inherit", margin: "4px 2px 0" }}>
        {isHeld ? "编辑持仓" : "＋ 加入持仓"}</button>
    </div>
  );
}

Object.assign(window, { MHoldings, MStockDetail });
