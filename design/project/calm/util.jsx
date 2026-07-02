// Calm Dashboard — formatting + palette utils
const cFmtNum = (n, dec = 2) =>
  n.toLocaleString("zh-CN", { minimumFractionDigits: dec, maximumFractionDigits: dec });

const cFmtMoney = (n, opts = {}) => {
  const { sign = false, dec = 2 } = opts;
  const s = Math.abs(n).toLocaleString("zh-CN",
    { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return (n < 0 ? "-" : sign ? "+" : "") + "¥" + s;
};

const cFmtPct = (n, opts = {}) => {
  const { sign = true } = opts;
  return (sign && n > 0 ? "+" : "") + n.toFixed(2) + "%";
};

// compact ¥ for axis ("13.7万", "1.2亿")
const cFmtCompact = (n) => {
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + "亿";
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(1) + "万";
  return Math.round(n).toString();
};

// 中式 涨红跌绿
function cMove(value, theme = "light") {
  if (value === 0) return theme === "dark" ? "#8a8a93" : "#7a7a82";
  if (value > 0) return theme === "dark" ? "#ff5d5d" : "#d6342f";
  return theme === "dark" ? "#37c98c" : "#0f9d63";
}

// palette per theme
function calmPalette(theme) {
  const isDark = theme === "dark";
  return isDark
    ? { isDark, bg: "#161619", panel: "#1d1d21", panelAlt: "#222228",
        line: "#2b2b33", lineSoft: "#232329", text: "#eeeef3", muted: "#8c8c96",
        subtle: "#5e5e68", accent: "#b9a6ff", accentSoft: "rgba(185,166,255,0.16)",
        chipBg: "#26262e", overlay: "rgba(0,0,0,0.6)",
        hoverRow: "#23232b", crosshair: "#6b6b76" }
    : { isDark, bg: "#faf9f6", panel: "#ffffff", panelAlt: "#fbfaf6",
        line: "#ece9e1", lineSoft: "#f1efe9", text: "#1a1a1f", muted: "#6e6e77",
        subtle: "#a7a299", accent: "#5b4fd4", accentSoft: "rgba(91,79,212,0.12)",
        chipBg: "#f1eee6", overlay: "rgba(30,28,24,0.32)",
        hoverRow: "#f6f3eb", crosshair: "#bdb8ae" };
}

Object.assign(window, { cFmtNum, cFmtMoney, cFmtPct, cFmtCompact, cMove, calmPalette });
