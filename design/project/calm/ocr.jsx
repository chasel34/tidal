// Calm — shared OCR-import logic + scan animation.
// Loaded by web / mobile / menubar. Depends only on React + window.CALM + props,
// so the same component/hook works across all three pages.
const { useState: useStateOCR, useEffect: useEffectOCR, useRef: useRefOCR } = React;

// inject shared keyframes once (each page has its own <style>, this is page-agnostic)
(function ensureOcrStyles() {
  if (document.getElementById("ocr-styles")) return;
  const s = document.createElement("style");
  s.id = "ocr-styles";
  s.textContent = `
    @keyframes ocrpulse { 0%,100%{opacity:.35;transform:scale(.78)} 50%{opacity:1;transform:scale(1.1)} }
    @keyframes ocrfadein { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
    @keyframes ocrspin { to { transform: rotate(360deg) } }
    @keyframes ocrpop { 0%{transform:scale(.5);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
  `;
  document.head.appendChild(s);
})();

function ocrHexA(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// path is project-root-relative; all three HTML files live at root.
const OCR_SAMPLE = "assets/ocr-sample.png";

// Preset "recognized" rows (demo). As if OCR'd from a broker holdings screenshot.
// Mix of universe matches + one HK code (00700) that the app doesn't carry → skipped.
const OCR_PRESET = [
  { name: "比亚迪", code: "002594", shares: 100, cost: 245.80 },
  { name: "五粮液", code: "000858", shares: 200, cost: 138.50 },
  { name: "中国平安", code: "601318", shares: 300, cost: 50.20 },
  { name: "恒瑞医药", code: "600276", shares: 500, cost: 44.10 },
  { name: "美的集团", code: "000333", shares: 100, cost: 68.90 },
  { name: "腾讯控股", code: "00700", shares: 100, cost: 380.00 },
];

// match a recognized row to the instrument universe → code or null
function ocrMatchCode(row) {
  const inst = window.CALM.instruments;
  if (row.code && inst[row.code]) return row.code;
  const byName = Object.values(inst).find(i => i.name === row.name);
  return byName ? byName.code : null;
}

function ocrReadFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// demo recognizer: returns preset rows tagged with their matched code
function ocrRecognize() {
  return OCR_PRESET.map((r, i) => ({
    id: "r" + i, name: r.name, code: r.code,
    shares: r.shares, cost: r.cost,
    matchedCode: ocrMatchCode(r),
  }));
}

// ---------------- scan animation ----------------
// Renders the uploaded screenshot with a soft accent light-band sweeping over it.
// Self-contained (Web Animations API + rAF); calls onDone after `duration` ms.
function OcrScanAnim({ src, P, onDone, duration = 2300, label = "正在识别…", maxHeight = 300 }) {
  const wrapRef = useRefOCR(null);
  const bandRef = useRefOCR(null);
  const [h, setH] = useStateOCR(0);
  const [pct, setPct] = useStateOCR(0);

  useEffectOCR(() => {
    const t = setTimeout(() => onDone && onDone(), duration);
    return () => clearTimeout(t);
  }, []);

  useEffectOCR(() => {
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setPct(Math.round(p * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffectOCR(() => {
    if (!h || !bandRef.current) return;
    const bandH = 84;
    const anim = bandRef.current.animate(
      [{ transform: `translateY(${-bandH}px)`, opacity: 0 },
       { transform: `translateY(2px)`, opacity: 1, offset: 0.09 },
       { transform: `translateY(${h - bandH - 2}px)`, opacity: 1, offset: 0.91 },
       { transform: `translateY(${h}px)`, opacity: 0 }],
      { duration: duration / 2, iterations: 2, easing: "cubic-bezier(.45,0,.55,1)" });
    return () => { try { anim.cancel(); } catch (e) {} };
  }, [h]);

  const a = P.accent;
  return (
    <div>
      <div ref={wrapRef} style={{ position: "relative", borderRadius: 14, overflow: "hidden",
        border: `1px solid ${P.line}`, background: P.isDark ? "#16161a" : "#f4f2ec" }}>
        <img src={src} alt="" onLoad={e => setH(e.target.clientHeight)}
          style={{ display: "block", width: "100%", height: "auto", maxHeight,
            objectFit: "cover", objectPosition: "top" }} />
        <div style={{ position: "absolute", inset: 0,
          background: P.isDark ? "rgba(10,10,12,0.34)" : "rgba(250,249,246,0.26)" }} />
        <div ref={bandRef} style={{ position: "absolute", left: 0, right: 0, top: 0, height: 84,
          pointerEvents: "none", willChange: "transform",
          background: `linear-gradient(to bottom, ${ocrHexA(a, 0)} 0%, ${ocrHexA(a, 0.14)} 55%, ${ocrHexA(a, 0.28)} 90%, ${ocrHexA(a, 0)} 100%)` }}>
          <div style={{ position: "absolute", left: 6, right: 6, bottom: 5, height: 2, borderRadius: 2,
            background: a, boxShadow: `0 0 14px 2px ${ocrHexA(a, 0.7)}` }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 16,
        justifyContent: "center" }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: a,
          animation: "ocrpulse 1s ease-in-out infinite" }} />
        <span style={{ fontSize: 13.5, color: P.muted }}>{label}</span>
        <span style={{ fontSize: 13.5, color: P.subtle, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
      </div>
    </div>
  );
}

// ---------------- shared import flow state ----------------
// step: upload → scan → review → done
function useOcrImport(store, defaultTarget) {
  const [step, setStep] = useStateOCR("upload");
  const [src, setSrc] = useStateOCR(null);
  const [target, setTarget] = useStateOCR(defaultTarget || "holding");
  const [rows, setRows] = useStateOCR([]);
  const [imported, setImported] = useStateOCR(0);

  const pickFile = async (file) => {
    if (!file) return;
    try { const url = await ocrReadFile(file); setSrc(url); setStep("scan"); } catch (e) {}
  };
  const useSample = () => { setSrc(OCR_SAMPLE); setStep("scan"); };
  const onScanDone = () => {
    setRows(ocrRecognize().map(r => ({ ...r, include: !!r.matchedCode })));
    setStep("review");
  };
  const editRow = (id, patch) => setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
  const removeRow = (id) => setRows(rs => rs.filter(r => r.id !== id));

  const isImportable = (r) => {
    if (!r.matchedCode || !r.include) return false;
    if (target === "holding") return Number(r.shares) > 0 && Number(r.cost) > 0;
    return true;
  };
  const importable = rows.filter(isImportable);
  const skipped = rows.filter(r => !r.matchedCode);

  const confirm = () => {
    importable.forEach(r => {
      if (target === "holding") store.addHolding(r.matchedCode, Number(r.shares), Number(r.cost));
      else store.addWatch(r.matchedCode);
    });
    setImported(importable.length);
    setStep("done");
  };
  const reset = () => { setStep("upload"); setSrc(null); setRows([]); setImported(0); };

  return { step, setStep, src, target, setTarget, rows, imported,
    pickFile, useSample, onScanDone, editRow, removeRow,
    isImportable, importable, skipped, confirm, reset };
}

Object.assign(window, {
  OCR_PRESET, OCR_SAMPLE, ocrHexA, ocrMatchCode, ocrReadFile, ocrRecognize,
  OcrScanAnim, useOcrImport,
});
