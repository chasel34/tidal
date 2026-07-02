// Variation C · Editorial Journal
// Newspaper / magazine — serif headlines, prose intro, columned layout.
// Frames "今日盈亏" as a piece of writing about your day.

function VariationC() {
  const [theme, setTheme] = React.useState("light");
  const data = window.DASH_DATA;
  const isDark = theme === "dark";

  const P = isDark
    ? { bg: "#15110d", paper: "#1c1814", line: "#332d27",
        text: "#f1ebe1", muted: "#a59c8c", subtle: "#6f6657",
        rule: "#3a3329", warm: "#d6b27a" }
    : { bg: "#f6f0e6", paper: "#fbf8f1", line: "#d6cebe",
        text: "#1f1a13", muted: "#5e5547", subtle: "#928974",
        rule: "#bdb29b", warm: "#9a6b2e" };

  const up = data.summary.todayDelta > 0;
  const moveC = moveColor(data.summary.todayDelta, theme);
  const totalC = moveColor(data.summary.totalGain, theme);

  const serif = "'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'EB Garamond', Georgia, serif";
  const sans = "'PingFang SC', 'Inter', system-ui, sans-serif";
  const mono = "'JetBrains Mono', ui-monospace, 'SF Mono', monospace";

  // Build lede summarizing today
  const best = [...data.holdings].sort((a, b) => b.todayPct - a.todayPct)[0];
  const worst = [...data.holdings].sort((a, b) => a.todayPct - b.todayPct)[0];

  return (
    <div style={{
      width: "100%", height: "100%",
      background: P.bg, color: P.text,
      fontFamily: sans,
      padding: "32px 56px",
      display: "flex", flexDirection: "column", gap: 0,
      overflow: "hidden",
    }}>
      {/* Masthead */}
      <header style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        paddingBottom: 14,
        borderBottom: `2px solid ${P.text}`,
      }}>
        <div style={{ fontSize: 11, color: P.muted, letterSpacing: "0.16em",
          textTransform: "uppercase", fontFamily: mono }}>
          第 №147 期 · 周四刊
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: serif, fontSize: 32, letterSpacing: "0.08em",
            fontWeight: 500, color: P.text, whiteSpace: "nowrap",
          }}>
            盘 · 私人财讯
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end",
          alignItems: "center", gap: 10,
          fontSize: 11, color: P.muted, letterSpacing: "0.16em",
          textTransform: "uppercase", fontFamily: mono }}>
          <span>{data.asOf.replace(/-/g, ".")}</span>
          <ThemeToggle theme={theme} setTheme={setTheme} palette={P} />
        </div>
      </header>

      {/* Sub-masthead — dateline strip */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        padding: "8px 0", borderBottom: `1px solid ${P.rule}`,
        fontSize: 10.5, color: P.subtle, fontFamily: mono,
        letterSpacing: "0.14em", textTransform: "uppercase",
      }}>
        <span>持仓 · {data.holdings.length} 只</span>
        <span>自选 · {data.watchlist.length} 只</span>
        <span>现金 · {fmtMoney(data.summary.cash, { decimals: 0 })}</span>
        <span>累计 · {fmtPct(data.summary.totalGainPct)}</span>
        <span>大盘 · 上证 {fmtPct(data.indices[0].pct)}</span>
      </div>

      {/* Headline + lede */}
      <div style={{
        display: "grid", gridTemplateColumns: "1.4fr 1fr",
        gap: 48, padding: "28px 0 22px",
        borderBottom: `1px solid ${P.rule}`,
      }}>
        {/* Headline column */}
        <div>
          <div style={{ fontFamily: mono, fontSize: 10.5,
            color: P.warm, letterSpacing: "0.2em",
            textTransform: "uppercase", marginBottom: 8 }}>
            头版 · 今日盈亏
          </div>
          <div style={{
            fontFamily: serif, fontSize: 96, fontWeight: 400,
            lineHeight: 0.95, letterSpacing: "-0.02em",
            color: moveC, fontVariantNumeric: "tabular-nums",
            marginBottom: 14,
          }}>
            {up ? "+" : ""}{fmtMoney(data.summary.todayDelta, { decimals: 2 })}
          </div>
          <div style={{
            display: "flex", gap: 18, alignItems: "baseline",
            fontFamily: serif, fontSize: 22, color: P.muted,
            fontVariantNumeric: "tabular-nums",
          }}>
            <span style={{ color: moveC }}>{fmtPct(data.summary.todayPct)}</span>
            <span style={{ color: P.subtle, fontSize: 14, fontFamily: sans }}>
              当日变动
            </span>
          </div>
        </div>

        {/* Lede — written summary */}
        <div style={{ borderLeft: `1px solid ${P.rule}`, paddingLeft: 32 }}>
          <div style={{ fontFamily: mono, fontSize: 10.5,
            color: P.warm, letterSpacing: "0.2em",
            textTransform: "uppercase", marginBottom: 8 }}>
            导读
          </div>
          <p style={{
            fontFamily: serif, fontSize: 16, lineHeight: 1.65,
            color: P.text, margin: 0, textWrap: "pretty",
          }}>
            <span style={{ float: "left", fontSize: 48, lineHeight: 0.9,
              marginRight: 8, marginTop: 4, fontWeight: 500,
              fontFamily: serif, color: P.text }}>
              {up ? "升" : "落"}
            </span>
            截至 {data.asOf.split(" ")[1]}，账户总值
            <strong style={{ color: P.text }}> {fmtMoney(data.summary.totalAssets)}</strong>
            ，本日{up ? "上行" : "回落"}
            <strong style={{ color: moveC }}> {fmtPct(data.summary.todayPct)}</strong>
            。持仓中，<em style={{ fontStyle: "normal", color: P.text }}>{best.name}</em>
            领涨 <span style={{ color: moveColor(best.todayPct, theme) }}>
              {fmtPct(best.todayPct)}</span>，
            <em style={{ fontStyle: "normal", color: P.text }}>{worst.name}</em>
            最弱 <span style={{ color: moveColor(worst.todayPct, theme) }}>
              {fmtPct(worst.todayPct)}</span>。
          </p>
          <div style={{
            marginTop: 14, paddingTop: 12,
            borderTop: `1px dashed ${P.rule}`,
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 14, fontVariantNumeric: "tabular-nums",
          }}>
            <Field label="账户总额" value={fmtMoney(data.summary.totalAssets)}
              P={P} mono={mono} />
            <Field label="累计盈亏"
              value={`${data.summary.totalGain > 0 ? "+" : ""}${fmtMoney(data.summary.totalGain, { decimals: 0 })}`}
              color={totalC} P={P} mono={mono} />
          </div>
        </div>
      </div>

      {/* Body — two columns */}
      <div style={{
        flex: 1, display: "grid", gridTemplateColumns: "1.55fr 1fr",
        gap: 48, paddingTop: 22, overflow: "hidden",
      }}>
        {/* Left — Holdings */}
        <section style={{ borderRight: `1px solid ${P.rule}`, paddingRight: 48 }}>
          <SectionHeader serif={serif} mono={mono} P={P}
            kicker="本期专栏" title="持仓 · 今日表现" />
          <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
            {data.holdings.map((h, i) => {
              const c = moveColor(h.todayPct, theme);
              const gainAbs = (h.price - h.cost) * h.shares;
              const gainPct = ((h.price - h.cost) / h.cost) * 100;
              const gainC = moveColor(gainAbs, theme);
              return (
                <article key={h.code} style={{
                  display: "grid",
                  gridTemplateColumns: "20px 1.4fr 90px 70px 70px",
                  gap: 12, padding: "14px 0",
                  alignItems: "center",
                  borderBottom: i === data.holdings.length - 1
                    ? "none" : `1px dotted ${P.rule}`,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  <div style={{ fontFamily: mono, fontSize: 11,
                    color: P.subtle }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <div style={{ fontFamily: serif, fontSize: 18,
                      color: P.text, letterSpacing: "-0.005em" }}>
                      {h.name}
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 10,
                      color: P.subtle, letterSpacing: "0.1em",
                      textTransform: "uppercase", marginTop: 3 }}>
                      {h.code} · {h.type} · 持 {h.shares}{h.type === "股票" ? "股" : "份"}
                    </div>
                  </div>
                  <SparkLine data={h.trend} color={gainC} width={84} height={22} />
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: serif, fontSize: 16,
                      color: c, fontWeight: 500 }}>
                      {fmtPct(h.todayPct)}
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 10,
                      color: P.subtle, marginTop: 2 }}>
                      今日
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: serif, fontSize: 16,
                      color: gainC, fontWeight: 500 }}>
                      {fmtPct(gainPct)}
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 10,
                      color: P.subtle, marginTop: 2 }}>
                      累计
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Right — Watchlist + Indices */}
        <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <SectionHeader serif={serif} mono={mono} P={P}
              kicker="关注" title="自选 · 今日变动"
              right={
                <button style={{
                  background: "transparent", border: "none",
                  color: P.warm, fontSize: 11, cursor: "pointer",
                  fontFamily: mono, letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}>＋ 添加</button>
              } />
            <div style={{ marginTop: 12 }}>
              {data.watchlist.map((w, i) => {
                const c = moveColor(w.todayPct, theme);
                return (
                  <div key={w.code} style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 70px 60px",
                    gap: 10, padding: "10px 0",
                    alignItems: "center",
                    borderBottom: i === data.watchlist.length - 1
                      ? "none" : `1px dotted ${P.rule}`,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    <div>
                      <div style={{ fontFamily: serif, fontSize: 15,
                        color: P.text }}>{w.name}</div>
                      <div style={{ fontFamily: mono, fontSize: 10,
                        color: P.subtle, letterSpacing: "0.1em",
                        textTransform: "uppercase", marginTop: 2 }}>
                        {w.code} · {w.type}
                      </div>
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 12,
                      color: P.muted, textAlign: "right" }}>
                      {fmtNum(w.price)}
                    </div>
                    <div style={{ fontFamily: serif, fontSize: 15,
                      color: c, textAlign: "right" }}>
                      {fmtPct(w.todayPct)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer — indices as a strip */}
          <div style={{
            marginTop: "auto",
            padding: "16px 18px",
            background: P.paper, border: `1px solid ${P.line}`,
            borderRadius: 2,
          }}>
            <div style={{ fontFamily: mono, fontSize: 10.5,
              color: P.warm, letterSpacing: "0.2em",
              textTransform: "uppercase", marginBottom: 10 }}>
              大盘指数 · 截止收盘
            </div>
            <div style={{ display: "grid",
              gridTemplateColumns: "1fr 1fr", gap: "10px 18px" }}>
              {data.indices.map(idx => {
                const c = moveColor(idx.pct, theme);
                return (
                  <div key={idx.code} style={{
                    fontVariantNumeric: "tabular-nums",
                    display: "flex", justifyContent: "space-between",
                    alignItems: "baseline",
                  }}>
                    <div style={{ fontFamily: serif, fontSize: 14,
                      color: P.text }}>{idx.name}</div>
                    <div style={{ display: "flex", gap: 8,
                      alignItems: "baseline" }}>
                      <div style={{ fontFamily: mono, fontSize: 11,
                        color: P.subtle }}>
                        {fmtNum(idx.value)}
                      </div>
                      <div style={{ fontFamily: mono, fontSize: 12,
                        color: c, minWidth: 50, textAlign: "right" }}>
                        {fmtPct(idx.pct)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Footer rule */}
      <div style={{
        marginTop: 10, paddingTop: 8,
        borderTop: `1px solid ${P.rule}`,
        display: "flex", justifyContent: "space-between",
        fontFamily: mono, fontSize: 9.5, color: P.subtle,
        letterSpacing: "0.18em", textTransform: "uppercase",
      }}>
        <span>本期编辑 · 你</span>
        <span>盘 · 私人财讯 · 仅供本人参阅</span>
        <span>下期 · 明日 09:30</span>
      </div>
    </div>
  );
}

function SectionHeader({ kicker, title, right, serif, mono, P }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "baseline" }}>
        <div style={{ fontFamily: mono, fontSize: 10.5,
          color: P.warm, letterSpacing: "0.2em",
          textTransform: "uppercase" }}>
          {kicker}
        </div>
        {right}
      </div>
      <div style={{
        fontFamily: serif, fontSize: 24, color: P.text,
        marginTop: 2, paddingBottom: 8,
        borderBottom: `1px solid ${P.text}`,
        letterSpacing: "-0.005em",
      }}>{title}</div>
    </div>
  );
}

function Field({ label, value, color, P, mono }) {
  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 9.5,
        color: P.subtle, letterSpacing: "0.16em",
        textTransform: "uppercase", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, color: color || P.text }}>
        {value}
      </div>
    </div>
  );
}

window.VariationC = VariationC;
