"use client";

import type { Palette } from "@/lib/theme";
import type { Theme } from "@/lib/types";

interface ThemeToggleProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
  P: Palette;
}

export function ThemeToggle({ theme, setTheme, P }: ThemeToggleProps) {
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title={theme === "dark" ? "切换为亮色" : "切换为暗色"}
      style={{
        background: "transparent",
        border: `1px solid ${P.line}`,
        color: P.muted,
        width: 32,
        height: 32,
        borderRadius: 16,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        padding: 0,
      }}
    >
      {theme === "dark" ? "☾" : "☀"}
    </button>
  );
}
