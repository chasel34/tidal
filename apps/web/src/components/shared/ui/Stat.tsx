"use client";

import type { Palette } from "@/lib/theme";

interface StatProps {
  label: string;
  value: string;
  color?: string;
  sub?: string;
  P: Palette;
}

export function Stat({ label, value, color, sub, P }: StatProps) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: P.subtle,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 16, color: color || P.text }}>
        {value}
        {sub && (
          <span style={{ fontSize: 12, marginLeft: 6, opacity: 0.85 }}>{sub}</span>
        )}
      </div>
    </div>
  );
}
