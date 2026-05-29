"use client";

import { useEffect, useState } from "react";
import type { Palette } from "@/lib/theme";
import type { Quote } from "@/lib/types";
import { INDICES } from "@/lib/constants";
import { cFmtNum, cFmtPct, cMove } from "@/lib/format";
import type { Theme } from "@/lib/types";

interface MIndexBarProps {
  P: Palette;
  theme: Theme;
  quotes: Record<string, Quote>;
  onGoWatch: () => void;
}

export function MIndexBar({ P, theme, quotes, onGoWatch }: MIndexBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (expanded) return;
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % INDICES.length);
    }, 10000);
    return () => clearInterval(id);
  }, [expanded]);

  const indices = INDICES.map((idx) => {
    const q = quotes[idx.code];
    return {
      name: idx.name,
      code: idx.code,
      price: q?.price ?? 0,
      pct: q?.changePercent ?? 0,
    };
  });

  const cur = indices[current];
  const curColor = cMove(cur.pct, theme);

  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 16px",
          cursor: "pointer",
          borderBottom: `1px solid ${P.lineSoft}`,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: P.text }}>
          {cur.name}
        </span>
        <span
          style={{
            fontSize: 14,
            color: P.text,
            marginLeft: 8,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {cFmtNum(cur.price)}
        </span>
        <span
          style={{
            fontSize: 12,
            marginLeft: 8,
            padding: "2px 6px",
            borderRadius: 4,
            background: curColor + "1a",
            color: curColor,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {cFmtPct(cur.pct)}
        </span>
        <svg width="20" height="16" viewBox="0 0 24 24" fill="none" stroke={P.subtle} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}><path d="M7 9l5 5 5-5" /></svg>
        <span
          onClick={(e) => { e.stopPropagation(); onGoWatch(); }}
          style={{
            marginLeft: "auto",
            fontSize: 13,
            color: P.muted,
            cursor: "pointer",
          }}
        >
          股票自选 ›
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Collapsed bar still visible behind */}
      <div
        onClick={() => setExpanded(false)}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 16px",
          cursor: "pointer",
          borderBottom: `1px solid ${P.lineSoft}`,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: P.text }}>{cur.name}</span>
        <span style={{ fontSize: 14, color: P.text, marginLeft: 8, fontVariantNumeric: "tabular-nums" }}>{cFmtNum(cur.price)}</span>
        <span style={{ fontSize: 12, marginLeft: 8, padding: "2px 6px", borderRadius: 4, background: curColor + "1a", color: curColor, fontVariantNumeric: "tabular-nums" }}>{cFmtPct(cur.pct)}</span>
        <svg width="20" height="16" viewBox="0 0 24 24" fill="none" stroke={P.subtle} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}><path d="M7 15l5-5 5 5" /></svg>
        <span onClick={(e) => { e.stopPropagation(); onGoWatch(); }} style={{ marginLeft: "auto", fontSize: 13, color: P.muted, cursor: "pointer" }}>股票自选 ›</span>
      </div>

      {/* Floating dropdown */}
      <div style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        zIndex: 100,
        clipPath: "inset(0 -40px -40px -40px)",
      }}>
      <div style={{
        background: P.bg,
        borderRadius: "0 0 16px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
        padding: "12px 16px 16px",
        borderTop: `1px solid ${P.lineSoft}`,
      }}>
        {/* Header */}
        <div
          onClick={() => setExpanded(false)}
          style={{ display: "flex", alignItems: "center", cursor: "pointer", marginBottom: 12 }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: P.text }}>股市行情</span>
        </div>

        {/* Index grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {indices.map((idx) => {
            const color = cMove(idx.pct, theme);
            return (
              <div key={idx.code} style={{ background: color + "14", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 12, color: P.text, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{idx.name}</div>
                <div style={{ fontSize: 17, fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>{cFmtPct(idx.pct)}</div>
                <div style={{ fontSize: 11, color: P.muted, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{cFmtNum(idx.price)}</div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
