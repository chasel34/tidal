// Calm Mobile — Watch list with swipe-to-delete.
const { useState: useStateMW, useRef: useRefMW } = React;

function MWatchRow({ w, store, P }) {
  const c = cMove(w.todayPct, store.theme);
  const [dx, setDx] = useStateMW(0);       // current translate
  const [open, setOpen] = useStateMW(false); // revealed delete
  const start = useRefMW(null);
  const moved = useRefMW(false);

  const REVEAL = 76;
  const onTouchStart = e => { start.current = e.touches[0].clientX; moved.current = false; };
  const onTouchMove = e => {
    if (start.current == null) return;
    let d = e.touches[0].clientX - start.current + (open ? -REVEAL : 0);
    if (Math.abs(d) > 6) moved.current = true;
    d = Math.min(0, Math.max(-REVEAL - 24, d));
    setDx(d);
  };
  const onTouchEnd = () => {
    const shouldOpen = dx < -REVEAL / 2;
    setOpen(shouldOpen);
    setDx(shouldOpen ? -REVEAL : 0);
    start.current = null;
  };

  return (
    <div style={{ position: "relative", borderRadius: "var(--m-radius, 16px)",
      overflow: "hidden" }}>
      {/* delete action behind */}
      <button onClick={() => store.removeWatch(w.code)} style={{ position: "absolute",
        top: 0, right: 0, bottom: 0, width: REVEAL, border: "none",
        background: cMove(1, store.theme), color: "#fff", fontSize: 13,
        cursor: "pointer", fontFamily: "inherit" }}>移除</button>
      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ position: "relative", background: P.panel,
          border: `1px solid ${P.line}`, borderRadius: "var(--m-radius, 16px)",
          padding: "14px 15px", display: "flex", alignItems: "center", gap: 12,
          transform: `translateX(${dx}px)`,
          transition: start.current == null ? "transform .22s cubic-bezier(.32,.72,0,1)" : "none",
          touchAction: "pan-y", WebkitTapHighlightColor: "transparent" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, color: P.text, whiteSpace: "nowrap",
            overflow: "hidden", textOverflow: "ellipsis" }}>{w.name}</div>
          <div style={{ fontSize: 11.5, color: P.subtle, marginTop: 3,
            letterSpacing: "0.03em" }}>{w.code} · {w.market} · {w.type}</div>
        </div>
        <Spark data={w.daily.slice(-30)} color={c} width={64} height={28} />
        <div style={{ width: 78, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          <div style={{ fontSize: 15, color: P.text }}>¥{cFmtNum(w.price)}</div>
          <div style={{ fontSize: 12.5, color: c, marginTop: 2 }}>{cFmtPct(w.todayPct)}</div>
        </div>
      </div>
    </div>
  );
}

function MWatchScreen({ store, P, openSheet }) {
  const list = store.sortedWatch;
  const sortOpts = [
    { key: "today", label: "今日" },
    { key: "price", label: "现价" },
    { key: "name", label: "代码" },
  ];
  return (
    <div style={{ padding: "2px 14px 8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {sortOpts.map(o => {
            const on = store.sortW.key === o.key;
            return (
              <button key={o.key} onClick={() => store.toggleSortW(o.key)} style={{
                background: on ? P.chipBg : "transparent", color: on ? P.text : P.muted,
                border: `1px solid ${on ? "transparent" : P.line}`, borderRadius: 999,
                padding: "6px 12px", fontSize: 12.5, cursor: "pointer",
                fontFamily: "inherit" }}>
                {o.label}{on && <span style={{ fontSize: 9, marginLeft: 4 }}>
                  {store.sortW.dir === "asc" ? "▲" : "▼"}</span>}
              </button>
            );
          })}
        </div>
        <MPill P={P} variant="primary" onClick={() => openSheet({ type: "watch" })}>＋ 添加</MPill>
      </div>

      <div style={{ fontSize: 11.5, color: P.subtle, margin: "0 4px 12px" }}>
        {list.length} 只关注中 · 左滑可移除</div>

      {list.length === 0 ? (
        <MEmpty P={P} text="自选列表是空的 · 添加你想关注的标的"
          actionLabel="添加自选" onAction={() => openSheet({ type: "watch" })} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map(w => <MWatchRow key={w.code} w={w} store={store} P={P} />)}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { MWatchScreen, MWatchRow });
