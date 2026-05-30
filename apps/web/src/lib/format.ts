import type { Theme } from "./types";

export const cFmtNum = (n: number, dec = 2): string =>
  n.toLocaleString("zh-CN", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });

export const cFmtMoney = (
  n: number,
  opts: { sign?: boolean; dec?: number } = {}
): string => {
  const { sign = false, dec = 2 } = opts;
  const s = Math.abs(n).toLocaleString("zh-CN", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
  return (n < 0 ? "-" : sign ? "+" : "") + "¥" + s;
};

export const cFmtPct = (n: number, opts: { sign?: boolean } = {}): string => {
  const { sign = true } = opts;
  return (sign && n > 0 ? "+" : "") + n.toFixed(2) + "%";
};

/** compact ¥ for axis ("13.7万", "1.2亿") */
export const cFmtCompact = (n: number): string => {
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + "亿";
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(1) + "万";
  return Math.round(n).toString();
};

/** 中式 涨红跌绿 */
export function cMove(value: number, theme: Theme = "light"): string {
  if (value === 0) return theme === "dark" ? "#8a8a93" : "#7a7a82";
  if (value > 0) return theme === "dark" ? "#ff5d5d" : "#d6342f";
  return theme === "dark" ? "#37c98c" : "#0f9d63";
}
