"use client";

import { ReactNode } from "react";
import type { Palette } from "@/lib/theme";

interface MTopBarProps {
  P: Palette;
  title: string;
  sub?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function MTopBar({ P, title, sub, onBack, right }: MTopBarProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "8px 18px 12px", flexShrink: 0 }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: P.accent, fontSize: 26, padding: "0 8px 0 0", cursor: "pointer", lineHeight: 1 }}
        >
          ‹
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: P.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </div>
        {sub && <div style={{ fontSize: 12.5, color: P.subtle, marginTop: 2 }}>{sub}</div>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}
