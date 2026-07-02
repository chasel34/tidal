// Calm Mobile — add/edit bottom sheets (watch + holding). Uses filterUniverse from calm/ui.jsx.
const { useState: useStateMS } = React;

// ---------- Add to watchlist ----------
function MAddWatchSheet({ P, store, onClose }) {
  const [q, setQ] = useStateMS("");
  const results = filterUniverse(q);
  return (
    <MBottomSheet P={P} title="添加自选" onClose={onClose}>
      <MSearch P={P} value={q} onChange={setQ} placeholder="搜索 名称 / 代码 / 板块" autoFocus />
      <div style={{ marginTop: 12 }}>
        {results.length === 0 && (
          <div style={{ color: P.muted, fontSize: 14, padding: "26px 4px",
            textAlign: "center" }}>没有找到匹配的标的</div>
        )}
        {results.map(inst => {
          const has = store.watch.includes(inst.code);
          const c = cMove(inst.todayPct, P.isDark ? "dark" : "light");
          return (
            <div key={inst.code} style={{ display: "flex", alignItems: "center",
              gap: 12, padding: "13px 2px", borderBottom: `1px solid ${P.lineSoft}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, color: P.text, whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis" }}>{inst.name}</div>
                <div style={{ fontSize: 11.5, color: P.subtle, marginTop: 2,
                  letterSpacing: "0.03em" }}>{inst.code} · {inst.sector}</div>
              </div>
              <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                <div style={{ fontSize: 14, color: P.text }}>¥{cFmtNum(inst.price)}</div>
                <div style={{ fontSize: 12, color: c }}>{cFmtPct(inst.todayPct)}</div>
              </div>
              {has ? (
                <button onClick={() => store.removeWatch(inst.code)} style={{
                  background: P.chipBg, border: "none", color: P.muted, borderRadius: 999,
                  padding: "7px 13px", fontSize: 12.5, cursor: "pointer",
                  fontFamily: "inherit", whiteSpace: "nowrap" }}>已添加</button>
              ) : (
                <button onClick={() => store.addWatch(inst.code)} style={{
                  background: P.accent, border: "none", color: "#fff", borderRadius: 999,
                  padding: "7px 14px", fontSize: 12.5, cursor: "pointer",
                  fontFamily: "inherit", whiteSpace: "nowrap" }}>＋ 加入</button>
              )}
            </div>
          );
        })}
      </div>
    </MBottomSheet>
  );
}

// ---------- Add / edit holding ----------
function MHoldingSheet({ P, store, onClose, editCode }) {
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
  const unit = inst && inst.type === "股票" ? "股" : "份";

  const inputStyle = { width: "100%", boxSizing: "border-box",
    background: P.isDark ? "#16161a" : "#f4f2ec", border: `1px solid ${P.line}`,
    borderRadius: 12, padding: "13px 14px", fontSize: 17, color: P.text,
    fontFamily: "inherit", outline: "none", fontVariantNumeric: "tabular-nums" };

  return (
    <MBottomSheet P={P} title={editing ? "编辑持仓" : "添加持仓"} onClose={onClose}>
      {!picked ? (
        <>
          <MSearch P={P} value={q} onChange={setQ} placeholder="搜索要买入的标的" autoFocus />
          <div style={{ marginTop: 12 }}>
            {results.map(i2 => {
              const c = cMove(i2.todayPct, P.isDark ? "dark" : "light");
              return (
                <div key={i2.code} onClick={() => pick(i2.code)} style={{ display: "flex",
                  alignItems: "center", gap: 12, padding: "13px 2px",
                  borderBottom: `1px solid ${P.lineSoft}`, cursor: "pointer" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: P.text }}>{i2.name}</div>
                    <div style={{ fontSize: 11.5, color: P.subtle, marginTop: 2 }}>
                      {i2.code} · {i2.sector}</div>
                  </div>
                  <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    <div style={{ fontSize: 14, color: P.text }}>¥{cFmtNum(i2.price)}</div>
                    <div style={{ fontSize: 12, color: c }}>{cFmtPct(i2.todayPct)}</div>
                  </div>
                  <span style={{ color: P.subtle, fontSize: 18 }}>›</span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", padding: "2px 0 16px" }}>
            <div>
              <div style={{ fontSize: 17, color: P.text }}>{inst.name}</div>
              <div style={{ fontSize: 12.5, color: P.subtle, marginTop: 3 }}>
                {inst.code} · {inst.type} · 现价 ¥{cFmtNum(inst.price)}</div>
            </div>
            {!editing && (
              <button onClick={() => setPicked(null)} style={{ background: P.chipBg,
                border: "none", color: P.muted, borderRadius: 999, padding: "7px 13px",
                fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>换标的</button>
            )}
          </div>
          <label style={{ fontSize: 13, color: P.muted, display: "block", marginBottom: 7 }}>
            持仓数量（{unit}）</label>
          <input value={shares} onChange={e => setShares(e.target.value.replace(/[^0-9.]/g, ""))}
            style={inputStyle} placeholder="0" inputMode="decimal" />
          <label style={{ fontSize: 13, color: P.muted, display: "block",
            margin: "16px 0 7px" }}>成本价（¥）</label>
          <input value={cost} onChange={e => setCost(e.target.value.replace(/[^0-9.]/g, ""))}
            style={inputStyle} placeholder="0.00" inputMode="decimal" />

          {Number(shares) > 0 && Number(cost) > 0 && (
            <div style={{ marginTop: 16, padding: "13px 15px",
              background: P.isDark ? "#16161a" : "#f4f2ec", borderRadius: 12,
              display: "flex", justifyContent: "space-between", fontSize: 14,
              fontVariantNumeric: "tabular-nums" }}>
              <span style={{ color: P.muted }}>预计市值</span>
              <span style={{ color: P.text }}>
                {cFmtMoney(Number(shares) * inst.price, { dec: 0 })}
                <span style={{ color: cMove(inst.price - Number(cost), P.isDark ? "dark" : "light"),
                  marginLeft: 10 }}>
                  {cFmtPct(((inst.price - Number(cost)) / Number(cost)) * 100)}</span>
              </span>
            </div>
          )}

          <button onClick={save} disabled={!canSave} style={{ width: "100%",
            marginTop: 20, background: P.accent, color: "#fff", border: "none",
            borderRadius: 14, padding: "15px", fontSize: 16, cursor: canSave ? "pointer" : "not-allowed",
            fontFamily: "inherit", opacity: canSave ? 1 : 0.45 }}>
            {editing ? "保存修改" : "添加持仓"}</button>
          {editing && (
            <button onClick={() => { store.removeHolding(picked); onClose(); }} style={{
              width: "100%", marginTop: 10, background: "transparent",
              color: cMove(1, P.isDark ? "dark" : "light"), border: `1px solid ${P.line}`,
              borderRadius: 14, padding: "13px", fontSize: 14, cursor: "pointer",
              fontFamily: "inherit" }}>删除持仓</button>
          )}
        </>
      )}
    </MBottomSheet>
  );
}

Object.assign(window, { MAddWatchSheet, MHoldingSheet });
