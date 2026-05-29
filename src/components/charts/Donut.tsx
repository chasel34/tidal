import type { AllocationSegment } from "@/lib/types";

interface DonutProps {
  segments: AllocationSegment[];
  size?: number;
  thickness?: number;
  colors: string[];
  gap?: number;
}

export function Donut({
  segments,
  size = 150,
  thickness = 16,
  colors,
  gap = 0.014,
}: DonutProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - thickness / 2;
  const cx = size / 2;
  const cy = size / 2;
  // pure prefix-sum offsets (no mutation during render)
  const fracs = segments.map((s) => s.value / total);
  const arcs = fracs.map((frac, i) => ({
    frac,
    offset: -0.25 + fracs.slice(0, i).reduce((a, b) => a + b, 0),
  }));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((_, i) => {
        const { frac, offset } = arcs[i];
        const start = offset + gap / 2;
        const end = offset + frac - gap / 2;
        if (end <= start) return null;
        const a0 = start * Math.PI * 2;
        const a1 = end * Math.PI * 2;
        const large = end - start > 0.5 ? 1 : 0;
        return (
          <path
            key={i}
            d={`M ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`}
            fill="none"
            stroke={colors[i % colors.length]}
            strokeWidth={thickness}
            strokeLinecap="butt"
          />
        );
      })}
    </svg>
  );
}
