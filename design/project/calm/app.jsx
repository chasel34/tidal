// Calm Dashboard — main application.
const { useState: useStateA } = React;

function CalmApp() {
  const store = useStore();
  const P = calmPalette(store.theme);
  const D = window.CALM;
  const [modal, setModal] = useStateA(null); // {type:'watch'} | {type:'holding', code?}

  const tabs = [
    { id: "today", label: "今天", icon: "◉" },
    { id: "holdings", label: "持仓", icon: "◧" },
    { id: "watch", label: "自选", icon: "✦" },
  ];

  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      background: P.bg, color: P.text,
      fontFamily: "'PingFang SC', 'Inter', system-ui, -apple-system, sans-serif",
      display: "grid", gridTemplateColumns: "220px 1fr",
      overflow: "hidden",
    }}>
      {/* ---- Sidebar ---- */}
      <aside style={{ borderRight: `1px solid ${P.line}`, padding: "22px 16px",
        display: "flex", flexDirection: "column", gap: 22, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: "0 4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7,
              background: P.accent, color: "#fff", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 600 }}>盘</div>
            <div style={{ fontSize: 14.5, color: P.text }}>我的看板</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setModal({ type: "settings" })} title="设置" style={{
              background: "transparent", border: `1px solid ${P.line}`, color: P.muted,
              width: 32, height: 32, borderRadius: 16, cursor: "pointer", display: "inline-flex",
              alignItems: "center", justifyContent: "center", padding: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <CalmThemeToggle theme={store.theme} setTheme={store.setTheme} P={P} />
          </div>
        </div>

        <div>
          <SideLabel P={P}>导航</SideLabel>
          {tabs.map(t => {
            const active = store.tab === t.id;
            return (
              <button key={t.id} onClick={() => store.setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 11, width: "100%",
                padding: "9px 12px", borderRadius: 9, border: "none",
                background: active ? (P.isDark ? "#26262e" : "#f0ede5") : "transparent",
                color: active ? P.text : P.muted, cursor: "pointer",
                font: "inherit", fontSize: 13.5, textAlign: "left", marginBottom: 2 }}>
                <span style={{ width: 16, textAlign: "center", opacity: 0.85 }}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        <div>
          <SideLabel P={P}>大盘</SideLabel>
          {D.indices.map(idx => {
            const c = cMove(idx.pct, store.theme);
            return (
              <div key={idx.code} style={{ display: "flex",
                justifyContent: "space-between", alignItems: "center",
                padding: "7px 12px", fontSize: 12,
                fontVariantNumeric: "tabular-nums" }}>
                <span style={{ color: P.muted }}>{idx.name}</span>
                <span style={{ color: c }}>{cFmtPct(idx.pct)}</span>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "auto", padding: "12px 4px 0",
          borderTop: `1px solid ${P.line}`, display: "flex",
          flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 11, color: P.subtle }}>
            数据延迟约 15 秒 · 演示数据</div>
          <button onClick={store.resetAll} style={{
            background: "transparent", border: "none", color: P.subtle,
            fontSize: 11, cursor: "pointer", fontFamily: "inherit",
            textAlign: "left", padding: 0 }}>↺ 恢复演示数据</button>
        </div>
      </aside>

      {/* ---- Main ---- */}
      <main style={{ overflowY: "auto", overflowX: "hidden" }}>
        <div style={{ padding: "30px 40px 48px", maxWidth: 1080, margin: "0 auto" }}>
          {store.tab === "today" && <TodayPane store={store} P={P} openModal={setModal} />}
          {store.tab === "holdings" && <HoldingsPane store={store} P={P} openModal={setModal} />}
          {store.tab === "watch" && <WatchPane store={store} P={P} openModal={setModal} />}
        </div>
      </main>

      {/* ---- Modals ---- */}
      {modal && modal.type === "watch" && (
        <AddWatchModal P={P} store={store} onClose={() => setModal(null)} />
      )}
      {modal && modal.type === "holding" && (
        <HoldingModal P={P} store={store} editCode={modal.code}
          onClose={() => setModal(null)} />
      )}
      {modal && modal.type === "ocr" && (
        <OcrImportModal P={P} store={store} defaultTarget={modal.target}
          onClose={() => setModal(null)}
          onOpenSettings={() => setModal({ type: "settings" })} />
      )}
      {modal && modal.type === "settings" && (
        <SettingsModal P={P} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function SideLabel({ children, P }) {
  return (
    <div style={{ fontSize: 10.5, color: P.subtle, letterSpacing: "0.12em",
      padding: "0 12px 8px", textTransform: "uppercase" }}>{children}</div>
  );
}

// ================= TODAY =================
function TodayPane({ store, P, openModal }) {
  const { summary, period, setPeriod, portfolioSeries } = store;
  const up = summary.todayDelta >= 0;
  const moveC = cMove(summary.todayDelta, store.theme);
  const { series, labels } = portfolioSeries(period);

  const allocColors = P.isDark
    ? ["#b9a6ff", "#7ad9c8", "#f5a86a", "#5a6072"]
    : ["#5b4fd4", "#2e9d8f", "#e08a3b", "#cfc7b6"];
  const totalAlloc = store.allocation.reduce((s, x) => s + x.value, 0) || 1;

  return (
    <div>
      {/* Hero + allocation */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px",
        gap: 24, alignItems: "center", marginBottom: 30 }}>
        <div>
          <div style={{ color: P.muted, fontSize: 13, marginBottom: 16 }}>
            今天 · 周四 · {store.cash != null ? window.CALM.asOf.split(" ")[0] : ""}</div>
          <div style={{ fontSize: "clamp(46px, 5.6vw, 80px)", fontWeight: 300,
            letterSpacing: "-0.04em", color: moveC, lineHeight: 1, marginBottom: 14,
            whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
            {up ? "+" : ""}{cFmtMoney(summary.todayDelta, { dec: 2 })}
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "baseline",
            flexWrap: "wrap", rowGap: 6, whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums" }}>
            <span style={{ fontSize: 15, color: moveC }}>{cFmtPct(summary.todayPct)} 今日</span>
            <span style={{ fontSize: 13, color: P.muted }}>
              账户总额 {cFmtMoney(summary.totalAssets)}</span>
            <span style={{ fontSize: 13, color: cMove(summary.totalGain, store.theme) }}>
              累计 {cFmtPct(summary.totalGainPct)}</span>
          </div>
        </div>
        {/* allocation donut */}
        <div style={{ background: P.panel, border: `1px solid ${P.line}`,
          borderRadius: 14, padding: 16, display: "flex", alignItems: "center",
          gap: 14 }}>
          <div style={{ position: "relative", width: 110, height: 110 }}>
            <CalmDonut segments={store.allocation} size={110} thickness={13}
              colors={allocColors} P={P} />
            <div style={{ position: "absolute", inset: 0, display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 9.5, color: P.subtle, letterSpacing: "0.08em" }}>总市值</div>
              <div style={{ fontSize: 14, color: P.text,
                fontVariantNumeric: "tabular-nums" }}>
                ¥{cFmtCompact(summary.marketValue)}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            {store.allocation.map((seg, i) => (
              <div key={seg.label} style={{ display: "flex", alignItems: "center",
                gap: 7, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2,
                  background: allocColors[i % allocColors.length] }} />
                <span style={{ color: P.muted, flex: 1 }}>{seg.label}</span>
                <span style={{ color: P.text }}>
                  {((seg.value / totalAlloc) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 场外基金 · 今日预估收益 */}
      {store.fundEstimate.count > 0 && (() => {
        const fe = store.fundEstimate;
        const c = cMove(fe.gain, store.theme);
        return (
          <button onClick={() => store.setTab("holdings")} style={{
            width: "100%", textAlign: "left", cursor: "pointer",
            background: P.panel, border: `1px solid ${P.line}`,
            borderRadius: 14, padding: "15px 20px", marginBottom: 26,
            display: "flex", alignItems: "center", gap: 20,
            fontFamily: "inherit" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: P.text, marginBottom: 3 }}>
                场外基金 · 今日预估收益</div>
              <div style={{ fontSize: 11.5, color: P.subtle }}>
                {fe.count} 只 · 盘中估算 · 净值次日确认</div>
            </div>
            <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              <div style={{ fontSize: 22, color: c, letterSpacing: "-0.01em" }}>
                {fe.gain > 0 ? "+" : ""}{cFmtMoney(fe.gain, { dec: 2 })}</div>
              <div style={{ fontSize: 12, color: c }}>{cFmtPct(fe.pct)}</div>
            </div>
            <span style={{ color: P.subtle, fontSize: 16 }}>→</span>
          </button>
        );
      })()}

      {/* Chart */}
      <div style={{ background: P.panel, border: `1px solid ${P.line}`,
        borderRadius: 14, padding: "16px 18px 10px", marginBottom: 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: P.muted }}>
            资产走势 · {period === "1D" ? "当日分时" : "近 " + period}</div>
          <div style={{ display: "flex", gap: 4 }}>
            {["1D", "1W", "1M", "3M", "1Y"].map(r => (
              <button key={r} onClick={() => setPeriod(r)} style={{
                background: r === period ? P.chipBg : "transparent",
                color: r === period ? P.text : P.muted, border: "none",
                padding: "5px 11px", borderRadius: 7, fontSize: 11.5,
                cursor: "pointer", fontFamily: "inherit",
                fontVariantNumeric: "tabular-nums" }}>{r}</button>
            ))}
          </div>
        </div>
        <AreaChartLive series={series} labels={labels} height={210}
          color={P.accent}
          fillFrom={P.accentSoft} fillTo={P.isDark ? "rgba(185,166,255,0)" : "rgba(91,79,212,0)"}
          P={P} baseline
          formatValue={v => cFmtMoney(v, { dec: 0 })} />
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26 }}>
        <MiniList title="持仓 · 今日表现" actionLabel="全部 →"
          onAction={() => store.setTab("holdings")} P={P}
          rows={store.sortedHoldings.slice(0, 5)} store={store} kind="holding" />
        <MiniList title="自选 · 今日变动" actionLabel="全部 →"
          onAction={() => store.setTab("watch")} P={P}
          rows={[...store.watchFull].sort((a, b) => b.todayPct - a.todayPct).slice(0, 5)}
          store={store} kind="watch" />
      </div>
    </div>
  );
}

function MiniList({ title, actionLabel, onAction, rows, P, store, kind }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "baseline", marginBottom: 8, padding: "0 2px" }}>
        <span style={{ fontSize: 13, color: P.muted }}>{title}</span>
        <button onClick={onAction} style={{ background: "transparent",
          border: "none", color: P.subtle, fontSize: 12, cursor: "pointer",
          fontFamily: "inherit" }}>{actionLabel}</button>
      </div>
      <div>
        {rows.map((r, i) => {
          const c = cMove(r.todayPct, store.theme);
          return (
            <div key={r.code} style={{ display: "grid",
              gridTemplateColumns: "1fr 64px 70px", alignItems: "center",
              padding: "11px 2px", borderTop: i === 0 ? "none" : `1px solid ${P.lineSoft}`,
              fontVariantNumeric: "tabular-nums" }}>
              <div>
                <div style={{ fontSize: 14, color: P.text, whiteSpace: "nowrap" }}>{r.name}</div>
                <div style={{ fontSize: 11, color: P.subtle, marginTop: 1,
                  letterSpacing: "0.04em" }}>{r.code} · {r.type}</div>
              </div>
              <Spark data={r.daily.slice(-30)} color={c} width={56} height={22} />
              <div style={{ textAlign: "right", color: c, fontSize: 13 }}>
                {cFmtPct(r.todayPct)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ================= HOLDINGS =================
function HoldingsPane({ store, P, openModal }) {
  const [sel, setSel] = useStateA(0);
  const [detailPeriod, setDetailPeriod] = useStateA("3M");
  const list = store.sortedHoldings;
  const h = list[Math.min(sel, list.length - 1)] || null;

  const detailSeries = h ? (() => {
    const take = window.CALM.PERIODS[detailPeriod] || 66;
    return { s: h.daily.slice(250 - take), l: window.CALM.dailyDates.slice(250 - take) };
  })() : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <div style={{ color: P.muted, fontSize: 13, marginBottom: 6 }}>持仓</div>
          <div style={{ fontSize: 30, fontWeight: 400, color: P.text,
            letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
            {list.length} 只 · 市值 {cFmtMoney(store.summary.marketValue)}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => openModal({ type: "ocr", target: "holding" })}
            style={calmBtn(P)}>⎙ 截图导入</button>
          <button onClick={() => openModal({ type: "holding" })}
            style={calmBtn(P, "primary")}>＋ 添加持仓</button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState P={P} text="还没有持仓 · 点击「添加持仓」开始记录"
          onAction={() => openModal({ type: "holding" })} actionLabel="添加持仓" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 22 }}>
          {/* list */}
          <div style={{ background: P.panel, border: `1px solid ${P.line}`,
            borderRadius: 14, padding: "6px 0", alignSelf: "start" }}>
            <div style={{ display: "grid",
              gridTemplateColumns: "1.7fr 78px 70px 78px", gap: 8,
              padding: "10px 18px" }}>
              <SortTh label="名称" sortKey="name" align="left" P={P}
                active={store.sortH.key === "name"} dir={store.sortH.dir}
                onClick={store.toggleSortH} />
              <SortTh label="市值" sortKey="value" P={P}
                active={store.sortH.key === "value"} dir={store.sortH.dir}
                onClick={store.toggleSortH} />
              <SortTh label="今日" sortKey="today" P={P}
                active={store.sortH.key === "today"} dir={store.sortH.dir}
                onClick={store.toggleSortH} />
              <SortTh label="盈亏" sortKey="gain" P={P}
                active={store.sortH.key === "gain"} dir={store.sortH.dir}
                onClick={store.toggleSortH} />
            </div>
            {list.map((row, idx) => {
              const todayC = cMove(row.todayPct, store.theme);
              const gainC = cMove(row.gainAbs, store.theme);
              const active = row.code === (h && h.code);
              return (
                <div key={row.code} onClick={() => setSel(idx)} style={{
                  display: "grid", gridTemplateColumns: "1.7fr 78px 70px 78px",
                  gap: 8, padding: "12px 18px", cursor: "pointer",
                  alignItems: "center", fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  background: active ? P.hoverRow : "transparent",
                  borderLeft: `2px solid ${active ? P.accent : "transparent"}` }}>
                  <div>
                    <div style={{ color: P.text, fontSize: 14, whiteSpace: "nowrap" }}>{row.name}</div>
                    <div style={{ color: P.subtle, fontSize: 11, marginTop: 2,
                      letterSpacing: "0.04em" }}>
                      {row.code} · {row.shares}{row.type === "股票" ? "股" : "份"}</div>
                  </div>
                  <div style={{ textAlign: "right", color: P.text }}>
                    {cFmtCompact(row.marketValue)}</div>
                  <div style={{ textAlign: "right", color: todayC }}>
                    {cFmtPct(row.todayPct)}</div>
                  <div style={{ textAlign: "right", color: gainC }}>
                    {cFmtPct(row.gainPct)}</div>
                </div>
              );
            })}
          </div>

          {/* detail */}
          {h && h.isFund && (
            <FundDetail h={h} store={store} P={P} openModal={openModal} />
          )}
          {h && !h.isFund && (
            <div style={{ background: P.panel, border: `1px solid ${P.line}`,
              borderRadius: 14, padding: 20, alignSelf: "start" }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11.5, color: P.subtle,
                    letterSpacing: "0.08em", marginBottom: 5 }}>
                    {h.code} · {h.market} · {h.type}</div>
                  <div style={{ fontSize: 20, color: P.text }}>{h.name}</div>
                </div>
                <button onClick={() => openModal({ type: "holding", code: h.code })}
                  style={{ ...calmBtn(P), padding: "6px 13px", fontSize: 12 }}>编辑</button>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12,
                marginBottom: 14, fontVariantNumeric: "tabular-nums" }}>
                <div style={{ fontSize: 32, color: P.text, letterSpacing: "-0.02em" }}>
                  ¥{cFmtNum(h.price)}</div>
                <div style={{ fontSize: 14, color: cMove(h.todayPct, store.theme) }}>
                  {cFmtPct(h.todayPct)} 今日</div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end",
                gap: 4, marginBottom: 4 }}>
                {["1M", "3M", "1Y"].map(r => (
                  <button key={r} onClick={() => setDetailPeriod(r)} style={{
                    background: r === detailPeriod ? P.chipBg : "transparent",
                    color: r === detailPeriod ? P.text : P.muted, border: "none",
                    padding: "4px 10px", borderRadius: 6, fontSize: 11,
                    cursor: "pointer", fontFamily: "inherit" }}>{r}</button>
                ))}
              </div>
              <CandleChartLive series={detailSeries.s} labels={detailSeries.l}
                height={170} theme={store.theme} P={P} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: 16, marginTop: 16, paddingTop: 16,
                borderTop: `1px solid ${P.line}`,
                fontVariantNumeric: "tabular-nums" }}>
                <Stat label="持仓成本" value={`¥${cFmtNum(h.cost)}`} P={P} />
                <Stat label="持仓数量"
                  value={`${cFmtNum(h.shares, 0)} ${h.type === "股票" ? "股" : "份"}`} P={P} />
                <Stat label="持仓市值" value={cFmtMoney(h.marketValue, { dec: 0 })} P={P} />
                <Stat label="持仓盈亏"
                  value={`${h.gainAbs > 0 ? "+" : ""}${cFmtMoney(h.gainAbs, { dec: 0 })}`}
                  color={cMove(h.gainAbs, store.theme)} P={P}
                  sub={cFmtPct(h.gainPct)} />
                <Stat label="占总仓位" value={`${h.weight.toFixed(1)}%`} P={P} />
                <Stat label="今日盈亏"
                  value={`${h.todayDeltaTotal > 0 ? "+" : ""}${cFmtMoney(h.todayDeltaTotal, { dec: 0 })}`}
                  color={cMove(h.todayDeltaTotal, store.theme)} P={P} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color, sub, P }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.05em",
        textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, color: color || P.text }}>
        {value}
        {sub && <span style={{ fontSize: 12, marginLeft: 6, opacity: 0.85 }}>{sub}</span>}
      </div>
    </div>
  );
}

// ================= WATCH =================
function WatchPane({ store, P, openModal }) {
  const [hoverCode, setHoverCode] = useStateA(null);
  const list = store.sortedWatch;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <div style={{ color: P.muted, fontSize: 13, marginBottom: 6 }}>自选</div>
          <div style={{ fontSize: 30, fontWeight: 400, color: P.text,
            letterSpacing: "-0.02em" }}>{list.length} 只关注中</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => openModal({ type: "watch" })} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
            border: `1px solid ${P.line}`, borderRadius: 999, fontSize: 12.5,
            color: P.muted, background: "transparent", cursor: "pointer",
            fontFamily: "inherit" }}>
            <span style={{ opacity: 0.6 }}>⌕</span> 搜索股票 / 基金代码</button>
          <button onClick={() => openModal({ type: "ocr", target: "watch" })}
            style={calmBtn(P)}>⎙ 截图导入</button>
          <button onClick={() => openModal({ type: "watch" })}
            style={calmBtn(P, "primary")}>＋ 添加自选</button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState P={P} text="自选列表是空的 · 添加你想关注的标的"
          onAction={() => openModal({ type: "watch" })} actionLabel="添加自选" />
      ) : (
        <div style={{ background: P.panel, border: `1px solid ${P.line}`,
          borderRadius: 14, padding: "6px 0" }}>
          <div style={{ display: "grid",
            gridTemplateColumns: "1.5fr 1.1fr 92px 90px 64px 40px", gap: 10,
            padding: "10px 22px" }}>
            <SortTh label="名称 / 代码" sortKey="name" align="left" P={P}
              active={store.sortW.key === "name"} dir={store.sortW.dir}
              onClick={store.toggleSortW} />
            <span style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.08em",
              textTransform: "uppercase" }}>近月</span>
            <SortTh label="现价" sortKey="price" P={P}
              active={store.sortW.key === "price"} dir={store.sortW.dir}
              onClick={store.toggleSortW} />
            <SortTh label="今日" sortKey="today" P={P}
              active={store.sortW.key === "today"} dir={store.sortW.dir}
              onClick={store.toggleSortW} />
            <span style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.08em",
              textTransform: "uppercase", textAlign: "right" }}>类型</span>
            <span />
          </div>
          {list.map((w, i) => {
            const c = cMove(w.todayPct, store.theme);
            const hovered = hoverCode === w.code;
            return (
              <div key={w.code}
                onMouseEnter={() => setHoverCode(w.code)}
                onMouseLeave={() => setHoverCode(null)}
                style={{ display: "grid",
                  gridTemplateColumns: "1.5fr 1.1fr 92px 90px 64px 40px", gap: 10,
                  padding: "13px 22px", alignItems: "center", fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  borderTop: i === 0 ? "none" : `1px solid ${P.lineSoft}`,
                  background: hovered ? P.hoverRow : "transparent" }}>
                <div>
                  <div style={{ color: P.text, fontSize: 14, whiteSpace: "nowrap" }}>{w.name}</div>
                  <div style={{ color: P.subtle, fontSize: 11, marginTop: 2,
                    letterSpacing: "0.04em" }}>{w.code} · {w.market}</div>
                </div>
                <Spark data={w.daily.slice(-30)} color={c} width={110} height={26} />
                <div style={{ textAlign: "right", color: P.text }}>¥{cFmtNum(w.price)}</div>
                <div style={{ textAlign: "right", color: c }}>{cFmtPct(w.todayPct)}</div>
                <div style={{ textAlign: "right", color: P.subtle, fontSize: 11 }}>{w.type}</div>
                <div style={{ textAlign: "right" }}>
                  <button onClick={() => store.removeWatch(w.code)} title="移除自选"
                    style={{ background: "transparent", border: "none",
                      color: hovered ? P.muted : "transparent", cursor: "pointer",
                      fontSize: 14, padding: 4, transition: "color .12s" }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ P, text, onAction, actionLabel }) {
  return (
    <div style={{ background: P.panel, border: `1px dashed ${P.line}`,
      borderRadius: 14, padding: "56px 20px", textAlign: "center" }}>
      <div style={{ color: P.muted, fontSize: 14, marginBottom: 16 }}>{text}</div>
      <button onClick={onAction} style={calmBtn(P, "primary")}>＋ {actionLabel}</button>
    </div>
  );
}

window.CalmApp = CalmApp;
