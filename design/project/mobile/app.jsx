// Calm Mobile — app shell: bottom tab nav + push-detail stack + sheets + tweaks.
const { useState: useStateA, useRef: useRefA, useEffect: useEffectA } = React;

const M_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#5b4fd4",
  "radius": 16,
  "dark": false
}/*EDITMODE-END*/;

function hexA(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function CalmMobileApp() {
  const store = useStore();
  const [t, setTweak] = useTweaks(M_TWEAK_DEFAULTS);

  // keep header toggle <-> tweak dark in sync (store.theme is source of truth)
  useEffectA(() => {
    const wantDark = store.theme === "dark";
    if (t.dark !== wantDark) setTweak("dark", wantDark);
  }, [store.theme]);
  useEffectA(() => {
    const wantDark = !!t.dark;
    if ((store.theme === "dark") !== wantDark) store.setTheme(wantDark ? "dark" : "light");
  }, [t.dark]);

  useEffectA(() => {
    document.documentElement.style.setProperty("--m-radius", t.radius + "px");
  }, [t.radius]);

  const base = calmPalette(store.theme);
  const P = { ...base, accent: t.accent, accentSoft: hexA(t.accent, base.isDark ? 0.18 : 0.12) };

  const [sheet, setSheet] = useStateA(null);   // {type:'watch'|'holding', code?}
  const [nav, setNav] = useStateA([]);          // stack of {name:'holding'|'fund', code}
  const scrollRef = useRefA(null);

  const tabs = [
    { id: "today", label: "今天", icon: "◎" },
    { id: "holdings", label: "持仓", icon: "▦" },
    { id: "watch", label: "自选", icon: "✦" },
  ];

  const go = (route) => {
    const h = store.holdingsFull.find(x => x.code === route.code);
    setNav(s => [...s, { ...route, name: h && h.isFund ? "fund" : route.name }]);
  };
  const back = () => setNav(s => s.slice(0, -1));

  // reset scroll on tab change
  useEffectA(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [store.tab]);

  const top = nav[nav.length - 1] || null;
  const detailH = top ? store.holdingsFull.find(x => x.code === top.code) : null;

  const titleByTab = { today: "今天", holdings: "持仓", watch: "自选" };
  const subByTab = {
    today: "我的资产看板",
    holdings: `${store.sortedHoldings.length} 只 · 市值 ${cFmtMoney(store.summary.marketValue, { dec: 0 })}`,
    watch: `${store.sortedWatch.length} 只关注中`,
  };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex",
      justifyContent: "center", background: P.isDark ? "#0c0c0e" : "#e9e6df" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 440, height: "100%",
        background: P.bg, color: P.text, overflow: "hidden",
        fontFamily: "'PingFang SC', 'Inter', system-ui, -apple-system, sans-serif",
        boxShadow: P.isDark ? "0 0 60px rgba(0,0,0,0.5)" : "0 0 60px rgba(40,30,20,0.10)" }}>

        {/* ---- main tab scroll ---- */}
        <div ref={scrollRef} style={{ position: "absolute", inset: 0,
          overflowY: "auto", WebkitOverflowScrolling: "touch",
          paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
          <MHeader P={P} large title={titleByTab[store.tab]} sub={subByTab[store.tab]}
            right={<MThemeToggle P={P} theme={store.theme} setTheme={store.setTheme} />} />
          {store.tab === "today" && <MTodayScreen store={store} P={P} openSheet={setSheet} go={go} />}
          {store.tab === "holdings" && <MHoldingsScreen store={store} P={P} openSheet={setSheet} go={go} />}
          {store.tab === "watch" && <MWatchScreen store={store} P={P} openSheet={setSheet} />}
          <div style={{ textAlign: "center", padding: "20px 0 8px", fontSize: 11,
            color: P.subtle }}>数据延迟约 15 秒 · 演示数据 ·{" "}
            <span onClick={store.resetAll} style={{ cursor: "pointer",
              textDecoration: "underline" }}>恢复演示数据</span></div>
        </div>

        {/* ---- tab bar ---- */}
        <MTabBar P={P} tabs={tabs} active={store.tab} onChange={store.setTab} />

        {/* ---- detail push screen ---- */}
        {top && detailH && (
          <DetailScreen key={nav.length + top.code} P={P} store={store}
            route={top} h={detailH} onBack={back} openSheet={setSheet} />
        )}

        {/* ---- sheets ---- */}
        {sheet && sheet.type === "watch" && (
          <MAddWatchSheet P={P} store={store} onClose={() => setSheet(null)} />
        )}
        {sheet && sheet.type === "holding" && (
          <MHoldingSheet P={P} store={store} editCode={sheet.code}
            onClose={() => setSheet(null)} />
        )}

        {/* ---- tweaks ---- */}
        <TweaksPanel>
          <TweakSection label="外观" />
          <TweakColor label="强调色" value={t.accent}
            options={["#5b4fd4", "#2e9d8f", "#c2603a", "#3a6ea5"]}
            onChange={v => setTweak("accent", v)} />
          <TweakSlider label="圆角" value={t.radius} min={8} max={24} step={1} unit="px"
            onChange={v => setTweak("radius", v)} />
          <TweakToggle label="暗色模式" value={t.dark} onChange={v => setTweak("dark", v)} />
        </TweaksPanel>
      </div>
    </div>
  );
}

// slide-in detail (holding / fund)
function DetailScreen({ P, store, route, h, onBack, openSheet }) {
  const [shown, setShown] = useStateA(false);
  const scRef = useRefA(null);
  useEffectA(() => { requestAnimationFrame(() => setShown(true)); }, []);
  const close = () => { setShown(false); setTimeout(onBack, 240); };

  return (
    <div style={{ position: "absolute", inset: 0, background: P.bg, zIndex: 60,
      display: "flex", flexDirection: "column",
      transform: shown ? "translateX(0)" : "translateX(100%)",
      transition: "transform .26s cubic-bezier(.32,.72,0,1)",
      boxShadow: shown ? "none" : "-12px 0 30px rgba(0,0,0,0.15)" }}>
      <MHeader P={P} title={h.name} onBack={close}
        right={<span style={{ width: 30 }} />} />
      <div ref={scRef} style={{ flex: 1, overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}>
        {route.name === "fund"
          ? <MFundScreen h={h} store={store} P={P} openSheet={openSheet} />
          : <MStockDetail h={h} store={store} P={P} openSheet={openSheet} />}
      </div>
    </div>
  );
}

window.CalmMobileApp = CalmMobileApp;
