"use client";

import type { Palette } from "@/lib/theme";
import { tidalBtn } from "./styles";

interface EmptyStateProps {
  P: Palette;
  text: string;
  onAction: () => void;
  actionLabel: string;
}

export function EmptyState({ P, text, onAction, actionLabel }: EmptyStateProps) {
  return (
    <div
      style={{
        background: P.panel,
        border: `1px dashed ${P.line}`,
        borderRadius: 14,
        padding: "56px 20px",
        textAlign: "center",
      }}
    >
      <div style={{ color: P.muted, fontSize: 14, marginBottom: 16 }}>{text}</div>
      <button onClick={onAction} style={tidalBtn(P, "primary")}>
        ＋ {actionLabel}
      </button>
    </div>
  );
}
