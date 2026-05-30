import { useMemo } from "react";
import type { Palette } from "@shared/theme";

const PAD = { top: 6, right: 12, bottom: 16, left: 40 };

export function AreaChart({
  series,
  labels,
  color,
  P,
  height = 84,
}: {
  series: number[];
  labels: string[];
  color: string;
  P: Palette;
  height?: number;
}) {
  const width = 292;
  const geo = useMemo(() => {
    if (series.length < 2) return null;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = max - min || 1;
    const lo = min - span * 0.16;
    const hi = max + span * 0.16;
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const yFor = (v: number) => PAD.top + innerH - ((v - lo) / (hi - lo || 1)) * innerH;
    const xFor = (i: number) => PAD.left + (i / (series.length - 1)) * innerW;
    const pts = series.map((v, i) => [xFor(i), yFor(v)] as const);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    const area = `${line} L ${pts.at(-1)![0].toFixed(1)} ${PAD.top + innerH} L ${pts[0][0].toFixed(1)} ${PAD.top + innerH} Z`;
    return { line, area, xFor };
  }, [series, height]);

  if (!geo) {
    return (
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
    );
  }

  const labelTicks = [0, Math.floor((series.length - 1) / 2), series.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={P.isDark ? "rgba(255,255,255,0.05)" : "rgba(91,79,212,0.10)"} />
          <stop offset="100%" stopColor={P.isDark ? "rgba(255,255,255,0)" : "rgba(91,79,212,0)"} />
        </linearGradient>
      </defs>
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
    </svg>
  );
}
