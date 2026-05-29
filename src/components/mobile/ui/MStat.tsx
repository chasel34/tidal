"use client";

import type { Palette } from "@/lib/theme";

interface MStatProps {
  P: Palette;
  label: string;
  value: string;
  color?: string;
  sub?: string;
}

export function MStat({ P, label, value, color, sub }: MStatProps) {
  return (
    <div>
      <div style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span style={{ fontSize: 16, color: color || P.text, fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {sub && <span style={{ fontSize: 11.5, marginLeft: 6, opacity: 0.85 }}>{sub}</span>}
      </div>
    </div>
  );
}
