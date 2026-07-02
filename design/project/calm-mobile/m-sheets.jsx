// Calm Mobile — bottom sheets: search, add watch, add/edit holding.
const { useState: useStateMS } = React;

function MSearchField({ T, value, onChange, placeholder, autoFocus }) {
  const P = T.P;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9,
      background: P.isDark ? "#16161a" : "#faf9f5", border: `1px solid ${P.line}`,
      borderRadius: 12, padding: "0 14px" }}>
      <span style={{ color: P.subtle, fontSize: 16 }}>⌕</span>
      <input autoFocus={autoFocus} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={{ flex: 1, background: "transparent", border: "none",
          padding: "13px 0", fontSize: 16, color: P.text, outline: "none", fontFamily: "inherit" }} />
      {value && <button onClick={() => onChange("")} style={{ background: "transparent", border: "none",
        color: P.subtle, cursor: "pointer", fontSize: 14 }}>✕</button>}
    </div>
  );
}

// ---------- Add to watchlist ----------
function MAddWatchSheet({ T, store, onClose }) {
  const P = T.P;
  const [q, setQ] = useStateMS("");
  const results = filterUniverse(q);
  return (
    <MSheet T={T} title="添加自选" sub="搜索名称 / 代码 / 板块" onClose={onClose}>
      <MSearchField T={T} value={q} onChange={setQ} placeholder="如 茅台 / 600519 / 白酒" autoFocus />
      <div style={{ marginTop: 12 }}>
        {results.length === 0 && (
          <div style={{ color: P.muted, fontSize: 14, padding: "28px 4px", textAlign: "center" }}>没有找到匹配的标的</div>
        )}
        {results.map(inst => {
          const has = store.watch.includes(inst.code);
          const c = T.move(inst.todayPct);
          return (
            <div key={inst.code} style={{ display: "flex", alignItems: "center", gap: 12,
              padding: "13px 4px", borderBottom: `1px solid ${P.lineSoft}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, color: P.text }}>{inst.name}</div>
                <div style={{ fontSize: 12, color: P.subtle, marginTop: 2, letterSpacing: "0.03em" }}>
                  {inst.code} · {inst.sector}</div>
              </div>
              <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                <div style={{ fontSize: 14.5, color: P.text }}>¥{cFmtNum(inst.price)}</div>
                <div style={{ fontSize: 12.5, color: c }}>{cFmtPct(inst.todayPct)}</div>
              </div>
              {has ? (
                <button onClick={() => store.removeWatch(inst.code)} style={{ flexShrink: 0,
                  background: P.chipBg, color: P.muted, border: "none", borderRadius: 999,
                  padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  minWidth: 64 }}>已添加</button>
              ) : (
                <button onClick={() => store.addWatch(inst.code)} style={{ flexShrink: 0,
                  background: P.accent, color: "#fff", border: "none", borderRadius: 999,
                  padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit", minWidth: 64 }}>＋ 关注</button>
              )}
            </div>
          );
        })}
      </div>
    </MSheet>
  );
}

// ---------- Add / edit holding ----------
function MHoldingSheet({ T, store, onClose, editCode }) {
  const P = T.P;
  const D = window.CALM;
  const editing = !!editCode;
  const existing = editing ? store.holdings.find(h => h.code === editCode) : null;
  const [q, setQ] = useStateMS("");
  const [picked, setPicked] = useStateMS(editCode || null);
  const inst = picked ? D.instruments[picked] : null;
  const [shares, setShares] = useStateMS(existing ? String(existing.shares) : "");
  const [cost, setCost] = useStateMS(existing ? String(existing.cost) : "");
  const results = filterUniverse(q);

  const pick = code => { setPicked(code); if (!cost) setCost(String(D.instruments[code].price)); };
  const canSave = picked && Number(shares) > 0 && Number(cost) > 0;
  const save = () => {
    if (!canSave) return;
    if (editing) store.updateHolding(picked, Number(shares), Number(cost));
    else store.addHolding(picked, Number(shares), Number(cost));
    onClose();
  };

  const inputStyle = { width: "100%", boxSizing: "border-box", background: P.isDark ? "#16161a" : "#faf9f5",
    border: `1px solid ${P.line}`, borderRadius: 11, padding: "13px 14px", fontSize: 17, color: P.text,
    fontFamily: "inherit", outline: "none", fontVariantNumeric: "tabular-nums" };

  return (
    <MSheet T={T} title={editing ? "编辑持仓" : "添加持仓"} onClose={onClose}>
      {!picked ? (
        <>
          <MSearchField T={T} value={q} onChange={setQ} placeholder="搜索要买入的标的" autoFocus />
          <div style={{ marginTop: 12 }}>
            {results.map(i2 => {
              const c = T.move(i2.todayPct);
              return (
                <div key={i2.code} onClick={() => pick(i2.code)} style={{ display: "flex",
                  alignItems: "center", gap: 12, padding: "13px 4px", borderBottom: `1px solid ${P.lineSoft}`,
                  cursor: "pointer" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15.5, color: P.text }}>{i2.name}</div>
                    <div style={{ fontSize: 12, color: P.subtle, marginTop: 2 }}>{i2.code} · {i2.sector}</div>
                  </div>
                  <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    <div style={{ fontSize: 14.5, color: P.text }}>¥{cFmtNum(i2.price)}</div>
                    <div style={{ fontSize: 12.5, color: c }}>{cFmtPct(i2.todayPct)}</div>
                  </div>
                  <span style={{ color: P.subtle, fontSize: 20 }}>›</span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "0 2px 18px" }}>
            <div>
              <div style={{ fontSize: 17, color: P.text }}>{inst.name}</div>
              <div style={{ fontSize: 13, color: P.subtle, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
                {inst.code} · {inst.type} · 现价 ¥{cFmtNum(inst.price)}</div>
            </div>
            {!editing && (
              <button onClick={() => setPicked(null)} style={{ background: P.chipBg, border: "none",
                color: P.muted, borderRadius: 999, padding: "8px 14px", fontSize: 13, cursor: "pointer",
                fontFamily: "inherit" }}>换标的</button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: P.muted, display: "block", marginBottom: 7 }}>
                持仓数量（{inst.type === "股票" ? "股" : "份"}）</label>
              <input value={shares} onChange={e => setShares(e.target.value.replace(/[^0-9.]/g, ""))}
                style={inputStyle} placeholder="0" inputMode="decimal" />
            </div>
            <div>
              <label style={{ fontSize: 13, color: P.muted, display: "block", marginBottom: 7 }}>成本价（¥）</label>
              <input value={cost} onChange={e => setCost(e.target.value.replace(/[^0-9.]/g, ""))}
                style={inputStyle} placeholder="0.00" inputMode="decimal" />
            </div>
          </div>
          {Number(shares) > 0 && Number(cost) > 0 && (
            <div style={{ marginTop: 14, padding: "13px 15px", background: P.isDark ? "#16161a" : "#faf9f5",
              borderRadius: 12, display: "flex", justifyContent: "space-between", fontSize: 14,
              fontVariantNumeric: "tabular-nums" }}>
              <span style={{ color: P.muted }}>预计市值</span>
              <span style={{ color: P.text }}>
                {cFmtMoney(Number(shares) * inst.price, { dec: 0 })}
                <span style={{ color: T.move(inst.price - Number(cost)), marginLeft: 10 }}>
                  {cFmtPct(((inst.price - Number(cost)) / Number(cost)) * 100)}</span>
              </span>
            </div>
          )}
          <button onClick={save} disabled={!canSave} style={{ width: "100%", marginTop: 20,
            background: P.accent, color: "#fff", border: "none", borderRadius: 14, padding: "15px",
            fontSize: 16, fontWeight: 600, fontFamily: "inherit",
            cursor: canSave ? "pointer" : "not-allowed", opacity: canSave ? 1 : 0.45 }}>
            {editing ? "保存修改" : "添加持仓"}</button>
          {editing && (
            <button onClick={() => { store.removeHolding(picked); onClose(); }} style={{ width: "100%",
              marginTop: 10, background: "transparent", color: T.move(-1), border: `1px solid ${P.line}`,
              borderRadius: 14, padding: "13px", fontSize: 14.5, fontFamily: "inherit", cursor: "pointer" }}>
              删除持仓</button>
          )}
        </>
      )}
    </MSheet>
  );
}

Object.assign(window, { MSearchField, MAddWatchSheet, MHoldingSheet });
