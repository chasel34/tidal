"use client";

import { useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import type { Palette } from "@/lib/theme";
import { cFmtNum, cFmtPct } from "@/lib/format";

function useMeasure(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      setW(entries[0].contentRect.width);
    });
    ro.observe(ref.current);
    setW(ref.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

interface Candle {
  open: number;
  close: number;
  high: number;
  low: number;
}

interface MCandleProps {
  candles: Candle[];
  labels?: string[];
  height?: number;
  P: Palette;
  move: (v: number) => string;
}

export function MCandle({
  candles,
  labels,
  height = 200,
  P,
  move,
}: MCandleProps) {
  const [containerRef, width] = useMeasure();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const pad = { top: 14, right: 8, bottom: 20, left: 44 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const geo = useMemo(() => {
    if (candles.length < 1 || innerW <= 0) return null;
    const allHigh = Math.max(...candles.map((c) => c.high));
    const allLow = Math.min(...candles.map((c) => c.low));
    const range = allHigh - allLow || 1;
    const vPad = range * 0.16;
    const min = allLow - vPad;
    const max = allHigh + vPad;
    const yScale = (v: number) => pad.top + innerH * (1 - (v - min) / (max - min));

    const cw = innerW / candles.length;
    const bodyW = Math.max(2, Math.min(13, cw * 0.62));

    const ticks: number[] = [];
    for (let i = 0; i < 4; i++) {
      ticks.push(min + ((max - min) * (3 - i)) / 3);
    }

    return { min, max, yScale, cw, bodyW, ticks };
  }, [candles, innerW, innerH, pad.top]);

  const updateHover = useCallback((e: React.PointerEvent) => {
    if (!geo || innerW <= 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left - pad.left;
    const idx = Math.floor(x / geo.cw);
    setHoverIdx(Math.max(0, Math.min(candles.length - 1, idx)));
  }, [geo, innerW, candles.length, pad.left]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateHover(e);
  }, [updateHover]);

  const clearHover = useCallback(() => setHoverIdx(null), []);

  if (!geo || width === 0) {
    return <div ref={containerRef} style={{ width: "100%", height, touchAction: "pan-y" }} />;
  }

  const xLabels = labels ?? [];
  const xLabelIdxs = [0, Math.floor((candles.length - 1) / 2), candles.length - 1];

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height, touchAction: "pan-y", position: "relative" }}
      onPointerDown={handlePointerDown}
      onPointerMove={(e) => { if (hoverIdx !== null) updateHover(e); }}
      onPointerUp={clearHover}
      onPointerCancel={clearHover}
      onPointerLeave={clearHover}
    >
      <svg width={width} height={height} style={{ display: "block" }}>
        {/* gridlines and Y ticks */}
        {geo.ticks.map((t, i) => {
          const y = geo.yScale(t);
          return (
            <g key={i}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke={P.lineSoft} strokeWidth={1} />
              <text x={pad.left - 6} y={y + 3} textAnchor="end" style={{ fontSize: 9.5, fill: P.subtle }}>
                {cFmtNum(t)}
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {xLabelIdxs.map((idx) => {
          const label = xLabels[idx];
          if (!label) return null;
          const x = pad.left + idx * geo.cw + geo.cw / 2;
          return (
            <text key={idx} x={x} y={height - 4} textAnchor="middle" style={{ fontSize: 9.5, fill: P.subtle }}>
              {label}
            </text>
          );
        })}

        {/* candles */}
        {candles.map((c, i) => {
          const cx = pad.left + i * geo.cw + geo.cw / 2;
          const isUp = c.close >= c.open;
          const color = isUp ? move(1) : move(-1);
          const bodyTop = geo.yScale(Math.max(c.open, c.close));
          const bodyBot = geo.yScale(Math.min(c.open, c.close));
          const bodyH = Math.max(1, bodyBot - bodyTop);
          return (
            <g key={i}>
              <line x1={cx} x2={cx} y1={geo.yScale(c.high)} y2={geo.yScale(c.low)} stroke={color} strokeWidth={1} />
              <rect
                x={cx - geo.bodyW / 2}
                y={bodyTop}
                width={geo.bodyW}
                height={bodyH}
                fill={color}
              />
            </g>
          );
        })}

        {/* hover highlight */}
        {hoverIdx !== null && (() => {
          const c = candles[hoverIdx];
          const cx = pad.left + hoverIdx * geo.cw;
          const chg = c.open !== 0 ? ((c.close - c.open) / c.open) * 100 : 0;
          const tooltipX = Math.min(cx, width - pad.right - 146);
          return (
            <>
              <rect
                x={cx} y={pad.top}
                width={geo.cw} height={innerH}
                fill={P.accent} opacity={0.08}
              />
              {/* tooltip */}
              <rect
                x={tooltipX} y={pad.top}
                width={146} height={56} rx={8}
                fill={P.isDark ? "rgba(0,0,0,0.82)" : "rgba(30,28,24,0.88)"}
              />
              {xLabels[hoverIdx] && (
                <text x={tooltipX + 8} y={pad.top + 14} style={{ fontSize: 10, fill: P.muted }}>
                  {xLabels[hoverIdx]}
                </text>
              )}
              <text x={tooltipX + 8} y={pad.top + 30} style={{ fontSize: 11, fill: "#fff", fontWeight: 600 }}>
                {cFmtPct(chg)} O:{cFmtNum(c.open)}
              </text>
              <text x={tooltipX + 8} y={pad.top + 46} style={{ fontSize: 10, fill: "#ccc" }}>
                H:{cFmtNum(c.high)} L:{cFmtNum(c.low)} C:{cFmtNum(c.close)}
              </text>
            </>
          );
        })()}
      </svg>
    </div>
  );
}
