// Calm Mobile — 场外基金 detail screen.
const { useState: useStateMF } = React;

function MFundBar({ segments, P }) {
  const colors = P.isDark ? ["#b9a6ff", "#7ad9c8", "#5a6072"] : ["#5b4fd4", "#2e9d8f", "#cfc7b6"];
  const total = segments.reduce((s, x) => s + x.pct, 0) || 1;
  return (
    <div>
      <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden", gap: 2 }}>
        {segments.map((s, i) => s.pct > 0 && (
          <div key={s.label} style={{ width: `${(s.pct / total) * 100}%`,
            background: colors[i % colors.length] }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 11, flexWrap: "wrap" }}>
        {segments.map((s, i) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6,
            fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3,
              background: colors[i % colors.length] }} />
            <span style={{ color: P.muted }}>{s.label}</span>
            <span style={{ color: P.text }}>{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MFundScreen({ h, store, P, openSheet }) {
  const [period, setPeriod] = useStateMF("3M");
  const f = h.fund;
  const take = window.CALM.PERIODS[period] || 66;
  const series = h.daily.slice(250 - take);
  const labels = window.CALM.dailyDates.slice(250 - take);
  const maxSector = Math.max(...f.sectorAlloc.map(s => s.pct));
  const estC = cMove(f.estPct, store.theme);
  const gainC = cMove(h.estDeltaTotal, store.theme);

  return (
    <div style={{ padding: "6px 14px 8px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
          <span style={{ fontSize: 12, color: P.subtle, letterSpacing: "0.06em" }}>
            {h.code} · 场外基金</span>
          <span style={{ fontSize: 10.5, color: P.muted, background: P.chipBg,
            padding: "2px 8px", borderRadius: 999 }}>{f.fullType}</span>
        </div>
        <div style={{ fontSize: 12, color: P.subtle }}>
          {f.risk} · <span style={{ color: P.accent }}>{"★".repeat(f.star)}</span>
          <span style={{ opacity: 0.3 }}>{"★".repeat(5 - f.star)}</span></div>
      </div>

      {/* 盘中估值 / 预估收益 */}
      <MCard P={P} style={{ background: P.isDark ? "#16161a" : P.panelAlt }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, color: P.subtle, marginBottom: 6 }}>盘中估算净值</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 30, color: estC, letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums" }}>¥{cFmtNum(f.estNav, 4)}</span>
              <span style={{ fontSize: 14, color: estC,
                fontVariantNumeric: "tabular-nums" }}>{cFmtPct(f.estPct)}</span>
            </div>
          </div>
          <span style={{ fontSize: 10.5, color: P.subtle, background: P.chipBg,
            padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>{f.estTime}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 14, paddingTop: 13, borderTop: `1px solid ${P.line}` }}>
          <div>
            <div style={{ fontSize: 11, color: P.subtle, marginBottom: 3 }}>今日预估收益</div>
            <div style={{ fontSize: 19, color: gainC, fontVariantNumeric: "tabular-nums" }}>
              {h.estDeltaTotal > 0 ? "+" : ""}{cFmtMoney(h.estDeltaTotal, { dec: 2 })}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: P.subtle, marginBottom: 3 }}>预计确认</div>
            <div style={{ fontSize: 13, color: P.muted,
              fontVariantNumeric: "tabular-nums" }}>{f.confirmDate} (T+1)</div>
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: P.subtle, marginTop: 11, lineHeight: 1.5 }}>
          盘中估值仅供参考 · 实际收益以当日收盘公布的单位净值为准</div>
      </MCard>

      {/* confirmed nav */}
      <MCard P={P}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <MStat P={P} label="单位净值" value={`¥${cFmtNum(f.nav, 4)}`} sub={f.navDate} />
          <MStat P={P} label="累计净值" value={`¥${cFmtNum(f.navAcc, 4)}`} />
          <MStat P={P} label="基金规模" value={`${cFmtNum(f.fundSize, 1)}亿`} />
        </div>
      </MCard>

      {/* nav trend */}
      <MCard P={P} pad={12}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: P.muted, paddingLeft: 4 }}>净值走势</span>
          <MSegmented P={P} size="sm" options={["1M", "3M", "1Y"]}
            value={period} onChange={setPeriod} />
        </div>
        <MAreaChart series={series} labels={labels} height={180} color={P.accent}
          fillFrom={P.accentSoft} fillTo={P.isDark ? "rgba(185,166,255,0)" : "rgba(91,79,212,0)"}
          P={P} baseline formatY={v => cFmtNum(v, 3)} formatValue={v => "¥" + cFmtNum(v, 4)} />
      </MCard>

      {/* my position */}
      <MCard P={P}>
        <div style={{ fontSize: 13, color: P.muted, marginBottom: 14 }}>我的持仓</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px 14px" }}>
          <MStat P={P} label="持有份额" value={`${cFmtNum(h.shares, 0)}`} />
          <MStat P={P} label="持仓成本" value={`¥${cFmtNum(h.cost, 4)}`} />
          <MStat P={P} label="持仓市值" value={cFmtMoney(h.marketValue, { dec: 0 })} />
          <MStat P={P} label="持有收益" color={cMove(h.gainAbs, store.theme)}
            value={`${h.gainAbs > 0 ? "+" : ""}${cFmtMoney(h.gainAbs, { dec: 0 })}`}
            sub={cFmtPct(h.gainPct)} />
          <MStat P={P} label="占总仓位" value={`${h.weight.toFixed(1)}%`} />
        </div>
      </MCard>

      {/* asset alloc */}
      <MCard P={P}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "baseline", marginBottom: 13 }}>
          <span style={{ fontSize: 13, color: P.muted }}>资产配置</span>
          <span style={{ fontSize: 11, color: P.subtle }}>截至 {f.navDate}</span>
        </div>
        <MFundBar segments={f.assetAlloc} P={P} />
      </MCard>

      {/* sector alloc */}
      <MCard P={P}>
        <div style={{ fontSize: 13, color: P.muted, marginBottom: 10 }}>行业配置</div>
        {f.sectorAlloc.map(s => (
          <div key={s.label} style={{ display: "grid",
            gridTemplateColumns: "72px 1fr 44px", alignItems: "center", gap: 10,
            padding: "6px 0", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
            <span style={{ color: P.muted, whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis" }}>{s.label}</span>
            <div style={{ height: 6, borderRadius: 4, background: P.lineSoft }}>
              <div style={{ width: `${Math.min(100, (s.pct / maxSector) * 100)}%`,
                height: "100%", borderRadius: 4, background: P.accent, opacity: 0.85 }} />
            </div>
            <span style={{ color: P.text, textAlign: "right" }}>{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </MCard>

      {/* top holdings */}
      <MCard P={P}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: P.muted }}>重仓股</span>
          <span style={{ fontSize: 11, color: P.subtle }}>前十大重仓</span>
        </div>
        {f.topHoldings.map((s, i) => {
          const c = cMove(s.pct, store.theme);
          return (
            <div key={s.code} style={{ display: "grid",
              gridTemplateColumns: "18px 1fr 58px 60px", gap: 10, alignItems: "center",
              padding: "9px 0", borderTop: i === 0 ? "none" : `1px solid ${P.lineSoft}`,
              fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
              <span style={{ color: P.subtle, fontSize: 11 }}>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: P.text, whiteSpace: "nowrap", overflow: "hidden",
                  textOverflow: "ellipsis" }}>{s.name}</div>
                <div style={{ color: P.subtle, fontSize: 10.5 }}>{s.code}</div>
              </div>
              <span style={{ textAlign: "right", color: P.muted }}>{s.weight.toFixed(1)}%</span>
              <span style={{ textAlign: "right", color: c }}>{cFmtPct(s.pct)}</span>
            </div>
          );
        })}
      </MCard>

      {/* fund info */}
      <MCard P={P}>
        <div style={{ fontSize: 13, color: P.muted, marginBottom: 14 }}>基金信息</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <MStat P={P} label="基金经理" value={f.manager} sub={`${f.tenureYrs}年`} />
          <MStat P={P} label="任职时间" value={f.managerSince} />
          <MStat P={P} label="成立日期" value={f.inception} />
          <MStat P={P} label="风险等级" value={f.risk} />
        </div>
      </MCard>

      <button onClick={() => openSheet({ type: "holding", code: h.code })} style={{
        width: "100%", background: "transparent", color: P.text,
        border: `1px solid ${P.line}`, borderRadius: 14, padding: "14px",
        fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>编辑持仓</button>
    </div>
  );
}

Object.assign(window, { MFundScreen, MFundBar });
