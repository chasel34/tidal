// Calm Dashboard — state store (localStorage-backed) + computed aggregates.
const { useState: useStateS, useEffect: useEffectS, useCallback: useCallbackS, useMemo: useMemoS } = React;

const CALM_KEY = "calm-dashboard-v1";

function loadState() {
  try {
    const raw = localStorage.getItem(CALM_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function useStore() {
  const D = window.CALM;
  const init = loadState() || {};
  const [theme, setTheme] = useStateS(init.theme || "light");
  const [tab, setTab] = useStateS(init.tab || "today");
  const [period, setPeriod] = useStateS(init.period === "1D" || !init.period ? "1M" : init.period);
  const [holdings, setHoldings] = useStateS(init.holdings || D.defaultHoldings);
  const [watch, setWatch] = useStateS(init.watch || D.defaultWatch);
  const [cash] = useStateS(init.cash != null ? init.cash : D.defaultCash);
  const [sortH, setSortH] = useStateS(init.sortH || { key: "weight", dir: "desc" });
  const [sortW, setSortW] = useStateS(init.sortW || { key: "today", dir: "desc" });

  useEffectS(() => {
    try {
      localStorage.setItem(CALM_KEY, JSON.stringify({
        theme, tab, period, holdings, watch, cash, sortH, sortW,
      }));
    } catch (e) {}
  }, [theme, tab, period, holdings, watch, cash, sortH, sortW]);

  // ---- computed: holdings enriched ----
  const holdingsFull = useMemoS(() => {
    const list = holdings.map(h => {
      const inst = D.instruments[h.code];
      if (!inst) return null;
      const marketValue = h.shares * inst.price;
      const costValue = h.shares * h.cost;
      const gainAbs = marketValue - costValue;
      const gainPct = costValue ? (gainAbs / costValue) * 100 : 0;
      const todayDeltaTotal = h.shares * inst.todayDelta;
      // 场外基金: 盘中估算今日收益 (净值待确认)
      const isFund = !!inst.fund;
      const estDeltaTotal = isFund
        ? h.shares * inst.fund.nav * (inst.fund.estPct / 100) : 0;
      return { ...inst, shares: h.shares, cost: h.cost,
        marketValue, costValue, gainAbs, gainPct, todayDeltaTotal,
        isFund, estDeltaTotal };
    }).filter(Boolean);
    const totalMV = list.reduce((s, h) => s + h.marketValue, 0) || 1;
    list.forEach(h => { h.weight = (h.marketValue / totalMV) * 100; });
    return list;
  }, [holdings]);

  const watchFull = useMemoS(() =>
    watch.map(code => D.instruments[code]).filter(Boolean), [watch]);

  // ---- 场外基金 盘中估算汇总 ----
  const fundEstimate = useMemoS(() => {
    const funds = holdingsFull.filter(h => h.isFund);
    const gain = funds.reduce((s, h) => s + h.estDeltaTotal, 0);
    const value = funds.reduce((s, h) => s + h.marketValue, 0);
    const prev = value - gain;
    const pct = prev ? (gain / prev) * 100 : 0;
    return { funds, gain, value, pct, count: funds.length };
  }, [holdingsFull]);

  const summary = useMemoS(() => {
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

  // ---- portfolio time series (reacts to holdings) ----
  const portfolioSeries = useCallbackS((per) => {
    if (per === "1D") {
      const n = D.timeAxis.length;
      const series = Array.from({ length: n }, (_, t) =>
        holdingsFull.reduce((s, h) => s + h.shares * h.intraday[t], 0) + cash);
      return { series, labels: D.timeAxis };
    }
    const total = 250;
    const full = Array.from({ length: total }, (_, t) =>
      holdingsFull.reduce((s, h) => s + h.shares * h.daily[t], 0) + cash);
    const take = D.PERIODS[per] || 22;
    const series = full.slice(total - take);
    const labels = D.dailyDates.slice(total - take);
    return { series, labels };
  }, [holdingsFull, cash]);

  // ---- allocation ----
  const allocation = useMemoS(() => {
    const byType = {};
    holdingsFull.forEach(h => {
      byType[h.type] = (byType[h.type] || 0) + h.marketValue;
    });
    const segs = Object.entries(byType).map(([label, value]) => ({ label, value }));
    segs.push({ label: "现金", value: cash });
    return segs;
  }, [holdingsFull, cash]);

  // ---- sorting helpers ----
  const sortedHoldings = useMemoS(() => {
    const arr = [...holdingsFull];
    const { key, dir } = sortH;
    const get = h => ({ today: h.todayPct, gain: h.gainPct, weight: h.weight,
      value: h.marketValue, name: h.code }[key]);
    arr.sort((a, b) => {
      const av = get(a), bv = get(b);
      if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [holdingsFull, sortH]);

  const sortedWatch = useMemoS(() => {
    const arr = [...watchFull];
    const { key, dir } = sortW;
    const get = w => ({ today: w.todayPct, price: w.price, name: w.code }[key]);
    arr.sort((a, b) => {
      const av = get(a), bv = get(b);
      if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [watchFull, sortW]);

  // ---- mutations ----
  const addWatch = useCallbackS((code) => {
    setWatch(w => w.includes(code) ? w : [code, ...w]);
  }, []);
  const removeWatch = useCallbackS((code) => {
    setWatch(w => w.filter(c => c !== code));
  }, []);
  const addHolding = useCallbackS((code, shares, cost) => {
    setHoldings(hs => {
      const exists = hs.find(h => h.code === code);
      if (exists) return hs.map(h => h.code === code ? { ...h, shares, cost } : h);
      return [...hs, { code, shares, cost }];
    });
  }, []);
  const updateHolding = useCallbackS((code, shares, cost) => {
    setHoldings(hs => hs.map(h => h.code === code ? { ...h, shares, cost } : h));
  }, []);
  const removeHolding = useCallbackS((code) => {
    setHoldings(hs => hs.filter(h => h.code !== code));
  }, []);

  const toggleSortH = useCallbackS((key) => {
    setSortH(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });
  }, []);
  const toggleSortW = useCallbackS((key) => {
    setSortW(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });
  }, []);

  const resetAll = useCallbackS(() => {
    setHoldings(D.defaultHoldings); setWatch(D.defaultWatch);
  }, []);

  return {
    theme, setTheme, tab, setTab, period, setPeriod,
    holdings, watch, cash,
    holdingsFull, watchFull, summary, allocation,
    fundEstimate,
    sortedHoldings, sortedWatch, sortH, sortW, toggleSortH, toggleSortW,
    portfolioSeries,
    addWatch, removeWatch, addHolding, updateHolding, removeHolding, resetAll,
  };
}

window.useStore = useStore;
