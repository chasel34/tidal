import type { CSSProperties } from "react";
import type { Palette } from "@/lib/theme";
import { cMove } from "@/lib/format";

export function tidalInput(P: Palette): CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    background: P.isDark ? "#16161a" : "#faf9f5",
    border: `1px solid ${P.line}`,
    borderRadius: 9,
    padding: "10px 12px",
    fontSize: 14,
    color: P.text,
    fontFamily: "inherit",
    outline: "none",
    fontVariantNumeric: "tabular-nums",
  };
}

export function tidalBtn(
  P: Palette,
  variant?: "primary" | "danger"
): CSSProperties {
  const base: CSSProperties = {
    padding: "9px 16px",
    borderRadius: 999,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
    border: "none",
    whiteSpace: "nowrap",
  };
  if (variant === "primary")
    return { ...base, background: P.accent, color: "#fff" };
  if (variant === "danger")
    return {
      ...base,
      background: "transparent",
      color: cMove(-1, P.isDark ? "dark" : "light"),
      border: `1px solid ${P.line}`,
    };
  return {
    ...base,
    background: "transparent",
    color: P.text,
    border: `1px solid ${P.line}`,
  };
}
