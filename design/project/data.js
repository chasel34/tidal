// Shared mock data for the personal asset dashboard.
// All amounts in CNY. Numbers are illustrative.

window.DASH_DATA = (() => {
  // Seeded pseudo-random for stable sparklines across renders.
  function seeded(seed) {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  function trend(seed, len, base, drift, vol) {
    const rnd = seeded(seed);
    const out = [];
    let v = base;
    for (let i = 0; i < len; i++) {
      v += drift + (rnd() - 0.5) * vol;
      out.push(+v.toFixed(2));
    }
    return out;
  }

  const holdings = [
    {
      code: "600519", name: "贵州茅台", market: "SH", type: "股票",
      shares: 50, cost: 1580.00, price: 1632.50,
      todayPct: 0.85, todayDelta: 13.75,
      trend: trend(11, 40, 1580, 1.3, 22),
    },
    {
      code: "300750", name: "宁德时代", market: "SZ", type: "股票",
      shares: 100, cost: 215.00, price: 208.30,
      todayPct: -1.42, todayDelta: -3.00,
      trend: trend(22, 40, 220, -0.3, 4),
    },
    {
      code: "600036", name: "招商银行", market: "SH", type: "股票",
      shares: 500, cost: 35.20, price: 38.45,
      todayPct: 1.18, todayDelta: 0.45,
      trend: trend(33, 40, 34, 0.1, 0.6),
    },
    {
      code: "510300", name: "沪深300ETF", market: "SH", type: "ETF",
      shares: 1000, cost: 3.85, price: 3.92,
      todayPct: 0.51, todayDelta: 0.02,
      trend: trend(44, 40, 3.85, 0.002, 0.04),
    },
    {
      code: "005827", name: "易方达蓝筹精选", market: "OF", type: "基金",
      shares: 1500, cost: 2.45, price: 2.38,
      todayPct: -0.63, todayDelta: -0.015,
      trend: trend(55, 40, 2.5, -0.003, 0.025),
    },
  ];

  const watchlist = [
    { code: "002594", name: "比亚迪", market: "SZ", type: "股票",
      price: 248.50, todayPct: 2.15, trend: trend(101, 40, 240, 0.3, 3.5) },
    { code: "601318", name: "中国平安", market: "SH", type: "股票",
      price: 52.30, todayPct: -0.42, trend: trend(102, 40, 53, -0.05, 0.6) },
    { code: "601012", name: "隆基绿能", market: "SH", type: "股票",
      price: 18.65, todayPct: -1.85, trend: trend(103, 40, 20, -0.05, 0.35) },
    { code: "510500", name: "中证500ETF", market: "SH", type: "ETF",
      price: 6.32, todayPct: 0.95, trend: trend(104, 40, 6.2, 0.005, 0.06) },
    { code: "163417", name: "兴全合宜", market: "OF", type: "基金",
      price: 1.86, todayPct: 0.32, trend: trend(105, 40, 1.85, 0.001, 0.015) },
  ];

  // Aggregate calculations
  let marketValue = 0, cost = 0, todayDelta = 0;
  holdings.forEach(h => {
    marketValue += h.shares * h.price;
    cost += h.shares * h.cost;
    todayDelta += h.shares * h.todayDelta;
  });
  const cash = 8240.17;
  const totalAssets = marketValue + cash;
  const totalGain = marketValue - cost;
  const totalGainPct = (totalGain / cost) * 100;
  const todayPct = (todayDelta / (marketValue - todayDelta)) * 100;

  // Portfolio trend for last 30 days
  const portfolioTrend = trend(7, 30, totalAssets - 5000, 180, 1800);
  portfolioTrend[portfolioTrend.length - 1] = +totalAssets.toFixed(2);

  // Index quotes (top of dashboard)
  const indices = [
    { name: "上证指数", code: "000001", value: 3186.45, pct: 0.32 },
    { name: "深证成指", code: "399001", value: 9842.18, pct: 0.58 },
    { name: "创业板指", code: "399006", value: 1925.36, pct: -0.21 },
    { name: "沪深300", code: "000300", value: 3712.84, pct: 0.45 },
  ];

  // Allocation by type
  const allocation = [
    { label: "股票", value: holdings.filter(h => h.type === "股票")
      .reduce((s, h) => s + h.shares * h.price, 0) },
    { label: "ETF", value: holdings.filter(h => h.type === "ETF")
      .reduce((s, h) => s + h.shares * h.price, 0) },
    { label: "基金", value: holdings.filter(h => h.type === "基金")
      .reduce((s, h) => s + h.shares * h.price, 0) },
    { label: "现金", value: cash },
  ];

  return {
    holdings, watchlist, indices, allocation,
    summary: {
      totalAssets, marketValue, cost, cash,
      todayDelta, todayPct,
      totalGain, totalGainPct,
      portfolioTrend,
    },
    asOf: "2026-05-28 14:32",
  };
})();
