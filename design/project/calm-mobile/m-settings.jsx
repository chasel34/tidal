// Calm Mobile — Settings sheet: a two-item list that pushes to sub-pages
// (智能识别 / 备份与同步). Each sub-page renders in the same bottom sheet with a
// back chevron in the header.
const { useState: useStateMS } = React;

function MSField({ T, label, hint, children }) {
  const P = T.P;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
        margin: "0 2px 7px" }}>
        <span style={{ fontSize: 12.5, color: P.subtle, fontWeight: 600 }}>{label}</span>
        {hint && <span style={{ fontSize: 11.5, color: P.subtle }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function MSKeyField({ T, value, onChange, placeholder }) {
  const P = T.P;
  const [show, setShow] = useStateMS(false);
  return (
    <div style={{ position: "relative" }}>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        type={show ? "text" : "password"} spellCheck={false} autoComplete="off"
        style={{ boxSizing: "border-box", width: "100%", background: P.isDark ? "#16161a" : "#faf9f5",
          border: `1px solid ${P.line}`, borderRadius: 12, padding: "13px 60px 13px 14px", fontSize: 15,
          color: P.text, outline: "none", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          letterSpacing: show ? "0" : "0.04em" }} />
      <button onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 8, top: "50%",
        transform: "translateY(-50%)", background: P.chipBg, border: "none", color: P.muted,
        fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: "6px 10px", borderRadius: 8 }}>
        {show ? "隐藏" : "显示"}</button>
    </div>
  );
}

// ---- settings menu: rows that push to sub-pages ----
function MSMenuRow({ T, icon, label, sub, status, onClick }) {
  const P = T.P;
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 13, width: "100%",
      textAlign: "left", background: P.panel, border: `1px solid ${P.line}`, borderRadius: T.rad,
      padding: "15px 16px", cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}>
      <span style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: P.accentSoft,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={19} color={P.accent} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15.5, color: P.text, fontWeight: 500 }}>{label}</span>
        <span style={{ display: "block", fontSize: 12.5, color: P.subtle, marginTop: 2 }}>{sub}</span>
      </span>
      {status}
      <Icon name="ChevronRight" size={18} color={P.subtle} />
    </button>
  );
}

// ---- 智能识别 (BYOK AI) sub-page body ----
function MSAiBody({ T }) {
  const P = T.P;
  const ai = useAiSettings();
  const [adv, setAdv] = useStateMS(false);
  const [testing, setTesting] = useStateMS(false);
  const [result, setResult] = useStateMS(null);
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

  const monoField = { boxSizing: "border-box", width: "100%", background: P.isDark ? "#16161a" : "#faf9f5",
    border: `1px solid ${P.line}`, borderRadius: 12, padding: "13px 14px", fontSize: 14,
    color: P.text, outline: "none", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };

  return (
    <>
      <div style={{ fontSize: 12.5, color: P.subtle, margin: "0 4px 20px", lineHeight: 1.55 }}>
        截图导入由你自己的大模型 API 识别。填入 API Key 后即可使用，未填则无法使用截图导入。
      </div>

      <MSectionLabel T={T}>AI 服务商</MSectionLabel>
      <div style={{ marginBottom: 6 }}>
        <MSegmented T={T} options={ai.providers.map(p => p.short)} value={prov.short}
          onChange={v => { const p = ai.providers.find(x => x.short === v); if (p) { ai.setActiveProvider(p.id); clearResult(); } }} />
      </div>
      <div style={{ fontSize: 12, color: P.subtle, margin: "0 4px 20px" }}>{prov.blurb}</div>

      <MSField T={T} label="API Key" hint={prov.docHint}>
        <MSKeyField T={T} value={cfg.apiKey}
          onChange={v => { ai.setField(prov.id, "apiKey", v); clearResult(); }}
          placeholder={prov.keyPlaceholder} />
        {!configured && (
          <div style={{ fontSize: 12, color: errColor, margin: "7px 2px 0" }}>
            未填写 API Key 时，截图导入不可用。</div>
        )}
      </MSField>

      <MSField T={T} label="识别模型 ID" hint={prov.modelHint}>
        <input value={cfg.model} onChange={e => { ai.setField(prov.id, "model", e.target.value); clearResult(); }}
          placeholder={prov.defaultModel} spellCheck={false} autoCapitalize="none" style={monoField} />
      </MSField>

      <button onClick={() => setAdv(a => !a)} style={{ background: "transparent", border: "none",
        color: P.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: "0 2px 8px",
        display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, transform: adv ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
        高级设置
      </button>
      {adv && (
        <MSField T={T} label="API 域名（Base URL）" hint="留空用默认">
          <input value={cfg.baseURL} onChange={e => { ai.setField(prov.id, "baseURL", e.target.value); clearResult(); }}
            placeholder={prov.defaultBaseURL} spellCheck={false} autoCapitalize="none"
            style={{ ...monoField, fontSize: 13 }} />
        </MSField>
      )}

      <button onClick={runTest} disabled={testing} style={{ width: "100%", marginTop: 6,
        background: "transparent", color: P.text, border: `1px solid ${P.line}`, borderRadius: 14,
        padding: "13px", fontSize: 15, fontFamily: "inherit", cursor: testing ? "default" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: testing ? 0.6 : 1 }}>
        {testing && <span style={{ width: 14, height: 14, borderRadius: 7, display: "inline-block",
          border: `2px solid ${P.line}`, borderTopColor: P.accent, animation: "mspin .7s linear infinite" }} />}
        {testing ? "测试中…" : "测试连接"}
      </button>
      {result && (
        <div style={{ marginTop: 12, fontSize: 13, textAlign: "center",
          color: result.ok ? okColor : errColor }}>
          {result.ok ? "✓ " : "⚠ "}{result.msg}</div>
      )}

      <div style={{ marginTop: 20, padding: "13px 15px", borderRadius: 14,
        background: P.isDark ? "#16161a" : "#faf9f5", border: `1px solid ${P.lineSoft}`,
        fontSize: 12, color: P.muted, lineHeight: 1.65 }}>
        导入的截图会上传至 <b style={{ color: P.text, fontWeight: 600 }}>{prov.short}</b> 进行识别。
        持仓数据较为敏感，请确认你信任该服务商。API Key 仅保存在本设备。
      </div>
    </>
  );
}

// ---- settings sheet: menu → sub-page ----
function MSettingsSheet({ T, onClose }) {
  const P = T.P;
  const [view, setView] = useStateMS("menu");
  const configured = useAiSettings().isConfigured();
  const m = useSyncMachine("mobile");

  const title = view === "ai" ? "智能识别" : view === "sync" ? "备份与同步" : "设置";
  const sub = view === "ai" ? "截图识别 · BYOK" : null;

  return (
    <>
    <MSheet T={T} title={title} sub={sub} onClose={onClose}
      onBack={view === "menu" ? undefined : () => setView("menu")}>

      {view === "menu" && (
        <div style={{ paddingBottom: 4 }}>
          <MSMenuRow T={T} icon="Sparkles" label="智能识别" sub="截图导入 · 自带大模型 API"
            onClick={() => setView("ai")}
            status={<span style={{ fontSize: 12, color: configured ? (P.isDark ? "#37c98c" : "#0f9d63") : P.subtle,
              marginRight: 2 }}>{configured ? "已配置" : "未配置"}</span>} />
          <MSMenuRow T={T} icon="RefreshCcw" label="备份与同步" sub="Google Drive 云同步与本地备份"
            onClick={() => setView("sync")} />
        </div>
      )}

      {view === "ai" && <MSAiBody T={T} />}

      {view === "sync" && (
        <div style={{ position: "relative", height: "min(560px, 68vh)", overflow: "hidden",
          margin: "-16px -20px -8px" }}>
          <SyncBody surface="mobile" P={P} m={m} />
        </div>
      )}
    </MSheet>
    {/* 同步确认 / 授权 — 以整个手机为宿主的底部弹层，而非局限在子页区域 */}
    {view === "sync" && <SyncOverlays surface="mobile" P={P} m={m} z={210} />}
    </>
  );
}

Object.assign(window, { MSettingsSheet });
