"use client";

import { CSSProperties, ReactNode } from "react";
import type { Palette } from "@/lib/theme";

interface MCardProps {
  P: Palette;
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  pad?: number;
}

export function MCard({ P, children, style, onClick, pad = 16 }: MCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: P.panel,
        border: `1px solid ${P.line}`,
        borderRadius: 16,
        padding: pad,
        ...(onClick ? { cursor: "pointer" } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
