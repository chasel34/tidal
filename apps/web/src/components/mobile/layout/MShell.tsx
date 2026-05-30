"use client";

import { ReactNode } from "react";
import type { Palette } from "@/lib/theme";

interface MShellProps {
  P: Palette;
  children: ReactNode;
}

export function MShell({ P, children }: MShellProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        background: P.isDark ? "#0c0c0e" : "#e9e6df",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          height: "100%",
          background: P.bg,
          color: P.text,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 0 60px rgba(0,0,0,0.12)",
          fontFamily: "'PingFang SC','Inter',system-ui,-apple-system,sans-serif",
        }}
      >
        {children}
      </div>
    </div>
  );
}
