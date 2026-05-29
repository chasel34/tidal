interface SparkProps {
  data: number[];
  width?: number;
  height?: number;
  color: string;
  strokeWidth?: number;
}

/** Static sparkline. */
export function Spark({
  data,
  width = 80,
  height = 24,
  color,
  strokeWidth = 1.4,
}: SparkProps) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const d = data
    .map(
      (v, i) =>
        (i ? "L" : "M") +
        (i * stepX).toFixed(2) +
        " " +
        (height - ((v - min) / range) * (height - 2) - 1).toFixed(2)
    )
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
