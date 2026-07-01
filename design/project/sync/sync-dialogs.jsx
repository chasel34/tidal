// Google Drive 同步 — dialog bodies + OAuth overlay. Chrome supplied by SyncDialog (panel).

window.syncConfirmMeta = function (kind) {
  switch (kind) {
    case "uploadOverwrite":  return { title: "用本机数据覆盖云端？", icon: "CloudUpload", keep: "本机", over: "云端", confirm: "覆盖云端" };
    case "restoreOverwrite": return { title: "用云端数据覆盖本机？", icon: "CloudDownload", keep: "云端", over: "本机", confirm: "覆盖本机" };
    case "emptyOverwrite":   return { title: "用本机（空）覆盖云端？", icon: "CloudUpload", keep: "本机（空白配置）", over: "云端", confirm: "覆盖云端", warn: "云端现有配置将被清空，且无法找回。" };
    case "badCloudOverwrite":return { title: "用本机数据覆盖云端？", icon: "CloudUpload", keep: "本机", over: "云端（已损坏）", confirm: "覆盖云端", warn: "云端数据已无法识别，将被本机配置整体替换。" };
    case "deleteCloud":      return { title: "删除云端同步数据？", icon: "Trash2", confirm: "删除并断开", danger: true };
    default: return { title: "确认操作？", confirm: "确认" };
  }
};

function syncDialogTitle(dialog) {
  if (!dialog) return "";
  if (dialog.type === "content") return "同步内容";
  if (dialog.type === "conflict") return "处理同步冲突";
  if (dialog.type === "disconnect") return "断开连接";
  if (dialog.type === "confirm") return window.syncConfirmMeta(dialog.kind).title;
  return "";
}

// footer button row, surface-aware
function DlgFooter({ surface, children }) {
  const mobile = surface === "mobile";
  return (
    <div style={{ display: "flex", flexDirection: mobile ? "column-reverse" : "row",
      justifyContent: "flex-end", gap: mobile ? 9 : 10, marginTop: 20 }}>{children}</div>
  );
}

// ---- 查看同步内容 ----
function ContentDialog({ P, S, surface, m }) {
  const D = window.SYNC;
  const Item = ({ ok, k, d }) => (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0" }}>
      <Icon name={ok ? "Check" : "Minus"} size={S.body + 3} color={ok ? syncToneColor("ok", P) : P.subtle} style={{ marginTop: 1, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <span style={{ fontSize: S.body, color: P.text }}>{k}</span>
        <span style={{ fontSize: S.sub, color: P.subtle, marginLeft: 8 }}>{d}</span>
      </div>
    </div>
  );
  return (
    <div>
      <FieldLabel P={P} S={S}>会同步</FieldLabel>
      <div style={{ marginBottom: 18 }}>{D.synced.map(x => <Item key={x.k} ok k={x.k} d={x.d} />)}</div>
      <FieldLabel P={P} S={S}>不会同步</FieldLabel>
      <div>{D.notSynced.map(x => <Item key={x.k} k={x.k} d={x.d} />)}</div>
      <DlgFooter surface={surface}>
        <SyncBtn P={P} S={S} variant="secondary" full={surface === "mobile"} onClick={m.closeDialog}>知道了</SyncBtn>
      </DlgFooter>
    </div>
  );
}

// ---- VI · 冲突 ----
function ConflictDialog({ P, S, surface, m }) {
  const D = window.SYNC;
  return (
    <div>
      <div style={{ fontSize: S.body, color: P.muted, lineHeight: 1.55, marginBottom: 16 }}>
        这台设备和云端都发生了更改，需要选择保留哪一份。第一版为整体覆盖，暂不做逐项合并。
      </div>
      <div style={{ display: "flex", flexDirection: surface === "mobile" ? "column" : "row", gap: 10, marginBottom: 18 }}>
        <SummaryCard P={P} S={S} kind="local" data={D.local} />
        <SummaryCard P={P} S={S} kind="cloud" data={D.cloud} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <SyncBtn P={P} S={S} variant="primary" icon="CloudUpload" full onClick={() => m.openConfirm("uploadOverwrite")}>保留本机，覆盖云端</SyncBtn>
        <SyncBtn P={P} S={S} variant="secondary" icon="CloudDownload" full onClick={() => m.openConfirm("restoreOverwrite")}>使用云端，覆盖本机</SyncBtn>
        <SyncBtn P={P} S={S} variant="ghost" full onClick={m.closeDialog}>先不处理</SyncBtn>
      </div>
      <InfoBox P={P} S={S} icon="Info">{"\u201C先不处理\u201D后保持冲突状态，并暂停自动上传，直到你做出选择。"}</InfoBox>
    </div>
  );
}

// ---- VIII · 断开连接 ----
function DisconnectDialog({ P, S, surface, m }) {
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
        <Bullet P={P} S={S} icon="HardDrive">断开后，本机数据仍会完整保留。</Bullet>
        <Bullet P={P} S={S} icon="Cloud">不会删除 Google Drive 中已同步的数据。</Bullet>
        <Bullet P={P} S={S} icon="RotateCcw">之后可以重新连接并继续同步。</Bullet>
      </div>
      <DlgFooter surface={surface}>
        <SyncBtn P={P} S={S} variant="secondary" full={surface === "mobile"} onClick={m.closeDialog}>取消</SyncBtn>
        <SyncBtn P={P} S={S} variant="danger" icon="Unlink" full={surface === "mobile"} onClick={m.doDisconnect}>断开连接</SyncBtn>
      </DlgFooter>
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${P.lineSoft}` }}>
        <button onClick={() => m.openConfirm("deleteCloud")} style={{ display: "flex", alignItems: "center", gap: 7,
          background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0,
          color: syncToneColor("error", P), fontSize: S.sub + 0.5 }}>
          <Icon name="Trash2" size={S.sub + 2} color={syncToneColor("error", P)} />
          删除云端同步数据并断开连接
        </button>
      </div>
    </div>
  );
}

// ---- IX · 危险操作二次确认 ----
function ConfirmDialog({ P, S, surface, m }) {
  const kind = m.state.dialog.kind;
  const meta = window.syncConfirmMeta(kind);
  const err = syncToneColor("error", P);

  return (
    <div>
      {meta.danger && kind === "deleteCloud" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <Bullet P={P} S={S} icon="CloudOff">删除后，其他设备将无法再从云端恢复这份配置。</Bullet>
          <Bullet P={P} S={S} icon="HardDrive">本机数据仍会完整保留。</Bullet>
          <Bullet P={P} S={S} icon="Link2Off">同时会断开与 Google Drive 的连接。</Bullet>
        </div>
      ) : (
        <div style={{ border: `1px solid ${P.line}`, borderRadius: S.radius, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: `${S.pad * 0.6}px ${S.pad * 0.8}px`,
            borderBottom: `1px solid ${P.lineSoft}` }}>
            <Icon name="CircleCheck" size={S.body + 4} color={syncToneColor("ok", P)} />
            <span style={{ fontSize: S.body, color: P.muted }}>将保留</span>
            <span style={{ marginLeft: "auto", fontSize: S.body, color: P.text, fontWeight: 500 }}>{meta.keep}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: `${S.pad * 0.6}px ${S.pad * 0.8}px` }}>
            <Icon name="CircleX" size={S.body + 4} color={err} />
            <span style={{ fontSize: S.body, color: P.muted }}>将覆盖</span>
            <span style={{ marginLeft: "auto", fontSize: S.body, color: P.text, fontWeight: 500 }}>{meta.over}</span>
          </div>
        </div>
      )}

      {meta.warn && <div style={{ marginBottom: 14 }}><InfoBox P={P} S={S} tone="error" icon="TriangleAlert">{meta.warn}</InfoBox></div>}

      <InfoBox P={P} S={S} icon="KeyRound">此操作为整体配置覆盖，不会同步你的 AI API Key。</InfoBox>

      <DlgFooter surface={surface}>
        <SyncBtn P={P} S={S} variant="secondary" full={surface === "mobile"} onClick={m.closeDialog}>取消</SyncBtn>
        <SyncBtn P={P} S={S} variant={meta.danger ? "danger" : "primary"} icon={meta.icon} full={surface === "mobile"} onClick={() => m.confirm(kind)}>{meta.confirm}</SyncBtn>
      </DlgFooter>
    </div>
  );
}

// ---- OAuth waiting overlay (neutral; not a recreation of Google's consent UI) ----
function OAuthOverlay({ P, S, surface, m }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center",
      background: P.overlay, backdropFilter: "blur(3px)" }} onMouseDown={m.cancelOauth}>
      <div onMouseDown={e => e.stopPropagation()} style={{ width: surface === "mobile" ? "82%" : 320, background: P.panel,
        border: `1px solid ${P.line}`, borderRadius: 16, padding: 26, textAlign: "center",
        boxShadow: P.isDark ? "0 24px 70px rgba(0,0,0,0.6)" : "0 24px 70px rgba(40,30,20,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <Spinner P={P} size={30} />
        </div>
        <div style={{ fontSize: S.title - 1, color: P.text, fontWeight: 500 }}>正在等待 Google 授权…</div>
        <div style={{ fontSize: S.body, color: P.muted, lineHeight: 1.55, margin: "8px 0 20px" }}>
          请在弹出的 Google 窗口中完成登录与授权。授权仅用于访问 Tidal 的应用数据区。
        </div>
        <SyncBtn P={P} S={S} variant="secondary" full onClick={m.cancelOauth}>取消</SyncBtn>
      </div>
    </div>
  );
}

Object.assign(window, { syncDialogTitle, DlgFooter, ContentDialog, ConflictDialog, DisconnectDialog, ConfirmDialog, OAuthOverlay });
