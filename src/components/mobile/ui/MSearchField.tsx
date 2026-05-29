"use client";

import type { Palette } from "@/lib/theme";

interface MSearchFieldProps {
  P: Palette;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function MSearchField({ P, value, onChange, placeholder, autoFocus }: MSearchFieldProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: P.isDark ? "#16161a" : "#faf9f5",
        border: `1px solid ${P.line}`,
        borderRadius: 12,
        padding: "0 14px",
      }}
    >
      <span style={{ fontSize: 18, color: P.muted, marginRight: 8 }}>⌕</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          padding: "13px 0",
          fontSize: 16,
          color: P.text,
        }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          style={{ background: "none", border: "none", cursor: "pointer", color: P.muted, fontSize: 16, padding: "0 0 0 8px" }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
