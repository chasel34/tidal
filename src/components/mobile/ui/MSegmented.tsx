"use client";

import type { Palette } from "@/lib/theme";

interface MSegmentedProps {
  P: Palette;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  size?: "sm" | "md";
}

export function MSegmented({ P, options, value, onChange, size = "md" }: MSegmentedProps) {
  const isSmall = size === "sm";
  return (
    <div style={{ display: "flex", background: P.chipBg, borderRadius: 11, padding: 3, gap: 2 }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              flex: 1,
              borderRadius: 9,
              fontVariantNumeric: "tabular-nums",
              padding: isSmall ? "6px 0" : "8px 0",
              fontSize: isSmall ? 12 : 13,
              background: active ? P.panel : "transparent",
              fontWeight: active ? 600 : 500,
              color: active ? P.text : P.muted,
              boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
