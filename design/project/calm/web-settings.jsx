// Calm Dashboard (web) — Settings modal (BYOK AI recognition).
const { useState: useStateWS } = React;

// small segmented matching the web palette
function WSeg({ P, value, options, onChange }) {
  return (
    <div style={{ display: "flex", background: P.chipBg, borderRadius: 10, padding: 3, gap: 2 }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            flex: 1, padding: "8px 10px", border: "none", borderRadius: 8, cursor: "pointer",
            fontFamily: "inherit", fontSize: 13, fontWeight: active ? 500 : 400,
            background: active ? P.panel : "transparent", color: active ? P.text : P.muted,
            boxShadow: active ? (P.isDark ? "0 1px 3px rgba(0,0,0,0.4)" : "0 1px 3px rgba(40,30,20,0.1)") : "none",
            transition: "background .15s" }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function WSLabel({ P, children, hint }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
      margin: "0 2px 7px" }}>
      <span style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.06em",
        textTransform: "uppercase" }}>{children}</span>
      {hint && <span style={{ fontSize: 11, color: P.subtle }}>{hint}</span>}
    </div>
  );
}

function WSKeyField({ P, value, onChange, placeholder }) {
  const [show, setShow] = useStateWS(false);
  return (
    <div style={{ position: "relative" }}>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        type={show ? "text" : "password"} spellCheck={false} autoComplete="off"
        style={{ ...calmInput(P), paddingRight: 64, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 13, letterSpacing: show ? "0" : "0.06em" }} />
      <button onClick={() => setShow(s => !s)} type="button" style={{ position: "absolute",
        right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent",
        border: "none", color: P.subtle, fontSize: 11.5, cursor: "pointer", padding: "4px 6px",
        fontFamily: "inherit" }}>{show ? "隐藏" : "显示"}</button>
    </div>
  );
}

function SettingsModal({ P, onClose }) {
  const ai = useAiSettings();
  const [adv, setAdv] = useStateWS(false);
  const [testing, setTesting] = useStateWS(false);
  const [result, setResult] = useStateWS(null);
  const prov = ai.activeProvider;
  const cfg = ai.activeConfig;
  const configured = ai.isConfigured();

  const runTest = async () => {
    setTesting(true); setResult(null);
    const r = await ai.testConnection(prov.id);
    setTesting(false); setResult(r);
  };
  const clearResult = () => setResult(null);

  const okColor = P.isDark ? "#37c98c" : "#0f9d63";
  const errColor = P.isDark ? "#ff5d5d" : "#d6342f";

  return (
    <Modal P={P} title="设置" onClose={onClose} width={500}>
      <div style={{ fontSize: 12.5, color: P.muted, margin: "0 2px 18px", lineHeight: 1.55 }}>
        截图导入由你自己的大模型 API 识别。填入下方服务商的 API Key 后即可使用（未填则无法使用截图导入）。
      </div>

      <div>
        {/* provider */}
        <WSLabel P={P}>AI 服务商</WSLabel>
        <WSeg P={P} value={prov.id}
          onChange={v => { ai.setActiveProvider(v); clearResult(); }}
          options={ai.providers.map(p => ({ value: p.id, label: p.short }))} />

        {/* api key */}
        <div style={{ marginTop: 18 }}>
          <WSLabel P={P} hint={prov.docHint}>{prov.name} · API Key</WSLabel>
          <WSKeyField P={P} value={cfg.apiKey}
            onChange={v => { ai.setField(prov.id, "apiKey", v); clearResult(); }}
            placeholder={prov.keyPlaceholder} />
          {!configured && (
            <div style={{ fontSize: 11.5, color: errColor, margin: "7px 2px 0" }}>
              未填写 API Key 时，截图导入不可用。</div>
          )}
        </div>

        {/* model (free text) */}
        <div style={{ marginTop: 18 }}>
          <WSLabel P={P} hint={prov.modelHint}>识别模型 ID</WSLabel>
          <input value={cfg.model} onChange={e => { ai.setField(prov.id, "model", e.target.value); clearResult(); }}
            placeholder={prov.defaultModel} spellCheck={false}
            style={{ ...calmInput(P), fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 13 }} />
        </div>

        {/* advanced */}
        <button onClick={() => setAdv(a => !a)} style={{ background: "transparent", border: "none",
          color: P.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: "16px 2px 0",
          display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 9, transform: adv ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
          高级设置
        </button>
        {adv && (
          <div style={{ marginTop: 12 }}>
            <WSLabel P={P} hint="留空则用默认">API 域名（Base URL）</WSLabel>
            <input value={cfg.baseURL} onChange={e => { ai.setField(prov.id, "baseURL", e.target.value); clearResult(); }}
              placeholder={prov.defaultBaseURL} spellCheck={false}
              style={{ ...calmInput(P), fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 12.5 }} />
          </div>
        )}

        {/* test + result */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
          <button onClick={runTest} disabled={testing} style={{ ...calmBtn(P),
            display: "flex", alignItems: "center", gap: 7,
            opacity: testing ? 0.6 : 1, cursor: testing ? "default" : "pointer" }}>
            {testing && <span style={{ width: 12, height: 12, borderRadius: 6, display: "inline-block",
              border: `2px solid ${P.line}`, borderTopColor: P.accent, animation: "ocrspin .7s linear infinite" }} />}
            {testing ? "测试中…" : "测试连接"}
          </button>
          {result && (
            <span style={{ fontSize: 12.5, color: result.ok ? okColor : errColor,
              display: "flex", alignItems: "center", gap: 5 }}>
              <span>{result.ok ? "✓" : "⚠"}</span>{result.msg}
            </span>
          )}
        </div>

        {/* privacy */}
        <div style={{ marginTop: 20, padding: "12px 14px", borderRadius: 10,
          background: P.isDark ? "#16161a" : "#faf9f5", border: `1px solid ${P.lineSoft}`,
          display: "flex", gap: 10 }}>
          <span style={{ color: P.subtle, fontSize: 14, lineHeight: 1.3 }}>ⓘ</span>
          <div style={{ fontSize: 11.5, color: P.muted, lineHeight: 1.6 }}>
            导入的截图会上传至 <b style={{ color: P.text, fontWeight: 500 }}>{prov.short}</b> 进行识别。
            持仓数据较为敏感，请确认你信任该服务商。API Key 仅保存在本设备浏览器，不会同步。
          </div>
        </div>
      </div>
    </Modal>
  );
}

Object.assign(window, { SettingsModal });
