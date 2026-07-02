// Calm Dashboard — data layer
// Self-contained instrument universe with multi-period series + dates.
// All amounts CNY. Illustrative only.

window.CALM = (() => {
  // ---- seeded pseudo-random ----
  function seeded(seed) {
    let s = seed % 233280;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  // raw walk
  function walk(seed, len, base, drift, vol) {
    const rnd = seeded(seed);
    const out = [];
    let v = base;
    for (let i = 0; i < len; i++) {
      v += drift + (rnd() - 0.5) * vol;
      if (v < base * 0.4) v = base * 0.4;
      out.push(v);
    }
    return out;
  }

  // Generate a 1Y daily series whose LAST value equals `price`.
  function dailySeries(seed, price, volPct, driftPct) {
    const len = 250;
    const raw = walk(seed, len, price, price * driftPct, price * volPct);
    const last = raw[len - 1];
    const factor = price / last;
    return raw.map(v => +(v * factor).toFixed(price < 10 ? 4 : 2));
  }

  // Intraday series (50 pts, 09:30→15:00). Starts at prevClose, ends at price.
  function intradaySeries(seed, price, todayPct) {
    const prevClose = price / (1 + todayPct / 100);
    const len = 50;
    const raw = walk(seed + 7, len, prevClose, (price - prevClose) / len,
      Math.abs(price - prevClose) * 0.9 + price * 0.001);
    // force endpoints
    raw[0] = prevClose;
    const last = raw[len - 1];
    const shift = price - last;
    return raw.map((v, i) => {
      const w = i / (len - 1); // ramp the shift so end lands exactly
      return +(v + shift * w).toFixed(price < 10 ? 4 : 2);
    });
  }

  // ---- date axes ----
  function pastTradingDates(n, endStr) {
    const [y, m, d] = endStr.split("-").map(Number);
    let cur = new Date(y, m - 1, d);
    const out = [];
    while (out.length < n) {
      const wd = cur.getDay();
      if (wd !== 0 && wd !== 6) {
        out.unshift(
          String(cur.getMonth() + 1).padStart(2, "0") + "-" +
          String(cur.getDate()).padStart(2, "0")
        );
      }
      cur.setDate(cur.getDate() - 1);
    }
    return out;
  }
  function intradayTimes() {
    const out = [];
    const push = (h, m) => out.push(String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"));
    for (let h = 9, m = 30; !(h === 11 && m > 30); ) {
      push(h, m); m += 5; if (m >= 60) { m -= 60; h++; }
    }
    for (let h = 13, m = 0; !(h === 15 && m > 0); ) {
      push(h, m); m += 5; if (m >= 60) { m -= 60; h++; }
    }
    return out;
  }

  const TODAY = "2026-05-28";
  const dailyDates = pastTradingDates(250, TODAY);
  const timeAxis = intradayTimes();

  // ---- instrument universe ----
  // base def → expanded with series
  const defs = [
    // code, name, market, type, price, todayPct, cost?, shares?, vol, drift, sector
    ["600519", "贵州茅台", "SH", "股票", 1632.50, 0.85, 1.4, 0.6, "白酒"],
    ["300750", "宁德时代", "SZ", "股票", 208.30, -1.42, 2.6, -0.2, "新能源"],
    ["600036", "招商银行", "SH", "股票", 38.45, 1.18, 1.2, 0.25, "银行"],
    ["510300", "沪深300ETF", "SH", "ETF", 3.92, 0.51, 0.9, 0.12, "宽基"],
    ["005827", "易方达蓝筹精选", "OF", "基金", 2.38, -0.63, 1.1, -0.1, "混合"],
    ["002594", "比亚迪", "SZ", "股票", 248.50, 2.15, 2.4, 0.4, "汽车"],
    ["601318", "中国平安", "SH", "股票", 52.30, -0.42, 1.3, 0.05, "保险"],
    ["601012", "隆基绿能", "SH", "股票", 18.65, -1.85, 2.8, -0.3, "光伏"],
    ["510500", "中证500ETF", "SH", "ETF", 6.32, 0.95, 1.0, 0.18, "宽基"],
    ["163417", "兴全合宜", "OF", "基金", 1.86, 0.32, 1.0, 0.08, "混合"],
    // extra universe for search
    ["000858", "五粮液", "SZ", "股票", 142.80, 0.62, 1.5, 0.3, "白酒"],
    ["600900", "长江电力", "SH", "股票", 28.40, 0.21, 0.7, 0.15, "电力"],
    ["300059", "东方财富", "SZ", "股票", 16.92, 3.05, 3.0, 0.5, "券商"],
    ["601899", "紫金矿业", "SH", "股票", 17.55, 1.42, 2.2, 0.35, "有色"],
    ["588000", "科创50ETF", "SH", "ETF", 1.04, -0.95, 1.4, -0.05, "宽基"],
    ["159915", "创业板ETF", "SZ", "ETF", 2.18, -0.41, 1.5, -0.08, "宽基"],
    ["110011", "易方达中小盘", "OF", "基金", 8.92, 0.74, 1.2, 0.12, "股票"],
    ["161725", "招商中证白酒", "OF", "基金", 0.98, 0.55, 1.6, 0.06, "行业"],
    ["600276", "恒瑞医药", "SH", "股票", 46.30, -0.88, 2.0, 0.1, "医药"],
    ["000333", "美的集团", "SZ", "股票", 72.15, 0.93, 1.3, 0.22, "家电"],
  ];

  const instruments = {};
  defs.forEach((d, i) => {
    const [code, name, market, type, price, todayPct, vol, drift, sector] = d;
    const daily = dailySeries(100 + i * 13, price, vol / 100, drift / 100);
    const intraday = intradaySeries(200 + i * 17, price, todayPct);
    const prevClose = price / (1 + todayPct / 100);
    instruments[code] = {
      code, name, market, type, price, todayPct, sector,
      todayDelta: +(price - prevClose).toFixed(price < 10 ? 4 : 2),
      prevClose: +prevClose.toFixed(price < 10 ? 4 : 2),
      daily, intraday,
    };
  });

  // ---- 场外基金 (OTC fund) detail + intraday valuation ----
  // OTC funds settle at the day's closing NAV (确认 T+1); during the session
  // only an *estimated* NAV (盘中估值) is available. estPct is that live estimate.
  const fundMeta = {
    "005827": {
      fullType: "偏股混合型", navAcc: 4.1230, navDate: "05-27",
      estPct: -0.63, estTime: "14:32 估算", confirmDate: "05-29",
      manager: "张坤", managerSince: "2018-09 至今", tenureYrs: 7.7,
      fundSize: 412.6, inception: "2018-09-05", risk: "中风险 · R3", star: 5,
      assetAlloc: [
        { label: "股票", pct: 92.4 }, { label: "债券", pct: 0.8 }, { label: "现金", pct: 6.8 },
      ],
      sectorAlloc: [
        { label: "食品饮料", pct: 38.5 }, { label: "金融", pct: 16.2 },
        { label: "医药生物", pct: 12.4 }, { label: "互联网", pct: 11.8 },
        { label: "家用电器", pct: 8.1 }, { label: "其他", pct: 13.0 },
      ],
      topHoldings: [
        { name: "贵州茅台", code: "600519", weight: 9.8, pct: 0.85 },
        { name: "五粮液", code: "000858", weight: 9.2, pct: 0.62 },
        { name: "泸州老窖", code: "000568", weight: 8.6, pct: 1.14 },
        { name: "腾讯控股", code: "00700", weight: 8.1, pct: -0.42 },
        { name: "洋河股份", code: "002304", weight: 6.9, pct: -0.31 },
        { name: "招商银行", code: "600036", weight: 6.2, pct: 1.18 },
        { name: "香港交易所", code: "00388", weight: 5.4, pct: 0.27 },
        { name: "海康威视", code: "002415", weight: 4.8, pct: -1.05 },
        { name: "美团-W", code: "03690", weight: 4.1, pct: -0.88 },
        { name: "伊利股份", code: "600887", weight: 3.7, pct: 0.44 },
      ],
    },
    "163417": {
      fullType: "灵活配置混合型", navAcc: 2.0410, navDate: "05-27",
      estPct: 0.32, estTime: "14:32 估算", confirmDate: "05-29",
      manager: "谢治宇", managerSince: "2018-01 至今", tenureYrs: 8.3,
      fundSize: 168.3, inception: "2018-01-23", risk: "中风险 · R3", star: 5,
      assetAlloc: [
        { label: "股票", pct: 88.1 }, { label: "债券", pct: 4.2 }, { label: "现金", pct: 7.7 },
      ],
      sectorAlloc: [
        { label: "电子", pct: 24.6 }, { label: "金融", pct: 18.3 },
        { label: "新能源", pct: 15.2 }, { label: "汽车", pct: 11.4 },
        { label: "家用电器", pct: 8.8 }, { label: "其他", pct: 21.7 },
      ],
      topHoldings: [
        { name: "海康威视", code: "002415", weight: 6.4, pct: -1.05 },
        { name: "兴业银行", code: "601166", weight: 5.8, pct: 0.92 },
        { name: "立讯精密", code: "002475", weight: 5.1, pct: 1.36 },
        { name: "比亚迪", code: "002594", weight: 4.6, pct: 2.15 },
        { name: "隆基绿能", code: "601012", weight: 4.2, pct: -1.85 },
        { name: "中国平安", code: "601318", weight: 3.9, pct: -0.42 },
        { name: "三安光电", code: "600703", weight: 3.5, pct: 0.71 },
        { name: "宁德时代", code: "300750", weight: 3.2, pct: -1.42 },
        { name: "韦尔股份", code: "603501", weight: 2.9, pct: 1.08 },
        { name: "美的集团", code: "000333", weight: 2.6, pct: 0.93 },
      ],
    },
    "110011": {
      fullType: "偏股混合型", navAcc: 12.8640, navDate: "05-27",
      estPct: 0.74, estTime: "14:32 估算", confirmDate: "05-29",
      manager: "陈皓", managerSince: "2020-05 至今", tenureYrs: 6.0,
      fundSize: 96.4, inception: "2008-06-19", risk: "中高风险 · R4", star: 4,
      assetAlloc: [
        { label: "股票", pct: 90.7 }, { label: "债券", pct: 1.5 }, { label: "现金", pct: 7.8 },
      ],
      sectorAlloc: [
        { label: "医药生物", pct: 21.3 }, { label: "电子", pct: 18.9 },
        { label: "新能源", pct: 16.5 }, { label: "机械设备", pct: 10.2 },
        { label: "化工", pct: 9.4 }, { label: "其他", pct: 23.7 },
      ],
      topHoldings: [
        { name: "恒瑞医药", code: "600276", weight: 5.6, pct: -0.88 },
        { name: "迈瑞医疗", code: "300760", weight: 5.2, pct: 0.54 },
        { name: "宁德时代", code: "300750", weight: 4.8, pct: -1.42 },
        { name: "汇川技术", code: "300124", weight: 4.3, pct: 1.22 },
        { name: "东方财富", code: "300059", weight: 3.9, pct: 3.05 },
        { name: "紫金矿业", code: "601899", weight: 3.4, pct: 1.42 },
        { name: "美的集团", code: "000333", weight: 3.1, pct: 0.93 },
        { name: "立讯精密", code: "002475", weight: 2.8, pct: 1.36 },
        { name: "万华化学", code: "600309", weight: 2.5, pct: -0.34 },
        { name: "韦尔股份", code: "603501", weight: 2.2, pct: 1.08 },
      ],
    },
    "161725": {
      fullType: "指数型 · 跟踪中证白酒", navAcc: 1.4820, navDate: "05-27",
      estPct: 0.55, estTime: "14:32 估算", confirmDate: "05-29",
      manager: "侯昊", managerSince: "2015-05 至今", tenureYrs: 11.0,
      fundSize: 583.1, inception: "2015-05-27", risk: "中高风险 · R4", star: 4,
      assetAlloc: [
        { label: "股票", pct: 94.6 }, { label: "债券", pct: 0.0 }, { label: "现金", pct: 5.4 },
      ],
      sectorAlloc: [
        { label: "白酒", pct: 86.4 }, { label: "其他饮料", pct: 7.8 },
        { label: "现金及其他", pct: 5.8 },
      ],
      topHoldings: [
        { name: "贵州茅台", code: "600519", weight: 15.9, pct: 0.85 },
        { name: "五粮液", code: "000858", weight: 14.7, pct: 0.62 },
        { name: "泸州老窖", code: "000568", weight: 11.2, pct: 1.14 },
        { name: "山西汾酒", code: "600809", weight: 10.6, pct: 0.38 },
        { name: "洋河股份", code: "002304", weight: 9.4, pct: -0.31 },
        { name: "古井贡酒", code: "000596", weight: 6.1, pct: 0.72 },
        { name: "今世缘", code: "603369", weight: 4.3, pct: 0.19 },
        { name: "迎驾贡酒", code: "603198", weight: 3.5, pct: -0.24 },
        { name: "口子窖", code: "603589", weight: 2.8, pct: 0.41 },
        { name: "舍得酒业", code: "600702", weight: 2.4, pct: -0.66 },
      ],
    },
  };
  Object.keys(fundMeta).forEach(code => {
    if (instruments[code]) {
      const m = fundMeta[code];
      const nav = instruments[code].price;
      instruments[code].fund = {
        ...m, nav,
        estNav: +(nav * (1 + m.estPct / 100)).toFixed(4),
      };
    }
  });

  // default holdings: code → {shares, cost}
  const defaultHoldings = [
    { code: "600519", shares: 50, cost: 1580.00 },
    { code: "300750", shares: 100, cost: 215.00 },
    { code: "600036", shares: 500, cost: 35.20 },
    { code: "510300", shares: 1000, cost: 3.85 },
    { code: "005827", shares: 1500, cost: 2.45 },
  ];
  const defaultWatch = ["002594", "601318", "601012", "510500", "163417"];
  const defaultCash = 8240.17;

  const indices = [
    { name: "上证指数", code: "000001", value: 3186.45, pct: 0.32,
      daily: dailySeries(900, 3186.45, 0.012, 0.0006) },
    { name: "深证成指", code: "399001", value: 9842.18, pct: 0.58,
      daily: dailySeries(901, 9842.18, 0.014, 0.0008) },
    { name: "创业板指", code: "399006", value: 1925.36, pct: -0.21,
      daily: dailySeries(902, 1925.36, 0.018, -0.0004) },
    { name: "沪深300", code: "000300", value: 3712.84, pct: 0.45,
      daily: dailySeries(903, 3712.84, 0.011, 0.0007) },
  ];

  // period → number of trailing daily points
  const PERIODS = { "1W": 5, "1M": 22, "3M": 66, "1Y": 250 };

  return {
    instruments, indices,
    dailyDates, timeAxis,
    defaultHoldings, defaultWatch, defaultCash,
    asOf: "2026-05-28 14:32",
    PERIODS,
    intradaySeries, dailySeries, // exported for portfolio scaling
  };
})();
