// Google Drive 同步 — review app: toolbar + scenario rail + staged surface mock.
const { useState: useStateA, useEffect: useEffectA } = React;

// constant review chrome palette (independent of the toggled surface theme)
const CH = {
  bg: "#e7e4dd", stage: "#dedbd3", panel: "#ffffff", line: "rgba(40,30,20,0.10)",
  text: "#272420", muted: "rgba(58,50,40,0.64)", subtle: "rgba(58,50,40,0.42)",
  accent: "#5b4fd4", activeBg: "rgba(91,79,212,0.10)", railBg: "#f3f1ec",
};

const LS = { surface: "gdsync.surface", theme: "gdsync.theme", scenario: "gdsync.scenario" };
const readLS = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };

function ChSeg({ value, options, onChange }) {
  return (
    <div style={{ display: "flex", background: "rgba(40,30,20,0.06)", borderRadius: 9, padding: 3, gap: 2 }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{ border: "none", cursor: "pointer",
            fontFamily: "inherit", fontSize: 12.5, fontWeight: active ? 500 : 400, padding: "6px 13px", borderRadius: 7,
            background: active ? CH.panel : "transparent", color: active ? CH.text : CH.muted,
            boxShadow: active ? "0 1px 3px rgba(40,30,20,0.12)" : "none", transition: "background .15s" }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function SyncFlowApp() {
  const [surface, setSurface] = useStateA(() => readLS(LS.surface, "web"));
  const [theme, setTheme] = useStateA(() => readLS(LS.theme, "light"));
  const [scenario, setScenario] = useStateA(() => readLS(LS.scenario, "disconnected"));
  const [nonce, setNonce] = useStateA(0);

  useEffectA(() => { try { localStorage.setItem(LS.surface, surface); } catch {} }, [surface]);
  useEffectA(() => { try { localStorage.setItem(LS.theme, theme); } catch {} }, [theme]);
  useEffectA(() => { try { localStorage.setItem(LS.scenario, scenario); } catch {} }, [scenario]);

  const P = window.calmPalette(theme);
  const S = window.SYNC_TOK[surface];
  const m = window.useSyncFlow(surface, scenario, nonce);

  const pickScenario = (id) => { setScenario(id); setNonce(n => n + 1); };
  const Shell = surface === "web" ? WebShell : surface === "menubar" ? MenubarShell : MobileShell;

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      background: CH.bg, color: CH.text, fontFamily: "'PingFang SC','Inter',system-ui,sans-serif" }}>
      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "11px 20px",
        borderBottom: `1px solid ${CH.line}`, background: CH.panel, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 24, height: 24, borderRadius: 7, background: CH.accent, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>盘</span>
          <span style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.01em" }}>Google Drive 同步</span>
          <span style={{ fontSize: 12.5, color: CH.subtle }}>交互流程</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <ChSeg value={surface} onChange={setSurface}
            options={[{ value: "web", label: "网页端" }, { value: "menubar", label: "菜单栏" }, { value: "mobile", label: "移动端" }]} />
          <ChSeg value={theme} onChange={setTheme}
            options={[{ value: "light", label: "亮色" }, { value: "dark", label: "暗色" }]} />
          <button onClick={() => setNonce(n => n + 1)} title="重置当前状态" style={{ display: "flex", alignItems: "center", gap: 6,
            background: "transparent", border: `1px solid ${CH.line}`, color: CH.muted, borderRadius: 8,
            padding: "7px 12px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
            <Icon name="RotateCcw" size={13} color={CH.muted} /> 重置
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {/* scenario rail */}
        <div style={{ width: 224, flexShrink: 0, overflowY: "auto", background: CH.railBg,
          borderRight: `1px solid ${CH.line}`, padding: "16px 12px 32px" }}>
          {window.SYNC_SCENARIOS.map(g => (
            <div key={g.group} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: CH.subtle, letterSpacing: "0.07em", textTransform: "uppercase",
                padding: "0 10px 7px", fontWeight: 600 }}>{g.group}</div>
              {g.items.map(it => {
                const active = scenario === it.id;
                return (
                  <button key={it.id} onClick={() => pickScenario(it.id)} style={{ display: "flex", alignItems: "center",
                    gap: 8, width: "100%", textAlign: "left", border: "none", cursor: "pointer", fontFamily: "inherit",
                    fontSize: 13, padding: "8px 10px", borderRadius: 8, marginBottom: 1,
                    background: active ? CH.activeBg : "transparent", color: active ? CH.accent : CH.text,
                    fontWeight: active ? 500 : 400, transition: "background .12s" }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(40,30,20,0.04)"; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                      background: active ? CH.accent : "transparent" }} />
                    {it.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* stage */}
        <div style={{ flex: 1, minWidth: 0, overflow: "auto", background: CH.stage,
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: surface === "mobile" ? "18px 28px" : "36px 28px" }}>
          <Shell P={P} surface={surface}>
            <SyncPanel P={P} S={S} surface={surface} m={m} />
          </Shell>
        </div>
      </div>
    </div>
  );
}

window.SyncFlowApp = SyncFlowApp;
