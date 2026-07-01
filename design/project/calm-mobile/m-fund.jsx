// Calm Mobile — 场外基金 detail screen.
const { useState: useStateMF } = React;

function MAllocBar({ T, segments }) {
  const P = T.P;
  const colors = P.isDark ? [T.accent, "#7ad9c8", "#5a6072"] : [T.accent, "#2e9d8f", "#cfc7b6"];
  const total = segments.reduce((s, x) => s + x.pct, 0) || 1;
  return (
    <div>
      <div style={{ display: "flex", height: 11, borderRadius: 6, overflow: "hidden", gap: 2 }}>
        {segments.map((s, i) => s.pct > 0 && (
          <div key={s.label} style={{ width: `${(s.pct / total) * 100}%`, background: colors[i % colors.length] }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 18, marginTop: 11, flexWrap: "wrap" }}>
        {segments.map((s, i) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5,
            fontVariantNumeric: "tabular-nums" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: colors[i % colors.length] }} />
            <span style={{ color: P.muted }}>{s.label}</span>
            <span style={{ color: P.text }}>{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MBarRow({ T, label, pct, max }) {
  const P = T.P;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "72px 1fr 48px", alignItems: "center", gap: 12,
      padding: "7px 0", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
      <span style={{ color: P.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <div style={{ height: 7, borderRadius: 4, background: P.lineSoft }}>
        <div style={{ width: `${Math.min(100, (pct / max) * 100)}%`, height: "100%", borderRadius: 4,
          background: T.accent, opacity: 0.85 }} />
      </div>
      <span style={{ color: P.text, textAlign: "right" }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

function MFundDetail({ h, isHeld, store, T, openSheet }) {
  const P = T.P;
  const [period, setPeriod] = useStateMF("3M");
  const f = h.fund;
  const take = window.CALM.PERIODS[period] || 66;
  const series = h.daily.slice(250 - take);
  const labels = window.CALM.dailyDates.slice(250 - take);
  const maxSector = Math.max(...f.sectorAlloc.map(s => s.pct));
  const estC = T.move(f.estPct);
  const estGain = h.estDeltaTotal;
  const gainC = T.move(estGain);

  return (
    <div style={{ padding: "4px 16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* header */}
      <div style={{ padding: "2px 4px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: P.subtle, letterSpacing: "0.06em" }}>{h.code} · 场外基金</span>
          <span style={{ fontSize: 10.5, color: P.muted, background: P.chipBg, padding: "2px 8px", borderRadius: 999 }}>{f.fullType}</span>
        </div>
        <div style={{ fontSize: 12, color: P.subtle }}>
          {f.risk} · <span style={{ color: "#e0a93b" }}>{"★".repeat(f.star)}</span>
          <span style={{ opacity: 0.3 }}>{"★".repeat(5 - f.star)}</span></div>
      </div>

      {/* 盘中估值 card */}
      <MCard T={T} pad={18} style={{ background: P.isDark ? "#16161a" : "#faf9f5" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11.5, color: P.subtle, marginBottom: 6 }}>盘中估算净值</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, fontVariantNumeric: "tabular-nums" }}>
              <span style={{ fontSize: 32, color: estC, letterSpacing: "-0.02em" }}>¥{cFmtNum(f.estNav, 4)}</span>
              <span style={{ fontSize: 15, color: estC }}>{cFmtPct(f.estPct)}</span>
            </div>
          </div>
          <span style={{ fontSize: 10.5, color: P.subtle, background: P.chipBg, padding: "4px 10px",
            borderRadius: 999, whiteSpace: "nowrap" }}>{f.estTime}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 15, paddingTop: 14, borderTop: `1px solid ${P.line}` }}>
          {isHeld ? (
            <div>
              <div style={{ fontSize: 11.5, color: P.subtle, marginBottom: 4 }}>今日预估收益</div>
              <div style={{ fontSize: 20, color: gainC, fontVariantNumeric: "tabular-nums" }}>
                {estGain > 0 ? "+" : ""}{cFmtMoney(estGain, { dec: 2 })}</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11.5, color: P.subtle, marginBottom: 4 }}>估算涨跌</div>
              <div style={{ fontSize: 20, color: estC, fontVariantNumeric: "tabular-nums" }}>{cFmtPct(f.estPct)}</div>
            </div>
          )}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11.5, color: P.subtle, marginBottom: 4 }}>预计确认</div>
            <div style={{ fontSize: 13.5, color: P.muted, fontVariantNumeric: "tabular-nums" }}>{f.confirmDate} (T+1)</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: P.subtle, marginTop: 12, lineHeight: 1.5 }}>
          盘中估值仅供参考 · 实际收益以当日收盘公布的单位净值为准</div>
      </MCard>

      {/* confirmed nav */}
      <MCard T={T} pad={18}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <MStat T={T} label="单位净值" value={`¥${cFmtNum(f.nav, 4)}`} sub={f.navDate} />
          <MStat T={T} label="累计净值" value={`¥${cFmtNum(f.navAcc, 4)}`} />
          <MStat T={T} label="基金规模" value={`${cFmtNum(f.fundSize, 1)}亿`} />
        </div>
      </MCard>

      {/* NAV trend */}
      <MSectionLabel T={T}>净值走势</MSectionLabel>
      <MCard T={T} pad={14}>
        <MArea series={series} labels={labels} height={190} T={T}
          formatY={v => cFmtNum(v, 3)} formatValue={v => "¥" + cFmtNum(v, 4)} />
        <div style={{ marginTop: 12 }}>
          <MSegmented T={T} options={["1M", "3M", "1Y"]} value={period} onChange={setPeriod} size="sm" />
        </div>
      </MCard>

      {/* my position */}
      {isHeld && <>
        <MSectionLabel T={T}>我的持仓</MSectionLabel>
        <MCard T={T} pad={18}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, rowGap: 18 }}>
            <MStat T={T} label="持有份额" value={`${cFmtNum(h.shares, 0)} 份`} />
            <MStat T={T} label="持仓成本" value={`¥${cFmtNum(h.cost, 4)}`} />
            <MStat T={T} label="持仓市值" value={cFmtMoney(h.marketValue, { dec: 0 })} />
            <MStat T={T} label="占总仓位" value={`${h.weight.toFixed(1)}%`} />
            <MStat T={T} label="持有收益" color={T.move(h.gainAbs)} sub={cFmtPct(h.gainPct)}
              value={`${h.gainAbs > 0 ? "+" : ""}${cFmtMoney(h.gainAbs, { dec: 0 })}`} />
          </div>
        </MCard>
      </>}

      {/* asset alloc */}
      <MSectionLabel T={T} action={<span style={{ fontSize: 11, color: P.subtle }}>截至 {f.navDate}</span>}>资产配置</MSectionLabel>
      <MCard T={T} pad={18}><MAllocBar T={T} segments={f.assetAlloc} /></MCard>

      {/* sector */}
      <MSectionLabel T={T}>行业配置</MSectionLabel>
      <MCard T={T} pad={18}>
        {f.sectorAlloc.map(s => <MBarRow key={s.label} T={T} label={s.label} pct={s.pct} max={maxSector} />)}
      </MCard>

      {/* top holdings */}
      <MSectionLabel T={T} action={<span style={{ fontSize: 11, color: P.subtle }}>前十大重仓</span>}>重仓股</MSectionLabel>
      <MCard T={T} pad={4}>
        {f.topHoldings.map((s, i) => {
          const c = T.move(s.pct);
          return (
            <div key={s.code} style={{ display: "grid", gridTemplateColumns: "22px 1fr 58px 64px",
              gap: 10, alignItems: "center", padding: "11px 12px",
              borderTop: i === 0 ? "none" : `1px solid ${P.lineSoft}`, fontSize: 14,
              fontVariantNumeric: "tabular-nums" }}>
              <span style={{ color: P.subtle, fontSize: 12 }}>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: P.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                <div style={{ color: P.subtle, fontSize: 11, letterSpacing: "0.03em" }}>{s.code}</div>
              </div>
              <span style={{ textAlign: "right", color: P.muted }}>{s.weight.toFixed(1)}%</span>
              <span style={{ textAlign: "right", color: c }}>{cFmtPct(s.pct)}</span>
            </div>
          );
        })}
      </MCard>

      {/* fund info */}
      <MSectionLabel T={T}>基金信息</MSectionLabel>
      <MCard T={T} pad={18}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, rowGap: 18 }}>
          <MStat T={T} label="基金经理" value={f.manager} sub={`${f.tenureYrs}年`} />
          <MStat T={T} label="任职时间" value={f.managerSince} />
          <MStat T={T} label="成立日期" value={f.inception} />
          <MStat T={T} label="风险等级" value={f.risk} />
        </div>
      </MCard>

      <button onClick={() => openSheet({ type: "holding", code: isHeld ? h.code : undefined })}
        style={{ background: isHeld ? P.accent : "transparent", color: isHeld ? "#fff" : P.accent,
          border: isHeld ? "none" : `1px solid ${P.accent}`, borderRadius: 14, padding: "15px", fontSize: 16,
          fontWeight: 600, cursor: "pointer", fontFamily: "inherit", margin: "4px 2px 0" }}>
        {isHeld ? "编辑持仓" : "＋ 加入持仓"}</button>
    </div>
  );
}

Object.assign(window, { MFundDetail, MAllocBar, MBarRow });
