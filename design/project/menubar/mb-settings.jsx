// Calm Menubar — System Settings-style window (left sidebar + right panes).
const { useState: useStateS } = React;

const MB_SECTIONS = [
  { id: "general",   label: "通用",      icon: "SlidersHorizontal" },
  { id: "appearance",label: "外观",      icon: "SunMoon" },
  { id: "menubar",   label: "菜单栏",    icon: "PanelTop" },
  { id: "ai",       label: "智能识别",  icon: "Sparkles" },
  { id: "notify",    label: "通知提醒",  icon: "Bell" },
  { id: "portfolio", label: "持仓与自选",icon: "Wallet" },
  { id: "sync",      label: "备份与同步",icon: "RefreshCcw" },
  { id: "about",     label: "关于",      icon: "Info" },
];

function MBInstrumentPicker({ exclude, P, onPick, placeholder }) {
  const D = window.CALM;
  const opts = Object.values(D.instruments).filter(i => !exclude.includes(i.code));
  const [val, setVal] = useStateS("");
  if (opts.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 8, padding: "11px 14px", alignItems: "center" }}>
      <div style={{ flex: 1 }}>
        <MBSelect P={P} value={val || "__none"}
          onChange={(v) => setVal(v === "__none" ? "" : v)}
          options={[{ value: "__none", label: placeholder || "选择标的…" },
            ...opts.map(i => ({ value: i.code, label: `${i.name} ${i.code}` }))]} />
      </div>
      <button disabled={!val} onClick={() => { if (val) { onPick(val); setVal(""); } }}
        style={{ padding: "7px 16px", borderRadius: 8, border: "none",
          cursor: val ? "pointer" : "not-allowed", font: "inherit", fontSize: 12.5,
          background: P.accent, color: "#fff", opacity: val ? 1 : 0.4 }}>添加</button>
    </div>
  );
}

function MBBackupCard({ store, P }) {
  const fileRef = React.useRef(null);
  const [msg, setMsg] = useStateS(null);
  const ioBtn = { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
    borderRadius: 8, border: `1px solid ${P.line}`, background: "transparent",
    color: P.text, cursor: "pointer", font: "inherit", fontSize: 12.5 };

  const doExport = () => {
    const data = store.exportState();
    const d = new Date();
    const fn = `tidal-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = fn; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg({ ok: true, text: `已导出 ${data.holdings.length} 持仓 · ${data.watch.length} 自选` });
  };
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        const ok = store.importState(data);
        setMsg(ok
          ? { ok: true, text: `已导入 ${(data.holdings || []).length} 持仓 · ${(data.watch || []).length} 自选` }
          : { ok: false, text: "文件里没有可识别的持仓/自选数据" });
      } catch (err) { setMsg({ ok: false, text: "解析失败：不是有效的 JSON 文件" }); }
    };
    r.readAsText(f);
  };

  return (
    <>
      <MBGroupLabel P={P}>本地备份</MBGroupLabel>
      <MBCard P={P}>
        <MBRow label="导出数据" sub="持仓、自选、提醒与偏好保存为 JSON 文件" P={P}>
          <button onClick={doExport} style={ioBtn}>
            <Icon name="Download" size={14} color={P.text} /> 导出</button>
        </MBRow>
        <MBRow label="导入数据" sub="从备份文件恢复（将覆盖当前数据）" P={P} last>
          <button onClick={() => fileRef.current && fileRef.current.click()} style={ioBtn}>
            <Icon name="Upload" size={14} color={P.text} /> 选择文件</button>
        </MBRow>
      </MBCard>
      <input ref={fileRef} type="file" accept=".json,application/json"
        onChange={onFile} style={{ display: "none" }} />
      {msg && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "10px 4px 0",
          fontSize: 11.5, color: msg.ok ? P.subtle : (P.isDark ? "#ff5d5d" : "#d6342f") }}>
          <Icon name={msg.ok ? "Check" : "TriangleAlert"} size={13}
            color={msg.ok ? P.subtle : (P.isDark ? "#ff5d5d" : "#d6342f")} />
          {msg.text}
        </div>
      )}
    </>
  );
}

// ---- 备份与同步 pane: Google Drive 云同步 + 本地文件备份 ----
function MBSyncPane({ store, P, m }) {
  return (
    <>
      <div style={{ position: "relative", minHeight: 340, marginBottom: 18,
        border: `1px solid ${P.line}`, borderRadius: 12, overflow: "hidden",
        background: P.isDark ? "rgba(255,255,255,0.02)" : "#ffffff" }}>
        <SyncBody surface="menubar" P={P} m={m} flow />
      </div>
      <MBBackupCard store={store} P={P} />
    </>
  );
}

// ---- API-key / text field for the AI pane ----
function MBKeyField({ P, value, onChange, placeholder }) {
  const [show, setShow] = useStateS(false);
  return (
    <div style={{ position: "relative" }}>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        type={show ? "text" : "password"} spellCheck={false} autoComplete="off"
        style={{ boxSizing: "border-box", width: "100%", background: P.isDark ? "#19191d" : "#f4f1ea",
          border: `1px solid ${P.line}`, borderRadius: 8, padding: "8px 52px 8px 11px",
          fontSize: 12.5, color: P.text, outline: "none",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          letterSpacing: show ? "0" : "0.05em" }} />
      <button onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 7, top: "50%",
        transform: "translateY(-50%)", background: "transparent", border: "none", color: P.subtle,
        fontSize: 11, cursor: "pointer", fontFamily: "inherit", padding: "3px 5px" }}>
        {show ? "隐藏" : "显示"}</button>
    </div>
  );
}

function MBAiPane({ P }) {
  const ai = useAiSettings();
  const [adv, setAdv] = useStateS(false);
  const [testing, setTesting] = useStateS(false);
  const [result, setResult] = useStateS(null);
  const prov = ai.activeProvider;
  const cfg = ai.activeConfig;
  const configured = ai.isConfigured();
  const okColor = P.isDark ? "#37c98c" : "#0f9d63";
  const errColor = P.isDark ? "#ff5d5d" : "#d6342f";
  const clearResult = () => setResult(null);
  const runTest = async () => {
    setTesting(true); setResult(null);
    const r = await ai.testConnection(prov.id);
    setTesting(false); setResult(r);
  };
  const fieldLabel = { fontSize: 11.5, color: P.subtle, margin: "0 0 6px 2px" };
  const monoInput = { boxSizing: "border-box", width: "100%", background: P.isDark ? "#19191d" : "#f4f1ea",
    border: `1px solid ${P.line}`, borderRadius: 8, padding: "8px 11px", fontSize: 12.5,
    color: P.text, outline: "none", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };

  return (
    <>
      <div style={{ fontSize: 11.5, color: P.subtle, margin: "0 4px 14px", lineHeight: 1.55 }}>
        截图导入由你自己的大模型 API 识别。填入 API Key 后即可使用，未填则无法使用截图导入。
      </div>

      <MBGroupLabel P={P}>AI 服务商</MBGroupLabel>
      <MBCard P={P} style={{ marginBottom: 18 }}>
        <MBRow label="服务商" sub={prov.blurb} P={P} last>
          <MBSegmented P={P} value={prov.id}
            onChange={v => { ai.setActiveProvider(v); clearResult(); }}
            options={ai.providers.map(p => ({ value: p.id, label: p.short }))} />
        </MBRow>
      </MBCard>

      <MBGroupLabel P={P}>{prov.name} · 凭据</MBGroupLabel>
      <MBCard P={P}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${P.lineSoft}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", ...fieldLabel }}>
            <span>API Key</span>
            <span style={{ color: P.subtle }}>{prov.docHint}</span>
          </div>
          <MBKeyField P={P} value={cfg.apiKey}
            onChange={v => { ai.setField(prov.id, "apiKey", v); clearResult(); }}
            placeholder={prov.keyPlaceholder} />
          {!configured && (
            <div style={{ fontSize: 11, color: errColor, margin: "6px 0 0 2px" }}>
              未填写 API Key 时，截图导入不可用。</div>
          )}
        </div>
        <div style={{ padding: "12px 14px", borderBottom: adv ? `1px solid ${P.lineSoft}` : "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", ...fieldLabel }}>
            <span>识别模型 ID</span>
            <span style={{ color: P.subtle }}>{prov.modelHint}</span>
          </div>
          <input value={cfg.model}
            onChange={e => { ai.setField(prov.id, "model", e.target.value); clearResult(); }}
            placeholder={prov.defaultModel} spellCheck={false} style={monoInput} />
        </div>
        {adv && (
          <div style={{ padding: "12px 14px" }}>
            <div style={fieldLabel}>API 域名（Base URL）· 留空用默认</div>
            <input value={cfg.baseURL}
              onChange={e => { ai.setField(prov.id, "baseURL", e.target.value); clearResult(); }}
              placeholder={prov.defaultBaseURL} spellCheck={false} style={{ ...monoInput, fontSize: 12 }} />
          </div>
        )}
      </MBCard>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 4px 0" }}>
        <button onClick={runTest} disabled={testing} style={{ display: "flex", alignItems: "center",
          gap: 6, padding: "6px 13px", borderRadius: 8, border: `1px solid ${P.line}`,
          background: "transparent", color: P.text, cursor: testing ? "default" : "pointer",
          font: "inherit", fontSize: 12.5, opacity: testing ? 0.6 : 1 }}>
          {testing && <span style={{ width: 11, height: 11, borderRadius: 6, display: "inline-block",
            border: `2px solid ${P.line}`, borderTopColor: P.accent, animation: "mbspin .7s linear infinite" }} />}
          {testing ? "测试中…" : "测试连接"}
        </button>
        {result && (
          <span style={{ fontSize: 12, color: result.ok ? okColor : errColor }}>
            {result.ok ? "✓ " : "⚠ "}{result.msg}</span>
        )}
        <button onClick={() => setAdv(a => !a)} style={{ marginLeft: "auto", background: "transparent",
          border: "none", color: P.subtle, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>
          {adv ? "收起高级" : "高级设置"}</button>
      </div>

      <div style={{ marginTop: 16, padding: "11px 13px", borderRadius: 10,
        background: P.isDark ? "rgba(255,255,255,0.03)" : "rgba(40,30,20,0.03)",
        border: `1px solid ${P.lineSoft}`, fontSize: 11, color: P.subtle, lineHeight: 1.6 }}>
        导入的截图会上传至 <b style={{ color: P.muted, fontWeight: 500 }}>{prov.short}</b> 进行识别。
        持仓为敏感数据，请确认你信任该服务商。API Key 仅保存在本设备。
      </div>
    </>
  );
}

function MBSettingsWindow({ store, P, onClose, onDragStart, initialPane }) {
  const [pane, setPane] = useStateS(initialPane || "appearance");
  const [modal, setModal] = useStateS(null);
  const move = (v) => mbMove(v, P.isDark ? "dark" : "light", store.conv);
  const D = window.CALM;
  const cur = MB_SECTIONS.find(s => s.id === pane);
  const syncM = useSyncMachine("menubar");

  const refreshOpts = [
    { value: 15, label: "15 秒" }, { value: 30, label: "30 秒" },
    { value: 60, label: "1 分钟" }, { value: 300, label: "5 分钟" },
    { value: 0, label: "仅手动" },
  ];

  return (
    <div style={{ width: 760, height: 544, display: "flex", position: "relative",
      borderRadius: 12, overflow: "hidden",
      background: P.isDark ? "#1d1d21" : "#fbfaf6",
      border: `1px solid ${P.isDark ? "rgba(255,255,255,0.1)" : "rgba(40,30,20,0.12)"}`,
      boxShadow: P.isDark
        ? "0 30px 90px rgba(0,0,0,0.65)" : "0 30px 90px rgba(40,30,20,0.30)",
      fontFamily: "'PingFang SC', 'Inter', system-ui, sans-serif",
      "--mb-hover": P.isDark ? "rgba(255,255,255,0.05)" : "rgba(40,30,20,0.04)" }}>

      {/* ---- sidebar ---- */}
      <div style={{ width: 212, flexShrink: 0, display: "flex", flexDirection: "column",
        background: P.isDark ? "rgba(255,255,255,0.025)" : "rgba(40,30,20,0.022)",
        borderRight: `1px solid ${P.lineSoft}` }}>
        {/* traffic lights + drag handle */}
        <div onMouseDown={onDragStart} style={{ display: "flex", gap: 8,
          padding: "13px 14px 12px", cursor: "default" }}>
          <span onClick={onClose} style={{ width: 12, height: 12, borderRadius: "50%",
            background: "#ff5f57", cursor: "pointer", border: "0.5px solid rgba(0,0,0,0.12)" }} />
          <span style={{ width: 12, height: 12, borderRadius: "50%",
            background: "#febc2e", border: "0.5px solid rgba(0,0,0,0.12)" }} />
          <span style={{ width: 12, height: 12, borderRadius: "50%",
            background: "#28c840", border: "0.5px solid rgba(0,0,0,0.12)" }} />
        </div>
        {/* app identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 10,
          padding: "4px 14px 14px" }}>
          <div style={{ width: 38, height: 38, display: "flex", alignItems: "center",
            justifyContent: "center" }}>
            <Icon name="Waves" size={28} color={P.accent} sw={2} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, color: P.text, fontWeight: 500 }}>Tidal</div>
            <div style={{ fontSize: 11, color: P.subtle, marginTop: 1 }}>版本 1.0 (3)</div>
          </div>
        </div>
        <div style={{ padding: "0 10px", overflowY: "auto", flex: 1 }}>
          {MB_SECTIONS.map(s => (
            <MBSideRow key={s.id} icon={s.icon} label={s.label} P={P}
              active={pane === s.id} onClick={() => setPane(s.id)} />
          ))}
        </div>
      </div>

      {/* ---- content pane ---- */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div onMouseDown={onDragStart} style={{ padding: "16px 26px 10px",
          fontSize: 17, color: P.text, fontWeight: 500, cursor: "default",
          flexShrink: 0 }}>{cur.label}</div>
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 26px 26px" }}>

          {/* ===== Appearance (theme + up/down colors) ===== */}
          {pane === "appearance" && (
            <>
              <MBCard P={P} style={{ marginBottom: 18 }}>
                <MBRow label="外观主题" sub="弹窗与设置窗口的明暗风格" P={P}>
                  <MBSegmented P={P} value={store.theme} onChange={store.setTheme}
                    options={[{ value: "light", label: "亮色" },
                      { value: "dark", label: "暗色" }, { value: "auto", label: "跟随系统" }]} />
                </MBRow>
                <MBRow label="涨跌配色" sub="A 股习惯红涨绿跌；可切换为国际惯例" P={P} last>
                  <MBSegmented P={P} value={store.conv} onChange={store.setConv}
                    options={[{ value: "redUp", label: "红涨绿跌" },
                      { value: "greenUp", label: "绿涨红跌" }]} />
                </MBRow>
              </MBCard>
              <MBGroupLabel P={P}>预览</MBGroupLabel>
              <MBCard P={P}>
                {[{ n: "贵州茅台", c: "600519", v: 0.85 },
                  { n: "宁德时代", c: "300750", v: -1.42 }].map((r, i) => (
                  <MBRow key={r.c} label={r.n} sub={r.c} P={P} last={i === 1}>
                    <span style={{ fontSize: 14, color: move(r.v),
                      fontVariantNumeric: "tabular-nums" }}>{cFmtPct(r.v)}</span>
                  </MBRow>
                ))}
              </MBCard>
            </>
          )}

          {/* ===== Smart recognition (BYOK AI) ===== */}
          {pane === "ai" && <MBAiPane P={P} />}

          {/* ===== 备份与同步 (Google Drive + 本地文件) ===== */}
          {pane === "sync" && <MBSyncPane store={store} P={P} m={syncM} />}

          {/* ===== Menu bar ===== */}
          {pane === "menubar" && (
            <>
              <MBGroupLabel P={P}>菜单栏图标</MBGroupLabel>
              <MBCard P={P} style={{ marginBottom: 18 }}>
                <MBRow label="显示内容" sub="顶栏图标旁随实时数据更新" P={P} last>
                  <MBSegmented P={P} value={store.menubarMode} onChange={store.setMenubarMode}
                    options={[{ value: "icon", label: "仅图标" },
                      { value: "percent", label: "今日涨跌" }, { value: "total", label: "总资产" }]} />
                </MBRow>
              </MBCard>
              <MBGroupLabel P={P}>弹窗内容</MBGroupLabel>
              <MBCard P={P}>
                {[
                  { k: "trend", label: "资产走势小图", sub: "可切换 1W / 1M / 3M / 1Y" },
                  { k: "holdings", label: "持仓列表", sub: "按市值排序的迷你列表" },
                  { k: "watch", label: "自选列表", sub: "" },
                  { k: "indices", label: "大盘指数", sub: "上证 / 深证 / 创业板 / 沪深300" },
                  { k: "actions", label: "快捷操作栏", sub: "打开主看板 / 刷新 / 设置" },
                ].map((row, i, arr) => (
                  <MBRow key={row.k} label={row.label} sub={row.sub} P={P}
                    last={i === arr.length - 1}>
                    <MBSwitch P={P} on={store.sections[row.k]}
                      onChange={() => store.toggleSection(row.k)} />
                  </MBRow>
                ))}
              </MBCard>
              <div style={{ fontSize: 11.5, color: P.subtle, margin: "10px 4px 0",
                lineHeight: 1.5 }}>
                关闭全部列表后，弹窗仅显示资产摘要，更适合常驻一瞥。
              </div>
            </>
          )}

          {/* ===== Colors merged into Appearance ===== */}


          {/* ===== Notifications ===== */}
          {pane === "notify" && (
            <>
              <MBCard P={P} style={{ marginBottom: 18 }}>
                <MBRow label="允许通知" sub="价格触发提醒时推送到通知中心" P={P} last>
                  <MBSwitch P={P} on={store.notify} onChange={store.setNotify} />
                </MBRow>
              </MBCard>
              <MBGroupLabel P={P}>价格提醒</MBGroupLabel>
              <MBCard P={P} style={{ opacity: store.notify ? 1 : 0.5,
                pointerEvents: store.notify ? "auto" : "none" }}>
                {store.alerts.length === 0 && (
                  <div style={{ padding: "16px 14px", fontSize: 12.5, color: P.subtle,
                    textAlign: "center" }}>暂无提醒</div>
                )}
                {store.alerts.map((a, i) => {
                  const inst = D.instruments[a.code];
                  if (!inst) return null;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px",
                      borderBottom: `1px solid ${P.lineSoft}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: P.text }}>{inst.name}</div>
                        <div style={{ fontSize: 11, color: P.subtle, marginTop: 1 }}>{a.code}</div>
                      </div>
                      <MBSegmented P={P} value={a.dir}
                        onChange={(v) => store.setAlert(i, { dir: v })}
                        options={[{ value: "above", label: "涨破" }, { value: "below", label: "跌破" }]} />
                      <span style={{ fontSize: 12.5, color: P.muted,
                        fontVariantNumeric: "tabular-nums" }}>¥{cFmtNum(a.price)}</span>
                      <MBSwitch P={P} on={a.on} onChange={() => store.setAlert(i, { on: !a.on })} />
                      <button onClick={() => store.removeAlert(i)} style={{
                        background: "transparent", border: "none", color: P.subtle,
                        cursor: "pointer", fontSize: 15, padding: 2 }}>✕</button>
                    </div>
                  );
                })}
                <MBInstrumentPicker P={P} exclude={store.alerts.map(a => a.code)}
                  onPick={store.addAlert} placeholder="新增提醒标的…" />
              </MBCard>
            </>
          )}

          {/* ===== Portfolio ===== */}
          {pane === "portfolio" && (
            <>
              <MBGroupLabel P={P}>持仓</MBGroupLabel>
              <MBCard P={P} style={{ marginBottom: 18 }}>
                {store.holdingsFull.map((h, i, arr) => (
                  <div key={h.code} className="mb-hoverable"
                    onClick={() => setModal({ mode: "edit", code: h.code })}
                    style={{ display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", fontVariantNumeric: "tabular-nums", cursor: "pointer",
                    borderBottom: `1px solid ${P.lineSoft}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: P.text }}>{h.name}</div>
                      <div style={{ fontSize: 11, color: P.subtle, marginTop: 1 }}>
                        {h.code} · {h.shares} {h.type === "股票" ? "股" : "份"} · 成本 ¥{cFmtNum(h.cost)}</div>
                    </div>
                    <span style={{ fontSize: 12.5, color: P.muted }}>{cFmtCompact(h.marketValue)}</span>
                    <span style={{ fontSize: 12.5, color: move(h.todayPct), width: 56,
                      textAlign: "right" }}>{cFmtPct(h.todayPct)}</span>
                    <span style={{ display: "flex", color: P.subtle }}>
                      <Icon name="ChevronRight" size={15} color={P.subtle} /></span>
                  </div>
                ))}
                <button onClick={() => setModal({ mode: "buy" })} className="mb-hoverable"
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "11px 14px", border: "none", background: "transparent",
                    cursor: "pointer", font: "inherit", color: P.accent, fontSize: 13 }}>
                  <Icon name="Plus" size={16} color={P.accent} /> 买入新标的
                </button>
              </MBCard>
              <MBGroupLabel P={P}>自选</MBGroupLabel>
              <MBCard P={P}>
                {store.watchFull.map((w) => (
                  <div key={w.code} style={{ display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", fontVariantNumeric: "tabular-nums",
                    borderBottom: `1px solid ${P.lineSoft}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: P.text }}>{w.name}</div>
                      <div style={{ fontSize: 11, color: P.subtle, marginTop: 1 }}>{w.code} · {w.sector}</div>
                    </div>
                    <span style={{ fontSize: 12.5, color: P.muted }}>¥{cFmtNum(w.price)}</span>
                    <span style={{ fontSize: 12.5, color: move(w.todayPct), width: 56,
                      textAlign: "right" }}>{cFmtPct(w.todayPct)}</span>
                    <button onClick={() => store.removeWatch(w.code)} style={{
                      background: "transparent", border: "none", color: P.subtle,
                      cursor: "pointer", display: "flex", padding: 2 }}>
                      <Icon name="X" size={15} color={P.subtle} /></button>
                  </div>
                ))}
                <button onClick={() => setModal({ mode: "watch" })} className="mb-hoverable"
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "11px 14px", border: "none", background: "transparent",
                    cursor: "pointer", font: "inherit", color: P.accent, fontSize: 13 }}>
                  <Icon name="Plus" size={16} color={P.accent} /> 添加自选
                </button>
              </MBCard>
            </>
          )}

          {/* ===== General ===== */}
          {pane === "general" && (
            <>
              <MBCard P={P} style={{ marginBottom: 18 }}>
                <MBRow label="开机时自动启动" sub="登录后在后台常驻菜单栏" P={P}>
                  <MBSwitch P={P} on={store.launchAtLogin} onChange={store.setLaunchAtLogin} />
                </MBRow>
                <MBRow label="刷新频率" sub="行情自动刷新的间隔" P={P}>
                  <MBSelect P={P} value={store.refreshSec} onChange={store.setRefreshSec}
                    options={refreshOpts} />
                </MBRow>
                <MBRow label="数据来源" sub="演示数据 · 实时行情延迟约 15 秒" P={P} last>
                  <span style={{ fontSize: 12.5, color: P.subtle }}>演示</span>
                </MBRow>
              </MBCard>
            </>
          )}

          {/* ===== About ===== */}
          {pane === "about" && (
            <MBCard P={P}>
              <div style={{ padding: "26px 16px", textAlign: "center" }}>
                <div style={{ width: 60, height: 60, display: "flex", alignItems: "center",
                  justifyContent: "center", margin: "0 auto 12px" }}>
                  <Icon name="Waves" size={44} color={P.accent} sw={2} />
                </div>
                <div style={{ fontSize: 16, color: P.text, fontWeight: 500 }}>Tidal</div>
                <div style={{ fontSize: 12.5, color: P.subtle, marginTop: 4 }}>
                  菜单栏资产看板 · 版本 1.0 (3)</div>
                <div style={{ fontSize: 12, color: P.subtle, marginTop: 16, lineHeight: 1.6 }}>
                  安静地追踪你的持仓、自选与大盘。<br />数据仅供演示，不构成投资建议。
                </div>
              </div>
            </MBCard>
          )}
        </div>
      </div>

      {modal && <MBPickerModal store={store} P={P} modal={modal}
        onClose={() => setModal(null)} />}

      {/* 同步确认 / 授权 — 以系统设置窗口为宿主的 macOS sheet，而非回到模块内 */}
      {pane === "sync" && <SyncOverlays surface="menubar" P={P} m={syncM} z={90} />}
    </div>
  );
}

window.MBSettingsWindow = MBSettingsWindow;
