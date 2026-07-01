// Calm Mobile — 自选 (Watchlist) with swipe-to-delete rows.
const { useState: useStateMW, useRef: useRefMW } = React;

// swipeable row: drag left to reveal delete
function MSwipeRow({ T, onDelete, children }) {
  const P = T.P;
  const [dx, setDx] = useStateMW(0);
  const start = useRefMW(null);
  const moved = useRefMW(false);
  const REVEAL = 84;

  const onDown = e => { start.current = e.clientX; moved.current = false; };
  const onMove = e => {
    if (start.current == null) return;
    let d = e.clientX - start.current + (dxOpen.current ? -REVEAL : 0);
    if (Math.abs(e.clientX - start.current) > 6) moved.current = true;
    d = Math.max(-REVEAL - 20, Math.min(0, d));
    setDx(d);
  };
  const dxOpen = useRefMW(false);
  const onUp = () => {
    if (start.current == null) return;
    start.current = null;
    const open = dx < -REVEAL / 2;
    dxOpen.current = open;
    setDx(open ? -REVEAL : 0);
  };

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <button onClick={onDelete} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: REVEAL,
        background: T.move(1), color: "#fff", border: "none", fontSize: 14, fontWeight: 600,
        cursor: "pointer", fontFamily: "inherit" }}>移除</button>
      <div onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onDown(e); }}
        onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        style={{ position: "relative", background: P.panel, transform: `translateX(${dx}px)`,
          transition: start.current == null ? "transform .22s cubic-bezier(.22,.61,.36,1)" : "none",
          touchAction: "pan-y" }}>
        {children(moved)}
      </div>
    </div>
  );
}

function MWatch({ store, T, openSheet, goDetail }) {
  const P = T.P;
  const list = store.sortedWatch;
  const sortOpts = [
    { key: "today", label: "今日" }, { key: "price", label: "现价" }, { key: "name", label: "代码" },
  ];

  if (list.length === 0) {
    return <div style={{ paddingTop: 12 }}>
      <MEmpty T={T} text="自选列表是空的 · 添加想关注的标的" actionLabel="添加自选"
        onAction={() => openSheet({ type: "watch" })} />
    </div>;
  }

  return (
    <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* search trigger */}
      <button onClick={() => openSheet({ type: "watch" })} style={{ display: "flex", alignItems: "center",
        gap: 9, background: P.isDark ? "#16161a" : "#faf9f5", border: `1px solid ${P.line}`,
        borderRadius: 12, padding: "12px 14px", color: P.subtle, fontSize: 15, cursor: "pointer",
        fontFamily: "inherit", textAlign: "left" }}>
        <span style={{ fontSize: 16 }}>⌕</span> 搜索股票 / 基金代码加入自选
      </button>

      <button onClick={() => openSheet({ type: "ocr", target: "watch" })} style={{ display: "flex",
        alignItems: "center", gap: 9, background: "transparent", border: `1px dashed ${P.line}`,
        borderRadius: 12, padding: "12px 14px", color: P.muted, fontSize: 14.5, cursor: "pointer",
        fontFamily: "inherit", textAlign: "left", marginTop: -6 }}>
        <span style={{ fontSize: 16 }}>⎙</span> 截图导入自选列表
      </button>

      {/* sort chips */}
      <div style={{ display: "flex", gap: 8, padding: "0 2px" }}>
        {sortOpts.map(o => {
          const active = store.sortW.key === o.key;
          return (
            <button key={o.key} onClick={() => store.toggleSortW(o.key)} style={{ display: "flex",
              alignItems: "center", gap: 4, padding: "7px 14px", borderRadius: 999,
              border: `1px solid ${active ? "transparent" : P.line}`,
              background: active ? P.accentSoft : "transparent", color: active ? P.accent : P.muted,
              fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: active ? 600 : 500 }}>
              {o.label}{active && <span style={{ fontSize: 9 }}>{store.sortW.dir === "asc" ? "▲" : "▼"}</span>}
            </button>
          );
        })}
      </div>

      <MCard T={T} pad={0} style={{ overflow: "hidden" }}>
        {list.map((w, i) => {
          const c = T.move(w.todayPct);
          return (
            <div key={w.code} style={{ borderTop: i === 0 ? "none" : `1px solid ${P.lineSoft}` }}>
              <MSwipeRow T={T} onDelete={() => store.removeWatch(w.code)}>
                {(moved) => (
                  <div onClick={() => { if (!moved.current) goDetail(w.code); }} style={{ display: "flex",
                    alignItems: "center", gap: 12, padding: "14px 14px", cursor: "pointer",
                    fontVariantNumeric: "tabular-nums" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15.5, color: P.text, whiteSpace: "nowrap", overflow: "hidden",
                        textOverflow: "ellipsis" }}>{w.name}</div>
                      <div style={{ fontSize: 11.5, color: P.subtle, marginTop: 3, letterSpacing: "0.03em" }}>
                        {w.code} · {w.market} · {w.type}</div>
                    </div>
                    <Spark data={w.daily.slice(-30)} color={c} width={56} height={26} />
                    <div style={{ textAlign: "right", minWidth: 64 }}>
                      <div style={{ fontSize: 15, color: P.text }}>¥{cFmtNum(w.price)}</div>
                    </div>
                    <div style={{ minWidth: 62, textAlign: "right" }}>
                      <span style={{ display: "inline-block", padding: "5px 9px", borderRadius: 8,
                        background: c, color: "#fff", fontSize: 13, fontWeight: 500 }}>{cFmtPct(w.todayPct)}</span>
                    </div>
                  </div>
                )}
              </MSwipeRow>
            </div>
          );
        })}
      </MCard>
      <div style={{ fontSize: 11.5, color: P.subtle, textAlign: "center", padding: "2px 0" }}>
        ← 向左滑动单行可移除自选</div>
    </div>
  );
}

Object.assign(window, { MWatch, MSwipeRow });
