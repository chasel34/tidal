// Calm Dashboard (web) — OCR screenshot-import modal.
const { useState: useStateOW, useRef: useRefOW } = React;

// segmented 持仓 / 自选
function OcrTargetToggle({ P, value, onChange }) {
  const opts = [{ id: "holding", label: "持仓" }, { id: "watch", label: "自选" }];
  return (
    <div style={{ display: "flex", background: P.chipBg, borderRadius: 10, padding: 3, gap: 2 }}>
      {opts.map(o => {
        const active = o.id === value;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            flex: 1, padding: "7px 0", border: "none", borderRadius: 8, cursor: "pointer",
            fontFamily: "inherit", fontSize: 13, fontWeight: active ? 500 : 400,
            background: active ? P.panel : "transparent", color: active ? P.text : P.muted,
            boxShadow: active ? (P.isDark ? "0 1px 3px rgba(0,0,0,0.4)" : "0 1px 3px rgba(40,30,20,0.1)") : "none",
            transition: "background .15s" }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function OcrDropZone({ P, onFile, onSample }) {
  const inputRef = useRefOW(null);
  const [over, setOver] = useStateOW(false);

  React.useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const it of items) {
        if (it.type && it.type.startsWith("image/")) { onFile(it.getAsFile()); break; }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFile]);

  return (
    <div>
      <div onClick={() => inputRef.current && inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false);
          const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) onFile(f); }}
        style={{ border: `1.5px dashed ${over ? P.accent : P.line}`, borderRadius: 14,
          padding: "38px 20px", textAlign: "center", cursor: "pointer",
          background: over ? P.accentSoft : (P.isDark ? "#16161a" : "#faf9f5"),
          transition: "border-color .15s, background .15s" }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, margin: "0 auto 14px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: P.accentSoft, color: P.accent, fontSize: 22 }}>⎙</div>
        <div style={{ fontSize: 14, color: P.text, marginBottom: 5 }}>拖入截图，或点击选择文件</div>
        <div style={{ fontSize: 12, color: P.subtle }}>支持持仓 / 自选列表截图 · 也可直接粘贴（⌘V）</div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files && e.target.files[0]; if (f) onFile(f); }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 2px" }}>
        <div style={{ flex: 1, height: 1, background: P.lineSoft }} />
        <span style={{ fontSize: 11.5, color: P.subtle }}>没有截图？</span>
        <div style={{ flex: 1, height: 1, background: P.lineSoft }} />
      </div>
      <button onClick={onSample} style={{ ...calmBtn(P), width: "100%", padding: "10px 0" }}>
        使用示例截图体验</button>
    </div>
  );
}

function OcrReviewRow({ P, row, target, editRow, removeRow, alreadyHas }) {
  const D = window.CALM;
  const inst = row.matchedCode ? D.instruments[row.matchedCode] : null;
  const matched = !!row.matchedCode;
  const cellInput = { ...calmInput(P), padding: "7px 9px", fontSize: 13, borderRadius: 8 };

  return (
    <div style={{ padding: "12px 4px", borderBottom: `1px solid ${P.lineSoft}`,
      opacity: matched ? 1 : 0.6, animation: "ocrfadein .3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, color: P.text }}>{row.name}</span>
            {!matched && (
              <span style={{ fontSize: 10.5, color: P.subtle, border: `1px solid ${P.line}`,
                borderRadius: 6, padding: "1px 6px" }}>未匹配 · 将跳过</span>
            )}
            {matched && target === "watch" && alreadyHas && (
              <span style={{ fontSize: 10.5, color: P.subtle }}>已在自选</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: P.subtle, marginTop: 2, letterSpacing: "0.03em" }}>
            {row.code}{inst ? ` · ${inst.sector} · 现价 ¥${cFmtNum(inst.price)}` : " · 不在标的库"}</div>
        </div>
        {matched && target === "holding" && (
          <div style={{ display: "flex", gap: 6 }}>
            <input value={row.shares} inputMode="decimal" aria-label="股数"
              onChange={e => editRow(row.id, { shares: e.target.value.replace(/[^0-9.]/g, "") })}
              style={{ ...cellInput, width: 66, textAlign: "right" }} />
            <input value={row.cost} inputMode="decimal" aria-label="成本"
              onChange={e => editRow(row.id, { cost: e.target.value.replace(/[^0-9.]/g, "") })}
              style={{ ...cellInput, width: 74, textAlign: "right" }} />
          </div>
        )}
        <button onClick={() => removeRow(row.id)} title="移除这一行" style={{ background: "transparent",
          border: "none", color: P.subtle, cursor: "pointer", fontSize: 15, padding: "4px 2px",
          flexShrink: 0 }}>✕</button>
      </div>
    </div>
  );
}

// shown when the active provider has no API Key — import is blocked
function OcrGate({ P, ai, onOpenSettings }) {
  const prov = ai.activeProvider;
  return (
    <div style={{ textAlign: "center", padding: "22px 20px 8px" }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, margin: "0 auto 16px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: P.accentSoft, color: P.accent }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z" />
        </svg>
      </div>
      <div style={{ fontSize: 15, color: P.text, marginBottom: 7 }}>需要先配置 AI 识别</div>
      <div style={{ fontSize: 12.5, color: P.subtle, lineHeight: 1.6, marginBottom: 20,
        maxWidth: 340, marginInline: "auto" }}>
        截图导入由大模型 API 识别。请先在设置中填入 <b style={{ color: P.text, fontWeight: 500 }}>{prov.short}</b> 的 API Key。
      </div>
      <button onClick={onOpenSettings} style={{ ...calmBtn(P, "primary") }}>去设置填写 API Key</button>
    </div>
  );
}

function OcrEngineBadge({ P, ai, onOpenSettings }) {
  const prov = ai.activeProvider;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px",
      borderRadius: 10, background: P.isDark ? "#16161a" : "#faf9f5",
      border: `1px solid ${P.lineSoft}`, marginBottom: 14 }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: P.accent }} />
      <div style={{ flex: 1, fontSize: 12, color: P.muted }}>
        智能识别 · <span style={{ color: P.text }}>{prov.short}</span> · {ai.activeModel}
      </div>
      {onOpenSettings && (
        <button onClick={onOpenSettings} style={{ background: "transparent", border: "none",
          color: P.subtle, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", padding: 2 }}>切换</button>
      )}
    </div>
  );
}

function OcrImportModal({ P, store, onClose, defaultTarget, onOpenSettings }) {
  const o = useOcrImport(store, defaultTarget);
  const ai = useAiSettings();
  const D = window.CALM;

  const head = { holding: { unit: "持仓", cols: ["股数", "成本价"] }, watch: { unit: "自选" } }[o.target];

  return (
    <Modal P={P} title="截图导入" onClose={onClose} width={520}>
      {o.step === "upload" && (
        <>
          {ai.isConfigured() ? (
            <>
              <OcrEngineBadge P={P} ai={ai} onOpenSettings={onOpenSettings} />
              <div style={{ fontSize: 12.5, color: P.muted, marginBottom: 12 }}>
                上传一张截图，自动识别其中的标的并导入</div>
              <OcrDropZone P={P} onFile={o.pickFile} onSample={o.useSample} />
            </>
          ) : (
            <OcrGate P={P} ai={ai} onOpenSettings={onOpenSettings} />
          )}
        </>
      )}

      {o.step === "scan" && (
        <div style={{ padding: "8px 0 4px" }}>
          <OcrScanAnim src={o.src} P={P} onDone={o.onScanDone}
            label={ai.scanLabel} maxHeight={300} />
        </div>
      )}

      {o.step === "review" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <img src={o.src} alt="" style={{ width: 44, height: 44, borderRadius: 9,
              objectFit: "cover", objectPosition: "top", border: `1px solid ${P.line}` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: P.text }}>
                识别到 {o.rows.length} 项 · 可导入 {o.importable.length} 项</div>
              <div style={{ fontSize: 11.5, color: P.subtle, marginTop: 2 }}>
                核对无误后确认导入{o.skipped.length > 0 ? ` · ${o.skipped.length} 项不在标的库将跳过` : ""}</div>
            </div>
            <button onClick={o.reset} style={{ ...calmBtn(P), padding: "6px 12px", fontSize: 12 }}>
              重新选择</button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <OcrTargetToggle P={P} value={o.target} onChange={o.setTarget} />
          </div>

          {o.target === "holding" && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, padding: "0 30px 2px 0",
              fontSize: 10.5, color: P.subtle, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              <span style={{ width: 66, textAlign: "right" }}>股数</span>
              <span style={{ width: 74, textAlign: "right" }}>成本价</span>
            </div>
          )}

          <div style={{ maxHeight: 300, overflowY: "auto", margin: "0 -4px" }}>
            {o.rows.map(r => (
              <OcrReviewRow key={r.id} P={P} row={r} target={o.target}
                editRow={o.editRow} removeRow={o.removeRow}
                alreadyHas={o.target === "watch" && store.watch.includes(r.matchedCode)} />
            ))}
            {o.rows.length === 0 && (
              <div style={{ color: P.muted, fontSize: 13, padding: "26px 4px", textAlign: "center" }}>
                没有可导入的项了</div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 18 }}>
            <span style={{ fontSize: 12, color: P.subtle }}>
              导入为{o.target === "holding" ? "持仓" : "自选"}</span>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={calmBtn(P)}>取消</button>
              <button onClick={o.confirm} disabled={o.importable.length === 0} style={{
                ...calmBtn(P, "primary"), opacity: o.importable.length ? 1 : 0.45,
                cursor: o.importable.length ? "pointer" : "not-allowed" }}>
                确认导入 {o.importable.length} 项</button>
            </div>
          </div>
        </>
      )}

      {o.step === "done" && (
        <div style={{ textAlign: "center", padding: "26px 10px 18px" }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, margin: "0 auto 16px",
            background: P.accentSoft, color: P.accent, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 28, animation: "ocrpop .4s ease both" }}>✓</div>
          <div style={{ fontSize: 16, color: P.text, marginBottom: 6 }}>
            已导入 {o.imported} 项到{o.target === "holding" ? "持仓" : "自选"}</div>
          <div style={{ fontSize: 12.5, color: P.subtle, marginBottom: 22 }}>
            {o.skipped.length > 0 ? `${o.skipped.length} 项不在标的库，已跳过` : "全部识别项已导入"}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={o.reset} style={calmBtn(P)}>再导入一张</button>
            <button onClick={onClose} style={calmBtn(P, "primary")}>完成</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

Object.assign(window, { OcrImportModal, OcrTargetToggle });
