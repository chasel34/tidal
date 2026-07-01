// Google Drive 同步 — three surface shells. Each wraps <SyncPanel> children with chrome.

// ---------- WEB · Calm settings modal ----------
function WebShell({ P, children }) {
  return (
    <div style={{ width: 500, height: 632, maxHeight: "100%", display: "flex", flexDirection: "column",
      background: P.panel, border: `1px solid ${P.line}`, borderRadius: 16, overflow: "hidden",
      boxShadow: P.isDark ? "0 30px 90px rgba(0,0,0,0.6)" : "0 30px 90px rgba(40,30,20,0.20)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 18px",
        borderBottom: `1px solid ${P.line}`, flexShrink: 0 }}>
        <span style={{ fontSize: 15, color: P.text, fontWeight: 500 }}>设置</span>
        <Icon name="ChevronRight" size={14} color={P.subtle} />
        <span style={{ fontSize: 15, color: P.muted }}>备份与同步</span>
        <button style={{ marginLeft: "auto", background: "transparent", border: "none", color: P.muted,
          fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 4 }}>✕</button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

// ---------- MENUBAR · macOS settings window ----------
const MB_NAV = [
  { icon: "SlidersHorizontal", label: "通用" },
  { icon: "SunMoon", label: "外观" },
  { icon: "PanelTop", label: "菜单栏" },
  { icon: "Sparkles", label: "智能识别" },
  { icon: "RefreshCcw", label: "备份与同步", active: true },
  { icon: "Info", label: "关于" },
];
function MenubarShell({ P, children }) {
  return (
    <div style={{ width: 624, height: 528, maxHeight: "100%", display: "flex", overflow: "hidden",
      borderRadius: 12, border: `1px solid ${P.isDark ? "rgba(255,255,255,0.1)" : "rgba(40,30,20,0.12)"}`,
      background: P.isDark ? "#1d1d21" : "#fbfaf6",
      boxShadow: P.isDark ? "0 30px 90px rgba(0,0,0,0.65)" : "0 30px 90px rgba(40,30,20,0.30)" }}>
      {/* sidebar */}
      <div style={{ width: 184, flexShrink: 0, display: "flex", flexDirection: "column",
        background: P.isDark ? "rgba(255,255,255,0.025)" : "rgba(40,30,20,0.022)", borderRight: `1px solid ${P.lineSoft}` }}>
        <div style={{ display: "flex", gap: 8, padding: "13px 14px 10px" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map(c => (
            <span key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c, border: "0.5px solid rgba(0,0,0,0.12)" }} />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 14px 14px" }}>
          <Icon name="Waves" size={26} color={P.accent} sw={2} />
          <div>
            <div style={{ fontSize: 13.5, color: P.text, fontWeight: 500 }}>Tidal</div>
            <div style={{ fontSize: 11, color: P.subtle, marginTop: 1 }}>版本 1.0 (3)</div>
          </div>
        </div>
        <div style={{ padding: "0 10px" }}>
          {MB_NAV.map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px",
              borderRadius: 7, marginBottom: 1, background: s.active ? (P.isDark ? "rgba(185,166,255,0.16)" : "rgba(91,79,212,0.10)") : "transparent" }}>
              <Icon name={s.icon} size={15} color={s.active ? P.accent : P.muted} />
              <span style={{ fontSize: 12.5, color: s.active ? P.text : P.muted, fontWeight: s.active ? 500 : 400 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      {/* content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ padding: "15px 22px 11px", fontSize: 16, color: P.text, fontWeight: 500, flexShrink: 0 }}>备份与同步</div>
        <div style={{ flex: 1, minHeight: 0, borderTop: `1px solid ${P.lineSoft}` }}>{children}</div>
      </div>
    </div>
  );
}

// ---------- MOBILE · phone frame ----------
function MobilePhoneStatusBar({ P }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "11px 24px 3px", fontSize: 14, fontWeight: 600, color: P.text, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
      <span>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="18" height="11" viewBox="0 0 18 11" fill={P.text}>
          <rect x="0" y="7" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="6" rx="1" />
          <rect x="10" y="2.5" width="3" height="8.5" rx="1" /><rect x="15" y="0" width="3" height="11" rx="1" /></svg>
        <svg width="16" height="11" viewBox="0 0 16 12" fill={P.text}>
          <path d="M8 2.2c2.6 0 5 1 6.8 2.7l-1.3 1.4A7.6 7.6 0 0 0 8 4.1 7.6 7.6 0 0 0 2.5 6.3L1.2 4.9A9.6 9.6 0 0 1 8 2.2Z" />
          <path d="M8 6c1.5 0 2.9.6 3.9 1.6l-1.4 1.4A3.6 3.6 0 0 0 8 7.9c-.9 0-1.8.4-2.5 1.1L4.1 7.6A5.6 5.6 0 0 1 8 6Z" />
          <circle cx="8" cy="10.4" r="1.5" /></svg>
        <svg width="26" height="13" viewBox="0 0 26 13">
          <rect x="0.5" y="0.5" width="22" height="12" rx="3.5" fill="none" stroke={P.text} strokeOpacity="0.4" />
          <rect x="2" y="2" width="17" height="9" rx="2" fill={P.text} />
          <rect x="24" y="4" width="1.6" height="5" rx="0.8" fill={P.text} fillOpacity="0.4" /></svg>
      </div>
    </div>
  );
}
function MobileShell({ P, children }) {
  return (
    <div style={{ width: 384, height: "min(760px, calc(100vh - 104px))", borderRadius: 44, padding: 11,
      background: P.isDark ? "#000" : "#1a1a1f", boxShadow: "0 30px 80px rgba(0,0,0,0.4)", flexShrink: 0 }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 34, overflow: "hidden", background: P.bg,
        display: "flex", flexDirection: "column", position: "relative" }}>
        <MobilePhoneStatusBar P={P} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px 12px", flexShrink: 0 }}>
          <Icon name="ChevronLeft" size={24} color={P.accent} />
          <span style={{ fontSize: 19, fontWeight: 600, color: P.text, letterSpacing: "-0.01em" }}>备份与同步</span>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}

Object.assign(window, { WebShell, MenubarShell, MobileShell });
