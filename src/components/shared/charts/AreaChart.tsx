"use client";

import { useCallback, useId, useMemo, useState } from "react";
import type { Palette } from "@/lib/theme";
import { cFmtCompact } from "@/lib/format";
import { useMeasure } from "./useMeasure";

interface AreaChartProps {
  series: number[];
  labels?: string[];
  height?: number;
  color: string;
  fillFrom: string;
  fillTo: string;
  P: Palette;
  formatValue?: (v: number) => string;
  baseline?: boolean;
}

interface Geo {
  lo: number;
  hi: number;
  range: number;
  innerW: number;
  innerH: number;
  stepX: number;
  xFor: (i: number) => number;
  yFor: (v: number) => number;
  pts: [number, number][];
  line: string;
  area: string;
}

/** Interactive area / line chart with hover crosshair + tooltip. */
export function AreaChart({
  series,
  labels,
  height = 200,
  color,
  fillFrom,
  fillTo,
  P,
  formatValue,
  baseline = false,
}: AreaChartProps) {
  const [wrapRef, W] = useMeasure();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 16, right: 14, bottom: 24, left: 52 };
  const width = Math.max(W, 280);

  const geo = useMemo<Geo | null>(() => {
    if (!series || series.length < 2 || width < 50) return null;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = max - min || 1;
    const padV = span * 0.16;
    const lo = baseline ? Math.min(min - padV, series[0]) : min - padV;
    const hi = max + padV;
    const range = hi - lo || 1;
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const stepX = innerW / (series.length - 1);
    const xFor = (i: number) => pad.left + i * stepX;
    const yFor = (v: number) => pad.top + innerH - ((v - lo) / range) * innerH;
    const pts = series.map((v, i) => [xFor(i), yFor(v)] as [number, number]);
    const line = pts
      .map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1))
      .join(" ");
    const area =
      line +
      ` L ${pts[pts.length - 1][0].toFixed(1)} ${pad.top + innerH} L ${pts[0][0].toFixed(1)} ${pad.top + innerH} Z`;
    return { lo, hi, range, innerW, innerH, stepX, xFor, yFor, pts, line, area };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, width, height, baseline]);

  const onMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!geo) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let i = Math.round((x - pad.left) / geo.stepX);
      i = Math.max(0, Math.min(series.length - 1, i));
      setHover(i);
    },
    [geo, series, pad.left]
  );

  const rawId = useId();
  const gid = "a" + rawId.replace(/[^a-zA-Z0-9]/g, "");
  if (!geo) return <div ref={wrapRef} style={{ width: "100%", height }} />;

  const ticks = 4;
  const tickVals = Array.from(
    { length: ticks },
    (_, i) => geo.lo + (i / (ticks - 1)) * geo.range
  );
  const labelTicks = [0, Math.floor((series.length - 1) / 2), series.length - 1];

  const hp = hover != null ? geo.pts[hover] : null;
  const hv = hover != null ? series[hover] : null;
  const tipW = 132;
  let tipX = hp ? hp[0] - tipW / 2 : 0;
  tipX = Math.max(pad.left, Math.min(width - pad.right - tipW, tipX));

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
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillFrom} />
            <stop offset="100%" stopColor={fillTo} />
          </linearGradient>
        </defs>
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
                fontSize="10"
                textAnchor="end"
                fill={P.subtle}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {cFmtCompact(v)}
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
              fontSize="10"
              textAnchor={
                k === 0 ? "start" : k === labelTicks.length - 1 ? "end" : "middle"
              }
              fill={P.subtle}
            >
              {labels[i]}
            </text>
          ))}
        <path d={geo.area} fill={`url(#${gid})`} />
        <path
          d={geo.line}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hp && (
          <g>
            <line
              x1={hp[0]}
              x2={hp[0]}
              y1={pad.top}
              y2={height - pad.bottom}
              stroke={P.crosshair}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={hp[0]} cy={hp[1]} r="4.5" fill={color} stroke={P.panel} strokeWidth="2" />
          </g>
        )}
        {hp && hv != null && (
          <g transform={`translate(${tipX}, ${pad.top + 2})`}>
            <rect width={tipW} height="42" rx="8" fill={P.isDark ? "#000" : "#1a1a1f"} opacity="0.92" />
            <text x="12" y="17" fontSize="11" fill="rgba(255,255,255,0.6)">
              {labels ? labels[hover!] : ""}
            </text>
            <text
              x="12"
              y="33"
              fontSize="13"
              fill="#fff"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatValue ? formatValue(hv) : cFmtCompact(hv)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
