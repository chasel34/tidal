"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import type { Palette } from "@/lib/theme";

interface MSheetProps {
  P: Palette;
  title: string;
  sub?: string;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
}

export function MSheet({ P, title, sub, onClose, onBack, children }: MSheetProps) {
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 220);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "absolute",
          inset: 0,
          background: P.overlay,
          opacity: closing ? 0 : 1,
          transition: "opacity .22s",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: "relative",
          background: P.panel,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          maxHeight: "86%",
          display: "flex",
          flexDirection: "column",
          animation: closing ? "none" : "msheet-in .26s cubic-bezier(.22,.61,.36,1)",
          transform: closing ? "translateY(100%)" : undefined,
          transition: closing ? "transform .22s ease-in" : undefined,
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 38, height: 5, borderRadius: 3, background: P.line }} />
        </div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 20px 12px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {onBack && (
              <button
                onClick={onBack}
                aria-label="返回"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  background: P.chipBg,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  color: P.muted,
                  flexShrink: 0,
                }}
              >
                ‹
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: P.text }}>{title}</div>
              {sub && <div style={{ fontSize: 12, color: P.subtle, marginTop: 2 }}>{sub}</div>}
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              background: P.chipBg,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              color: P.muted,
            }}
          >
            ✕
          </button>
        </div>
        {/* Content */}
        <div style={{ overflowY: "auto", padding: "16px 20px 8px" }}>{children}</div>
      </div>
    </div>
  );
}
