// Google Drive 同步 — shared visual primitives (surface-aware via tokens).

// per-surface sizing tokens
window.SYNC_TOK = {
  web:     { pad: 22, gap: 14, title: 16,   body: 13,   sub: 11.5, radius: 13, btn: 13,   icon: 17 },
  menubar: { pad: 16, gap: 11, title: 13.5, body: 12,   sub: 11,   radius: 10, btn: 12.5, icon: 15 },
  mobile:  { pad: 18, gap: 14, title: 18,   body: 14.5, sub: 12.5, radius: 15, btn: 15.5, icon: 19 },
};

function syncToneColor(tone, P) {
  switch (tone) {
    case "ok":    return P.isDark ? "#37c98c" : "#0f9d63";
    case "error": return P.isDark ? "#ff6b6b" : "#cf3a33";
    case "warn":  return P.isDark ? "#e0ad62" : "#a9781f";
    case "info":  return P.accent;
    case "muted": return P.subtle;
    default:      return P.muted;
  }
}

// ---- button: primary / secondary / danger / ghost ----
function SyncBtn({ P, S, variant = "secondary", onClick, children, icon, full, disabled, busy }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
    fontFamily: "inherit", fontSize: S.btn, lineHeight: 1, cursor: disabled ? "default" : "pointer",
    borderRadius: 999, padding: full ? "12px 18px" : "9px 16px", whiteSpace: "nowrap",
    width: full ? "100%" : "auto", boxSizing: "border-box", transition: "background .14s, border-color .14s, opacity .14s",
    opacity: disabled ? 0.45 : 1, border: "1px solid transparent",
  };
  let sty;
  if (variant === "primary") sty = { ...base, background: P.accent, color: "#fff", fontWeight: 500 };
  else if (variant === "danger") sty = { ...base, background: "transparent", color: syncToneColor("error", P), border: `1px solid ${P.line}` };
  else if (variant === "ghost") sty = { ...base, background: "transparent", color: P.muted, border: "none", padding: full ? "12px 18px" : "9px 10px" };
  else sty = { ...base, background: "transparent", color: P.text, border: `1px solid ${P.line}` };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={sty}
      onMouseEnter={e => { if (!disabled && variant !== "ghost") e.currentTarget.style.background = variant === "primary" ? "" : (P.isDark ? "rgba(255,255,255,0.04)" : "rgba(40,30,20,0.03)"); }}
      onMouseLeave={e => { if (variant !== "primary") e.currentTarget.style.background = "transparent"; }}>
      {busy && <Spinner P={P} size={S.btn} />}
      {icon && !busy && <Icon name={icon} size={S.btn + 1} color={variant === "primary" ? "#fff" : (variant === "danger" ? syncToneColor("error", P) : P.muted)} />}
      {children}
    </button>
  );
}

function Spinner({ P, size = 13, color }) {
  return <span style={{ width: size, height: size, borderRadius: "50%", display: "inline-block",
    border: `2px solid ${P.isDark ? "rgba(255,255,255,0.18)" : "rgba(40,30,20,0.12)"}`,
    borderTopColor: color || P.accent, animation: "syncspin .7s linear infinite", flexShrink: 0 }} />;
}

function SyncAvatar({ P, size = 30 }) {
  const a = window.SYNC.account;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: P.accentSoft, color: P.accent, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: size * 0.42, fontWeight: 600 }}>{a.initial}</div>
  );
}

// status dot + label, used in the entry row and account block
function StatusInline({ P, S, screen, status, busy }) {
  const meta = window.syncStatusMeta(screen, status);
  const c = syncToneColor(meta.tone, P);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: S.sub + 0.5, color: c, fontWeight: 500 }}>
      {meta.tone === "info" || busy
        ? <Spinner P={P} size={S.sub + 1} color={c} />
        : <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, flexShrink: 0 }} />}
      {meta.label}
    </span>
  );
}

// the settings-list entry row for "Google Drive 同步".
// connected → merges in the account identity; otherwise → generic feature row.
function EntryRow({ P, S, surface, screen, status }) {
  const connected = screen !== "disconnected";
  const a = window.SYNC.account;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: `${S.pad * 0.6}px ${S.pad}px`,
      borderBottom: `1px solid ${P.lineSoft}` }}>
      {connected
        ? <SyncAvatar P={P} size={S.icon + 17} />
        : <div style={{ width: S.icon + 17, height: S.icon + 17, borderRadius: 9, flexShrink: 0,
            background: P.accentSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="HardDriveUpload" size={S.icon} color={P.accent} />
          </div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: S.body + 1, color: P.text, fontWeight: 500, whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis" }}>{connected ? a.name : "Google Drive 同步"}</div>
        <div style={{ fontSize: S.sub, color: P.subtle, marginTop: 2, whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis" }}>{connected ? a.email : "跨设备同步 Tidal 配置"}</div>
      </div>
      <StatusInline P={P} S={S} screen={screen} status={status} />
    </div>
  );
}

function Bullet({ P, S, icon, children }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ marginTop: 1, flexShrink: 0 }}><Icon name={icon} size={S.body + 2} color={P.subtle} /></span>
      <div style={{ fontSize: S.body, color: P.muted, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

// summary card for local / cloud config snapshots
function SummaryCard({ P, S, kind, data, emphasize }) {
  const isLocal = kind === "local";
  const title = isLocal ? "本机" : "云端";
  const icon = isLocal ? "MonitorSmartphone" : "Cloud";
  const empty = data.holdings === 0 && data.watch === 0;
  const metrics = [
    { label: "持仓", value: empty ? "—" : data.holdings + " 只" },
    { label: "自选", value: empty ? "—" : data.watch + " 只" },
    { label: "现金", value: empty ? "—" : window.syncMoney(data.cash) },
  ];
  return (
    <div style={{ flex: 1, minWidth: 0, border: `1px solid ${emphasize ? P.accent : P.line}`,
      background: emphasize ? P.accentSoft : (P.isDark ? "rgba(255,255,255,0.02)" : P.panelAlt || "#fbfaf6"),
      borderRadius: S.radius, padding: `${S.pad * 0.75}px ${S.pad * 0.8}px` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <Icon name={icon} size={S.body + 2} color={emphasize ? P.accent : P.muted} />
        <span style={{ fontSize: S.body, color: P.text, fontWeight: 500 }}>{title}</span>
        {!isLocal && data.source && (
          <span style={{ marginLeft: "auto", fontSize: S.sub - 0.5, color: P.subtle,
            background: P.chipBg, padding: "2px 7px", borderRadius: 6 }}>来自 {data.source}</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: S.sub - 0.5, color: P.subtle, marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: S.body + 1, color: P.text, fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: S.sub, color: P.subtle, marginTop: 12, paddingTop: 10,
        borderTop: `1px solid ${P.lineSoft}` }}>
        {isLocal ? "最近修改 " + data.at : "最近同步 " + data.at}
      </div>
    </div>
  );
}

// inline info / warning box
function InfoBox({ P, S, tone = "muted", icon = "Info", children }) {
  const c = syncToneColor(tone, P);
  const soft = tone === "error" ? (P.isDark ? "rgba(255,107,107,0.10)" : "rgba(207,58,51,0.06)")
    : tone === "warn" ? (P.isDark ? "rgba(224,173,98,0.10)" : "rgba(169,120,31,0.07)")
    : (P.isDark ? "rgba(255,255,255,0.03)" : "rgba(40,30,20,0.03)");
  return (
    <div style={{ display: "flex", gap: 9, padding: `${S.pad * 0.55}px ${S.pad * 0.65}px`,
      background: soft, border: `1px solid ${tone === "muted" ? P.lineSoft : "transparent"}`,
      borderRadius: S.radius - 2 }}>
      <Icon name={icon} size={S.body + 2} color={tone === "muted" ? P.subtle : c} style={{ marginTop: 1, flexShrink: 0 }} />
      <div style={{ fontSize: S.sub + 0.5, color: tone === "muted" ? P.muted : c, lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

// labelled section title inside the panel
function FieldLabel({ P, S, children, hint }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0 2px 9px" }}>
      <span style={{ fontSize: S.sub, color: P.subtle, letterSpacing: "0.06em", textTransform: "uppercase" }}>{children}</span>
      {hint && <span style={{ fontSize: S.sub, color: P.subtle }}>{hint}</span>}
    </div>
  );
}

Object.assign(window, {
  syncToneColor, SyncBtn, Spinner, SyncAvatar, StatusInline, EntryRow, Bullet, SummaryCard, InfoBox, FieldLabel,
});
