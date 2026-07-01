// Calm Menubar — compact native-menu style popover (reference: CodexBar layout).
const { useState: useStateP, useMemo: useMemoP } = React;

// ---- a stat cell in the 2x2 grid ----
function MBStatCell({ label, value, color, P }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: P.subtle, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: color || P.text, fontWeight: 500,
        fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

// ---- expandable list section (tap header to toggle) ----
function MBExpand({ title, right, rightColor, open, onToggle, children, P }) {
  return (
    <div>
      <button onClick={onToggle} className="mb-hoverable" style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%",
        padding: "9px 14px", border: "none", background: "transparent",
        cursor: "pointer", font: "inherit", textAlign: "left",
        borderRadius: 8 }}>
        <span style={{ fontSize: 13, color: P.text, flex: 1 }}>{title}</span>
        <span style={{ fontSize: 12, color: rightColor || P.muted,
          fontVariantNumeric: "tabular-nums" }}>{right}</span>
        <span style={{ display: "flex", color: P.subtle,
          transform: open ? "rotate(90deg)" : "none", transition: "transform .15s ease" }}>
          <Icon name="ChevronRight" size={15} color={P.subtle} />
        </span>
      </button>
      {open && (
        <div style={{ maxHeight: 134, overflowY: "auto", padding: "0 0 6px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function MBMiniRow({ name, code, mid, pct, color, P }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 58px", gap: 8,
      alignItems: "center", padding: "5px 14px 5px 22px",
      fontVariantNumeric: "tabular-nums" }}>
      <div style={{ minWidth: 0 }}>
        <span style={{ fontSize: 12.5, color: P.text }}>{name}</span>
        <span style={{ fontSize: 10, color: P.subtle, marginLeft: 6,
          letterSpacing: "0.02em" }}>{code}</span>
      </div>
      <span style={{ fontSize: 12, color: P.muted, textAlign: "right" }}>{mid}</span>
      <span style={{ fontSize: 12, color, textAlign: "right" }}>{pct}</span>
    </div>
  );
}

// ---- native menu action row (icon + label + optional shortcut) ----
function MBMenuRow({ iconName, spinning, label, shortcut, onClick, P, accent }) {
  return (
    <button onClick={onClick} className="mb-hoverable" style={{
      display: "flex", alignItems: "center", gap: 11, width: "100%",
      padding: "8px 14px", border: "none", background: "transparent",
      cursor: "pointer", font: "inherit", textAlign: "left", borderRadius: 8 }}>
      <span style={{ display: "flex",
        animation: spinning ? "mbspin .7s linear infinite" : "none" }}>
        <Icon name={iconName} size={16} color={accent ? P.accent : P.muted} />
      </span>
      <span style={{ flex: 1, fontSize: 13, color: P.text }}>{label}</span>
      {shortcut && <span style={{ fontSize: 12, color: P.subtle,
        letterSpacing: "0.04em" }}>{shortcut}</span>}
    </button>
  );
}

function MBDivider({ P }) {
  return <div style={{ height: 1, background: P.lineSoft, margin: "5px 12px" }} />;
}

function MBPopover({ store, P, onOpenSettings, onOpenDashboard, onOpenImport, onRefresh, refreshing, asOf }) {
  const { summary, holdingsFull, watchFull, sections, period, setPeriod, conv } = store;
  const D = window.CALM;
  const move = (v) => mbMove(v, P.isDark ? "dark" : "light", conv);
  const [open, setOpen] = useStateP("holdings");
  const toggle = (k) => setOpen(o => o === k ? null : k);

  const { series, labels } = useMemoP(() => store.portfolioSeries(period), [store, period]);
  const trendColor = move(summary.todayDelta);
  const posPct = summary.totalAssets ? (summary.marketValue / summary.totalAssets) * 100 : 0;
  const periods = ["1W", "1M", "3M", "1Y"];

  return (
    <div className="mb-pop" style={{ width: 300, display: "flex",
      flexDirection: "column", overflow: "hidden",
      background: P.isDark ? "rgba(29,29,33,0.97)" : "rgba(252,251,248,0.98)",
      backdropFilter: "blur(30px) saturate(1.4)", WebkitBackdropFilter: "blur(30px) saturate(1.4)",
      border: `1px solid ${P.isDark ? "rgba(255,255,255,0.08)" : "rgba(40,30,20,0.08)"}`,
      borderRadius: 14,
      boxShadow: P.isDark
        ? "0 16px 50px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.04)"
        : "0 16px 50px rgba(40,30,20,0.2), 0 2px 6px rgba(40,30,20,0.08)",
      fontFamily: "'PingFang SC', 'Inter', system-ui, sans-serif",
      "--mb-hover": P.isDark ? "rgba(255,255,255,0.06)" : "rgba(40,30,20,0.045)" }}>

      <div style={{ padding: "4px 0" }}>
        {/* ---- total hero ---- */}
        <div style={{ padding: "12px 14px 2px" }}>
          <div style={{ fontSize: 10.5, color: P.subtle }}>总资产</div>
          <div style={{ fontSize: 26, color: P.text, fontWeight: 500, marginTop: 2,
            letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>
            {cFmtMoney(summary.totalAssets, { dec: 2 })}</div>
          <div style={{ fontSize: 12.5, color: trendColor, marginTop: 3,
            fontVariantNumeric: "tabular-nums" }}>
            今日 {cFmtMoney(summary.todayDelta, { sign: true, dec: 2 })}
            <span style={{ marginLeft: 5 }}>{cFmtPct(summary.todayPct)}</span>
          </div>
        </div>

        {/* ---- 2x2 stat grid ---- */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "12px 10px", padding: "12px 14px 10px" }}>
          <MBStatCell P={P} label="持仓市值" value={cFmtMoney(summary.marketValue, { dec: 0 })} />
          <MBStatCell P={P} label="现金" value={cFmtMoney(summary.cash, { dec: 0 })} />
          <MBStatCell P={P} label="累计盈亏" color={move(summary.totalGain)}
            value={cFmtPct(summary.totalGainPct)} />
          <MBStatCell P={P} label="仓位" value={posPct.toFixed(0) + "%"} />
        </div>

        {/* ---- trend chart ---- */}
        {sections.trend && (
          <div style={{ padding: "0 4px 6px" }}>
            <AreaChartLive series={series} labels={labels} height={84} P={P}
              color={trendColor}
              fillFrom={P.isDark ? "rgba(255,255,255,0.05)" : "rgba(91,79,212,0.10)"}
              fillTo={P.isDark ? "rgba(255,255,255,0)" : "rgba(91,79,212,0)"}
              formatValue={(v) => cFmtMoney(v, { dec: 0 })}
              padding={{ top: 6, right: 12, bottom: 16, left: 40 }} baseline />
            <div style={{ display: "flex", gap: 3, padding: "0 12px",
              justifyContent: "center" }}>
              {periods.map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: "2px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                  font: "inherit", fontSize: 10.5,
                  background: period === p ? (P.isDark ? "#2b2b33" : "#ece9e1") : "transparent",
                  color: period === p ? P.text : P.subtle }}>{p}</button>
              ))}
            </div>
          </div>
        )}

        <MBDivider P={P} />

        {/* ---- expandable lists ---- */}
        <div style={{ padding: "0 4px" }}>
          {sections.holdings && (
            <MBExpand P={P} title="持仓" open={open === "holdings"}
              onToggle={() => toggle("holdings")}
              right={`${holdingsFull.length} 只 · ${cFmtCompact(summary.marketValue)}`}>
              {holdingsFull.map(h => (
                <MBMiniRow key={h.code} name={h.name} code={h.code} P={P}
                  mid={cFmtCompact(h.marketValue)} pct={cFmtPct(h.todayPct)}
                  color={move(h.todayPct)} />
              ))}
            </MBExpand>
          )}
          {sections.watch && (
            <MBExpand P={P} title="自选" open={open === "watch"}
              onToggle={() => toggle("watch")} right={`${watchFull.length} 只`}>
              {watchFull.map(w => (
                <MBMiniRow key={w.code} name={w.name} code={w.code} P={P}
                  mid={"¥" + cFmtNum(w.price)} pct={cFmtPct(w.todayPct)}
                  color={move(w.todayPct)} />
              ))}
            </MBExpand>
          )}
          {sections.indices && (
            <MBExpand P={P} title="大盘" open={open === "indices"}
              onToggle={() => toggle("indices")}
              right={`${D.indices[0].name.slice(0,2)} ${cFmtPct(D.indices[0].pct)}`}
              rightColor={move(D.indices[0].pct)}>
              {D.indices.map(idx => (
                <MBMiniRow key={idx.code} name={idx.name} code={idx.code} P={P}
                  mid={cFmtNum(idx.value)} pct={cFmtPct(idx.pct)} color={move(idx.pct)} />
              ))}
            </MBExpand>
          )}
        </div>

        {/* ---- action menu ---- */}
        {sections.actions && (
          <>
            <MBDivider P={P} />
            <div style={{ padding: "0 4px" }}>
              <MBMenuRow P={P} iconName="ArrowUpRight" label="打开主看板" onClick={onOpenDashboard} accent />
              <MBMenuRow P={P} iconName="ScanLine" label="截图导入持仓" onClick={onOpenImport} />
              <MBMenuRow P={P} iconName="RefreshCw" spinning={refreshing}
                label="刷新行情" shortcut="⌘R" onClick={onRefresh} />
              <MBMenuRow P={P} iconName="Settings" label="设置…" shortcut="⌘," onClick={onOpenSettings} />
            </div>
          </>
        )}
      </div>

      {/* footer */}
      <div style={{ padding: "7px 14px", borderTop: `1px solid ${P.lineSoft}`,
        fontSize: 10, color: P.subtle, display: "flex",
        justifyContent: "space-between", flexShrink: 0 }}>
        <span>实时延迟 15 秒</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>更新于 {asOf}</span>
      </div>
    </div>
  );
}

window.MBPopover = MBPopover;
