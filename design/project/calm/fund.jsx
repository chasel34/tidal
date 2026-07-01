// Calm Dashboard — 场外基金 detail: 盘中估值 (intraday valuation),
// 今日预估收益 (projected gain) + 持仓详情 (holdings breakdown).
const { useState: useStateF } = React;

// ---------- small primitives ----------
function FStat({ label, value, color, sub, P }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: P.subtle, letterSpacing: "0.05em",
        textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, color: color || P.text,
        fontVariantNumeric: "tabular-nums" }}>
        {value}
        {sub && <span style={{ fontSize: 11.5, marginLeft: 6, opacity: 0.85 }}>{sub}</span>}
      </div>
    </div>
  );
}

// stacked 股/债/现 bar
function AllocBar({ segments, P }) {
  const colors = P.isDark
    ? ["#b9a6ff", "#7ad9c8", "#5a6072"]
    : ["#5b4fd4", "#2e9d8f", "#cfc7b6"];
  const total = segments.reduce((s, x) => s + x.pct, 0) || 1;
  return (
    <div>
      <div style={{ display: "flex", height: 9, borderRadius: 6,
        overflow: "hidden", gap: 2, background: "transparent" }}>
        {segments.map((s, i) => s.pct > 0 && (
          <div key={s.label} style={{ width: `${(s.pct / total) * 100}%`,
            background: colors[i % colors.length] }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 9, flexWrap: "wrap" }}>
        {segments.map((s, i) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center",
            gap: 6, fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2,
              background: colors[i % colors.length] }} />
            <span style={{ color: P.muted }}>{s.label}</span>
            <span style={{ color: P.text }}>{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// horizontal bar row for sector weights
function BarRow({ label, pct, max, P }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "78px 1fr 46px",
      alignItems: "center", gap: 10, padding: "5px 0",
      fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
      <span style={{ color: P.muted, whiteSpace: "nowrap", overflow: "hidden",
        textOverflow: "ellipsis" }}>{label}</span>
      <div style={{ height: 6, borderRadius: 4, background: P.lineSoft }}>
        <div style={{ width: `${Math.min(100, (pct / max) * 100)}%`, height: "100%",
          borderRadius: 4, background: P.accent, opacity: 0.85 }} />
      </div>
      <span style={{ color: P.text, textAlign: "right" }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

function SectionLabel({ children, P, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between",
      alignItems: "baseline", margin: "22px 0 12px",
      paddingTop: 18, borderTop: `1px solid ${P.line}` }}>
      <span style={{ fontSize: 12.5, color: P.text, fontWeight: 500 }}>{children}</span>
      {action && <span style={{ fontSize: 11, color: P.subtle }}>{action}</span>}
    </div>
  );
}

// ---------- 盘中估值 / 今日预估收益 card ----------
function FundEstimateCard({ h, P }) {
  const f = h.fund;
  const estC = cMove(f.estPct, P.isDark ? "dark" : "light");
  const estGain = h.estDeltaTotal;
  const gainC = cMove(estGain, P.isDark ? "dark" : "light");
  return (
    <div style={{ background: P.isDark ? "#16161a" : "#faf9f5",
      border: `1px solid ${P.line}`, borderRadius: 13, padding: "15px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.04em",
            marginBottom: 5 }}>盘中估算净值</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 30, color: estC, letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums" }}>¥{cFmtNum(f.estNav, 4)}</span>
            <span style={{ fontSize: 14, color: estC,
              fontVariantNumeric: "tabular-nums" }}>{cFmtPct(f.estPct)}</span>
          </div>
        </div>
        <span style={{ fontSize: 10.5, color: P.subtle, background: P.chipBg,
          padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>
          {f.estTime}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginTop: 14, paddingTop: 13,
        borderTop: `1px solid ${P.line}` }}>
        <div>
          <div style={{ fontSize: 11, color: P.subtle, marginBottom: 3 }}>今日预估收益</div>
          <div style={{ fontSize: 19, color: gainC,
            fontVariantNumeric: "tabular-nums" }}>
            {estGain > 0 ? "+" : ""}{cFmtMoney(estGain, { dec: 2 })}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: P.subtle, marginBottom: 3 }}>预计确认</div>
          <div style={{ fontSize: 13, color: P.muted,
            fontVariantNumeric: "tabular-nums" }}>{f.confirmDate} (T+1)</div>
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: P.subtle, marginTop: 11,
        lineHeight: 1.5 }}>
        盘中估值仅供参考 · 实际收益以当日收盘公布的单位净值为准</div>
    </div>
  );
}

// ---------- full fund detail panel ----------
function FundDetail({ h, store, P, openModal }) {
  const [period, setPeriod] = useStateF("3M");
  const f = h.fund;
  const take = window.CALM.PERIODS[period] || 66;
  const series = h.daily.slice(250 - take);
  const labels = window.CALM.dailyDates.slice(250 - take);
  const maxSector = Math.max(...f.sectorAlloc.map(s => s.pct));
  const gainC = cMove(h.gainAbs, store.theme);

  return (
    <div style={{ background: P.panel, border: `1px solid ${P.line}`,
      borderRadius: 14, padding: 20, alignSelf: "start" }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8,
            marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, color: P.subtle, letterSpacing: "0.08em" }}>
              {h.code} · 场外基金</span>
            <span style={{ fontSize: 10.5, color: P.muted, background: P.chipBg,
              padding: "2px 8px", borderRadius: 999 }}>{f.fullType}</span>
          </div>
          <div style={{ fontSize: 20, color: P.text }}>{h.name}</div>
          <div style={{ fontSize: 11.5, color: P.subtle, marginTop: 4 }}>
            {f.risk} · {"★".repeat(f.star)}<span style={{ opacity: 0.3 }}>
              {"★".repeat(5 - f.star)}</span></div>
        </div>
        <button onClick={() => openModal({ type: "holding", code: h.code })}
          style={{ ...calmBtn(P), padding: "6px 13px", fontSize: 12 }}>编辑</button>
      </div>

      {/* 盘中估值 / 预估收益 */}
      <FundEstimateCard h={h} P={P} />

      {/* confirmed nav row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 14, marginTop: 16 }}>
        <FStat label="单位净值" value={`¥${cFmtNum(f.nav, 4)}`}
          sub={`${f.navDate}`} P={P} />
        <FStat label="累计净值" value={`¥${cFmtNum(f.navAcc, 4)}`} P={P} />
        <FStat label="基金规模" value={`${cFmtNum(f.fundSize, 1)}亿`} P={P} />
      </div>

      {/* NAV trend */}
      <SectionLabel P={P}>净值走势</SectionLabel>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4,
        marginBottom: 2 }}>
        {["1M", "3M", "1Y"].map(r => (
          <button key={r} onClick={() => setPeriod(r)} style={{
            background: r === period ? P.chipBg : "transparent",
            color: r === period ? P.text : P.muted, border: "none",
            padding: "4px 10px", borderRadius: 6, fontSize: 11,
            cursor: "pointer", fontFamily: "inherit" }}>{r}</button>
        ))}
      </div>
      <AreaChartLive series={series} labels={labels} height={170}
        color={P.accent} fillFrom={P.accentSoft}
        fillTo={P.isDark ? "rgba(185,166,255,0)" : "rgba(91,79,212,0)"}
        P={P} baseline
        formatY={v => cFmtNum(v, 3)}
        formatValue={v => "¥" + cFmtNum(v, 4)} />

      {/* 我的持仓 */}
      <SectionLabel P={P}>我的持仓</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 14, rowGap: 16 }}>
        <FStat label="持有份额" value={`${cFmtNum(h.shares, 0)} 份`} P={P} />
        <FStat label="持仓成本" value={`¥${cFmtNum(h.cost, 4)}`} P={P} />
        <FStat label="持仓市值" value={cFmtMoney(h.marketValue, { dec: 0 })} P={P} />
        <FStat label="持有收益"
          value={`${h.gainAbs > 0 ? "+" : ""}${cFmtMoney(h.gainAbs, { dec: 0 })}`}
          color={gainC} sub={cFmtPct(h.gainPct)} P={P} />
        <FStat label="占总仓位" value={`${h.weight.toFixed(1)}%`} P={P} />
      </div>

      {/* 持仓详情 — 资产配置 */}
      <SectionLabel P={P} action={`截至 ${f.navDate}`}>资产配置</SectionLabel>
      <AllocBar segments={f.assetAlloc} P={P} />

      {/* 行业配置 */}
      <SectionLabel P={P}>行业配置</SectionLabel>
      <div>
        {f.sectorAlloc.map(s => (
          <BarRow key={s.label} label={s.label} pct={s.pct} max={maxSector} P={P} />
        ))}
      </div>

      {/* 重仓股 */}
      <SectionLabel P={P} action="前十大重仓">重仓股</SectionLabel>
      <div>
        <div style={{ display: "grid",
          gridTemplateColumns: "20px 1fr 64px 64px", gap: 10,
          padding: "0 0 8px", fontSize: 10.5, color: P.subtle,
          letterSpacing: "0.06em", textTransform: "uppercase" }}>
          <span></span><span>名称</span>
          <span style={{ textAlign: "right" }}>占比</span>
          <span style={{ textAlign: "right" }}>今日</span>
        </div>
        {f.topHoldings.map((s, i) => {
          const c = cMove(s.pct, store.theme);
          return (
            <div key={s.code} style={{ display: "grid",
              gridTemplateColumns: "20px 1fr 64px 64px", gap: 10,
              alignItems: "center", padding: "8px 0",
              borderTop: `1px solid ${P.lineSoft}`,
              fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
              <span style={{ color: P.subtle, fontSize: 11 }}>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: P.text, whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                <div style={{ color: P.subtle, fontSize: 10.5,
                  letterSpacing: "0.03em" }}>{s.code}</div>
              </div>
              <span style={{ textAlign: "right", color: P.muted }}>
                {s.weight.toFixed(1)}%</span>
              <span style={{ textAlign: "right", color: c }}>{cFmtPct(s.pct)}</span>
            </div>
          );
        })}
      </div>

      {/* 基金信息 */}
      <SectionLabel P={P}>基金信息</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 14, rowGap: 14 }}>
        <FStat label="基金经理" value={f.manager} sub={`${f.tenureYrs}年`} P={P} />
        <FStat label="任职时间" value={f.managerSince} P={P} />
        <FStat label="成立日期" value={f.inception} P={P} />
        <FStat label="风险等级" value={f.risk} P={P} />
      </div>
    </div>
  );
}

Object.assign(window, {
  FundDetail, FundEstimateCard, AllocBar, BarRow, FStat, SectionLabel,
});
