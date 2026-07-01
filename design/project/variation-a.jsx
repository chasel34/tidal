// Variation A · Calm Dashboard
// Linear/Notion-ish — sidebar nav, one giant hero number, restrained list rows.

function VariationA() {
  const [theme, setTheme] = React.useState("light");
  const [tab, setTab] = React.useState("today"); // today | holdings | watch
  const [selectedHolding, setSelectedHolding] = React.useState(0);

  const data = window.DASH_DATA;
  const isDark = theme === "dark";

  const P = isDark
    ? { bg: "#16161a", panel: "#1d1d22", line: "#2a2a32", text: "#ededf2",
        muted: "#8a8a93", subtle: "#5f5f68", accent: "#c8b7ff",
        chipBg: "#23232b", chipText: "#b9b9c2" }
    : { bg: "#fafaf7", panel: "#ffffff", line: "#ece9e2", text: "#1a1a1f",
        muted: "#6f6f78", subtle: "#a39e96", accent: "#5a4ed1",
        chipBg: "#f1eee6", chipText: "#5a554d" };

  const up = data.summary.todayDelta > 0;
  const moveC = moveColor(data.summary.todayDelta, theme);

  const NavItem = ({ id, label, icon }) => {
    const active = tab === id;
    return (
      <button
        onClick={() => setTab(id)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 12px", borderRadius: 8,
          background: active ? (isDark ? "#26262e" : "#f0ede5") : "transparent",
          color: active ? P.text : P.muted,
          border: "none", cursor: "pointer",
          font: "inherit", fontSize: 13.5,
          textAlign: "left", width: "100%",
        }}>
        <span style={{ fontSize: 14, width: 16, textAlign: "center", opacity: 0.85 }}>{icon}</span>
        <span>{label}</span>
      </button>
    );
  };

  const content = tab === "today" ? <TodayPane /> :
    tab === "holdings" ? <HoldingsPane /> : <WatchPane />;

  function TodayPane() {
    return (
      <div>
        {/* Hero — today */}
        <div style={{ padding: "0 0 32px 0" }}>
          <div style={{ color: P.muted, fontSize: 13, marginBottom: 18 }}>
            今天 · 周四 · {data.asOf.split(" ")[0]}
          </div>
          <div style={{
            fontSize: 88, fontWeight: 300, letterSpacing: "-0.04em",
            color: moveC, fontFamily: "'Söhne', 'Inter', system-ui",
            lineHeight: 1, marginBottom: 14,
            fontVariantNumeric: "tabular-nums",
          }}>
            {up ? "+" : ""}{fmtMoney(data.summary.todayDelta, { decimals: 2 })}
          </div>
          <div style={{ display: "flex", gap: 18, alignItems: "baseline" }}>
            <div style={{ fontSize: 15, color: moveC, fontVariantNumeric: "tabular-nums" }}>
              {fmtPct(data.summary.todayPct)} 今日
            </div>
            <div style={{ fontSize: 13, color: P.muted }}>
              账户总额 {fmtMoney(data.summary.totalAssets)}
            </div>
          </div>
        </div>

        {/* Area chart */}
        <div style={{
          background: P.panel, border: `1px solid ${P.line}`,
          borderRadius: 14, padding: "18px 18px 8px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 13, color: P.muted }}>近 30 日资产走势</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["1D", "1W", "1M", "3M", "1Y"].map(r => (
                <button key={r} style={{
                  background: r === "1M" ? P.chipBg : "transparent",
                  color: r === "1M" ? P.text : P.muted,
                  border: "none", padding: "4px 10px", borderRadius: 6,
                  fontSize: 11.5, cursor: "pointer", fontFamily: "inherit",
                }}>{r}</button>
              ))}
            </div>
          </div>
          <AreaChart
            data={data.summary.portfolioTrend}
            width={720} height={180}
            color={P.accent}
            fillFrom={isDark ? "rgba(200,183,255,0.22)" : "rgba(90,78,209,0.18)"}
            fillTo={isDark ? "rgba(200,183,255,0)" : "rgba(90,78,209,0)"}
            axisColor={P.subtle}
            gradientId="vA-area"
          />
        </div>

        {/* Two columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 24 }}>
          <SectionCard title="今日表现 · 持仓" actionLabel="全部 →" onAction={() => setTab("holdings")}>
            {data.holdings.slice(0, 4).map((h, i) => {
              const c = moveColor(h.todayPct, theme);
              return (
                <div key={h.code} style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 70px 80px",
                  alignItems: "center", padding: "10px 0",
                  borderTop: i === 0 ? "none" : `1px solid ${P.line}`,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  <div>
                    <div style={{ fontSize: 14, color: P.text }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.04em" }}>
                      {h.code} · {h.type}
                    </div>
                  </div>
                  <SparkLine data={h.trend} color={c} width={60} height={22} />
                  <div style={{ textAlign: "right", color: c, fontSize: 13 }}>
                    {fmtPct(h.todayPct)}
                  </div>
                </div>
              );
            })}
          </SectionCard>
          <SectionCard title="自选 · 今日变动" actionLabel="全部 →" onAction={() => setTab("watch")}>
            {data.watchlist.slice(0, 4).map((w, i) => {
              const c = moveColor(w.todayPct, theme);
              return (
                <div key={w.code} style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 70px 80px",
                  alignItems: "center", padding: "10px 0",
                  borderTop: i === 0 ? "none" : `1px solid ${P.line}`,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  <div>
                    <div style={{ fontSize: 14, color: P.text }}>{w.name}</div>
                    <div style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.04em" }}>
                      {w.code} · {w.type}
                    </div>
                  </div>
                  <SparkLine data={w.trend} color={c} width={60} height={22} />
                  <div style={{ textAlign: "right", color: c, fontSize: 13 }}>
                    {fmtPct(w.todayPct)}
                  </div>
                </div>
              );
            })}
          </SectionCard>
        </div>
      </div>
    );
  }

  function HoldingsPane() {
    const h = data.holdings[selectedHolding];
    const c = moveColor(h.todayPct, theme);
    const totalGain = (h.price - h.cost) * h.shares;
    const totalGainPct = ((h.price - h.cost) / h.cost) * 100;
    const totalC = moveColor(totalGain, theme);

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "flex-end", marginBottom: 24 }}>
          <div>
            <div style={{ color: P.muted, fontSize: 13, marginBottom: 6 }}>持仓</div>
            <div style={{ fontSize: 32, fontWeight: 400, color: P.text,
              letterSpacing: "-0.02em" }}>
              {data.holdings.length} 只 · 市值 {fmtMoney(data.summary.marketValue)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={pillBtn(P, false)}>＋ 添加</button>
            <button style={pillBtn(P, false)}>↓ 导出</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18 }}>
          {/* Holdings list */}
          <div style={{
            background: P.panel, border: `1px solid ${P.line}`,
            borderRadius: 14, padding: "8px 0", overflow: "hidden",
          }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1.8fr 70px 80px 80px",
              gap: 8, padding: "10px 18px", fontSize: 11,
              color: P.subtle, letterSpacing: "0.08em", textTransform: "uppercase",
            }}>
              <div>名称</div>
              <div style={{ textAlign: "right" }}>市值</div>
              <div style={{ textAlign: "right" }}>今日</div>
              <div style={{ textAlign: "right" }}>持仓盈亏</div>
            </div>
            {data.holdings.map((h, idx) => {
              const todayC = moveColor(h.todayPct, theme);
              const gainAbs = (h.price - h.cost) * h.shares;
              const gainPct = ((h.price - h.cost) / h.cost) * 100;
              const gainC = moveColor(gainAbs, theme);
              const active = idx === selectedHolding;
              return (
                <div key={h.code}
                  onClick={() => setSelectedHolding(idx)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.8fr 70px 80px 80px",
                    gap: 8, padding: "12px 18px",
                    background: active ? (isDark ? "#23232b" : "#f6f3eb") : "transparent",
                    cursor: "pointer",
                    fontVariantNumeric: "tabular-nums",
                    fontSize: 13, alignItems: "center",
                    borderLeft: `2px solid ${active ? P.accent : "transparent"}`,
                  }}>
                  <div>
                    <div style={{ color: P.text, fontSize: 14 }}>{h.name}</div>
                    <div style={{ color: P.subtle, fontSize: 11,
                      letterSpacing: "0.04em", marginTop: 2 }}>
                      {h.code} · {h.shares}{h.type === "股票" ? "股" : "份"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", color: P.text }}>
                    {fmtMoney(h.shares * h.price, { decimals: 0 })}
                  </div>
                  <div style={{ textAlign: "right", color: todayC }}>
                    {fmtPct(h.todayPct)}
                  </div>
                  <div style={{ textAlign: "right", color: gainC }}>
                    {fmtPct(gainPct)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          <div style={{
            background: P.panel, border: `1px solid ${P.line}`,
            borderRadius: 14, padding: 20,
          }}>
            <div style={{ fontSize: 12, color: P.subtle, letterSpacing: "0.08em",
              textTransform: "uppercase", marginBottom: 8 }}>
              {h.code} · {h.market}
            </div>
            <div style={{ fontSize: 22, color: P.text, marginBottom: 14 }}>{h.name}</div>
            <div style={{
              display: "flex", alignItems: "baseline", gap: 12, marginBottom: 18,
              fontVariantNumeric: "tabular-nums",
            }}>
              <div style={{ fontSize: 34, color: P.text, letterSpacing: "-0.02em" }}>
                ¥{fmtNum(h.price)}
              </div>
              <div style={{ fontSize: 14, color: c }}>
                {fmtPct(h.todayPct)}
              </div>
            </div>
            <Candles data={h.trend} width={340} height={140} theme={theme} />
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
              marginTop: 18, paddingTop: 18, borderTop: `1px solid ${P.line}`,
              fontVariantNumeric: "tabular-nums",
            }}>
              <Stat label="持仓成本" value={`¥${fmtNum(h.cost)}`} P={P} />
              <Stat label="持仓数量" value={`${h.shares}${h.type === "股票" ? " 股" : " 份"}`} P={P} />
              <Stat label="持仓市值" value={`¥${fmtNum(h.shares * h.price, 0)}`} P={P} />
              <Stat label="持仓盈亏"
                value={`${totalGain > 0 ? "+" : ""}${fmtMoney(totalGain, { decimals: 0 })}`}
                color={totalC} P={P} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  function WatchPane() {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "flex-end", marginBottom: 24 }}>
          <div>
            <div style={{ color: P.muted, fontSize: 13, marginBottom: 6 }}>自选</div>
            <div style={{ fontSize: 32, fontWeight: 400, color: P.text,
              letterSpacing: "-0.02em" }}>
              {data.watchlist.length} 只关注中
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 12px", border: `1px solid ${P.line}`,
              borderRadius: 999, fontSize: 12.5, color: P.muted,
            }}>
              <span style={{ opacity: 0.5 }}>⌕</span>
              搜索股票 / 基金代码
            </div>
            <button style={pillBtn(P, true)}>＋ 添加自选</button>
          </div>
        </div>
        <div style={{
          background: P.panel, border: `1px solid ${P.line}`,
          borderRadius: 14, padding: "8px 0",
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1.5fr 1fr 90px 90px 80px 36px",
            gap: 10, padding: "10px 22px", fontSize: 11,
            color: P.subtle, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            <div>名称 / 代码</div>
            <div>近月</div>
            <div style={{ textAlign: "right" }}>现价</div>
            <div style={{ textAlign: "right" }}>今日</div>
            <div style={{ textAlign: "right" }}>类型</div>
            <div></div>
          </div>
          {data.watchlist.map((w, i) => {
            const c = moveColor(w.todayPct, theme);
            return (
              <div key={w.code} style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 90px 90px 80px 36px",
                gap: 10, padding: "14px 22px",
                borderTop: i === 0 ? "none" : `1px solid ${P.line}`,
                alignItems: "center", fontVariantNumeric: "tabular-nums",
                fontSize: 13,
              }}>
                <div>
                  <div style={{ color: P.text, fontSize: 14 }}>{w.name}</div>
                  <div style={{ color: P.subtle, fontSize: 11,
                    letterSpacing: "0.04em", marginTop: 2 }}>
                    {w.code} · {w.market}
                  </div>
                </div>
                <SparkLine data={w.trend} color={c} width={120} height={26} />
                <div style={{ textAlign: "right", color: P.text }}>
                  ¥{fmtNum(w.price)}
                </div>
                <div style={{ textAlign: "right", color: c }}>{fmtPct(w.todayPct)}</div>
                <div style={{ textAlign: "right", color: P.subtle, fontSize: 11 }}>
                  {w.type}
                </div>
                <div style={{ textAlign: "right", color: P.subtle, cursor: "pointer" }}>⋯</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: "100%", height: "100%",
      background: P.bg, color: P.text,
      fontFamily: "'PingFang SC', 'Inter', system-ui, -apple-system, sans-serif",
      display: "grid", gridTemplateColumns: "212px 1fr",
    }}>
      {/* Sidebar */}
      <aside style={{
        borderRight: `1px solid ${P.line}`,
        padding: "22px 16px",
        display: "flex", flexDirection: "column", gap: 24,
      }}>
        <div style={{ padding: "0 4px 4px", display: "flex",
          justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 7,
              background: P.accent, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 600,
            }}>盘</div>
            <div style={{ fontSize: 14, color: P.text, letterSpacing: "-0.01em" }}>
              我的看板
            </div>
          </div>
          <ThemeToggle theme={theme} setTheme={setTheme} palette={P} />
        </div>

        <div>
          <div style={{ fontSize: 10.5, color: P.subtle, letterSpacing: "0.12em",
            padding: "0 12px 8px", textTransform: "uppercase" }}>导航</div>
          <NavItem id="today" label="今天" icon="◉" />
          <NavItem id="holdings" label="持仓" icon="◧" />
          <NavItem id="watch" label="自选" icon="✦" />
        </div>

        <div>
          <div style={{ fontSize: 10.5, color: P.subtle, letterSpacing: "0.12em",
            padding: "0 12px 8px", textTransform: "uppercase" }}>大盘</div>
          {data.indices.map(idx => {
            const c = moveColor(idx.pct, theme);
            return (
              <div key={idx.code} style={{
                display: "flex", justifyContent: "space-between",
                padding: "7px 12px", fontSize: 12,
                fontVariantNumeric: "tabular-nums",
              }}>
                <div style={{ color: P.muted }}>{idx.name}</div>
                <div style={{ color: c }}>{fmtPct(idx.pct)}</div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "auto", padding: "12px",
          borderTop: `1px solid ${P.line}`,
          fontSize: 11, color: P.subtle }}>
          数据延迟约 15 秒 · 演示数据
        </div>
      </aside>

      {/* Main */}
      <main style={{ padding: "32px 40px", overflow: "hidden" }}>
        {content}
      </main>
    </div>
  );
}

function SectionCard({ title, actionLabel, onAction, children }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "baseline", marginBottom: 10, padding: "0 2px" }}>
        <div style={{ fontSize: 13, color: "inherit", opacity: 0.85 }}>{title}</div>
        {actionLabel && (
          <button onClick={onAction} style={{
            background: "transparent", border: "none", color: "inherit",
            opacity: 0.55, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>{actionLabel}</button>
        )}
      </div>
      <div style={{ padding: "2px 2px 0" }}>{children}</div>
    </div>
  );
}

function Stat({ label, value, color, P }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.06em",
        textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, color: color || P.text }}>{value}</div>
    </div>
  );
}

function pillBtn(P, primary) {
  return {
    background: primary ? P.accent : "transparent",
    color: primary ? "#fff" : P.text,
    border: primary ? "none" : `1px solid ${P.line}`,
    padding: "8px 14px", borderRadius: 999,
    fontSize: 12.5, cursor: "pointer",
    fontFamily: "inherit",
  };
}

window.VariationA = VariationA;
