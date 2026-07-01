// Calm Mobile (calm-mobile) — OCR screenshot-import bottom sheet.
const { useState: useStateMO, useRef: useRefMO } = React;

function MOcrRow({ T, row, target, editRow, removeRow, alreadyHas }) {
  const P = T.P;
  const D = window.CALM;
  const inst = row.matchedCode ? D.instruments[row.matchedCode] : null;
  const matched = !!row.matchedCode;
  const field = { boxSizing: "border-box", width: "100%", background: P.isDark ? "#16161a" : "#faf9f5",
    border: `1px solid ${P.line}`, borderRadius: 10, padding: "11px 12px", fontSize: 16, color: P.text,
    fontFamily: "inherit", outline: "none", textAlign: "right", fontVariantNumeric: "tabular-nums" };

  return (
    <div style={{ padding: "14px 2px", borderBottom: `1px solid ${P.lineSoft}`,
      opacity: matched ? 1 : 0.6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15.5, color: P.text }}>{row.name}</span>
            {!matched && (
              <span style={{ fontSize: 11, color: P.subtle, border: `1px solid ${P.line}`,
                borderRadius: 6, padding: "1px 7px" }}>未匹配 · 将跳过</span>
            )}
            {matched && target === "watch" && alreadyHas && (
              <span style={{ fontSize: 11, color: P.subtle }}>已在自选</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: P.subtle, marginTop: 3, letterSpacing: "0.03em" }}>
            {row.code}{inst ? ` · ${inst.sector} · ¥${cFmtNum(inst.price)}` : " · 不在标的库"}</div>
        </div>
        <button onClick={() => removeRow(row.id)} aria-label="移除" style={{ background: P.chipBg,
          border: "none", color: P.muted, width: 30, height: 30, borderRadius: 15, fontSize: 14,
          cursor: "pointer", flexShrink: 0, lineHeight: 1 }}>✕</button>
      </div>
      {matched && target === "holding" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 11 }}>
          <div>
            <label style={{ fontSize: 11, color: P.subtle, display: "block", marginBottom: 5 }}>股数</label>
            <input value={row.shares} inputMode="decimal" style={field}
              onChange={e => editRow(row.id, { shares: e.target.value.replace(/[^0-9.]/g, "") })} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: P.subtle, display: "block", marginBottom: 5 }}>成本价（¥）</label>
            <input value={row.cost} inputMode="decimal" style={field}
              onChange={e => editRow(row.id, { cost: e.target.value.replace(/[^0-9.]/g, "") })} />
          </div>
        </div>
      )}
    </div>
  );
}

function MOcrGate({ T, ai, onOpenSettings }) {
  const P = T.P;
  const prov = ai.activeProvider;
  return (
    <div style={{ textAlign: "center", padding: "14px 12px 8px" }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: P.accentSoft, color: P.accent }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z" />
        </svg>
      </div>
      <div style={{ fontSize: 16, color: P.text, marginBottom: 8 }}>需要先配置 AI 识别</div>
      <div style={{ fontSize: 13, color: P.subtle, lineHeight: 1.6, marginBottom: 22 }}>
        截图导入由大模型 API 识别。请先在设置中填入 {prov.short} 的 API Key。</div>
      <button onClick={onOpenSettings} style={{ width: "100%", background: P.accent, color: "#fff",
        border: "none", borderRadius: 14, padding: "15px", fontSize: 16, fontWeight: 600,
        fontFamily: "inherit", cursor: "pointer" }}>去设置填写 API Key</button>
    </div>
  );
}

function MOcrEngineBadge({ T, ai, onOpenSettings }) {
  const P = T.P;
  const prov = ai.activeProvider;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 13px",
      borderRadius: 13, background: P.isDark ? "#16161a" : "#faf9f5",
      border: `1px solid ${P.lineSoft}`, marginBottom: 14 }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: P.accent }} />
      <div style={{ flex: 1, fontSize: 12.5, color: P.muted }}>
        智能识别 · <span style={{ color: P.text }}>{prov.short}</span> · {ai.activeModel}
      </div>
      {onOpenSettings && (
        <button onClick={onOpenSettings} style={{ background: "transparent", border: "none",
          color: P.subtle, fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 2 }}>切换</button>
      )}
    </div>
  );
}

function MOcrImportSheet({ T, store, onClose, defaultTarget, onOpenSettings }) {
  const P = T.P;
  const o = useOcrImport(store, defaultTarget);
  const ai = useAiSettings();
  const fileRef = useRefMO(null);
  const targetLabel = o.target === "holding" ? "持仓" : "自选";
  const sub = { upload: "上传截图，自动识别并导入", scan: "识别中…",
    review: `识别到 ${o.rows.length} 项 · 可导入 ${o.importable.length} 项`, done: "导入完成" }[o.step];

  const primaryBtn = (label, onClick, disabled) => (
    <button onClick={onClick} disabled={disabled} style={{ width: "100%", background: P.accent,
      color: "#fff", border: "none", borderRadius: 14, padding: "15px", fontSize: 16, fontWeight: 600,
      fontFamily: "inherit", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1 }}>
      {label}</button>
  );

  return (
    <MSheet T={T} title="截图导入" sub={sub} onClose={onClose}>
      {o.step === "upload" && (
        ai.isConfigured() ? (
        <div style={{ paddingBottom: 6 }}>
          <MOcrEngineBadge T={T} ai={ai} onOpenSettings={onOpenSettings} />
          <button onClick={() => fileRef.current && fileRef.current.click()} style={{ width: "100%",
            border: `1.5px dashed ${P.line}`, borderRadius: 16, padding: "32px 18px", textAlign: "center",
            background: P.isDark ? "#16161a" : "#faf9f5", cursor: "pointer", fontFamily: "inherit" }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, margin: "0 auto 14px",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: P.accentSoft, color: P.accent, fontSize: 24 }}>⎙</div>
            <div style={{ fontSize: 15, color: P.text, marginBottom: 5 }}>选择截图导入</div>
            <div style={{ fontSize: 12.5, color: P.subtle }}>从相册选择持仓 / 自选列表截图</div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { const f = e.target.files && e.target.files[0]; if (f) o.pickFile(f); }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 14px" }}>
            <div style={{ flex: 1, height: 1, background: P.lineSoft }} />
            <span style={{ fontSize: 12, color: P.subtle }}>没有截图？</span>
            <div style={{ flex: 1, height: 1, background: P.lineSoft }} />
          </div>
          <button onClick={o.useSample} style={{ width: "100%", background: "transparent",
            color: P.text, border: `1px solid ${P.line}`, borderRadius: 14, padding: "13px",
            fontSize: 14.5, fontFamily: "inherit", cursor: "pointer" }}>使用示例截图体验</button>
        </div>
        ) : (
          <MOcrGate T={T} ai={ai} onOpenSettings={onOpenSettings} />
        )
      )}

      {o.step === "scan" && (
        <div style={{ padding: "6px 0 10px" }}>
          <OcrScanAnim src={o.src} P={P} onDone={o.onScanDone}
            label={ai.scanLabel} maxHeight={320} />
        </div>
      )}

      {o.step === "review" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <img src={o.src} alt="" style={{ width: 46, height: 46, borderRadius: 10,
              objectFit: "cover", objectPosition: "top", border: `1px solid ${P.line}` }} />
            <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: P.subtle }}>
              {o.skipped.length > 0 ? `${o.skipped.length} 项不在标的库，将跳过` : "全部识别项均可导入"}</div>
            <button onClick={o.reset} style={{ background: P.chipBg, border: "none", color: P.muted,
              borderRadius: 999, padding: "8px 14px", fontSize: 13, cursor: "pointer",
              fontFamily: "inherit", flexShrink: 0 }}>重选</button>
          </div>

          <div style={{ marginBottom: 6 }}>
            <MSegmented T={T} options={["持仓", "自选"]} value={targetLabel}
              onChange={v => o.setTarget(v === "持仓" ? "holding" : "watch")} />
          </div>

          <div>
            {o.rows.map(r => (
              <MOcrRow key={r.id} T={T} row={r} target={o.target}
                editRow={o.editRow} removeRow={o.removeRow}
                alreadyHas={o.target === "watch" && store.watch.includes(r.matchedCode)} />
            ))}
            {o.rows.length === 0 && (
              <div style={{ color: P.muted, fontSize: 14, padding: "28px 4px", textAlign: "center" }}>
                没有可导入的项了</div>
            )}
          </div>

          <div style={{ marginTop: 18 }}>
            {primaryBtn(`确认导入 ${o.importable.length} 项到${targetLabel}`, o.confirm, o.importable.length === 0)}
          </div>
        </div>
      )}

      {o.step === "done" && (
        <div style={{ textAlign: "center", padding: "20px 10px 14px" }}>
          <div style={{ width: 60, height: 60, borderRadius: 30, margin: "0 auto 16px",
            background: P.accentSoft, color: P.accent, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 30, animation: "ocrpop .4s ease" }}>✓</div>
          <div style={{ fontSize: 17, color: P.text, marginBottom: 6 }}>
            已导入 {o.imported} 项到{targetLabel}</div>
          <div style={{ fontSize: 13, color: P.subtle, marginBottom: 22 }}>
            {o.skipped.length > 0 ? `${o.skipped.length} 项不在标的库，已跳过` : "全部识别项已导入"}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={o.reset} style={{ flex: 1, background: "transparent", color: P.text,
              border: `1px solid ${P.line}`, borderRadius: 14, padding: "13px", fontSize: 14.5,
              fontFamily: "inherit", cursor: "pointer" }}>再导入一张</button>
            <div style={{ flex: 1 }}>{primaryBtn("完成", onClose)}</div>
          </div>
        </div>
      )}
    </MSheet>
  );
}

Object.assign(window, { MOcrImportSheet, MOcrRow });
