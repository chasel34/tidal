// Calm Mobile — UI primitives: header, bottom sheet, segmented, cards, tab bar.
const { useState: useStateMU, useEffect: useEffectMU, useRef: useRefMU } = React;

// ---------- Sticky screen header ----------
function MHeader({ P, title, sub, onBack, right, large }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20,
      background: P.bg + "f2", backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: `1px solid ${large ? "transparent" : P.lineSoft}`,
      paddingTop: "max(10px, env(safe-area-inset-top))" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6,
        padding: large ? "4px 18px 6px" : "8px 14px", minHeight: 44 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "transparent", border: "none",
            color: P.accent, fontSize: 24, lineHeight: 1, cursor: "pointer",
            padding: "4px 8px 4px 0", marginLeft: -2, fontFamily: "inherit" }}>‹</button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!large && (
            <div style={{ fontSize: 16, color: P.text, fontWeight: 500,
              textAlign: onBack ? "center" : "left", whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis",
              marginRight: onBack && !right ? 30 : 0 }}>{title}</div>
          )}
        </div>
        {right}
      </div>
      {large && (
        <div style={{ padding: "0 18px 10px" }}>
          {sub && <div style={{ fontSize: 12.5, color: P.muted, marginBottom: 3 }}>{sub}</div>}
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em",
            color: P.text }}>{title}</div>
        </div>
      )}
    </div>
  );
}

// ---------- Card ----------
function MCard({ P, children, style, onClick, pad = 16 }) {
  return (
    <div onClick={onClick} style={{ background: P.panel, border: `1px solid ${P.line}`,
      borderRadius: "var(--m-radius, 16px)", padding: pad,
      cursor: onClick ? "pointer" : "default",
      WebkitTapHighlightColor: "transparent", ...style }}>{children}</div>
  );
}

// ---------- Section label ----------
function MSection({ P, children, action, onAction, style }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between",
      alignItems: "baseline", margin: "0 4px 9px", ...style }}>
      <span style={{ fontSize: 13, color: P.muted, fontWeight: 500 }}>{children}</span>
      {action && (
        <button onClick={onAction} style={{ background: "transparent", border: "none",
          color: P.subtle, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
          padding: 0 }}>{action}</button>
      )}
    </div>
  );
}

// ---------- Stat ----------
function MStat({ P, label, value, color, sub }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.04em",
        marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, color: color || P.text,
        fontVariantNumeric: "tabular-nums" }}>
        {value}
        {sub && <span style={{ fontSize: 12, marginLeft: 5, opacity: 0.85 }}>{sub}</span>}
      </div>
    </div>
  );
}

// ---------- Segmented control (period chips) ----------
function MSegmented({ P, options, value, onChange, size = "md" }) {
  const sm = size === "sm";
  return (
    <div style={{ display: "inline-flex", background: P.chipBg, borderRadius: 999,
      padding: 3, gap: 2 }}>
      {options.map(o => {
        const active = o === value;
        return (
          <button key={o} onClick={() => onChange(o)} style={{
            background: active ? P.panel : "transparent",
            color: active ? P.text : P.muted, border: "none",
            padding: sm ? "5px 11px" : "6px 14px", borderRadius: 999,
            fontSize: sm ? 11.5 : 12.5, cursor: "pointer", fontFamily: "inherit",
            fontVariantNumeric: "tabular-nums",
            boxShadow: active ? (P.isDark ? "none" : "0 1px 3px rgba(40,30,20,0.10)") : "none",
            transition: "background .15s, color .15s" }}>{o}</button>
        );
      })}
    </div>
  );
}

// ---------- Pill button ----------
function MPill({ P, children, onClick, variant }) {
  const primary = variant === "primary";
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: primary ? P.accent : "transparent",
      color: primary ? "#fff" : P.text,
      border: primary ? "none" : `1px solid ${P.line}`,
      borderRadius: 999, padding: "8px 15px", fontSize: 13,
      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
      WebkitTapHighlightColor: "transparent" }}>{children}</button>
  );
}

// ---------- Bottom sheet ----------
function MBottomSheet({ P, title, onClose, children, height }) {
  const [shown, setShown] = useStateMU(false);
  useEffectMU(() => { requestAnimationFrame(() => setShown(true)); }, []);
  const close = () => { setShown(false); setTimeout(onClose, 240); };

  // drag-to-dismiss on the grabber
  const startY = useRefMU(null);
  const [dragY, setDragY] = useStateMU(0);
  const onTouchStart = e => { startY.current = e.touches[0].clientY; };
  const onTouchMove = e => {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (dragY > 90) close(); else setDragY(0);
    startY.current = null;
  };

  return (
    <div onClick={close} style={{ position: "absolute", inset: 0, zIndex: 200,
      background: shown ? P.overlay : "rgba(0,0,0,0)", transition: "background .24s",
      display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: P.panel, borderTopLeftRadius: 22, borderTopRightRadius: 22,
        borderTop: `1px solid ${P.line}`,
        boxShadow: P.isDark ? "0 -16px 50px rgba(0,0,0,0.5)" : "0 -16px 50px rgba(40,30,20,0.16)",
        maxHeight: height || "86%", display: "flex", flexDirection: "column",
        transform: shown ? `translateY(${dragY}px)` : "translateY(100%)",
        transition: dragY ? "none" : "transform .26s cubic-bezier(.32,.72,0,1)" }}>
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          style={{ padding: "10px 0 4px", cursor: "grab", touchAction: "none" }}>
          <div style={{ width: 38, height: 5, borderRadius: 3, background: P.line,
            margin: "0 auto" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: "8px 18px 12px" }}>
          <div style={{ fontSize: 16, color: P.text, fontWeight: 500 }}>{title}</div>
          <button onClick={close} style={{ background: P.chipBg, border: "none",
            color: P.muted, width: 28, height: 28, borderRadius: 999, fontSize: 15,
            cursor: "pointer", lineHeight: 1, fontFamily: "inherit" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", padding: "0 18px calc(20px + env(safe-area-inset-bottom))",
          WebkitOverflowScrolling: "touch" }}>{children}</div>
      </div>
    </div>
  );
}

// ---------- Search field ----------
function MSearch({ P, value, onChange, placeholder, autoFocus }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8,
      background: P.isDark ? "#16161a" : "#f4f2ec", borderRadius: 12,
      padding: "0 13px" }}>
      <span style={{ color: P.subtle, fontSize: 15 }}>⌕</span>
      <input autoFocus={autoFocus} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={{ flex: 1, background: "transparent",
          border: "none", padding: "12px 0", fontSize: 15, color: P.text,
          outline: "none", fontFamily: "inherit" }} />
      {value && <button onClick={() => onChange("")} style={{ background: "transparent",
        border: "none", color: P.subtle, cursor: "pointer", fontSize: 14 }}>✕</button>}
    </div>
  );
}

// ---------- Bottom tab bar ----------
function MTabBar({ P, tabs, active, onChange }) {
  return (
    <nav style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 30,
      background: P.bg + "f2", backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)", borderTop: `1px solid ${P.line}`,
      display: "flex", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {tabs.map(t => {
        const on = t.id === active;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            flex: 1, background: "transparent", border: "none", cursor: "pointer",
            padding: "9px 0 8px", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3, fontFamily: "inherit",
            color: on ? P.accent : P.subtle, WebkitTapHighlightColor: "transparent" }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{t.icon}</span>
            <span style={{ fontSize: 10.5, fontWeight: on ? 600 : 400 }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ---------- Theme toggle (small) ----------
function MThemeToggle({ P, theme, setTheme }) {
  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      style={{ background: P.chipBg, border: "none", color: P.muted,
        width: 34, height: 34, borderRadius: 999, cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 15, padding: 0, fontFamily: "inherit" }}>
      {theme === "dark" ? "☾" : "☀"}</button>
  );
}

// ---------- Empty state ----------
function MEmpty({ P, text, actionLabel, onAction }) {
  return (
    <div style={{ background: P.panel, border: `1px dashed ${P.line}`,
      borderRadius: 16, padding: "44px 20px", textAlign: "center" }}>
      <div style={{ color: P.muted, fontSize: 14, marginBottom: 16 }}>{text}</div>
      <MPill P={P} variant="primary" onClick={onAction}>＋ {actionLabel}</MPill>
    </div>
  );
}

Object.assign(window, {
  MHeader, MCard, MSection, MStat, MSegmented, MPill, MBottomSheet,
  MSearch, MTabBar, MThemeToggle, MEmpty,
});
