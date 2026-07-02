// Calm Menubar — settings store + computed aggregates (localStorage-backed).
const { useState: useStateM, useEffect: useEffectM, useCallback: useCbM, useMemo: useMemoM } = React;

const MB_KEY = "calm-menubar-v1";

// ---- 涨跌配色：红涨绿跌(redUp, 中式默认) / 绿涨红跌(greenUp, 西式) ----
function mbMove(value, theme, conv) {
  if (!value) return theme === "dark" ? "#8a8a93" : "#7a7a82";
  const up = value > 0;
  const red = theme === "dark" ? "#ff5d5d" : "#d6342f";
  const green = theme === "dark" ? "#37c98c" : "#0f9d63";
  const showRed = conv === "greenUp" ? !up : up;
  return showRed ? red : green;
}

function mbResolveTheme(t) {
  if (t !== "auto") return t;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch (e) { return "light"; }
}

const MB_DEFAULTS = {
  theme: "light",          // light | dark | auto
  conv: "redUp",           // redUp | greenUp
  menubarMode: "percent",  // icon | percent | total
  refreshSec: 15,
  launchAtLogin: true,
  notify: true,
  sections: { trend: true, holdings: true, watch: true, indices: true, actions: true },
  period: "1M",
  tab: "holdings",
  alerts: [
    { code: "600519", dir: "above", price: 1700, on: true },
    { code: "300750", dir: "below", price: 190, on: true },
    { code: "002594", dir: "above", price: 260, on: false },
  ],
};

function mbLoad() {
  try {
    const raw = localStorage.getItem(MB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function useMenubarStore() {
  const D = window.CALM;
  const init = mbLoad() || {};
  const get = (k) => init[k] !== undefined ? init[k] : MB_DEFAULTS[k];

  const [theme, setTheme] = useStateM(get("theme"));
  const [conv, setConv] = useStateM(get("conv"));
  const [menubarMode, setMenubarMode] = useStateM(get("menubarMode"));
  const [refreshSec, setRefreshSec] = useStateM(get("refreshSec"));
  const [launchAtLogin, setLaunchAtLogin] = useStateM(get("launchAtLogin"));
  const [notify, setNotify] = useStateM(get("notify"));
  const [sections, setSections] = useStateM(get("sections"));
  const [period, setPeriod] = useStateM(get("period"));
  const [tab, setTab] = useStateM(get("tab"));
  const [alerts, setAlerts] = useStateM(get("alerts"));
  const [holdings, setHoldings] = useStateM(init.holdings || D.defaultHoldings);
  const [watch, setWatch] = useStateM(init.watch || D.defaultWatch);
  const [cash] = useStateM(init.cash != null ? init.cash : D.defaultCash);

  useEffectM(() => {
    try {
      localStorage.setItem(MB_KEY, JSON.stringify({
        theme, conv, menubarMode, refreshSec, launchAtLogin, notify,
        sections, period, tab, alerts, holdings, watch, cash,
      }));
    } catch (e) {}
  }, [theme, conv, menubarMode, refreshSec, launchAtLogin, notify,
      sections, period, tab, alerts, holdings, watch, cash]);

  const resolvedTheme = mbResolveTheme(theme);

  const toggleSection = useCbM((key) => {
    setSections(s => ({ ...s, [key]: !s[key] }));
  }, []);

  // ---- computed: holdings enriched ----
  const holdingsFull = useMemoM(() => {
    const list = holdings.map(h => {
      const inst = D.instruments[h.code];
      if (!inst) return null;
      const marketValue = h.shares * inst.price;
      const costValue = h.shares * h.cost;
      const gainAbs = marketValue - costValue;
      const gainPct = costValue ? (gainAbs / costValue) * 100 : 0;
      const todayDeltaTotal = h.shares * inst.todayDelta;
      return { ...inst, shares: h.shares, cost: h.cost,
        marketValue, costValue, gainAbs, gainPct, todayDeltaTotal };
    }).filter(Boolean);
    const totalMV = list.reduce((s, h) => s + h.marketValue, 0) || 1;
    list.forEach(h => { h.weight = (h.marketValue / totalMV) * 100; });
    list.sort((a, b) => b.marketValue - a.marketValue);
    return list;
  }, [holdings]);

  const watchFull = useMemoM(() =>
    watch.map(code => D.instruments[code]).filter(Boolean), [watch]);

  const summary = useMemoM(() => {
    let marketValue = 0, costValue = 0, todayDelta = 0;
    holdingsFull.forEach(h => {
      marketValue += h.marketValue; costValue += h.costValue;
      todayDelta += h.todayDeltaTotal;
    });
    const totalAssets = marketValue + cash;
    const totalGain = marketValue - costValue;
    const totalGainPct = costValue ? (totalGain / costValue) * 100 : 0;
    const prevMV = marketValue - todayDelta;
    const todayPct = prevMV ? (todayDelta / prevMV) * 100 : 0;
    return { marketValue, costValue, cash, totalAssets,
      todayDelta, todayPct, totalGain, totalGainPct };
  }, [holdingsFull, cash]);

  const portfolioSeries = useCbM((per) => {
    const total = 250;
    const full = Array.from({ length: total }, (_, t) =>
      holdingsFull.reduce((s, h) => s + h.shares * h.daily[t], 0) + cash);
    const take = D.PERIODS[per] || 22;
    const series = full.slice(total - take);
    const labels = D.dailyDates.slice(total - take);
    return { series, labels };
  }, [holdingsFull, cash]);

  const removeHolding = useCbM((code) =>
    setHoldings(hs => hs.filter(h => h.code !== code)), []);
  const addHolding = useCbM((code, shares, cost) => setHoldings(hs => {
    if (hs.find(h => h.code === code)) return hs.map(h => h.code === code ? { ...h, shares, cost } : h);
    return [...hs, { code, shares, cost }];
  }), []);
  const updateHolding = useCbM((code, shares, cost) =>
    setHoldings(hs => hs.map(h => h.code === code ? { ...h, shares, cost } : h)), []);
  const removeWatch = useCbM((code) =>
    setWatch(w => w.filter(c => c !== code)), []);
  const addWatch = useCbM((code) =>
    setWatch(w => w.includes(code) ? w : [code, ...w]), []);

  const setAlert = useCbM((i, patch) =>
    setAlerts(a => a.map((x, k) => k === i ? { ...x, ...patch } : x)), []);
  const removeAlert = useCbM((i) =>
    setAlerts(a => a.filter((_, k) => k !== i)), []);
  const addAlert = useCbM((code) =>
    setAlerts(a => [...a, { code, dir: "above", price: D.instruments[code].price, on: true }]), []);

  // ---- backup: export / import whole config ----
  const exportState = useCbM(() => ({
    app: "tidal", version: 1, exportedAt: new Date().toISOString(),
    holdings, watch, cash,
    settings: { theme, conv, menubarMode, refreshSec, launchAtLogin, notify, sections },
    alerts,
  }), [holdings, watch, cash, theme, conv, menubarMode, refreshSec,
       launchAtLogin, notify, sections, alerts]);

  const importState = useCbM((data) => {
    if (!data || typeof data !== "object") return false;
    let touched = false;
    if (Array.isArray(data.holdings)) {
      setHoldings(data.holdings.filter(h => h && D.instruments[h.code])
        .map(h => ({ code: h.code, shares: Number(h.shares) || 0, cost: Number(h.cost) || 0 })));
      touched = true;
    }
    if (Array.isArray(data.watch)) {
      setWatch(data.watch.filter(c => D.instruments[c])); touched = true;
    }
    const s = data.settings || {};
    if (["light", "dark", "auto"].includes(s.theme)) setTheme(s.theme);
    if (["redUp", "greenUp"].includes(s.conv)) setConv(s.conv);
    if (["icon", "percent", "total"].includes(s.menubarMode)) setMenubarMode(s.menubarMode);
    if (typeof s.refreshSec === "number") setRefreshSec(s.refreshSec);
    if (typeof s.launchAtLogin === "boolean") setLaunchAtLogin(s.launchAtLogin);
    if (typeof s.notify === "boolean") setNotify(s.notify);
    if (s.sections && typeof s.sections === "object")
      setSections(prev => ({ ...prev, ...s.sections }));
    if (Array.isArray(data.alerts))
      setAlerts(data.alerts.filter(a => a && D.instruments[a.code]));
    return touched;
  }, []);

  return {
    theme, setTheme, resolvedTheme, conv, setConv,
    menubarMode, setMenubarMode, refreshSec, setRefreshSec,
    launchAtLogin, setLaunchAtLogin, notify, setNotify,
    sections, toggleSection, period, setPeriod, tab, setTab,
    alerts, setAlert, removeAlert, addAlert,
    exportState, importState,
    holdings, watch, cash, holdingsFull, watchFull, summary, portfolioSeries,
    removeHolding, addHolding, updateHolding, removeWatch, addWatch,
  };
}

window.useMenubarStore = useMenubarStore;
window.mbMove = mbMove;
