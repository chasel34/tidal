// Small shared helpers + visual primitives reused across variations.
// Exports to window so other Babel files can use them.

const fmtMoney = (n, opts = {}) => {
  const { sign = false, decimals = 2 } = opts;
  const abs = Math.abs(n);
  const s = abs.toLocaleString("zh-CN", {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
  const prefix = n < 0 ? "-" : sign ? "+" : "";
  return prefix + "¥" + s;
};
const fmtNum = (n, decimals = 2) =>
  n.toLocaleString("zh-CN", {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
const fmtPct = (n, opts = {}) => {
  const { sign = true } = opts;
  const v = n.toFixed(2);
  return (sign && n > 0 ? "+" : "") + v + "%";
};

// 中式涨红跌绿 — choose token pairs given theme
function moveColor(value, theme = "light") {
  if (value === 0) return theme === "dark" ? "#8a8a93" : "#7a7a82";
  if (value > 0) {
    return theme === "dark" ? "#ff6868" : "#d83a3a";
  }
  return theme === "dark" ? "#3fc28a" : "#179766";
}

// Inline sparkline svg
function SparkLine({ data, width = 84, height = 26, color, fill, strokeWidth = 1.4 }) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return [x, y];
  });
  const d = points
    .map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(2) + " " + p[1].toFixed(2))
    .join(" ");
  const areaD = d + ` L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {fill ? <path d={areaD} fill={fill} /> : null}
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Donut chart for allocation
function Donut({ segments, size = 140, thickness = 18, gap = 0.012, centerLabel }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = size / 2 - thickness / 2;
  const cx = size / 2, cy = size / 2;
  let acc = -0.25; // start top
  const arcs = segments.map((seg, i) => {
    const frac = seg.value / total;
    const start = acc + gap / 2;
    const end = acc + frac - gap / 2;
    acc += frac;
    if (end <= start) return null;
    const a0 = start * Math.PI * 2;
    const a1 = end * Math.PI * 2;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = end - start > 0.5 ? 1 : 0;
    return (
      <path key={i}
        d={`M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`}
        fill="none" stroke={seg.color} strokeWidth={thickness}
        strokeLinecap="butt" />
    );
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs}
      {centerLabel}
    </svg>
  );
}

// Area chart for portfolio trend
function AreaChart({ data, width, height, color, fillFrom, fillTo,
                    axisColor, padding = { top: 18, right: 8, bottom: 22, left: 38 },
                    showAxis = true, gradientId }) {
  if (!data || data.length < 2) return null;
  const W = width, H = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pad = (max - min) * 0.15;
  const lo = min - pad, hi = max + pad;
  const range = hi - lo || 1;
  const innerW = W - padding.left - padding.right;
  const innerH = H - padding.top - padding.bottom;
  const stepX = innerW / (data.length - 1);
  const pts = data.map((v, i) => [
    padding.left + i * stepX,
    padding.top + innerH - ((v - lo) / range) * innerH,
  ]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(2) + " " + p[1].toFixed(2)).join(" ");
  const areaD = d + ` L ${pts[pts.length - 1][0]} ${padding.top + innerH} L ${pts[0][0]} ${padding.top + innerH} Z`;

  const gid = gradientId || "g" + Math.random().toString(36).slice(2, 7);
  const ticks = 4;
  const tickVals = Array.from({ length: ticks }, (_, i) => lo + (i / (ticks - 1)) * range);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillFrom} />
          <stop offset="100%" stopColor={fillTo} />
        </linearGradient>
      </defs>
      {showAxis && tickVals.map((v, i) => {
        const y = padding.top + innerH - (i / (ticks - 1)) * innerH;
        return (
          <g key={i}>
            <line x1={padding.left} x2={W - padding.right} y1={y} y2={y}
              stroke={axisColor} strokeWidth="0.6" strokeDasharray="2 4" />
            <text x={padding.left - 6} y={y + 3} fontSize="9"
              textAnchor="end" fill={axisColor}>
              {Math.round(v / 1000)}k
            </text>
          </g>
        );
      })}
      <path d={areaD} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// K-line / candle chart (simplified, deterministic from a trend series)
function Candles({ data, width, height, theme = "light", grid = true }) {
  if (!data || data.length < 2) return null;
  // Derive OHLC from each trend point + a small wobble
  const candles = data.map((close, i) => {
    const prev = i === 0 ? close * 0.998 : data[i - 1];
    const open = prev;
    const range = Math.abs(close - open) + close * 0.005;
    const wobble = (Math.sin(i * 1.7) + 1) * 0.5;
    const high = Math.max(open, close) + range * (0.3 + 0.5 * wobble);
    const low = Math.min(open, close) - range * (0.2 + 0.4 * (1 - wobble));
    return { open, close, high, low };
  });
  const lo = Math.min(...candles.map(c => c.low));
  const hi = Math.max(...candles.map(c => c.high));
  const range = hi - lo || 1;
  const pad = { top: 10, right: 8, bottom: 18, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const cw = innerW / candles.length;
  const bodyW = Math.max(2, cw * 0.55);
  const upStroke = theme === "dark" ? "#ff6868" : "#d83a3a";
  const dnStroke = theme === "dark" ? "#3fc28a" : "#179766";
  const upFill = upStroke;
  const dnFill = dnStroke;
  const axis = theme === "dark" ? "#3a3a42" : "#d8d4ce";
  const axisLabel = theme === "dark" ? "#6f6f78" : "#9a9690";
  const yFor = v => pad.top + innerH - ((v - lo) / range) * innerH;
  const ticks = 4;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {grid && Array.from({ length: ticks }, (_, i) => {
        const v = lo + (i / (ticks - 1)) * range;
        const y = yFor(v);
        return (
          <g key={i}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y}
              stroke={axis} strokeWidth="0.5" strokeDasharray="2 4" />
            <text x={pad.left - 6} y={y + 3} fontSize="9"
              textAnchor="end" fill={axisLabel}>{v.toFixed(2)}</text>
          </g>
        );
      })}
      {candles.map((c, i) => {
        const up = c.close >= c.open;
        const x = pad.left + i * cw + cw / 2;
        const stroke = up ? upStroke : dnStroke;
        const fill = up ? upFill : dnFill;
        const yo = yFor(c.open), yc = yFor(c.close);
        const yh = yFor(c.high), yl = yFor(c.low);
        const bodyTop = Math.min(yo, yc);
        const bodyH = Math.max(1, Math.abs(yc - yo));
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={yh} y2={yl} stroke={stroke} strokeWidth="0.8" />
            <rect x={x - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH}
              fill={fill} opacity={up ? 1 : 1} rx="0.5" />
          </g>
        );
      })}
    </svg>
  );
}

// Theme toggle button
function ThemeToggle({ theme, setTheme, palette }) {
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      style={{
        background: "transparent",
        border: `1px solid ${palette.line}`,
        color: palette.muted,
        width: 32, height: 32, borderRadius: 16,
        cursor: "pointer", display: "inline-flex",
        alignItems: "center", justifyContent: "center",
        fontSize: 14, padding: 0,
      }}
      title={theme === "dark" ? "切换为亮色" : "切换为暗色"}>
      {theme === "dark" ? "☾" : "☀"}
    </button>
  );
}

Object.assign(window, {
  fmtMoney, fmtNum, fmtPct, moveColor,
  SparkLine, Donut, AreaChart, Candles,
  ThemeToggle,
});
