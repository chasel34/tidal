// Calm Mobile — touch-enabled charts (area + candle). Reuses useMeasure from calm/charts.jsx.
const { useState: useStateMC, useMemo: useMemoMC, useCallback: useCbMC } = React;

// shared: resolve pointer/touch clientX to an index
function clientXToIndex(e, el, padLeft, stepX, n) {
  const rect = el.getBoundingClientRect();
  const cx = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
  const x = cx - rect.left;
  let i = Math.round((x - padLeft) / stepX);
  return Math.max(0, Math.min(n - 1, i));
}

// ---------- Touch area / line chart ----------
function MAreaChart({ series, labels, height = 200, color, fillFrom, fillTo, P,
  formatValue, formatY, baseline = false }) {
  const fmtY = formatY || cFmtCompact;
  const [wrapRef, W] = useMeasure();
  const [hover, setHover] = useStateMC(null);
  const pad = { top: 14, right: 12, bottom: 22, left: 44 };
  const width = Math.max(W, 240);

  const geo = useMemoMC(() => {
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
    return { lo, hi, range, innerW, innerH, stepX, xFor, yFor, pts, line, area };
  }, [series, width, height, baseline]);

  const onMove = useCbMC((e) => {
    if (!geo) return;
    setHover(clientXToIndex(e, e.currentTarget, pad.left, geo.stepX, series.length));
  }, [geo, series]);

  const gid = useMemoMC(() => "ma" + Math.random().toString(36).slice(2, 7), []);
  if (!geo) return <div ref={wrapRef} style={{ width: "100%", height }} />;

  const ticks = 4;
  const tickVals = Array.from({ length: ticks }, (_, i) => geo.lo + (i / (ticks - 1)) * geo.range);
  const labelTicks = [0, Math.floor((series.length - 1) / 2), series.length - 1];
  const hp = hover != null ? geo.pts[hover] : null;
  const hv = hover != null ? series[hover] : null;
  const tipW = 122;
  let tipX = hp ? hp[0] - tipW / 2 : 0;
  tipX = Math.max(pad.left, Math.min(width - pad.right - tipW, tipX));

  return (
    <div ref={wrapRef} style={{ width: "100%", touchAction: "pan-y" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        onTouchStart={onMove} onTouchMove={onMove}
        onTouchEnd={() => setHover(null)}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}
        style={{ display: "block" }}>
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
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y}
                stroke={P.lineSoft} strokeWidth="1" />
              <text x={pad.left - 7} y={y + 3} fontSize="9.5" textAnchor="end"
                fill={P.subtle} style={{ fontVariantNumeric: "tabular-nums" }}>{fmtY(v)}</text>
            </g>
          );
        })}
        {labels && labelTicks.map((i, k) => (
          <text key={k} x={geo.xFor(i)} y={height - 6} fontSize="9.5"
            textAnchor={k === 0 ? "start" : k === labelTicks.length - 1 ? "end" : "middle"}
            fill={P.subtle}>{labels[i]}</text>
        ))}
        <path d={geo.area} fill={`url(#${gid})`} />
        <path d={geo.line} fill="none" stroke={color} strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" />
        {hp && (
          <g>
            <line x1={hp[0]} x2={hp[0]} y1={pad.top} y2={height - pad.bottom}
              stroke={P.crosshair} strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={hp[0]} cy={hp[1]} r="5" fill={color}
              stroke={P.panel} strokeWidth="2.5" />
          </g>
        )}
        {hp && (
          <g transform={`translate(${tipX}, ${pad.top + 2})`}>
            <rect width={tipW} height="40" rx="8"
              fill={P.isDark ? "#000" : "#1a1a1f"} opacity="0.92" />
            <text x="11" y="16" fontSize="10.5" fill="rgba(255,255,255,0.6)">
              {labels ? labels[hover] : ""}</text>
            <text x="11" y="31" fontSize="12.5" fill="#fff"
              style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatValue ? formatValue(hv) : cFmtCompact(hv)}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ---------- Touch candle (K-line) chart ----------
function MCandleChart({ series, labels, height = 180, theme, P }) {
  const [wrapRef, W] = useMeasure();
  const [hover, setHover] = useStateMC(null);
  const width = Math.max(W, 240);
  const pad = { top: 12, right: 8, bottom: 20, left: 42 };

  const candles = useMemoMC(() => {
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

  const geo = useMemoMC(() => {
    if (!candles.length || width < 50) return null;
    const lo = Math.min(...candles.map(c => c.low));
    const hi = Math.max(...candles.map(c => c.high));
    const range = (hi - lo) || 1;
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const cw = innerW / candles.length;
    const bodyW = Math.max(2, Math.min(13, cw * 0.62));
    const yFor = v => pad.top + innerH - ((v - lo) / range) * innerH;
    const xFor = i => pad.left + i * cw + cw / 2;
    return { lo, hi, range, innerW, innerH, cw, bodyW, yFor, xFor };
  }, [candles, width, height]);

  const onMove = useCbMC((e) => {
    if (!geo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
    let i = Math.floor((cx - rect.left - pad.left) / geo.cw);
    setHover(Math.max(0, Math.min(candles.length - 1, i)));
  }, [geo, candles]);

  if (!geo) return <div ref={wrapRef} style={{ width: "100%", height }} />;

  const up = cMove(1, theme), dn = cMove(-1, theme);
  const ticks = 4;
  const tickVals = Array.from({ length: ticks }, (_, i) => geo.lo + (i / (ticks - 1)) * geo.range);
  const labelTicks = [0, Math.floor((candles.length - 1) / 2), candles.length - 1];
  const hc = hover != null ? candles[hover] : null;
  const tipW = 144;
  let tipX = hc ? geo.xFor(hover) - tipW / 2 : 0;
  tipX = Math.max(pad.left, Math.min(width - pad.right - tipW, tipX));
  const chg = hc ? ((hc.close - hc.open) / hc.open) * 100 : 0;

  return (
    <div ref={wrapRef} style={{ width: "100%", touchAction: "pan-y" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        onTouchStart={onMove} onTouchMove={onMove} onTouchEnd={() => setHover(null)}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}
        style={{ display: "block" }}>
        {tickVals.map((v, i) => {
          const y = geo.yFor(v);
          return (
            <g key={i}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y}
                stroke={P.lineSoft} strokeWidth="1" />
              <text x={pad.left - 7} y={y + 3} fontSize="9" textAnchor="end"
                fill={P.subtle} style={{ fontVariantNumeric: "tabular-nums" }}>{cFmtNum(v)}</text>
            </g>
          );
        })}
        {labels && labelTicks.map((i, k) => (
          <text key={k} x={geo.xFor(i)} y={height - 6} fontSize="9"
            textAnchor={k === 0 ? "start" : k === labelTicks.length - 1 ? "end" : "middle"}
            fill={P.subtle}>{labels[i]}</text>
        ))}
        {hc && (
          <rect x={geo.xFor(hover) - geo.cw / 2} y={pad.top}
            width={geo.cw} height={geo.innerH} fill={P.accent} opacity="0.08" />
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
              <rect x={x - geo.bodyW / 2} y={top} width={geo.bodyW} height={h} fill={col} rx="0.5" />
            </g>
          );
        })}
        {hc && (
          <g transform={`translate(${tipX}, ${pad.top + 2})`}>
            <rect width={tipW} height="56" rx="8"
              fill={P.isDark ? "#000" : "#1a1a1f"} opacity="0.92" />
            <text x="11" y="15" fontSize="10" fill="rgba(255,255,255,0.6)">
              {labels ? labels[hover] : ""} · {cFmtPct(chg)}</text>
            <text x="11" y="31" fontSize="10.5" fill="rgba(255,255,255,0.85)"
              style={{ fontVariantNumeric: "tabular-nums" }}>
              开 {cFmtNum(hc.open)}　高 {cFmtNum(hc.high)}</text>
            <text x="11" y="47" fontSize="10.5" fill="rgba(255,255,255,0.85)"
              style={{ fontVariantNumeric: "tabular-nums" }}>
              收 {cFmtNum(hc.close)}　低 {cFmtNum(hc.low)}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

Object.assign(window, { MAreaChart, MCandleChart });
