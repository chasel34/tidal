// Calm Menubar — OCR screenshot-import modal (mirrors MBPickerModal shell).
const { useState: useStateMBO, useRef: useRefMBO } = React;

function mboBtn(P, variant) {
  const base = { padding: "8px 16px", borderRadius: 9, fontSize: 13, cursor: "pointer",
    fontFamily: "inherit", border: "none", whiteSpace: "nowrap" };
  if (variant === "primary") return { ...base, background: P.accent, color: "#fff" };
  return { ...base, background: "transparent", color: P.text, border: `1px solid ${P.line}` };
}
function mboField(P) {
  return { boxSizing: "border-box", width: "100%", background: P.isDark ? "#16161a" : "#faf9f5",
    border: `1px solid ${P.line}`, borderRadius: 8, padding: "7px 9px", fontSize: 13, color: P.text,
    fontFamily: "inherit", outline: "none", textAlign: "right", fontVariantNumeric: "tabular-nums" };
}

function MBOcrToggle({ P, value, onChange }) {
  const opts = [{ id: "holding", label: "持仓" }, { id: "watch", label: "自选" }];
  return (
    <div style={{ display: "flex", background: P.chipBg, borderRadius: 9, padding: 3, gap: 2 }}>
      {opts.map(o => {
        const active = o.id === value;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{ flex: 1, padding: "6px 0",
            border: "none", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5,
            background: active ? P.panel : "transparent", color: active ? P.text : P.muted,
            boxShadow: active ? (P.isDark ? "0 1px 3px rgba(0,0,0,0.4)" : "0 1px 3px rgba(40,30,20,0.1)") : "none" }}>
            {o.label}</button>
        );
      })}
    </div>
  );
}

function MBOcrRow({ P, row, target, editRow, removeRow, alreadyHas }) {
  const D = window.CALM;
  const inst = row.matchedCode ? D.instruments[row.matchedCode] : null;
  const matched = !!row.matchedCode;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px",
      borderBottom: `1px solid ${P.lineSoft}`, opacity: matched ? 1 : 0.6 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 13, color: P.text }}>{row.name}</span>
          {!matched && (
            <span style={{ fontSize: 10, color: P.subtle, border: `1px solid ${P.line}`,
              borderRadius: 5, padding: "0 5px" }}>未匹配 · 跳过</span>
          )}
          {matched && target === "watch" && alreadyHas && (
            <span style={{ fontSize: 10, color: P.subtle }}>已在自选</span>
          )}
        </div>
        <div style={{ fontSize: 10.5, color: P.subtle, marginTop: 1, letterSpacing: "0.02em" }}>
          {row.code}{inst ? ` · ${inst.sector}` : " · 不在标的库"}</div>
      </div>
      {matched && target === "holding" && (
        <div style={{ display: "flex", gap: 5 }}>
          <input value={row.shares} inputMode="decimal" aria-label="股数" style={{ ...mboField(P), width: 56 }}
            onChange={e => editRow(row.id, { shares: e.target.value.replace(/[^0-9.]/g, "") })} />
          <input value={row.cost} inputMode="decimal" aria-label="成本" style={{ ...mboField(P), width: 64 }}
            onChange={e => editRow(row.id, { cost: e.target.value.replace(/[^0-9.]/g, "") })} />
        </div>
      )}
      <button onClick={() => removeRow(row.id)} aria-label="移除" style={{ background: "transparent",
        border: "none", color: P.subtle, cursor: "pointer", display: "flex", padding: 2, flexShrink: 0 }}>
        <Icon name="X" size={14} color={P.subtle} /></button>
    </div>
  );
}

function MBOcrGate({ P, ai, onOpenSettings }) {
  const prov = ai.activeProvider;
  return (
    <div style={{ textAlign: "center", padding: "18px 14px 6px" }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, margin: "0 auto 13px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: P.accentSoft, color: P.accent }}>
        <Icon name="Sparkles" size={22} color={P.accent} /></div>
      <div style={{ fontSize: 14, color: P.text, marginBottom: 6 }}>需要先配置 AI 识别</div>
      <div style={{ fontSize: 11.5, color: P.subtle, lineHeight: 1.6, marginBottom: 16 }}>
        截图导入由大模型 API 识别。请先在设置中填入 {prov.short} 的 API Key。</div>
      <button onClick={onOpenSettings} style={mboBtn(P, "primary")}>去设置</button>
    </div>
  );
}

function MBOcrEngineBadge({ P, ai, onOpenSettings }) {
  const prov = ai.activeProvider;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px",
      borderRadius: 9, background: P.isDark ? "#16161a" : "#faf9f5",
      border: `1px solid ${P.lineSoft}`, marginBottom: 12 }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: P.accent }} />
      <div style={{ flex: 1, fontSize: 11.5, color: P.muted }}>
        智能识别 · <span style={{ color: P.text }}>{prov.short}</span> · {ai.activeModel}
      </div>
      {onOpenSettings && (
        <button onClick={onOpenSettings} style={{ background: "transparent", border: "none",
          color: P.subtle, fontSize: 11, cursor: "pointer", fontFamily: "inherit", padding: 2 }}>切换</button>
      )}
    </div>
  );
}

// modal: { target?: 'holding' | 'watch' }
function MBOcrImportModal({ store, P, modal, onClose, onOpenSettings }) {
  const o = useOcrImport(store, modal.target);
  const ai = useAiSettings();
  const fileRef = useRefMBO(null);
  const targetLabel = o.target === "holding" ? "持仓" : "自选";

  React.useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div onMouseDown={onClose} style={{ position: "absolute", inset: 0, zIndex: 80,
      background: P.isDark ? "rgba(0,0,0,0.5)" : "rgba(30,28,24,0.32)", display: "flex",
      alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div onMouseDown={e => e.stopPropagation()} style={{ width: 420, maxWidth: "88%",
        maxHeight: "86%", display: "flex", flexDirection: "column", background: P.panel,
        border: `1px solid ${P.line}`, borderRadius: 14, overflow: "hidden",
        fontFamily: "'PingFang SC', 'Inter', system-ui, sans-serif",
        boxShadow: P.isDark ? "0 24px 70px rgba(0,0,0,0.6)" : "0 24px 70px rgba(40,30,20,0.22)" }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "13px 16px", borderBottom: `1px solid ${P.lineSoft}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Icon name="ScanLine" size={17} color={P.accent} />
            <span style={{ fontSize: 14.5, color: P.text, fontWeight: 500 }}>截图导入</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer",
            color: P.muted, display: "flex", padding: 2 }}><Icon name="X" size={17} color={P.muted} /></button>
        </div>

        <div style={{ padding: 16, overflowY: "auto" }}>
          {o.step === "upload" && (
            ai.isConfigured() ? (
            <>
              <MBOcrEngineBadge P={P} ai={ai} onOpenSettings={onOpenSettings} />
              <div style={{ fontSize: 12, color: P.muted, marginBottom: 12 }}>
                上传一张持仓 / 自选列表截图，自动识别并导入</div>
              <button onClick={() => fileRef.current && fileRef.current.click()} style={{ width: "100%",
                border: `1.5px dashed ${P.line}`, borderRadius: 12, padding: "30px 16px", textAlign: "center",
                background: P.isDark ? "#16161a" : "#faf9f5", cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, margin: "0 auto 12px",
                  display: "flex", alignItems: "center", justifyContent: "center", background: P.accentSoft }}>
                  <Icon name="ImageUp" size={20} color={P.accent} /></div>
                <div style={{ fontSize: 13.5, color: P.text, marginBottom: 4 }}>点击选择截图</div>
                <div style={{ fontSize: 11.5, color: P.subtle }}>或拖入图片文件</div>
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { const f = e.target.files && e.target.files[0]; if (f) o.pickFile(f); }} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 12px" }}>
                <div style={{ flex: 1, height: 1, background: P.lineSoft }} />
                <span style={{ fontSize: 11, color: P.subtle }}>没有截图？</span>
                <div style={{ flex: 1, height: 1, background: P.lineSoft }} />
              </div>
              <button onClick={o.useSample} style={{ ...mboBtn(P), width: "100%", padding: "9px 0" }}>
                使用示例截图体验</button>
            </>
            ) : (
              <MBOcrGate P={P} ai={ai} onOpenSettings={onOpenSettings} />
            )
          )}

          {o.step === "scan" && (
            <OcrScanAnim src={o.src} P={P} onDone={o.onScanDone}
              label={ai.scanLabel} maxHeight={260} />
          )}

          {o.step === "review" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
                <img src={o.src} alt="" style={{ width: 40, height: 40, borderRadius: 8,
                  objectFit: "cover", objectPosition: "top", border: `1px solid ${P.line}` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: P.text }}>
                    识别到 {o.rows.length} 项 · 可导入 {o.importable.length} 项</div>
                  <div style={{ fontSize: 11, color: P.subtle, marginTop: 1 }}>
                    {o.skipped.length > 0 ? `${o.skipped.length} 项不在标的库将跳过` : "核对无误后确认"}</div>
                </div>
                <button onClick={o.reset} style={{ ...mboBtn(P), padding: "5px 11px", fontSize: 12 }}>
                  重选</button>
              </div>
              <div style={{ marginBottom: 6 }}>
                <MBOcrToggle P={P} value={o.target} onChange={o.setTarget} />
              </div>
              <div style={{ maxHeight: 230, overflowY: "auto", margin: "0 -4px" }}>
                {o.rows.map(r => (
                  <MBOcrRow key={r.id} P={P} row={r} target={o.target}
                    editRow={o.editRow} removeRow={o.removeRow}
                    alreadyHas={o.target === "watch" && store.watch.includes(r.matchedCode)} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button onClick={onClose} style={mboBtn(P)}>取消</button>
                <button onClick={o.confirm} disabled={o.importable.length === 0} style={{
                  ...mboBtn(P, "primary"), opacity: o.importable.length ? 1 : 0.45,
                  cursor: o.importable.length ? "pointer" : "not-allowed" }}>
                  确认导入 {o.importable.length} 项</button>
              </div>
            </>
          )}

          {o.step === "done" && (
            <div style={{ textAlign: "center", padding: "22px 8px 12px" }}>
              <div style={{ width: 52, height: 52, borderRadius: 26, margin: "0 auto 14px",
                background: P.accentSoft, display: "flex", alignItems: "center", justifyContent: "center",
                animation: "ocrpop .4s ease" }}>
                <Icon name="Check" size={26} color={P.accent} /></div>
              <div style={{ fontSize: 15, color: P.text, marginBottom: 5 }}>
                已导入 {o.imported} 项到{targetLabel}</div>
              <div style={{ fontSize: 12, color: P.subtle, marginBottom: 20 }}>
                {o.skipped.length > 0 ? `${o.skipped.length} 项不在标的库，已跳过` : "全部识别项已导入"}</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={o.reset} style={mboBtn(P)}>再导入一张</button>
                <button onClick={onClose} style={mboBtn(P, "primary")}>完成</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.MBOcrImportModal = MBOcrImportModal;
