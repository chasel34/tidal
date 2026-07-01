// Calm Menubar — desktop scene: wallpaper, menu bar, popover & settings orchestration.
const { useState: useStateD, useEffect: useEffectD, useRef: useRefD, useCallback: useCbD } = React;

// soft calm wallpaper per theme
function MBWallpaper({ P, isDark }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden",
      background: isDark
        ? "linear-gradient(155deg, #1b1d24 0%, #232026 45%, #2a2330 100%)"
        : "linear-gradient(155deg, #efe9df 0%, #e8e3da 45%, #e3dcef 100%)" }}>
      <div style={{ position: "absolute", width: 760, height: 760, borderRadius: "50%",
        top: "-22%", right: "-12%", filter: "blur(80px)",
        background: isDark ? "rgba(120,90,200,0.22)" : "rgba(140,120,230,0.28)" }} />
      <div style={{ position: "absolute", width: 620, height: 620, borderRadius: "50%",
        bottom: "-26%", left: "-10%", filter: "blur(90px)",
        background: isDark ? "rgba(70,120,150,0.18)" : "rgba(230,190,150,0.30)" }} />
    </div>
  );
}

// a minimal dock to sell the macOS scene
function MBDock({ isDark, onOpenApp }) {
  const tiles = [
    "linear-gradient(160deg,#5b8def,#3a5fd6)", "linear-gradient(160deg,#54c98c,#2f9d63)",
    "linear-gradient(160deg,#f0a94b,#e07a2a)", "linear-gradient(160deg,#e36a8a,#cf3f6a)",
  ];
  return (
    <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
      display: "flex", alignItems: "flex-end", gap: 10, padding: "8px 12px", borderRadius: 20,
      background: isDark ? "rgba(40,40,48,0.42)" : "rgba(255,255,255,0.42)",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.6)"}`,
      boxShadow: "0 8px 30px rgba(40,30,20,0.18)" }}>
      {tiles.map((g, i) => (
        <div key={i} style={{ width: 44, height: 44, borderRadius: 11, background: g,
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.15)" }} />
      ))}
      <div style={{ width: 1, alignSelf: "stretch", margin: "4px 2px",
        background: isDark ? "rgba(255,255,255,0.18)" : "rgba(40,30,20,0.14)" }} />
      <button onClick={onOpenApp} title="Tidal" style={{ width: 44, height: 44, borderRadius: 11,
        border: "none", cursor: "pointer", background: "#5b4fd4", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.15)" }}>
        <Icon name="Waves" size={24} color="#fff" sw={2} />
      </button>
    </div>
  );
}

function MBScene() {
  const store = useMenubarStore();
  const isDark = store.resolvedTheme === "dark";
  const P = calmPalette(store.resolvedTheme);
  const move = (v) => mbMove(v, store.resolvedTheme, store.conv);

  const [popoverOpen, setPopoverOpen] = useStateD(false);
  const [settingsOpen, setSettingsOpen] = useStateD(false);
  const [settingsPane, setSettingsPane] = useStateD(null);
  const [ocrOpen, setOcrOpen] = useStateD(false);
  const [hintSeen, setHintSeen] = useStateD(false);
  const [refreshing, setRefreshing] = useStateD(false);
  const [asOf, setAsOf] = useStateD("14:32:10");
  const [setPos, setSetPos] = useStateD({ x: 0, y: 0 });
  const drag = useRefD(null);

  const nowStr = () => {
    const d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map(n => String(n).padStart(2, "0")).join(":");
  };

  const openPopover = () => { setPopoverOpen(o => !o); setHintSeen(true); };
  const openDashboard = () => { window.open("资产看板 · Calm.html", "_blank"); };
  const openSettings = (pane) => {
    setSettingsPane(typeof pane === "string" ? pane : null);
    setSettingsOpen(true); setPopoverOpen(false);
    setSetPos({ x: 0, y: 0 });
  };
  const openImport = () => { setOcrOpen(true); setPopoverOpen(false); };
  const doRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); setAsOf(nowStr()); }, 850);
  };

  // ---- settings window dragging ----
  const onDragStart = useCbD((e) => {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: setPos.x, oy: setPos.y };
  }, [setPos]);
  useEffectD(() => {
    const mm = (e) => {
      if (!drag.current) return;
      setSetPos({ x: drag.current.ox + (e.clientX - drag.current.sx),
        y: drag.current.oy + (e.clientY - drag.current.sy) });
    };
    const mu = () => { drag.current = null; };
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", mu);
    return () => { window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", mu); };
  }, []);

  // menubar item label
  const mbLabel = store.menubarMode === "percent"
    ? cFmtPct(store.summary.todayPct)
    : store.menubarMode === "total"
      ? cFmtMoney(store.summary.totalAssets, { dec: 0 })
      : null;
  const mbLabelColor = store.menubarMode === "percent" ? move(store.summary.todayDelta) : (isDark ? "#e8e8ee" : "#222");

  const barText = isDark ? "rgba(240,240,245,0.92)" : "rgba(30,28,24,0.88)";
  const barMuted = isDark ? "rgba(240,240,245,0.6)" : "rgba(30,28,24,0.6)";

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden",
      fontFamily: "'PingFang SC', 'Inter', system-ui, sans-serif",
      userSelect: "none" }}>
      <MBWallpaper P={P} isDark={isDark} />

      {/* click-away layer for popover */}
      {popoverOpen && (
        <div onClick={() => setPopoverOpen(false)}
          style={{ position: "absolute", inset: 0, zIndex: 40 }} />
      )}

      {/* ---- menu bar ---- */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 26, zIndex: 60,
        display: "flex", alignItems: "center", gap: 18, padding: "0 12px",
        fontSize: 13, color: barText,
        background: isDark ? "rgba(20,20,24,0.55)" : "rgba(255,255,255,0.55)",
        backdropFilter: "blur(22px) saturate(1.4)", WebkitBackdropFilter: "blur(22px) saturate(1.4)",
        borderBottom: `0.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(40,30,20,0.08)"}` }}>
        <span style={{ fontSize: 15 }}></span>
        <span style={{ fontWeight: 600 }}>Tidal</span>
        {["文件", "编辑", "视图", "窗口", "帮助"].map(m => (
          <span key={m} style={{ color: barMuted, fontSize: 12.5 }}>{m}</span>
        ))}
        <span style={{ flex: 1 }} />
        <span style={{ display: "flex", color: barMuted }}>
          <Icon name="Search" size={15} color={barMuted} /></span>
        <span style={{ display: "flex", color: barMuted }}>
          <Icon name="LayoutGrid" size={15} color={barMuted} /></span>

        {/* ---- our app menubar item + popover anchor ---- */}
        <div style={{ position: "relative" }}>
          <button onClick={openPopover} style={{
            display: "flex", alignItems: "center", gap: 6, height: 22, padding: "0 8px",
            borderRadius: 6, border: "none", cursor: "pointer", font: "inherit",
            fontVariantNumeric: "tabular-nums",
            background: popoverOpen ? (isDark ? "rgba(255,255,255,0.16)" : "rgba(40,30,20,0.1)") : "transparent",
            color: barText }}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="Waves" size={15} color={barText} sw={2.2} /></span>
            {mbLabel && <span style={{ fontSize: 12.5, color: mbLabelColor }}>{mbLabel}</span>}
          </button>

          {/* hint bubble */}
          {!hintSeen && !popoverOpen && !settingsOpen && (
            <div style={{ position: "absolute", top: 30, right: 0, whiteSpace: "nowrap",
              background: P.accent, color: "#fff", fontSize: 11.5, padding: "5px 10px",
              borderRadius: 8, boxShadow: "0 6px 20px rgba(91,79,212,0.4)",
              animation: "mbbob 1.6s ease-in-out infinite" }}>
              点击查看弹窗
              <span style={{ position: "absolute", top: -4, right: 16, width: 8, height: 8,
                background: P.accent, transform: "rotate(45deg)" }} />
            </div>
          )}

          {/* popover */}
          {popoverOpen && (
            <div style={{ position: "absolute", top: 32, right: -4, zIndex: 50 }}>
              <div style={{ position: "absolute", top: -6, right: 18, width: 12, height: 12,
                background: isDark ? "rgba(29,29,33,0.96)" : "rgba(255,255,255,0.97)",
                transform: "rotate(45deg)",
                borderLeft: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(40,30,20,0.08)"}`,
                borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(40,30,20,0.08)"}` }} />
              <MBPopover store={store} P={P} asOf={asOf}
                onOpenSettings={openSettings} onOpenDashboard={openDashboard}
                onOpenImport={openImport}
                onRefresh={doRefresh} refreshing={refreshing} />
            </div>
          )}
        </div>

        <span style={{ color: barText, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
          周四 14:32</span>
      </div>

      {/* ---- dock ---- */}
      <MBDock isDark={isDark} onOpenApp={openDashboard} />

      {/* ---- settings window ---- */}      {settingsOpen && (
        <div style={{ position: "absolute", inset: 0, zIndex: 70,
          display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 26 }}>
          <div style={{ marginLeft: setPos.x, marginTop: setPos.y }}>
            <MBSettingsWindow store={store} P={P} initialPane={settingsPane}
              onClose={() => setSettingsOpen(false)} onDragStart={onDragStart} />
          </div>
        </div>
      )}

      {/* ---- OCR import modal ---- */}
      {ocrOpen && (
        <MBOcrImportModal store={store} P={P} modal={{ target: "holding" }}
          onClose={() => setOcrOpen(false)}
          onOpenSettings={() => { setOcrOpen(false); openSettings("ai"); }} />
      )}
    </div>
  );
}

window.MBScene = MBScene;
