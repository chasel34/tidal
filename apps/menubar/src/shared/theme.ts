import type { ColorConvention, ResolvedTheme } from "./types";

export interface Palette {
  isDark: boolean;
  bg: string;
  panel: string;
  panelAlt: string;
  line: string;
  lineSoft: string;
  text: string;
  muted: string;
  subtle: string;
  accent: string;
  accentSoft: string;
  chipBg: string;
  overlay: string;
  hoverRow: string;
  crosshair: string;
}

export function tidalPalette(theme: ResolvedTheme): Palette {
  const isDark = theme === "dark";
  return isDark
    ? {
        isDark,
        bg: "#161619",
        panel: "#1d1d21",
        panelAlt: "#222228",
        line: "#2b2b33",
        lineSoft: "#232329",
        text: "#eeeef3",
        muted: "#8c8c96",
        subtle: "#5e5e68",
        accent: "#b9a6ff",
        accentSoft: "rgba(185,166,255,0.16)",
        chipBg: "#26262e",
        overlay: "rgba(0,0,0,0.6)",
        hoverRow: "#23232b",
        crosshair: "#6b6b76",
      }
    : {
        isDark,
        bg: "#faf9f6",
        panel: "#ffffff",
        panelAlt: "#fbfaf6",
        line: "#ece9e1",
        lineSoft: "#f1efe9",
        text: "#1a1a1f",
        muted: "#6e6e77",
        subtle: "#a7a299",
        accent: "#5b4fd4",
        accentSoft: "rgba(91,79,212,0.12)",
        chipBg: "#f1eee6",
        overlay: "rgba(30,28,24,0.32)",
        hoverRow: "#f6f3eb",
        crosshair: "#bdb8ae",
      };
}

export function moveColor(
  value: number,
  theme: ResolvedTheme,
  conv: ColorConvention,
): string {
  if (!value) return theme === "dark" ? "#8a8a93" : "#7a7a82";
  const up = value > 0;
  const red = theme === "dark" ? "#ff5d5d" : "#d6342f";
  const green = theme === "dark" ? "#37c98c" : "#0f9d63";
  const showRed = conv === "greenUp" ? !up : up;
  return showRed ? red : green;
}
