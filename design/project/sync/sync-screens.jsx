// Google Drive 同步 — screen + dialog bodies. Each takes { P, S, surface, m }.

function SyncHeading({ P, S, title, desc }) {
  return (
    <div style={{ marginBottom: S.gap + 4 }}>
      <div style={{ fontSize: S.title, color: P.text, fontWeight: 500, letterSpacing: "-0.01em" }}>{title}</div>
      {desc && <div style={{ fontSize: S.body, color: P.muted, lineHeight: 1.55, marginTop: 6 }}>{desc}</div>}
    </div>);

}

// row of actions; on desktop right-aligned, on mobile stacked full-width
function ActionRow({ surface, children }) {
  const mobile = surface === "mobile";
  return (
    <div style={{ display: "flex", flexDirection: mobile ? "column-reverse" : "row",
      justifyContent: "flex-end", gap: mobile ? 9 : 10, alignItems: "stretch", marginTop: 4 }}>
      {children}
    </div>);

}

// ============ II · 未连接 ============
function DisconnectedScreen({ P, S, surface, m }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: S.gap }}>
      <SyncHeading P={P} S={S} title="未连接 Google Drive"
      desc="连接后，可在网页端、移动网页与菜单栏客户端之间同步你的 Tidal 配置。" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Bullet P={P} S={S} icon="ShieldCheck">只访问 Tidal 自己的 Google Drive 应用数据区，不读取你的 Drive 文件列表。</Bullet>
        <Bullet P={P} S={S} icon="EyeOff">同步文件不会出现在你的 Drive 文件列表里。</Bullet>
        <Bullet P={P} S={S} icon="KeyRound">AI API Key 不会同步，仅保存在本设备。</Bullet>
      </div>
      <ActionRow surface={surface}>
        <SyncBtn P={P} S={S} variant="secondary" full={surface === "mobile"} onClick={m.openContent}>查看同步内容</SyncBtn>
        <SyncBtn P={P} S={S} variant="primary" icon="Cloud" full={surface === "mobile"} onClick={m.connect}>连接 Google Drive</SyncBtn>
      </ActionRow>
    </div>);

}

// ============ III · 首次同步 A/B/C/D ============
function FirstSyncScreen({ P, S, surface, m }) {
  const D = window.SYNC;
  const c = m.state.fsCase;

  if (c === "A") return (
    <div style={{ display: "flex", flexDirection: "column", gap: S.gap }}>
      <SyncHeading P={P} S={S} title="这是第一次同步"
      desc="将本机配置上传到 Google Drive 应用数据区。之后其它设备即可从云端取得这份配置。" />
      <SummaryCard P={P} S={S} kind="local" data={D.local} emphasize />
      <InfoBox P={P} S={S} icon="Sparkles">推荐：本机有数据、云端为空 — 上传本机。</InfoBox>
      <ActionRow surface={surface}>
        <SyncBtn P={P} S={S} variant="ghost" full={surface === "mobile"} onClick={() => m.firstSync("later")}>稍后再说</SyncBtn>
        <SyncBtn P={P} S={S} variant="primary" icon="CloudUpload" full={surface === "mobile"} onClick={() => m.firstSync("upload")}>上传本机数据</SyncBtn>
      </ActionRow>
    </div>);


  if (c === "B") return (
    <div style={{ display: "flex", flexDirection: "column", gap: S.gap }}>
      <SyncHeading P={P} S={S} title="已连接 Google Drive" desc="当前没有可同步的数据。开始添加持仓或自选后，更改会自动同步。" />
      <SummaryCard P={P} S={S} kind="local" data={D.localEmpty} />
      <ActionRow surface={surface}>
        <SyncBtn P={P} S={S} variant="secondary" full={surface === "mobile"} onClick={() => m.firstSync("syncEmpty")}>立即同步</SyncBtn>
        <SyncBtn P={P} S={S} variant="primary" icon="Check" full={surface === "mobile"} onClick={() => m.firstSync("finish")}>完成</SyncBtn>
      </ActionRow>
    </div>);


  if (c === "C") return (
    <div style={{ display: "flex", flexDirection: "column", gap: S.gap }}>
      <SyncHeading P={P} S={S} title="云端有可恢复的配置" desc="本机当前为空。可以从云端恢复这份配置到本设备。" />
      <SummaryCard P={P} S={S} kind="cloud" data={D.cloud} emphasize />
      <InfoBox P={P} S={S} icon="Sparkles">推荐：本机为空、云端有数据 — 从云端恢复。</InfoBox>
      <div style={{ display: "flex", flexDirection: surface === "mobile" ? "column-reverse" : "row",
        justifyContent: "space-between", gap: 10, alignItems: surface === "mobile" ? "stretch" : "center", marginTop: 4 }}>
        <SyncBtn P={P} S={S} variant="danger" full={surface === "mobile"} onClick={() => m.openConfirm("emptyOverwrite")}>保留本机空数据并覆盖云端</SyncBtn>
        <div style={{ display: "flex", flexDirection: surface === "mobile" ? "column-reverse" : "row", gap: 10 }}>
          <SyncBtn P={P} S={S} variant="ghost" full={surface === "mobile"} onClick={() => m.firstSync("later")}>稍后决定</SyncBtn>
          <SyncBtn P={P} S={S} variant="primary" icon="CloudDownload" full={surface === "mobile"} onClick={() => m.firstSync("restore")}>从云端恢复</SyncBtn>
        </div>
      </div>
    </div>);


  // D · both have data
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: S.gap }}>
      <SyncHeading P={P} S={S} title="两端都有数据" desc="请选择保留哪一份。第一版为整体配置覆盖，暂不做逐项合并。" />
      <div style={{ display: "flex", flexDirection: surface === "menubar" ? "column" : "row", gap: 10 }}>
        <SummaryCard P={P} S={S} kind="local" data={D.local} />
        <SummaryCard P={P} S={S} kind="cloud" data={D.cloud} />
      </div>
      <div style={{ display: "flex", flexDirection: surface === "mobile" ? "column-reverse" : "row",
        justifyContent: "flex-end", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
        <SyncBtn P={P} S={S} variant="ghost" full={surface === "mobile"} onClick={() => m.firstSync("later")}>稍后决定</SyncBtn>
        <SyncBtn P={P} S={S} variant="secondary" icon="CloudDownload" full={surface === "mobile"} onClick={() => m.openConfirm("restoreOverwrite")}>使用云端覆盖本机</SyncBtn>
        <SyncBtn P={P} S={S} variant="primary" icon="CloudUpload" full={surface === "mobile"} onClick={() => m.openConfirm("uploadOverwrite")}>使用本机覆盖云端</SyncBtn>
      </div>
    </div>);

}

// ============ IV · 已连接（含状态条 + 失败/冲突/重登） ============
function ConnectedScreen({ P, S, surface, m }) {
  const st = m.state.status,fk = m.state.failKind;
  const noteText = surface === "menubar" ?
  "菜单栏客户端会在启动时同步，并定时检查云端变化。" :
  surface === "mobile" ? "移动网页不承诺后台同步：打开页面时拉取云端，更改后稍候自动上传。" :
  "网页端不承诺后台同步：打开页面时拉取云端，更改后稍候自动上传。";

  const kv = [
  ["最近同步时间", st === "syncing" ? "同步中…" : m.state.lastSync],
  ["最近同步来源", m.state.source],
  ["本机未同步更改", st === "pending" || st === "conflict" ? "有" : "无"]];


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: S.gap }}>
      <StatusBanner P={P} S={S} surface={surface} m={m} st={st} fk={fk} />

      {/* details */}
      <div style={{ border: `1px solid ${P.line}`, borderRadius: S.radius, overflow: "hidden" }}>
        {kv.map(([k, v], i) =>
        <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: `${S.pad * 0.55}px ${S.pad * 0.8}px`, borderBottom: i < kv.length - 1 ? `1px solid ${P.lineSoft}` : "none" }}>
            <span style={{ fontSize: S.body, color: P.muted }}>{k}</span>
            <span style={{ fontSize: S.body, color: v === "有" ? syncToneColor("warn", P) : P.text, fontVariantNumeric: "tabular-nums" }}>{v}</span>
          </div>
        )}
      </div>

      {/* operations */}
      <div>
        <FieldLabel P={P} S={S}>操作</FieldLabel>
        <div style={{ border: `1px solid ${P.line}`, borderRadius: S.radius, overflow: "hidden" }}>
          <OpRow P={P} S={S} icon="RefreshCw" label="立即同步" onClick={m.syncNow} disabled={st === "syncing"} />
          <OpRow P={P} S={S} icon="CloudDownload" label="从云端恢复" onClick={() => m.openConfirm("restoreOverwrite")} disabled={st === "syncing"} />
          <OpRow P={P} S={S} icon="CloudUpload" label="上传本机覆盖云端" onClick={() => m.openConfirm("uploadOverwrite")} disabled={st === "syncing"} />
          <OpRow P={P} S={S} icon="Unlink" label="断开连接" danger last onClick={m.openDisconnect} />
        </div>
      </div>

      <InfoBox P={P} S={S} icon={surface === "menubar" ? "Clock" : "CloudOff"}>{noteText}</InfoBox>
    </div>);

}

function OpRow({ P, S, icon, label, onClick, danger, disabled, last }) {
  const c = danger ? syncToneColor("error", P) : P.text;
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} className="sync-row"
    style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left",
      padding: `${S.pad * 0.62}px ${S.pad * 0.8}px`, background: "transparent", border: "none",
      borderBottom: last ? "none" : `1px solid ${P.lineSoft}`, cursor: disabled ? "default" : "pointer",
      fontFamily: "inherit", opacity: disabled ? 0.4 : 1 }}>
      <Icon name={icon} size={S.body + 3} color={danger ? c : P.muted} />
      <span style={{ flex: 1, fontSize: S.body + 1, color: c }}>{label}</span>
      <Icon name="ChevronRight" size={S.body + 2} color={P.subtle} />
    </button>);

}

// action banner — only for states that need a recovery action the account-row
// status can't provide. Everyday states (synced / pending / syncing) are shown
// by the account row + detail table alone, so no banner is drawn for them.
function StatusBanner({ P, S, surface, m, st, fk }) {
  const wrap = (tone, icon, text, actions, busy) => {
    const c = syncToneColor(tone, P);
    const soft = tone === "ok" ? P.isDark ? "rgba(55,201,140,0.10)" : "rgba(15,157,99,0.06)" :
    tone === "error" ? P.isDark ? "rgba(255,107,107,0.10)" : "rgba(207,58,51,0.055)" :
    tone === "warn" ? P.isDark ? "rgba(224,173,98,0.10)" : "rgba(169,120,31,0.06)" :
    P.isDark ? "rgba(185,166,255,0.10)" : "rgba(91,79,212,0.06)";
    return (
      <div style={{ background: soft, borderRadius: S.radius, padding: `${S.pad * 0.7}px ${S.pad * 0.8}px`,
        display: "flex", flexDirection: surface === "mobile" && actions ? "column" : "row",
        alignItems: surface === "mobile" && actions ? "flex-start" : "center", gap: 12 }} data-comment-anchor="4139164a76-div-174-7">
        <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0 }}>
          {busy ? <Spinner P={P} size={S.body + 3} color={c} /> :
          <Icon name={icon} size={S.body + 5} color={c} style={{ flexShrink: 0 }} />}
          <span style={{ fontSize: S.body + 0.5, color: c, fontWeight: 500, lineHeight: 1.4 }}>{text}</span>
        </div>
        {actions && <div style={{ display: "flex", gap: 8, flexShrink: 0, width: surface === "mobile" ? "100%" : "auto" }}>{actions}</div>}
      </div>);

  };

  // synced / pending / syncing: no banner — the account row status + detail
  // table already convey these;立即同步 lives in the operations list below.
  if (st === "synced" || st === "pending" || st === "syncing") return null;

  if (st === "reauth") return wrap("error", "KeyRound", "Google 授权已过期，需要重新登录",
  <SyncBtn P={P} S={S} variant="primary" icon="LogIn" full={surface === "mobile"} onClick={m.reauthLogin}>重新登录</SyncBtn>);

  if (st === "conflict") return wrap("error", "GitMerge", "发现同步冲突：本机与云端都发生了更改",
  <SyncBtn P={P} S={S} variant="primary" icon="ArrowRightLeft" full={surface === "mobile"} onClick={m.openConflict}>处理冲突</SyncBtn>);

  if (st === "failed") {
    if (fk === "badCloud") return wrap("error", "FileWarning", "云端同步数据无法识别",
    <>
        <SyncBtn P={P} S={S} variant="secondary" full={surface === "mobile"} onClick={m.syncNow}>重试</SyncBtn>
        <SyncBtn P={P} S={S} variant="danger" full={surface === "mobile"} onClick={() => m.openConfirm("badCloudOverwrite")}>用本机覆盖云端</SyncBtn>
      </>);
    if (fk === "localWrite") return wrap("error", "HardDrive", "无法保存到本机",
    <>
        <SyncBtn P={P} S={S} variant="ghost" full={surface === "mobile"} onClick={m.syncNow}>保持云端不变</SyncBtn>
        <SyncBtn P={P} S={S} variant="primary" full={surface === "mobile"} onClick={m.retry}>重试</SyncBtn>
      </>);
    return wrap("error", "TriangleAlert", "同步失败，可稍后重试",
    <SyncBtn P={P} S={S} variant="primary" icon="RefreshCw" full={surface === "mobile"} onClick={m.retry}>重试</SyncBtn>);
  }
  return null;
}

Object.assign(window, { SyncHeading, ActionRow, DisconnectedScreen, FirstSyncScreen, ConnectedScreen, OpRow, StatusBanner });