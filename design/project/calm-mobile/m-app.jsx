// Calm Mobile — app shell: nav stack, pull-to-refresh, theme toggle, sheets, Tweaks.
const { useState: useStateApp, useRef: useRefApp, useEffect: useEffectApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#5b4fd4",
  "colorway": "涨红跌绿",
  "corner": "适中"
}/*EDITMODE-END*/;

const CORNER_PX = { "圆润": 22, "适中": 16, "方正": 9 };

function MApp() {
  const store = useStore();
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const T = makeT(store.theme, {
    accent: tw.accent,
    colorway: tw.colorway === "涨绿跌红" ? "greenUp" : "redUp",
    radius: CORNER_PX[tw.corner] != null ? CORNER_PX[tw.corner] : 16,
  });
  const P = T.P;
  const D = window.CALM;

  const [detail, setDetail] = useStateApp(null); // code | null
  const [sheet, setSheet] = useStateApp(null);
  const scroller = useRefApp(null);

  // pull-to-refresh
  const [pull, setPull] = useStateApp(0);
  const [refreshing, setRefreshing] = useStateApp(false);
  const [stamp, setStamp] = useStateApp(D.asOf.split(" ")[1]);
  const pullStart = useRefApp(null);

  const goDetail = (code) => { setDetail(code); if (scroller.current) scroller.current.scrollTop = 0; };
  const back = () => setDetail(null);
  const setTab = (t) => { setDetail(null); store.setTab(t); if (scroller.current) scroller.current.scrollTop = 0; };

  // reset detail scroll when switching
  useEffectApp(() => { if (scroller.current) scroller.current.scrollTop = 0; }, [store.tab, detail]);

  const onPullDown = e => {
    if (detail) return;
    if (scroller.current && scroller.current.scrollTop <= 0 && !refreshing) pullStart.current = e.clientY;
  };
  const onPullMove = e => {
    if (pullStart.current == null) return;
    const d = e.clientY - pullStart.current;
    if (d > 0 && scroller.current.scrollTop <= 0) {
      setPull(Math.min(90, d * 0.5));
    } else { pullStart.current = null; setPull(0); }
  };
  const onPullUp = () => {
    if (pullStart.current == null) return;
    pullStart.current = null;
    if (pull > 52) {
      setRefreshing(true); setPull(44);
      setTimeout(() => {
        setRefreshing(false); setPull(0);
        const now = new Date();
        setStamp(String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0"));
      }, 950);
    } else setPull(0);
  };

  // detail object
  const detailData = (() => {
    if (!detail) return null;
    const held = store.holdingsFull.find(x => x.code === detail);
    if (held) return { h: held, isHeld: true };
    const inst = D.instruments[detail];
    if (!inst) return null;
    return { h: { ...inst, shares: 0, cost: inst.price, marketValue: 0, costValue: 0, gainAbs: 0,
      gainPct: 0, weight: 0, todayDeltaTotal: 0, isFund: !!inst.fund, estDeltaTotal: 0 }, isHeld: false };
  })();

  // ---- top bar config ----
  let topbar;
  if (detail && detailData) {
    topbar = <MTopBar T={T} title={detailData.h.name}
      sub={`${detailData.h.code} · ${detailData.h.isFund ? "场外基金" : detailData.h.sector}`}
      onBack={back} right={
        <button onClick={() => store.addWatch(detail)} disabled={store.watch.includes(detail)}
          style={{ background: P.chipBg, border: "none", color: store.watch.includes(detail) ? P.subtle : P.accent,
            borderRadius: 999, padding: "7px 13px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
          {store.watch.includes(detail) ? "已自选" : "＋ 自选"}</button>
      } />;
  } else {
    const titles = { today: "我的资产", holdings: "持仓", watch: "自选" };
    const subs = {
      today: `更新于 ${stamp} · 演示数据`,
      holdings: `${store.holdingsFull.length} 只持仓`,
      watch: `${store.watchFull.length} 只关注中`,
    };
    topbar = <MTopBar T={T} title={titles[store.tab]} sub={subs[store.tab]} right={
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => setSheet({ type: "settings" })} aria-label="设置"
          style={{ background: "transparent", border: `1px solid ${P.line}`, color: P.muted, width: 38, height: 38,
            borderRadius: 19, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button onClick={() => store.setTheme(store.theme === "dark" ? "light" : "dark")}
          style={{ background: "transparent", border: `1px solid ${P.line}`, color: P.muted, width: 38, height: 38,
            borderRadius: 19, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center",
            justifyContent: "center" }}>{store.theme === "dark" ? "☾" : "☀"}</button>
      </div>
    } />;
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center",
      background: P.isDark ? "#0c0c0e" : "#e9e6df", overflow: "hidden" }}>
      <div style={{ width: "100%", maxWidth: 440, height: "100%", background: P.bg, color: P.text,
        display: "flex", flexDirection: "column", overflow: "hidden", position: "relative",
        fontFamily: "'PingFang SC','Inter',system-ui,-apple-system,sans-serif",
        boxShadow: "0 0 60px rgba(0,0,0,0.12)" }}>

        <MStatusBar T={T} />
        {topbar}

        {/* pull-to-refresh indicator */}
        <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
          {!detail && (
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: pull,
              display: "flex", alignItems: "center", justifyContent: "center", color: P.subtle,
              fontSize: 12, overflow: "hidden", transition: pullStart.current == null ? "height .25s" : "none" }}>
              <span style={{ opacity: Math.min(1, pull / 40), display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 7,
                  border: `2px solid ${P.line}`, borderTopColor: P.accent,
                  animation: refreshing ? "mspin .7s linear infinite" : "none" }} />
                {refreshing ? "刷新中…" : pull > 52 ? "松开刷新" : "下拉刷新"}
              </span>
            </div>
          )}
          <div ref={scroller} onPointerDown={onPullDown} onPointerMove={onPullMove}
            onPointerUp={onPullUp} onPointerCancel={onPullUp}
            style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden",
              WebkitOverflowScrolling: "touch",
              transform: `translateY(${detail ? 0 : pull}px)`,
              transition: pullStart.current == null ? "transform .25s" : "none" }}>
            {detail && detailData ? (
              detailData.h.isFund
                ? <MFundDetail h={detailData.h} isHeld={detailData.isHeld} store={store} T={T} openSheet={setSheet} />
                : <MStockDetail h={detailData.h} isHeld={detailData.isHeld} store={store} T={T} openSheet={setSheet} />
            ) : (
              <>
                {store.tab === "today" && <MToday store={store} T={T} openSheet={setSheet} goDetail={goDetail} />}
                {store.tab === "holdings" && <MHoldings store={store} T={T} openSheet={setSheet} goDetail={goDetail} />}
                {store.tab === "watch" && <MWatch store={store} T={T} openSheet={setSheet} goDetail={goDetail} />}
              </>
            )}
          </div>
        </div>

        {!detail && <MTabBar T={T} tab={store.tab} setTab={setTab} />}

        {/* sheets */}
        {sheet && sheet.type === "watch" && <MAddWatchSheet T={T} store={store} onClose={() => setSheet(null)} />}
        {sheet && sheet.type === "holding" && <MHoldingSheet T={T} store={store} editCode={sheet.code} onClose={() => setSheet(null)} />}
        {sheet && sheet.type === "ocr" && <MOcrImportSheet T={T} store={store} defaultTarget={sheet.target} onClose={() => setSheet(null)} onOpenSettings={() => setSheet({ type: "settings" })} />}
        {sheet && sheet.type === "settings" && <MSettingsSheet T={T} onClose={() => setSheet(null)} />}

        {/* Tweaks */}
        <TweaksPanel>
          <TweakSection label="外观" />
          <TweakColor label="强调色" value={tw.accent}
            options={["#5b4fd4", "#2a6fdb", "#1f8a5b", "#c2410c", "#b8336a"]}
            onChange={v => setTweak("accent", v)} />
          <TweakRadio label="卡片圆角" value={tw.corner} options={["圆润", "适中", "方正"]}
            onChange={v => setTweak("corner", v)} />
          <TweakSection label="行情配色" />
          <TweakRadio label="涨跌颜色" value={tw.colorway} options={["涨红跌绿", "涨绿跌红"]}
            onChange={v => setTweak("colorway", v)} />
          <SyncDemoTweaks />
        </TweaksPanel>
      </div>
    </div>
  );
}

window.MApp = MApp;
