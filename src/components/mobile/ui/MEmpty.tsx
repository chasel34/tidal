"use client";

import type { Palette } from "@/lib/theme";

interface MEmptyProps {
  P: Palette;
  text: string;
  actionLabel: string;
  onAction: () => void;
}

export function MEmpty({ P, text, actionLabel, onAction }: MEmptyProps) {
  return (
    <div
      style={{
        border: `2px dashed ${P.line}`,
        borderRadius: 16,
        padding: "48px 20px",
        textAlign: "center",
        margin: "0 16px",
      }}
    >
      <div style={{ color: P.muted, fontSize: 14, marginBottom: 18 }}>{text}</div>
      <button
        onClick={onAction}
        style={{
          background: P.accent,
          color: "#fff",
          borderRadius: 999,
          padding: "11px 22px",
          fontSize: 14,
          fontWeight: 600,
          border: "none",
          cursor: "pointer",
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}
