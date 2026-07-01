// Variation B · Bento Dashboard
// Tiled, modular — each life-of-portfolio fact lives in its own square.
// Pastel, low-contrast, friendly. Inspired by widget-style dashboards.

function VariationB() {
  const [theme, setTheme] = React.useState("light");
  const [period, setPeriod] = React.useState("1M");
  const data = window.DASH_DATA;
  const isDark = theme === "dark";

  const P = isDark
    ? { bg: "#0e1014", tile: "#181b22", tile2: "#1e2230",
        line: "#262a35", text: "#eef0f4", muted: "#8c93a3",
        subtle: "#5e6577", accent: "#7ad9c8", accent2: "#f5a86a",
        sweet: "#1f2735", sweet2: "#21232c" }
    : { bg: "#f4f1ec", tile: "#ffffff", tile2: "#fdf6eb",
        line: "#e9e5dc", text: "#1e1f24", muted: "#67687a",
        subtle: "#a0a094", accent: "#2e9d8f", accent2: "#e08a3b",
        sweet: "#f3eee2", sweet2: "#efe6d4" };

  const up = data.summary.todayDelta > 0;
  const moveC = moveColor(data.summary.todayDelta, theme);

  const Tile = ({ children, style, span, color }) => (
    <div style={{
      background: color || P.tile,
      border: `1px solid ${P.line}`,
      borderRadius: 22,
      padding: 22,
      position: "relative",
      overflow: "hidden",
      ...style,
      ...(span ? { gridColumn: span.col, gridRow: span.row } : {}),
    }}>{children}</div>
  );

  const TileLabel = ({ children }) => (
    <div style={{
      fontSize: 11, color: P.subtle, letterSpacing: "0.12em",
      textTransform: "uppercase", marginBottom: 12,
    }}>{children}</div>
  );

  const allocColors = [P.accent, P.accent2,
    isDark ? "#a695e8" : "#7b6cd8",
    isDark ? "#4a5163" : "#c8c1b3"];
  const allocSegments = data.allocation.map((a, i) => ({
    ...a, color: allocColors[i],
  }));
  const totalAlloc = allocSegments.reduce((s, x) => s + x.value, 0);

  return (
    <div style={{
      width: "100%", height: "100%",
      background: P.bg, color: P.text,
      fontFamily: "'PingFang SC', 'Inter', system-ui, sans-serif",
      padding: 24,
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: `linear-gradient(135deg, ${P.accent}, ${P.accent2})`,
            color: "#fff", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 14, fontWeight: 600,
          }}>盘</div>
          <div>
            <div style={{ fontSize: 16, letterSpacing: "-0.01em" }}>我的资产</div>
            <div style={{ fontSize: 11.5, color: P.muted }}>
              {data.asOf} · 数据延迟 ~15s
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px", background: P.tile,
            border: `1px solid ${P.line}`,
            borderRadius: 999, fontSize: 12.5, color: P.muted,
            width: 240,
          }}>
            <span style={{ opacity: 0.5 }}>⌕</span>
            搜索 代码 / 名称
          </div>
          <button style={{
            background: P.accent, color: "#fff",
            padding: "8px 16px", borderRadius: 999,
            border: "none", cursor: "pointer", fontSize: 12.5,
            fontFamily: "inherit",
          }}>＋ 添加</button>
          <ThemeToggle theme={theme} setTheme={setTheme} palette={P} />
        </div>
      </div>

      {/* Bento grid */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        gridTemplateRows: "260px 220px 280px",
        gap: 16,
      }}>
        {/* Hero — Today */}
        <Tile span={{ col: "1 / 7", row: "1 / 2" }} color={P.tile2}>
          <TileLabel>今日 · 周四</TileLabel>
          <div style={{
            fontSize: 86, fontWeight: 300, letterSpacing: "-0.04em",
            color: moveC, lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            marginTop: 4, marginBottom: 14,
          }}>
            {up ? "+" : ""}{fmtMoney(data.summary.todayDelta, { decimals: 2 })}
          </div>
          <div style={{ display: "flex", gap: 28, alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: 10.5, color: P.subtle,
                letterSpacing: "0.08em", textTransform: "uppercase",
                marginBottom: 3 }}>涨跌幅</div>
              <div style={{ fontSize: 18, color: moveC,
                fontVariantNumeric: "tabular-nums" }}>
                {fmtPct(data.summary.todayPct)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: P.subtle,
                letterSpacing: "0.08em", textTransform: "uppercase",
                marginBottom: 3 }}>账户总额</div>
              <div style={{ fontSize: 18, color: P.text,
                fontVariantNumeric: "tabular-nums" }}>
                {fmtMoney(data.summary.totalAssets)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: P.subtle,
                letterSpacing: "0.08em", textTransform: "uppercase",
                marginBottom: 3 }}>累计收益</div>
              <div style={{ fontSize: 18,
                color: moveColor(data.summary.totalGain, theme),
                fontVariantNumeric: "tabular-nums" }}>
                {fmtPct(data.summary.totalGainPct)}
              </div>
            </div>
          </div>
          {/* Decorative big arrow */}
          <div style={{
            position: "absolute", right: -30, bottom: -50,
            fontSize: 320, color: moveC, opacity: isDark ? 0.08 : 0.06,
            lineHeight: 1, fontWeight: 300, userSelect: "none",
          }}>{up ? "↗" : "↘"}</div>
        </Tile>

        {/* Allocation Donut */}
        <Tile span={{ col: "7 / 10", row: "1 / 2" }}>
          <TileLabel>资产配置</TileLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 12,
            justifyContent: "center", height: "calc(100% - 24px)" }}>
            <Donut
              segments={allocSegments} size={144} thickness={16}
              centerLabel={
                <g>
                  <text x="72" y="68" textAnchor="middle"
                    fontSize="10" fill={P.subtle}
                    style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}>总市值</text>
                  <text x="72" y="86" textAnchor="middle"
                    fontSize="17" fill={P.text}
                    fontFamily="ui-monospace, monospace">
                    ¥{(totalAlloc / 10000).toFixed(1)}万
                  </text>
                </g>
              }
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {allocSegments.map(seg => {
                const pct = (seg.value / totalAlloc) * 100;
                return (
                  <div key={seg.label} style={{ display: "flex",
                    alignItems: "center", gap: 8, fontSize: 12 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: 2, background: seg.color,
                    }} />
                    <div style={{ color: P.muted, width: 36 }}>{seg.label}</div>
                    <div style={{ color: P.text,
                      fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
                      {pct.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Tile>

        {/* Indices */}
        <Tile span={{ col: "10 / 13", row: "1 / 2" }}>
          <TileLabel>大盘指数</TileLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.indices.map(idx => {
              const c = moveColor(idx.pct, theme);
              return (
                <div key={idx.code} style={{
                  display: "grid", gridTemplateColumns: "1fr auto",
                  rowGap: 1, columnGap: 8,
                  fontVariantNumeric: "tabular-nums",
                  padding: "4px 0",
                  borderBottom: `1px solid ${P.line}`,
                }}>
                  <div style={{ fontSize: 13, color: P.text }}>{idx.name}</div>
                  <div style={{ fontSize: 13, color: c, textAlign: "right" }}>
                    {fmtPct(idx.pct)}
                  </div>
                  <div style={{ fontSize: 11, color: P.subtle }}>
                    {fmtNum(idx.value)}
                  </div>
                  <div style={{ fontSize: 10, color: P.subtle, textAlign: "right" }}>
                    {idx.code}
                  </div>
                </div>
              );
            })}
          </div>
        </Tile>

        {/* Portfolio area chart */}
        <Tile span={{ col: "1 / 9", row: "2 / 3" }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "baseline" }}>
            <TileLabel>账户走势 · 近 30 天</TileLabel>
            <div style={{ display: "flex", gap: 4 }}>
              {["1W", "1M", "3M", "1Y", "全部"].map(r => (
                <button key={r} onClick={() => setPeriod(r)} style={{
                  background: r === period ? (isDark ? "#262a35" : P.sweet2) : "transparent",
                  color: r === period ? P.text : P.muted,
                  border: "none", padding: "4px 10px", borderRadius: 6,
                  fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                }}>{r}</button>
              ))}
            </div>
          </div>
          <AreaChart
            data={data.summary.portfolioTrend}
            width={620} height={150}
            color={P.accent}
            fillFrom={isDark ? "rgba(122,217,200,0.25)" : "rgba(46,157,143,0.18)"}
            fillTo={isDark ? "rgba(122,217,200,0)" : "rgba(46,157,143,0)"}
            axisColor={P.subtle}
            gradientId="vB-area"
          />
        </Tile>

        {/* Top movers */}
        <Tile span={{ col: "9 / 13", row: "2 / 3" }} color={P.tile2}>
          <TileLabel>今日表现榜</TileLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...data.holdings, ...data.watchlist]
              .sort((a, b) => b.todayPct - a.todayPct)
              .slice(0, 5)
              .map((m, i) => {
                const c = moveColor(m.todayPct, theme);
                return (
                  <div key={m.code} style={{
                    display: "grid",
                    gridTemplateColumns: "16px 1fr 60px",
                    alignItems: "center", gap: 8,
                    padding: "4px 0",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    <div style={{ fontSize: 11, color: P.subtle,
                      fontFamily: "ui-monospace, monospace" }}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, color: P.text }}>{m.name}</div>
                      <div style={{ fontSize: 10, color: P.subtle }}>{m.code}</div>
                    </div>
                    <div style={{ fontSize: 13, color: c, textAlign: "right" }}>
                      {fmtPct(m.todayPct)}
                    </div>
                  </div>
                );
              })}
          </div>
        </Tile>

        {/* Holdings list */}
        <Tile span={{ col: "1 / 8", row: "3 / 4" }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "baseline" }}>
            <TileLabel>我的持仓 · {data.holdings.length} 只</TileLabel>
            <button style={{
              background: "transparent", color: P.muted,
              border: "none", fontSize: 11.5, cursor: "pointer",
              fontFamily: "inherit",
            }}>全部 →</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 80px 70px 80px 80px",
              gap: 8, fontSize: 10, color: P.subtle,
              letterSpacing: "0.08em", textTransform: "uppercase",
              paddingBottom: 8, borderBottom: `1px solid ${P.line}`,
            }}>
              <div>持仓</div>
              <div>近月</div>
              <div style={{ textAlign: "right" }}>现价</div>
              <div style={{ textAlign: "right" }}>今日</div>
              <div style={{ textAlign: "right" }}>盈亏</div>
            </div>
            {data.holdings.map(h => {
              const todayC = moveColor(h.todayPct, theme);
              const gainAbs = (h.price - h.cost) * h.shares;
              const gainPct = ((h.price - h.cost) / h.cost) * 100;
              const gainC = moveColor(gainAbs, theme);
              return (
                <div key={h.code} style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 80px 70px 80px 80px",
                  gap: 8, padding: "9px 0",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 12.5, alignItems: "center",
                  borderBottom: `1px solid ${P.line}`,
                }}>
                  <div>
                    <div style={{ color: P.text }}>{h.name}</div>
                    <div style={{ color: P.subtle, fontSize: 10, marginTop: 1 }}>
                      {h.code} · {h.shares}
                    </div>
                  </div>
                  <SparkLine data={h.trend} color={gainC} width={70} height={22} />
                  <div style={{ textAlign: "right", color: P.text }}>
                    {fmtNum(h.price)}
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
        </Tile>

        {/* Watchlist */}
        <Tile span={{ col: "8 / 13", row: "3 / 4" }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "baseline" }}>
            <TileLabel>自选 · {data.watchlist.length} 只</TileLabel>
            <button style={{
              background: "transparent", color: P.muted,
              border: "none", fontSize: 11.5, cursor: "pointer",
              fontFamily: "inherit",
            }}>管理 →</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {data.watchlist.map(w => {
              const c = moveColor(w.todayPct, theme);
              return (
                <div key={w.code} style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 70px 70px",
                  gap: 6, padding: "10px 0",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 12.5, alignItems: "center",
                  borderBottom: `1px solid ${P.line}`,
                }}>
                  <div>
                    <div style={{ color: P.text }}>{w.name}</div>
                    <div style={{ color: P.subtle, fontSize: 10, marginTop: 1 }}>
                      {w.code} · {w.type}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", color: P.text, fontSize: 12.5 }}>
                    {fmtNum(w.price)}
                  </div>
                  <div style={{ textAlign: "right", color: c }}>{fmtPct(w.todayPct)}</div>
                </div>
              );
            })}
          </div>
        </Tile>
      </div>
    </div>
  );
}

window.VariationB = VariationB;
