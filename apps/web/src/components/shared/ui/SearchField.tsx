"use client";

import type { Palette } from "@/lib/theme";

interface SearchFieldProps {
  P: Palette;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchField({
  P,
  value,
  onChange,
  placeholder,
  autoFocus,
}: SearchFieldProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: P.isDark ? "#16161a" : "#faf9f5",
        border: `1px solid ${P.line}`,
        borderRadius: 10,
        padding: "0 12px",
      }}
    >
      <span style={{ color: P.subtle, fontSize: 14 }}>⌕</span>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          padding: "11px 0",
          fontSize: 14,
          color: P.text,
          outline: "none",
          fontFamily: "inherit",
        }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="清除搜索"
          style={{
            background: "transparent",
            border: "none",
            color: P.subtle,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
