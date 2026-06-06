import { useCallback, useMemo, useState } from "react";
import { cFmtCompact } from "@shared/format";
import type { Palette } from "@shared/theme";
import { useMeasure } from "@/hooks/useMeasure";

const PAD = { top: 6, right: 12, bottom: 16, left: 40 };

export function AreaChart({
  series,
  labels,
  color,
  P,
  height = 84,
  baseline = true,
  formatValue,
}: {
  series: number[];
  labels: string[];
  color: string;
  P: Palette;
  height?: number;
  baseline?: boolean;
  formatValue?: (value: number) => string;
}) {
  const [wrapRef, { width: measured }] = useMeasure();
  const width = Math.max(measured, 240);
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (series.length < 2 || width < 50) return null;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = max - min || 1;
    const padV = span * 0.16;
    const lo = baseline ? Math.min(min - padV, series[0]) : min - padV;
    const hi = max + padV;
    const range = hi - lo || 1;
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const stepX = innerW / (series.length - 1);
    const xFor = (i: number) => PAD.left + i * stepX;
    const yFor = (v: number) => PAD.top + innerH - ((v - lo) / range) * innerH;
    const pts = series.map((v, i) => [xFor(i), yFor(v)] as const);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    const area = `${line} L ${pts.at(-1)![0].toFixed(1)} ${PAD.top + innerH} L ${pts[0][0].toFixed(1)} ${PAD.top + innerH} Z`;
    return { line, area, xFor, yFor, lo, range, stepX, pts };
  }, [series, width, height, baseline]);

  const onMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!geo) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const i = Math.max(0, Math.min(series.length - 1, Math.round((x - PAD.left) / geo.stepX)));
      setHover(i);
    },
    [geo, series.length],
  );

  if (!geo) {
    return (
      <div ref={wrapRef} style={{ width: "100%" }}>
        <div
          style={{
            height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: P.subtle,
            fontSize: 12,
          }}
        >
          暂无走势
        </div>
      </div>
    );
  }

  const ticks = 4;
  const tickVals = Array.from({ length: ticks }, (_, i) => geo.lo + (i / (ticks - 1)) * geo.range);
  const labelTicks = [0, Math.floor((series.length - 1) / 2), series.length - 1];

  const hoverPt = hover != null ? geo.pts[hover] : null;
  const hoverVal = hover != null ? series[hover] : null;
  const tipW = 132;
  const tipX = hoverPt
    ? Math.max(PAD.left, Math.min(width - PAD.right - tipW, hoverPt[0] - tipW / 2))
    : 0;

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
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={P.isDark ? "rgba(185,166,255,0.16)" : "rgba(91,79,212,0.12)"} />
            <stop offset="100%" stopColor={P.isDark ? "rgba(185,166,255,0)" : "rgba(91,79,212,0)"} />
          </linearGradient>
        </defs>
        {tickVals.map((v, i) => {
          const y = geo.yFor(v);
          return (
            <g key={i}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} stroke={P.lineSoft} strokeWidth="1" />
              <text
                x={PAD.left - 8}
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
        <path d={geo.area} fill="url(#trendFill)" />
        <path d={geo.line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {labels.length > 0 &&
          labelTicks.map((i, k) => (
            <text
              key={k}
              x={geo.xFor(i)}
              y={height - 5}
              fontSize="10"
              fill={P.subtle}
              textAnchor={k === 0 ? "start" : k === labelTicks.length - 1 ? "end" : "middle"}
            >
              {labels[i]}
            </text>
          ))}
        {hoverPt && (
          <g>
            <line
              x1={hoverPt[0]}
              x2={hoverPt[0]}
              y1={PAD.top}
              y2={height - PAD.bottom}
              stroke={P.crosshair}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={hoverPt[0]} cy={hoverPt[1]} r="4.5" fill={color} stroke={P.panel} strokeWidth="2" />
          </g>
        )}
        {hoverPt && hoverVal != null && (
          <g transform={`translate(${tipX}, ${PAD.top + 2})`}>
            <rect width={tipW} height="42" rx="8" fill={P.isDark ? "#000" : "#1a1a1f"} opacity="0.92" />
            <text x="12" y="17" fontSize="11" fill="rgba(255,255,255,0.6)">
              {labels[hover!] ?? ""}
            </text>
            <text x="12" y="33" fontSize="13" fill="#fff" style={{ fontVariantNumeric: "tabular-nums" }}>
              {(formatValue ?? cFmtCompact)(hoverVal)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
