// Calm Menubar — macOS-style settings controls.
const { useState: useStateC } = React;

// ---- pill toggle switch ----
function MBSwitch({ on, onChange, P }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 38, height: 23, borderRadius: 999, border: "none", padding: 0,
      cursor: "pointer", position: "relative", flexShrink: 0,
      background: on ? P.accent : (P.isDark ? "#3a3a44" : "#dcd8cf"),
      transition: "background .18s ease" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 17 : 2,
        width: 19, height: 19, borderRadius: "50%", background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.28)", transition: "left .18s ease" }} />
    </button>
  );
}

// ---- segmented control ----
function MBSegmented({ value, options, onChange, P }) {
  return (
    <div style={{ display: "inline-flex", gap: 2, padding: 2, borderRadius: 9,
      background: P.isDark ? "#19191d" : "#ece9e1" }}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer",
            font: "inherit", fontSize: 12.5, whiteSpace: "nowrap",
            color: active ? P.text : P.muted,
            background: active ? P.panel : "transparent",
            boxShadow: active ? (P.isDark ? "0 1px 2px rgba(0,0,0,0.4)" : "0 1px 2px rgba(40,30,20,0.12)") : "none",
            fontWeight: active ? 500 : 400, transition: "all .12s ease" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---- stepper / select for discrete numeric choices ----
function MBSelect({ value, options, onChange, P }) {
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select value={value} onChange={e => onChange(
          isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
        style={{ appearance: "none", WebkitAppearance: "none",
          background: P.isDark ? "#19191d" : "#f4f1ea", color: P.text,
          border: `1px solid ${P.line}`, borderRadius: 8, padding: "6px 30px 6px 12px",
          font: "inherit", fontSize: 13, cursor: "pointer", outline: "none" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ position: "absolute", right: 9, pointerEvents: "none",
        display: "flex", color: P.subtle }}>
        <Icon name="ChevronDown" size={14} color={P.subtle} />
      </span>
    </div>
  );
}

// ---- grouped inset card (System Settings list) ----
function MBCard({ children, P, style }) {
  return (
    <div style={{ background: P.panel, border: `1px solid ${P.line}`,
      borderRadius: 12, overflow: "hidden",
      boxShadow: P.isDark ? "none" : "0 1px 2px rgba(40,30,20,0.04)", ...style }}>
      {children}
    </div>
  );
}

// ---- one row inside a card: label (+sub) on left, control on right ----
function MBRow({ label, sub, children, P, last, icon, iconBg }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12,
      padding: "11px 14px",
      borderBottom: last ? "none" : `1px solid ${P.lineSoft}` }}>
      {icon && (
        <span style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0,
          background: iconBg || P.accent, color: "#fff", display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 13 }}>{icon}</span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: P.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: P.subtle, marginTop: 2,
          lineHeight: 1.4 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{children}</div>
    </div>
  );
}

// ---- section heading above a card ----
function MBGroupLabel({ children, P }) {
  return (
    <div style={{ fontSize: 11.5, color: P.subtle, letterSpacing: "0.04em",
      margin: "0 0 8px 4px", textTransform: "none" }}>{children}</div>
  );
}

// ---- sidebar row (monochrome icon + label, soft accent when active) ----
function MBSideRow({ icon, label, active, onClick, P }) {
  return (
    <button onClick={onClick} className={active ? "" : "mb-hoverable"} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%",
      padding: "7px 9px", borderRadius: 8, border: "none", cursor: "pointer",
      font: "inherit", textAlign: "left", marginBottom: 1,
      background: active ? P.accentSoft : "transparent",
      color: active ? P.accent : P.text }}>
      <span style={{ width: 18, display: "flex", justifyContent: "center",
        flexShrink: 0 }}>
        <Icon name={icon} size={16} color={active ? P.accent : P.subtle} />
      </span>
      <span style={{ fontSize: 13, fontWeight: active ? 500 : 400 }}>{label}</span>
    </button>
  );
}

Object.assign(window, { MBSwitch, MBSegmented, MBSelect, MBCard, MBRow, MBGroupLabel, MBSideRow });
