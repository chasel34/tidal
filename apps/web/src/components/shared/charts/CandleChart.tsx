"use client";

import { useCallback, useMemo, useState } from "react";
import type { Palette } from "@/lib/theme";
import type { Theme } from "@/lib/types";
import { cFmtNum, cFmtPct, cMove } from "@/lib/format";
import { useMeasure } from "./useMeasure";

export interface Candle {
  open: number;
  close: number;
  high: number;
  low: number;
}

interface CandleChartProps {
  candles: Candle[];
  labels?: string[];
  height?: number;
  theme: Theme;
  P: Palette;
}

interface Geo {
  lo: number;
  hi: number;
  range: number;
  innerH: number;
  cw: number;
  bodyW: number;
  yFor: (v: number) => number;
  xFor: (i: number) => number;
}

/** Interactive candle (K-line) chart with real OHLC + hover tooltip. */
export function CandleChart({ candles, labels, height = 180, theme, P }: CandleChartProps) {
  const [wrapRef, W] = useMeasure();
  const [hover, setHover] = useState<number | null>(null);
  const width = Math.max(W, 260);
  const pad = { top: 14, right: 10, bottom: 22, left: 48 };

  const geo = useMemo<Geo | null>(() => {
    if (!candles.length || width < 50) return null;
    const lo = Math.min(...candles.map((c) => c.low));
    const hi = Math.max(...candles.map((c) => c.high));
    const range = hi - lo || 1;
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const cw = innerW / candles.length;
    const bodyW = Math.max(2, Math.min(14, cw * 0.6));
    const yFor = (v: number) => pad.top + innerH - ((v - lo) / range) * innerH;
    const xFor = (i: number) => pad.left + i * cw + cw / 2;
    return { lo, hi, range, innerH, cw, bodyW, yFor, xFor };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, width, height]);

  const onMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!geo) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let i = Math.floor((x - pad.left) / geo.cw);
      i = Math.max(0, Math.min(candles.length - 1, i));
      setHover(i);
    },
    [geo, candles, pad.left]
  );

  if (!geo) return <div ref={wrapRef} style={{ width: "100%", height }} />;

  const up = cMove(1, theme);
  const dn = cMove(-1, theme);
  const ticks = 4;
  const tickVals = Array.from(
    { length: ticks },
    (_, i) => geo.lo + (i / (ticks - 1)) * geo.range
  );
  const labelTicks = [0, Math.floor((candles.length - 1) / 2), candles.length - 1];
  const hc = hover != null ? candles[hover] : null;
  const tipW = 150;
  let tipX = hc ? geo.xFor(hover!) - tipW / 2 : 0;
  tipX = Math.max(pad.left, Math.min(width - pad.right - tipW, tipX));
  const chg = hc ? ((hc.close - hc.open) / hc.open) * 100 : 0;

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        style={{ display: "block", cursor: "crosshair" }}
      >
        {tickVals.map((v, i) => {
          const y = geo.yFor(v);
          return (
            <g key={i}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke={P.lineSoft}
                strokeWidth="1"
              />
              <text
                x={pad.left - 8}
                y={y + 3}
                fontSize="9.5"
                textAnchor="end"
                fill={P.subtle}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {cFmtNum(v)}
              </text>
            </g>
          );
        })}
        {labels &&
          labelTicks.map((i, k) => (
            <text
              key={k}
              x={geo.xFor(i)}
              y={height - 6}
              fontSize="9.5"
              textAnchor={
                k === 0 ? "start" : k === labelTicks.length - 1 ? "end" : "middle"
              }
              fill={P.subtle}
            >
              {labels[i]}
            </text>
          ))}
        {hc && (
          <rect
            x={geo.xFor(hover!) - geo.cw / 2}
            y={pad.top}
            width={geo.cw}
            height={geo.innerH}
            fill={P.accent}
            opacity="0.08"
          />
        )}
        {candles.map((c, i) => {
          const isUp = c.close >= c.open;
          const col = isUp ? up : dn;
          const x = geo.xFor(i);
          const yo = geo.yFor(c.open);
          const yc = geo.yFor(c.close);
          const top = Math.min(yo, yc);
          const h = Math.max(1, Math.abs(yc - yo));
          return (
            <g key={i}>
              <line
                x1={x}
                x2={x}
                y1={geo.yFor(c.high)}
                y2={geo.yFor(c.low)}
                stroke={col}
                strokeWidth="1"
              />
              <rect x={x - geo.bodyW / 2} y={top} width={geo.bodyW} height={h} fill={col} rx="0.5" />
            </g>
          );
        })}
        {hc && (
          <g transform={`translate(${tipX}, ${pad.top + 2})`}>
            <rect width={tipW} height="58" rx="8" fill={P.isDark ? "#000" : "#1a1a1f"} opacity="0.92" />
            <text x="12" y="16" fontSize="10.5" fill="rgba(255,255,255,0.6)">
              {labels ? labels[hover!] : ""} · 涨幅 {cFmtPct(chg)}
            </text>
            <text
              x="12"
              y="33"
              fontSize="11"
              fill="rgba(255,255,255,0.85)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              开 {cFmtNum(hc.open)}　高 {cFmtNum(hc.high)}
            </text>
            <text
              x="12"
              y="49"
              fontSize="11"
              fill="rgba(255,255,255,0.85)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              收 {cFmtNum(hc.close)}　低 {cFmtNum(hc.low)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
