"use client";

import { useEffect, useRef, useState } from "react";
import type { Palette } from "@/lib/theme";

function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * 截图导入 scan animation — a soft accent light-band sweeping over the uploaded
 * screenshot. Loops until the parent leaves the scan step (the real recognition
 * call has variable latency, so this is indeterminate, not a fixed timer).
 */
export function OcrScanAnim({
  src,
  P,
  label = "正在识别截图…",
  maxHeight = 300,
}: {
  src: string;
  P: Palette;
  label?: string;
  maxHeight?: number;
}) {
  const bandRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);

  useEffect(() => {
    if (!h || !bandRef.current) return;
    const bandH = 84;
    const anim = bandRef.current.animate(
      [
        { transform: `translateY(${-bandH}px)`, opacity: 0 },
        { transform: `translateY(2px)`, opacity: 1, offset: 0.1 },
        { transform: `translateY(${h - bandH - 2}px)`, opacity: 1, offset: 0.9 },
        { transform: `translateY(${h}px)`, opacity: 0 },
      ],
      { duration: 1500, iterations: Infinity, easing: "cubic-bezier(.45,0,.55,1)" },
    );
    return () => {
      try {
        anim.cancel();
      } catch {
        /* noop */
      }
    };
  }, [h]);

  const a = P.accent;
  return (
    <div>
      <div
        style={{
          position: "relative",
          borderRadius: 14,
          overflow: "hidden",
          border: `1px solid ${P.line}`,
          background: P.isDark ? "#16161a" : "#f4f2ec",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          onLoad={(e) => setH(e.currentTarget.clientHeight)}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            maxHeight,
            objectFit: "cover",
            objectPosition: "top",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: P.isDark ? "rgba(10,10,12,0.34)" : "rgba(250,249,246,0.26)",
          }}
        />
        <div
          ref={bandRef}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 84,
            pointerEvents: "none",
            willChange: "transform",
            background: `linear-gradient(to bottom, ${hexA(a, 0)} 0%, ${hexA(a, 0.14)} 55%, ${hexA(a, 0.28)} 90%, ${hexA(a, 0)} 100%)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 6,
              right: 6,
              bottom: 5,
              height: 2,
              borderRadius: 2,
              background: a,
              boxShadow: `0 0 14px 2px ${hexA(a, 0.7)}`,
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          marginTop: 16,
          justifyContent: "center",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            background: a,
            animation: "ocr-pulse 1s ease-in-out infinite",
          }}
        />
        <span style={{ fontSize: 13.5, color: P.muted }}>{label}</span>
      </div>
      <style>{`@keyframes ocr-pulse{0%,100%{opacity:.35;transform:scale(.78)}50%{opacity:1;transform:scale(1.1)}}`}</style>
    </div>
  );
}
