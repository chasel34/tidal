// Calm Dashboard — interactive charts with hover crosshair + tooltips.
// Pointer tracking is done in React state over an SVG overlay.

const { useState, useRef, useLayoutEffect, useCallback, useMemo } = React;

// Measure a container's width responsively.
function useMeasure() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      const cr = entries[0].contentRect;
      setW(cr.width);
    });
    ro.observe(ref.current);
    setW(ref.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// ---------- Sparkline (static) ----------
function Spark({ data, width = 80, height = 24, color, strokeWidth = 1.4 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const d = data.map((v, i) =>
    (i ? "L" : "M") + (i * stepX).toFixed(2) + " " +
    (height - ((v - min) / range) * (height - 2) - 1).toFixed(2)).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ---------- Interactive area / line chart ----------
function AreaChartLive({
  series, labels, height = 200, color, fillFrom, fillTo, P,
  formatValue, formatY, baseline = false, padding,
}) {
  const fmtY = formatY || cFmtCompact;
  const [wrapRef, W] = useMeasure();
  const [hover, setHover] = useState(null); // index
  const pad = padding || { top: 16, right: 14, bottom: 24, left: 52 };
  const width = Math.max(W, 280);

  const geo = useMemo(() => {
    if (!series || series.length < 2 || width < 50) return null;
    const min = Math.min(...series), max = Math.max(...series);
    const span = (max - min) || 1;
    const padV = span * 0.16;
    const lo = baseline ? Math.min(min - padV, series[0]) : min - padV;
    const hi = max + padV;
    const range = (hi - lo) || 1;
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const stepX = innerW / (series.length - 1);
    const xFor = i => pad.left + i * stepX;
    const yFor = v => pad.top + innerH - ((v - lo) / range) * innerH;
    const pts = series.map((v, i) => [xFor(i), yFor(v)]);
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = line + ` L ${pts[pts.length - 1][0].toFixed(1)} ${pad.top + innerH} L ${pts[0][0].toFixed(1)} ${pad.top + innerH} Z`;
    return { lo, hi, range, innerW, innerH, stepX, xFor, yFor, pts, line, area, min, max };
  }, [series, width, height, baseline]);

  const onMove = useCallback((e) => {
    if (!geo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let i = Math.round((x - pad.left) / geo.stepX);
    i = Math.max(0, Math.min(series.length - 1, i));
    setHover(i);
  }, [geo, series]);

  const gid = useMemo(() => "a" + Math.random().toString(36).slice(2, 7), []);
  if (!geo) return <div ref={wrapRef} style={{ width: "100%", height }} />;

  const ticks = 4;
  const tickVals = Array.from({ length: ticks }, (_, i) => geo.lo + (i / (ticks - 1)) * geo.range);
  const labelTicks = [0, Math.floor((series.length - 1) / 2), series.length - 1];

  const hp = hover != null ? geo.pts[hover] : null;
  const hv = hover != null ? series[hover] : null;
  // tooltip position clamps inside
  const tipW = 132;
  let tipX = hp ? hp[0] - tipW / 2 : 0;
  tipX = Math.max(pad.left, Math.min(width - pad.right - tipW, tipX));

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}
        style={{ display: "block", cursor: "crosshair" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillFrom} />
            <stop offset="100%" stopColor={fillTo} />
          </linearGradient>
        </defs>
        {/* y grid */}
        {tickVals.map((v, i) => {
          const y = geo.yFor(v);
          return (
            <g key={i}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y}
                stroke={P.lineSoft} strokeWidth="1" />
              <text x={pad.left - 8} y={y + 3} fontSize="10" textAnchor="end"
                fill={P.subtle} style={{fontVariantNumeric:"tabular-nums"}}>
                {fmtY(v)}
              </text>
            </g>
          );
        })}
        {/* x labels */}
        {labels && labelTicks.map((i, k) => (
          <text key={k} x={geo.xFor(i)} y={height - 6} fontSize="10"
            textAnchor={k === 0 ? "start" : k === labelTicks.length - 1 ? "end" : "middle"}
            fill={P.subtle}>{labels[i]}</text>
        ))}
        <path d={geo.area} fill={`url(#${gid})`} />
        <path d={geo.line} fill="none" stroke={color} strokeWidth="1.8"
          strokeLinejoin="round" strokeLinecap="round" />
        {/* hover crosshair */}
        {hp && (
          <g>
            <line x1={hp[0]} x2={hp[0]} y1={pad.top} y2={height - pad.bottom}
              stroke={P.crosshair} strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={hp[0]} cy={hp[1]} r="4.5" fill={color}
              stroke={P.panel} strokeWidth="2" />
          </g>
        )}
        {/* tooltip */}
        {hp && (
          <g transform={`translate(${tipX}, ${pad.top + 2})`}>
            <rect width={tipW} height="42" rx="8"
              fill={P.isDark ? "#000" : "#1a1a1f"} opacity="0.92" />
            <text x="12" y="17" fontSize="11" fill="rgba(255,255,255,0.6)">
              {labels ? labels[hover] : ""}
            </text>
            <text x="12" y="33" fontSize="13" fill="#fff"
              style={{fontVariantNumeric:"tabular-nums"}}>
              {formatValue ? formatValue(hv) : cFmtCompact(hv)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ---------- Interactive candle (K-line) chart ----------
function CandleChartLive({ series, labels, height = 180, theme, P }) {
  const [wrapRef, W] = useMeasure();
  const [hover, setHover] = useState(null);
  const width = Math.max(W, 260);
  const pad = { top: 14, right: 10, bottom: 22, left: 48 };

  const candles = useMemo(() => {
    if (!series || series.length < 2) return [];
    return series.map((close, i) => {
      const open = i === 0 ? close * 0.997 : series[i - 1];
      const body = Math.abs(close - open) + close * 0.004;
      const wob = (Math.sin(i * 1.7) + 1) * 0.5;
      const high = Math.max(open, close) + body * (0.3 + 0.5 * wob);
      const low = Math.min(open, close) - body * (0.2 + 0.4 * (1 - wob));
      return { open, close, high, low, i };
    });
  }, [series]);

  const geo = useMemo(() => {
    if (!candles.length || width < 50) return null;
    const lo = Math.min(...candles.map(c => c.low));
    const hi = Math.max(...candles.map(c => c.high));
    const range = (hi - lo) || 1;
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const cw = innerW / candles.length;
    const bodyW = Math.max(2, Math.min(14, cw * 0.6));
    const yFor = v => pad.top + innerH - ((v - lo) / range) * innerH;
    const xFor = i => pad.left + i * cw + cw / 2;
    return { lo, hi, range, innerW, innerH, cw, bodyW, yFor, xFor };
  }, [candles, width, height]);

  const onMove = useCallback((e) => {
    if (!geo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let i = Math.floor((x - pad.left) / geo.cw);
    i = Math.max(0, Math.min(candles.length - 1, i));
    setHover(i);
  }, [geo, candles]);

  if (!geo) return <div ref={wrapRef} style={{ width: "100%", height }} />;

  const up = cMove(1, theme), dn = cMove(-1, theme);
  const ticks = 4;
  const tickVals = Array.from({ length: ticks }, (_, i) => geo.lo + (i / (ticks - 1)) * geo.range);
  const labelTicks = [0, Math.floor((candles.length - 1) / 2), candles.length - 1];
  const hc = hover != null ? candles[hover] : null;
  const tipW = 150;
  let tipX = hc ? geo.xFor(hover) - tipW / 2 : 0;
  tipX = Math.max(pad.left, Math.min(width - pad.right - tipW, tipX));
  const chg = hc ? ((hc.close - hc.open) / hc.open) * 100 : 0;

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}
        style={{ display: "block", cursor: "crosshair" }}>
        {tickVals.map((v, i) => {
          const y = geo.yFor(v);
          return (
            <g key={i}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y}
                stroke={P.lineSoft} strokeWidth="1" />
              <text x={pad.left - 8} y={y + 3} fontSize="9.5" textAnchor="end"
                fill={P.subtle} style={{fontVariantNumeric:"tabular-nums"}}>{cFmtNum(v)}</text>
            </g>
          );
        })}
        {labels && labelTicks.map((i, k) => (
          <text key={k} x={geo.xFor(i)} y={height - 6} fontSize="9.5"
            textAnchor={k === 0 ? "start" : k === labelTicks.length - 1 ? "end" : "middle"}
            fill={P.subtle}>{labels[i]}</text>
        ))}
        {hc && (
          <rect x={geo.xFor(hover) - geo.cw / 2} y={pad.top}
            width={geo.cw} height={geo.innerH}
            fill={P.accent} opacity="0.08" />
        )}
        {candles.map((c, i) => {
          const isUp = c.close >= c.open;
          const col = isUp ? up : dn;
          const x = geo.xFor(i);
          const yo = geo.yFor(c.open), yc = geo.yFor(c.close);
          const top = Math.min(yo, yc);
          const h = Math.max(1, Math.abs(yc - yo));
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={geo.yFor(c.high)} y2={geo.yFor(c.low)}
                stroke={col} strokeWidth="1" />
              <rect x={x - geo.bodyW / 2} y={top} width={geo.bodyW} height={h}
                fill={col} rx="0.5" />
            </g>
          );
        })}
        {hc && (
          <g transform={`translate(${tipX}, ${pad.top + 2})`}>
            <rect width={tipW} height="58" rx="8"
              fill={P.isDark ? "#000" : "#1a1a1f"} opacity="0.92" />
            <text x="12" y="16" fontSize="10.5" fill="rgba(255,255,255,0.6)">
              {labels ? labels[hover] : ""} · 涨幅 {cFmtPct(chg)}
            </text>
            <text x="12" y="33" fontSize="11" fill="rgba(255,255,255,0.85)"
              style={{fontVariantNumeric:"tabular-nums"}}>
              开 {cFmtNum(hc.open)}　高 {cFmtNum(hc.high)}
            </text>
            <text x="12" y="49" fontSize="11" fill="rgba(255,255,255,0.85)"
              style={{fontVariantNumeric:"tabular-nums"}}>
              收 {cFmtNum(hc.close)}　低 {cFmtNum(hc.low)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

Object.assign(window, { useMeasure, Spark, AreaChartLive, CandleChartLive });
