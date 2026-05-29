"use client";

import type { Palette } from "@/lib/theme";

interface SortThProps<K extends string> {
  label: string;
  sortKey: K;
  active: boolean;
  dir: "asc" | "desc";
  onClick: (key: K) => void;
  align?: "left" | "right";
  P: Palette;
}

export function SortTh<K extends string>({
  label,
  sortKey,
  active,
  dir,
  onClick,
  align = "right",
  P,
}: SortThProps<K>) {
  return (
    <button
      onClick={() => onClick(sortKey)}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: active ? P.text : P.subtle,
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontFamily: "inherit",
        padding: 0,
        display: "flex",
        alignItems: "center",
        gap: 3,
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        width: "100%",
      }}
    >
      {align === "right" && <span>{label}</span>}
      <span style={{ opacity: active ? 0.9 : 0, fontSize: 9 }}>
        {dir === "asc" ? "▲" : "▼"}
      </span>
      {align !== "right" && <span>{label}</span>}
    </button>
  );
}
