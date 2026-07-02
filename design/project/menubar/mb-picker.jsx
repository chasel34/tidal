// Calm Menubar — search-based add/buy picker (mirrors web/mobile add flows).
const { useState: useStatePk } = React;

function mbFilterUniverse(q) {
  const all = Object.values(window.CALM.instruments);
  if (!q.trim()) return all;
  const s = q.trim().toLowerCase();
  return all.filter(i => i.code.includes(s) || i.name.toLowerCase().includes(s) ||
    (i.sector && i.sector.toLowerCase().includes(s)));
}

function mbInputStyle(P) {
  return { width: "100%", boxSizing: "border-box",
    background: P.isDark ? "#16161a" : "#faf9f5",
    border: `1px solid ${P.line}`, borderRadius: 9, padding: "10px 12px",
    fontSize: 14, color: P.text, fontFamily: "inherit", outline: "none",
    fontVariantNumeric: "tabular-nums" };
}
function mbBtn(P, variant) {
  const base = { padding: "8px 16px", borderRadius: 9, fontSize: 13, cursor: "pointer",
    fontFamily: "inherit", border: "none", whiteSpace: "nowrap" };
  if (variant === "primary") return { ...base, background: P.accent, color: "#fff" };
  if (variant === "danger") return { ...base, background: "transparent",
    color: P.isDark ? "#ff5d5d" : "#d6342f", border: `1px solid ${P.line}` };
  return { ...base, background: "transparent", color: P.text, border: `1px solid ${P.line}` };
}

function MBSearchField({ P, value, onChange, placeholder, autoFocus }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8,
      background: P.isDark ? "#16161a" : "#faf9f5",
      border: `1px solid ${P.line}`, borderRadius: 10, padding: "0 12px" }}>
      <Icon name="Search" size={15} color={P.subtle} />
      <input autoFocus={autoFocus} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={{ flex: 1, background: "transparent",
          border: "none", padding: "11px 0", fontSize: 14, color: P.text,
          outline: "none", fontFamily: "inherit" }} />
      {value && <button onClick={() => onChange("")} style={{ background: "transparent",
        border: "none", color: P.subtle, cursor: "pointer", display: "flex" }}>
        <Icon name="X" size={14} color={P.subtle} /></button>}
    </div>
  );
}

// modal: { mode: 'watch' | 'buy' | 'edit', code? }
function MBPickerModal({ store, P, modal, onClose }) {
  const D = window.CALM;
  const move = (v) => mbMove(v, P.isDark ? "dark" : "light", store.conv);
  const editing = modal.mode === "edit";
  const existing = editing ? store.holdingsFull.find(h => h.code === modal.code) : null;

  const [q, setQ] = useStatePk("");
  const [picked, setPicked] = useStatePk(editing ? modal.code : null);
  const [shares, setShares] = useStatePk(existing ? String(existing.shares) : "");
  const [cost, setCost] = useStatePk(existing ? String(existing.cost) : "");

  const isWatch = modal.mode === "watch";
  const inst = picked ? D.instruments[picked] : null;
  const results = mbFilterUniverse(q);

  React.useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pickForBuy = (code) => {
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

  const title = isWatch ? "添加自选" : editing ? "编辑持仓" : "买入标的";
  const showForm = !isWatch && picked;

  return (
    <div onMouseDown={onClose} style={{ position: "absolute", inset: 0, zIndex: 20,
      background: P.isDark ? "rgba(0,0,0,0.5)" : "rgba(30,28,24,0.32)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(2px)" }}>
      <div onMouseDown={e => e.stopPropagation()} style={{ width: 440, maxWidth: "88%",
        maxHeight: "84%", display: "flex", flexDirection: "column",
        background: P.panel, border: `1px solid ${P.line}`, borderRadius: 14,
        overflow: "hidden", boxShadow: P.isDark
          ? "0 24px 70px rgba(0,0,0,0.6)" : "0 24px 70px rgba(40,30,20,0.22)" }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "13px 16px", borderBottom: `1px solid ${P.lineSoft}` }}>
          <span style={{ fontSize: 14.5, color: P.text, fontWeight: 500 }}>{title}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none",
            cursor: "pointer", color: P.muted, display: "flex", padding: 2 }}>
            <Icon name="X" size={17} color={P.muted} /></button>
        </div>

        <div style={{ padding: 16, overflowY: "auto" }}>
          {!showForm ? (
            <>
              <MBSearchField P={P} value={q} onChange={setQ} autoFocus
                placeholder={isWatch ? "搜索 名称 / 代码 / 板块" : "搜索要买入的标的"} />
              <div style={{ marginTop: 12, margin: "12px -6px 0" }}>
                {results.length === 0 && (
                  <div style={{ color: P.muted, fontSize: 13, padding: "24px 6px",
                    textAlign: "center" }}>没有找到匹配的标的</div>
                )}
                {results.map(i2 => {
                  const has = isWatch && store.watch.includes(i2.code);
                  return (
                    <div key={i2.code}
                      onClick={isWatch ? undefined : () => pickForBuy(i2.code)}
                      style={{ display: "grid",
                        gridTemplateColumns: "1fr 78px 64px 70px", gap: 8, alignItems: "center",
                        padding: "9px 6px", borderBottom: `1px solid ${P.lineSoft}`,
                        cursor: isWatch ? "default" : "pointer",
                        fontVariantNumeric: "tabular-nums", borderRadius: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, color: P.text }}>{i2.name}</div>
                        <div style={{ fontSize: 11, color: P.subtle, marginTop: 1,
                          letterSpacing: "0.03em" }}>{i2.code} · {i2.sector}</div>
                      </div>
                      <div style={{ textAlign: "right", color: P.text, fontSize: 13 }}>
                        ¥{cFmtNum(i2.price)}</div>
                      <div style={{ textAlign: "right", color: move(i2.todayPct), fontSize: 12.5 }}>
                        {cFmtPct(i2.todayPct)}</div>
                      <div style={{ textAlign: "right" }}>
                        {isWatch ? (has ? (
                          <button onClick={() => store.removeWatch(i2.code)}
                            style={{ ...mbBtn(P), padding: "5px 10px", fontSize: 12, color: P.muted }}>
                            移除</button>
                        ) : (
                          <button onClick={() => store.addWatch(i2.code)}
                            style={{ ...mbBtn(P, "primary"), padding: "5px 12px", fontSize: 12 }}>
                            加入</button>
                        )) : (
                          <span style={{ color: P.subtle, display: "inline-flex" }}>
                            <Icon name="ChevronRight" size={16} color={P.subtle} /></span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "center", paddingBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, color: P.text }}>{inst.name}</div>
                  <div style={{ fontSize: 12, color: P.subtle, marginTop: 2 }}>
                    {inst.code} · {inst.type} · 现价 ¥{cFmtNum(inst.price)}</div>
                </div>
                {!editing && (
                  <button onClick={() => setPicked(null)} style={{ ...mbBtn(P),
                    padding: "6px 12px", fontSize: 12 }}>换标的</button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: P.muted, display: "block",
                    marginBottom: 6 }}>持仓数量（{inst.type === "股票" ? "股" : "份"}）</label>
                  <input value={shares} inputMode="decimal" placeholder="0"
                    onChange={e => setShares(e.target.value.replace(/[^0-9.]/g, ""))}
                    style={mbInputStyle(P)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: P.muted, display: "block",
                    marginBottom: 6 }}>成本价（¥）</label>
                  <input value={cost} inputMode="decimal" placeholder="0.00"
                    onChange={e => setCost(e.target.value.replace(/[^0-9.]/g, ""))}
                    style={mbInputStyle(P)} />
                </div>
              </div>
              {Number(shares) > 0 && Number(cost) > 0 && (
                <div style={{ marginTop: 14, padding: "12px 14px",
                  background: P.isDark ? "#16161a" : "#faf9f5", borderRadius: 10,
                  display: "flex", justifyContent: "space-between", fontSize: 13,
                  fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ color: P.muted }}>预计市值</span>
                  <span style={{ color: P.text }}>
                    {cFmtMoney(Number(shares) * inst.price, { dec: 0 })}
                    <span style={{ color: move(inst.price - Number(cost)), marginLeft: 10 }}>
                      {cFmtPct(((inst.price - Number(cost)) / Number(cost)) * 100)}</span>
                  </span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
                {editing ? (
                  <button onClick={() => { store.removeHolding(picked); onClose(); }}
                    style={mbBtn(P, "danger")}>删除持仓</button>
                ) : <span />}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={onClose} style={mbBtn(P)}>取消</button>
                  <button onClick={save} disabled={!canSave} style={{ ...mbBtn(P, "primary"),
                    opacity: canSave ? 1 : 0.45, cursor: canSave ? "pointer" : "not-allowed" }}>
                    {editing ? "保存" : "确认买入"}</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* footer for watch mode */}
        {isWatch && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10,
            padding: "11px 16px", borderTop: `1px solid ${P.lineSoft}` }}>
            <button onClick={onClose} style={mbBtn(P, "primary")}>完成</button>
          </div>
        )}
      </div>
    </div>
  );
}

window.MBPickerModal = MBPickerModal;
