// Calm Dashboard — shared UI primitives + modals.
const { useState: useStateU } = React;

// ---------- Modal shell ----------
function Modal({ P, title, onClose, children, width = 460 }) {
  React.useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onMouseDown={onClose} style={{
      position: "absolute", inset: 0, background: P.overlay,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      paddingTop: "9vh", zIndex: 100, backdropFilter: "blur(2px)",
    }}>
      <div onMouseDown={e => e.stopPropagation()} style={{
        width, maxWidth: "90%", background: P.panel,
        border: `1px solid ${P.line}`, borderRadius: 16,
        boxShadow: P.isDark ? "0 24px 70px rgba(0,0,0,0.6)" : "0 24px 70px rgba(40,30,20,0.18)",
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: "16px 20px",
          borderBottom: `1px solid ${P.line}` }}>
          <div style={{ fontSize: 15, color: P.text, fontWeight: 500 }}>{title}</div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", color: P.muted,
            fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 4,
          }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function calmInput(P) {
  return {
    width: "100%", boxSizing: "border-box",
    background: P.isDark ? "#16161a" : "#faf9f5",
    border: `1px solid ${P.line}`, borderRadius: 9,
    padding: "10px 12px", fontSize: 14, color: P.text,
    fontFamily: "inherit", outline: "none",
    fontVariantNumeric: "tabular-nums",
  };
}
function calmBtn(P, variant) {
  const base = { padding: "9px 16px", borderRadius: 999, fontSize: 13,
    cursor: "pointer", fontFamily: "inherit", border: "none", whiteSpace: "nowrap" };
  if (variant === "primary") return { ...base, background: P.accent, color: "#fff" };
  if (variant === "danger") return { ...base, background: "transparent",
    color: cMove(-1, P.isDark ? "dark" : "light"), border: `1px solid ${P.line}` };
  return { ...base, background: "transparent", color: P.text, border: `1px solid ${P.line}` };
}

// ---------- Search field ----------
function SearchField({ P, value, onChange, placeholder, autoFocus }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8,
      background: P.isDark ? "#16161a" : "#faf9f5",
      border: `1px solid ${P.line}`, borderRadius: 10, padding: "0 12px" }}>
      <span style={{ color: P.subtle, fontSize: 14 }}>⌕</span>
      <input autoFocus={autoFocus} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ flex: 1, background: "transparent", border: "none",
          padding: "11px 0", fontSize: 14, color: P.text, outline: "none",
          fontFamily: "inherit" }} />
      {value && <button onClick={() => onChange("")} style={{
        background: "transparent", border: "none", color: P.subtle,
        cursor: "pointer", fontSize: 13 }}>✕</button>}
    </div>
  );
}

function filterUniverse(q) {
  const D = window.CALM;
  const all = Object.values(D.instruments);
  if (!q.trim()) return all;
  const s = q.trim().toLowerCase();
  return all.filter(i =>
    i.code.includes(s) || i.name.toLowerCase().includes(s) ||
    (i.sector && i.sector.toLowerCase().includes(s)));
}

// ---------- Add to watchlist modal ----------
function AddWatchModal({ P, store, onClose }) {
  const [q, setQ] = useStateU("");
  const results = filterUniverse(q);
  return (
    <Modal P={P} title="添加自选" onClose={onClose} width={480}>
      <SearchField P={P} value={q} onChange={setQ}
        placeholder="搜索 名称 / 代码 / 板块" autoFocus />
      <div style={{ marginTop: 14, maxHeight: 360, overflowY: "auto",
        margin: "14px -6px 0", padding: "0 6px" }}>
        {results.length === 0 && (
          <div style={{ color: P.muted, fontSize: 13, padding: "20px 4px",
            textAlign: "center" }}>没有找到匹配的标的</div>
        )}
        {results.map(inst => {
          const has = store.watch.includes(inst.code);
          const c = cMove(inst.todayPct, P.isDark ? "dark" : "light");
          return (
            <div key={inst.code} style={{ display: "grid",
              gridTemplateColumns: "1fr 88px 72px 72px", gap: 8,
              alignItems: "center", padding: "10px 6px",
              borderBottom: `1px solid ${P.lineSoft}`,
              fontVariantNumeric: "tabular-nums" }}>
              <div>
                <div style={{ fontSize: 14, color: P.text }}>{inst.name}</div>
                <div style={{ fontSize: 11, color: P.subtle, marginTop: 2,
                  letterSpacing: "0.04em" }}>{inst.code} · {inst.sector}</div>
              </div>
              <div style={{ textAlign: "right", color: P.text, fontSize: 13 }}>
                ¥{cFmtNum(inst.price)}</div>
              <div style={{ textAlign: "right", color: c, fontSize: 13 }}>
                {cFmtPct(inst.todayPct)}</div>
              <div style={{ textAlign: "right" }}>
                {has ? (
                  <button onClick={() => store.removeWatch(inst.code)} style={{
                    ...calmBtn(P), padding: "5px 10px", fontSize: 12, color: P.muted }}>
                    移除</button>
                ) : (
                  <button onClick={() => store.addWatch(inst.code)} style={{
                    ...calmBtn(P, "primary"), padding: "5px 12px", fontSize: 12 }}>
                    ＋ 加入</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ---------- Add / Edit holding modal ----------
function HoldingModal({ P, store, onClose, editCode }) {
  const D = window.CALM;
  const editing = !!editCode;
  const existing = editing ? store.holdings.find(h => h.code === editCode) : null;
  const [q, setQ] = useStateU("");
  const [picked, setPicked] = useStateU(editCode || null);
  const inst = picked ? D.instruments[picked] : null;
  const [shares, setShares] = useStateU(existing ? String(existing.shares) : "");
  const [cost, setCost] = useStateU(existing ? String(existing.cost) : "");

  const results = filterUniverse(q);
  const pick = (code) => {
    setPicked(code);
    if (!cost) setCost(String(D.instruments[code].price));
  };
  const canSave = picked && Number(shares) > 0 && Number(cost) > 0;
  const save = () => {
    if (!canSave) return;
    if (editing) store.updateHolding(picked, Number(shares), Number(cost));
    else store.addHolding(picked, Number(shares), Number(cost));
    onClose();
  };

  return (
    <Modal P={P} title={editing ? "编辑持仓" : "添加持仓"} onClose={onClose} width={460}>
      {!picked ? (
        <>
          <SearchField P={P} value={q} onChange={setQ}
            placeholder="搜索要买入的标的" autoFocus />
          <div style={{ marginTop: 14, maxHeight: 340, overflowY: "auto" }}>
            {results.map(i2 => {
              const c = cMove(i2.todayPct, P.isDark ? "dark" : "light");
              return (
                <div key={i2.code} onClick={() => pick(i2.code)} style={{
                  display: "grid", gridTemplateColumns: "1fr 88px 72px",
                  gap: 8, alignItems: "center", padding: "11px 6px",
                  borderBottom: `1px solid ${P.lineSoft}`, cursor: "pointer",
                  fontVariantNumeric: "tabular-nums" }}>
                  <div>
                    <div style={{ fontSize: 14, color: P.text }}>{i2.name}</div>
                    <div style={{ fontSize: 11, color: P.subtle, marginTop: 2 }}>
                      {i2.code} · {i2.sector}</div>
                  </div>
                  <div style={{ textAlign: "right", color: P.text, fontSize: 13 }}>
                    ¥{cFmtNum(i2.price)}</div>
                  <div style={{ textAlign: "right", color: c, fontSize: 13 }}>
                    {cFmtPct(i2.todayPct)}</div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", padding: "4px 0 16px" }}>
            <div>
              <div style={{ fontSize: 16, color: P.text }}>{inst.name}</div>
              <div style={{ fontSize: 12, color: P.subtle, marginTop: 2 }}>
                {inst.code} · {inst.type} · 现价 ¥{cFmtNum(inst.price)}</div>
            </div>
            {!editing && (
              <button onClick={() => setPicked(null)} style={{
                ...calmBtn(P), padding: "6px 12px", fontSize: 12 }}>换标的</button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: P.muted, display: "block",
                marginBottom: 6 }}>持仓数量（{inst.type === "股票" ? "股" : "份"}）</label>
              <input value={shares} onChange={e => setShares(e.target.value.replace(/[^0-9.]/g, ""))}
                style={calmInput(P)} placeholder="0" inputMode="decimal" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: P.muted, display: "block",
                marginBottom: 6 }}>成本价（¥）</label>
              <input value={cost} onChange={e => setCost(e.target.value.replace(/[^0-9.]/g, ""))}
                style={calmInput(P)} placeholder="0.00" inputMode="decimal" />
            </div>
          </div>
          {Number(shares) > 0 && Number(cost) > 0 && (
            <div style={{ marginTop: 14, padding: "12px 14px",
              background: P.isDark ? "#16161a" : "#faf9f5", borderRadius: 10,
              display: "flex", justifyContent: "space-between",
              fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
              <span style={{ color: P.muted }}>预计市值</span>
              <span style={{ color: P.text }}>
                {cFmtMoney(Number(shares) * inst.price, { dec: 0 })}
                <span style={{ color: cMove(inst.price - Number(cost), P.isDark ? "dark" : "light"),
                  marginLeft: 10 }}>
                  {cFmtPct(((inst.price - Number(cost)) / Number(cost)) * 100)}
                </span>
              </span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between",
            marginTop: 20 }}>
            {editing ? (
              <button onClick={() => { store.removeHolding(picked); onClose(); }}
                style={calmBtn(P, "danger")}>删除持仓</button>
            ) : <span />}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={calmBtn(P)}>取消</button>
              <button onClick={save} disabled={!canSave} style={{
                ...calmBtn(P, "primary"), opacity: canSave ? 1 : 0.45,
                cursor: canSave ? "pointer" : "not-allowed" }}>
                {editing ? "保存" : "添加"}</button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

// ---------- Donut ----------
function CalmDonut({ segments, size = 150, thickness = 16, colors, P, gap = 0.014 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - thickness / 2;
  const cx = size / 2, cy = size / 2;
  let acc = -0.25;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg, i) => {
        const frac = seg.value / total;
        const start = acc + gap / 2, end = acc + frac - gap / 2;
        acc += frac;
        if (end <= start) return null;
        const a0 = start * Math.PI * 2, a1 = end * Math.PI * 2;
        const large = end - start > 0.5 ? 1 : 0;
        return (
          <path key={i}
            d={`M ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`}
            fill="none" stroke={colors[i % colors.length]} strokeWidth={thickness}
            strokeLinecap="butt" />
        );
      })}
    </svg>
  );
}

// ---------- Sort header cell ----------
function SortTh({ label, sortKey, active, dir, onClick, align = "right", P }) {
  return (
    <button onClick={() => onClick(sortKey)} style={{
      background: "transparent", border: "none", cursor: "pointer",
      color: active ? P.text : P.subtle, fontSize: 11,
      letterSpacing: "0.08em", textTransform: "uppercase",
      fontFamily: "inherit", padding: 0, display: "flex",
      alignItems: "center", gap: 3,
      justifyContent: align === "right" ? "flex-end" : "flex-start",
      width: "100%",
    }}>
      {align === "right" && <span>{label}</span>}
      <span style={{ opacity: active ? 0.9 : 0, fontSize: 9 }}>
        {dir === "asc" ? "▲" : "▼"}</span>
      {align !== "right" && <span>{label}</span>}
    </button>
  );
}

// ---------- Theme toggle ----------
function CalmThemeToggle({ theme, setTheme, P }) {
  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title={theme === "dark" ? "切换为亮色" : "切换为暗色"}
      style={{ background: "transparent", border: `1px solid ${P.line}`,
        color: P.muted, width: 32, height: 32, borderRadius: 16,
        cursor: "pointer", display: "inline-flex", alignItems: "center",
        justifyContent: "center", fontSize: 14, padding: 0 }}>
      {theme === "dark" ? "☾" : "☀"}
    </button>
  );
}

Object.assign(window, {
  Modal, calmInput, calmBtn, SearchField, AddWatchModal, HoldingModal,
  CalmDonut, SortTh, CalmThemeToggle, filterUniverse,
});
