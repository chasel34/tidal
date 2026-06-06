"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import type { Palette } from "@/lib/theme";
import { cFmtCompact } from "@/lib/format";

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

interface MAreaProps {
  series: number[];
  labels?: string[];
  height?: number;
  P: Palette;
  accentColor?: string;
  accentSoft?: string;
  formatValue?: (v: number) => string;
  formatY?: (v: number) => string;
  baseline?: boolean;
}

export function MArea({
  series,
  labels,
  height = 200,
  P,
  accentColor,
  accentSoft,
  formatValue,
  formatY,
  baseline = true,
}: MAreaProps) {
  const [containerRef, width] = useMeasure();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const accent = accentColor ?? P.accent;
  const accentS = accentSoft ?? P.accentSoft;
  const fmtY = formatY ?? cFmtCompact;
  const fmtVal = formatValue ?? ((v: number) => v.toFixed(2));

  const rawId = useId();
  const gradId = "m" + rawId.replace(/:/g, "");

  const pad = { top: 16, right: 14, bottom: 22, left: 46 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const geo = useMemo(() => {
    if (series.length < 2 || innerW <= 0) return null;
    const raw_min = Math.min(...series);
    const raw_max = Math.max(...series);
    const range = raw_max - raw_min || 1;
    const vPad = range * 0.16;
    const min = baseline ? Math.min(raw_min, 0) - vPad : raw_min - vPad;
    const max = raw_max + vPad;
    const yScale = (v: number) => pad.top + innerH * (1 - (v - min) / (max - min));
    const xStep = innerW / (series.length - 1);
    const points = series.map((v, i) => ({ x: pad.left + i * xStep, y: yScale(v) }));
    const linePath = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ");
    const areaPath = linePath + ` L${points[points.length - 1].x},${pad.top + innerH} L${points[0].x},${pad.top + innerH} Z`;

    const ticks: number[] = [];
    for (let i = 0; i < 4; i++) {
      ticks.push(min + ((max - min) * (3 - i)) / 3);
    }

    return { min, max, points, linePath, areaPath, ticks, xStep, yScale };
  }, [series, innerW, innerH, baseline, pad.top, pad.left]);

  const updateHover = useCallback((e: React.PointerEvent) => {
    if (!geo || innerW <= 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left - pad.left;
    const idx = Math.round(x / geo.xStep);
    setHoverIdx(Math.max(0, Math.min(series.length - 1, idx)));
  }, [geo, innerW, series.length, pad.left]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateHover(e);
  }, [updateHover]);

  const clearHover = useCallback(() => setHoverIdx(null), []);

  if (!geo || width === 0) {
    return <div ref={containerRef} style={{ width: "100%", height, touchAction: "pan-y" }} />;
  }

  const xLabels = labels ?? [];
  // de-dup so a short series (length ≤ 2) doesn't collide on the same index/key
  const xLabelIdxs = [...new Set([0, Math.floor((series.length - 1) / 2), series.length - 1])];

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
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentS} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* gridlines and Y ticks */}
        {geo.ticks.map((t, i) => {
          const y = geo.yScale(t);
          return (
            <g key={i}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke={P.lineSoft} strokeWidth={1} />
              <text x={pad.left - 6} y={y + 3} textAnchor="end" style={{ fontSize: 9.5, fill: P.subtle }}>
                {fmtY(t)}
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {xLabelIdxs.map((idx) => {
          const label = xLabels[idx];
          if (!label) return null;
          const x = geo.points[idx]?.x ?? 0;
          return (
            <text key={idx} x={x} y={height - 4} textAnchor="middle" style={{ fontSize: 9.5, fill: P.subtle }}>
              {label}
            </text>
          );
        })}

        {/* area + line */}
        <path d={geo.areaPath} fill={`url(#${gradId})`} />
        <path d={geo.linePath} fill="none" stroke={accent} strokeWidth={2} />

        {/* hover state */}
        {hoverIdx !== null && geo.points[hoverIdx] && (() => {
          const pt = geo.points[hoverIdx];
          return (
            <>
              <line
                x1={pt.x} x2={pt.x}
                y1={pad.top} y2={pad.top + innerH}
                stroke={P.crosshair} strokeWidth={1} strokeDasharray="4 3"
              />
              <circle cx={pt.x} cy={pt.y} r={5} fill={accent} stroke={P.panel} strokeWidth={2.5} />

              {/* tooltip */}
              <rect
                x={Math.min(pt.x - 64, width - pad.right - 128)}
                y={pad.top}
                width={128} height={42} rx={8}
                fill={P.isDark ? "rgba(0,0,0,0.82)" : "rgba(30,28,24,0.88)"}
              />
              {xLabels[hoverIdx] && (
                <text
                  x={Math.min(pt.x - 64, width - pad.right - 128) + 10}
                  y={pad.top + 16}
                  style={{ fontSize: 10, fill: P.muted }}
                >
                  {xLabels[hoverIdx]}
                </text>
              )}
              <text
                x={Math.min(pt.x - 64, width - pad.right - 128) + 10}
                y={pad.top + 34}
                style={{ fontSize: 13, fill: "#fff", fontWeight: 600 }}
              >
                {fmtVal(series[hoverIdx])}
              </text>
            </>
          );
        })()}
      </svg>
    </div>
  );
}
