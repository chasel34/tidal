// Calm Mobile — UI primitives: theme bundle, status bar, tab bar, bottom sheet, segmented.
const { useState: useStateMU, useEffect: useEffectMU, useRef: useRefMU } = React;

// ---------- theme bundle: palette + accent/colorway/radius overrides ----------
function hexToRgba(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function makeT(theme, tw) {
  const P = { ...calmPalette(theme) };
  const accent = tw.accent || P.accent;
  P.accent = accent;
  P.accentSoft = hexToRgba(accent, theme === "dark" ? 0.18 : 0.12);
  const upRed = tw.colorway !== "greenUp"; // 中式 涨红 default
  const move = (v) => {
    if (v === 0) return P.muted;
    const useRed = (v > 0) === upRed;
    return useRed ? (theme === "dark" ? "#ff5d5d" : "#d6342f")
                  : (theme === "dark" ? "#37c98c" : "#0f9d63");
  };
  const rad = tw.radius != null ? tw.radius : 18;
  return { P, theme, move, rad, accent, isDark: P.isDark };
}

// ---------- status bar (faux iOS) ----------
function MStatusBar({ T }) {
  const P = T.P;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 22px 2px", fontSize: 14, fontWeight: 600, color: P.text,
      fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
      <span style={{ letterSpacing: "0.02em" }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* signal */}
        <svg width="18" height="11" viewBox="0 0 18 11" fill={P.text}>
          <rect x="0" y="7" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="6" rx="1" />
          <rect x="10" y="2.5" width="3" height="8.5" rx="1" /><rect x="15" y="0" width="3" height="11" rx="1" />
        </svg>
        {/* wifi */}
        <svg width="16" height="11" viewBox="0 0 16 12" fill={P.text}>
          <path d="M8 2.2c2.6 0 5 1 6.8 2.7l-1.3 1.4A7.6 7.6 0 0 0 8 4.1 7.6 7.6 0 0 0 2.5 6.3L1.2 4.9A9.6 9.6 0 0 1 8 2.2Z" />
          <path d="M8 6c1.5 0 2.9.6 3.9 1.6l-1.4 1.4A3.6 3.6 0 0 0 8 7.9c-.9 0-1.8.4-2.5 1.1L4.1 7.6A5.6 5.6 0 0 1 8 6Z" />
          <circle cx="8" cy="10.4" r="1.5" />
        </svg>
        {/* battery */}
        <svg width="26" height="13" viewBox="0 0 26 13">
          <rect x="0.5" y="0.5" width="22" height="12" rx="3.5" fill="none" stroke={P.text} strokeOpacity="0.4" />
          <rect x="2" y="2" width="17" height="9" rx="2" fill={P.text} />
          <rect x="24" y="4" width="1.6" height="5" rx="0.8" fill={P.text} fillOpacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

// ---------- top bar (title row, optional back / right actions) ----------
function MTopBar({ T, title, sub, onBack, right }) {
  const P = T.P;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 18px 12px",
      flexShrink: 0 }}>
      {onBack && (
        <button onClick={onBack} aria-label="返回" style={{ background: "transparent", border: "none",
          color: P.accent, fontSize: 26, lineHeight: 1, cursor: "pointer", padding: "2px 8px 2px 0",
          marginLeft: -4, display: "flex", alignItems: "center" }}>‹</button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: P.text,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: P.subtle, marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

// ---------- bottom tab bar (iOS) ----------
function MTabBar({ T, tab, setTab }) {
  const P = T.P;
  const tabs = [
    { id: "today", label: "今天", icon: (a) => (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.1 : 1.8}>
        <path d="M3 13l9-9 9 9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 11v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" strokeLinecap="round" strokeLinejoin="round" />
        {a && <rect x="9.5" y="13.5" width="5" height="6.5" rx="1" fill="currentColor" stroke="none" />}
      </svg>
    )},
    { id: "holdings", label: "持仓", icon: (a) => (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.1 : 1.8}>
        <rect x="3" y="5" width="18" height="14" rx="2.5" fill={a ? "currentColor" : "none"} />
        <path d="M3 9h18" stroke={a ? P.panel : "currentColor"} />
        <path d="M7 13h5" stroke={a ? P.panel : "currentColor"} strokeLinecap="round" />
      </svg>
    )},
    { id: "watch", label: "自选", icon: (a) => (
      <svg width="25" height="25" viewBox="0 0 24 24" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth={a ? 1.6 : 1.7}>
        <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 17l-5.2 2.6 1-5.8-4.2-4.1 5.8-.8z" strokeLinejoin="round" />
      </svg>
    )},
  ];
  return (
    <nav style={{ display: "flex", borderTop: `1px solid ${P.line}`, background: P.isDark ? "rgba(22,22,25,0.86)" : "rgba(255,255,255,0.86)",
      backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px))",
      flexShrink: 0 }}>
      {tabs.map(t => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            padding: "9px 0 7px", background: "transparent", border: "none", cursor: "pointer",
            color: active ? P.accent : P.subtle, fontFamily: "inherit" }}>
            {t.icon(active)}
            <span style={{ fontSize: 10.5, fontWeight: active ? 600 : 500, letterSpacing: "0.02em" }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ---------- bottom sheet ----------
function MSheet({ T, title, onClose, children, sub, onBack }) {
  const P = T.P;
  const [closing, setClosing] = useStateMU(false);
  const close = () => { setClosing(true); setTimeout(onClose, 220); };
  useEffectMU(() => {
    const onKey = e => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div onMouseDown={close} style={{ position: "absolute", inset: 0, zIndex: 200,
      display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: P.overlay,
        opacity: closing ? 0 : 1, transition: "opacity .22s ease", backdropFilter: "blur(2px)" }} />
      <div onMouseDown={e => e.stopPropagation()} style={{ position: "relative",
        background: P.panel, borderTopLeftRadius: 22, borderTopRightRadius: 22,
        borderTop: `1px solid ${P.line}`, maxHeight: "86%", display: "flex", flexDirection: "column",
        boxShadow: "0 -12px 50px rgba(0,0,0,0.22)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
        transform: closing ? "translateY(100%)" : "translateY(0)",
        animation: closing ? "none" : "msheet-in .26s cubic-bezier(.22,.61,.36,1)",
        transition: "transform .22s ease" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "9px 0 2px" }}>
          <div style={{ width: 38, height: 5, borderRadius: 3, background: P.line }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "6px 20px 12px", borderBottom: `1px solid ${P.lineSoft}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {onBack && (
              <button onClick={onBack} aria-label="返回" style={{ background: P.chipBg, border: "none",
                color: P.muted, width: 30, height: 30, borderRadius: 15, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>
                <svg width="9" height="15" viewBox="0 0 9 15" fill="none" stroke={P.muted}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 1 1.5 7.5 7.5 14" /></svg>
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: P.text }}>{title}</div>
              {sub && <div style={{ fontSize: 12, color: P.subtle, marginTop: 2 }}>{sub}</div>}
            </div>
          </div>
          <button onClick={close} style={{ background: P.chipBg, border: "none", color: P.muted,
            width: 30, height: 30, borderRadius: 15, fontSize: 15, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", padding: "16px 20px 8px", WebkitOverflowScrolling: "touch" }}>{children}</div>
      </div>
    </div>
  );
}

// ---------- segmented control (period picker) ----------
function MSegmented({ T, options, value, onChange, size = "md" }) {
  const P = T.P;
  const pad = size === "sm" ? "6px 0" : "8px 0";
  const fs = size === "sm" ? 12 : 13;
  return (
    <div style={{ display: "flex", background: P.chipBg, borderRadius: 11, padding: 3, gap: 2 }}>
      {options.map(o => {
        const active = o === value;
        return (
          <button key={o} onClick={() => onChange(o)} style={{ flex: 1, padding: pad,
            border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontSize: fs,
            fontWeight: active ? 600 : 500, fontVariantNumeric: "tabular-nums",
            background: active ? P.panel : "transparent",
            color: active ? P.text : P.muted,
            boxShadow: active ? (P.isDark ? "0 1px 4px rgba(0,0,0,0.4)" : "0 1px 3px rgba(40,30,20,0.12)") : "none",
            transition: "background .15s" }}>{o}</button>
        );
      })}
    </div>
  );
}

// ---------- card ----------
function MCard({ T, children, style, onClick, pad = 16 }) {
  const P = T.P;
  return (
    <div onClick={onClick} style={{ background: P.panel, border: `1px solid ${P.line}`,
      borderRadius: T.rad, padding: pad, ...(onClick ? { cursor: "pointer" } : {}), ...style }}>{children}</div>
  );
}

function MSectionLabel({ T, children, action }) {
  const P = T.P;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
      margin: "0 4px 10px", paddingTop: 4 }}>
      <span style={{ fontSize: 13, color: P.subtle, letterSpacing: "0.04em", fontWeight: 600 }}>{children}</span>
      {action}
    </div>
  );
}

function MStat({ T, label, value, color, sub }) {
  const P = T.P;
  return (
    <div>
      <div style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, color: color || P.text, fontVariantNumeric: "tabular-nums" }}>
        {value}{sub && <span style={{ fontSize: 11.5, marginLeft: 6, opacity: 0.85 }}>{sub}</span>}
      </div>
    </div>
  );
}

function MEmpty({ T, text, actionLabel, onAction }) {
  const P = T.P;
  return (
    <div style={{ background: P.panel, border: `1px dashed ${P.line}`, borderRadius: T.rad,
      padding: "48px 20px", textAlign: "center", margin: "0 16px" }}>
      <div style={{ color: P.muted, fontSize: 14, marginBottom: 18 }}>{text}</div>
      <button onClick={onAction} style={{ background: P.accent, color: "#fff", border: "none",
        borderRadius: 999, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer",
        fontFamily: "inherit" }}>＋ {actionLabel}</button>
    </div>
  );
}

Object.assign(window, {
  makeT, hexToRgba, MStatusBar, MTopBar, MTabBar, MSheet, MSegmented, MCard,
  MSectionLabel, MStat, MEmpty,
});
