// Google Drive 同步 — panel = entry row + active screen + dialog / oauth overlays.

function SyncDialog({ P, S, surface, m }) {
  const dialog = m.state.dialog;
  const title = window.syncDialogTitle(dialog);
  const mobile = surface === "mobile";
  const bodyMap = { content: ContentDialog, conflict: ConflictDialog, disconnect: DisconnectDialog, confirm: ConfirmDialog };
  const Body = bodyMap[dialog.type];
  return (
    <div onMouseDown={m.closeDialog} style={{ position: "absolute", inset: 0, zIndex: 50,
      background: P.overlay, backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
      display: "flex", alignItems: mobile ? "flex-end" : "flex-start", justifyContent: "center",
      paddingTop: mobile ? 0 : "7%" }}>
      <div onMouseDown={e => e.stopPropagation()} className={mobile ? "sync-sheet-in" : "sync-modal-in"}
        style={{ width: mobile ? "100%" : (surface === "menubar" ? 416 : 448), maxWidth: "100%", maxHeight: "92%",
          display: "flex", flexDirection: "column", background: P.panel, border: `1px solid ${P.line}`,
          borderRadius: mobile ? "20px 20px 0 0" : 16, overflow: "hidden",
          boxShadow: P.isDark ? "0 24px 70px rgba(0,0,0,0.62)" : "0 24px 70px rgba(40,30,20,0.20)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
          padding: `${S.pad * 0.7}px ${S.pad}px`, borderBottom: `1px solid ${P.line}` }}>
          <span style={{ fontSize: S.title - 1, color: P.text, fontWeight: 500 }}>{title}</span>
          <button onClick={m.closeDialog} style={{ background: "transparent", border: "none", color: P.muted,
            fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 4 }}>✕</button>
        </div>
        <div style={{ padding: S.pad, overflowY: "auto" }}>
          <Body P={P} S={S} surface={surface} m={m} />
        </div>
      </div>
    </div>
  );
}

function SyncPanel({ P, S, surface, m }) {
  const { screen, dialog, oauth } = m.state;
  return (
    <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <EntryRow P={P} S={S} surface={surface} screen={screen} status={m.state.status} />
        <div style={{ padding: S.pad }}>
          {screen === "disconnected" && <DisconnectedScreen P={P} S={S} surface={surface} m={m} />}
          {screen === "firstSync" && <FirstSyncScreen P={P} S={S} surface={surface} m={m} />}
          {screen === "connected" && <ConnectedScreen P={P} S={S} surface={surface} m={m} />}
        </div>
      </div>
      {dialog && <SyncDialog P={P} S={S} surface={surface} m={m} />}
      {oauth && <OAuthOverlay P={P} S={S} surface={surface} m={m} />}
    </div>
  );
}

Object.assign(window, { SyncDialog, SyncPanel });
