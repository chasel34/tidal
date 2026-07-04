"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Palette } from "@/lib/theme";

export interface ImportMsg {
  text: string;
  ok: boolean;
}

/** Transient import feedback: auto-dismisses after 3s; timer cleared on unmount. */
export function useImportMsg(): {
  importMsg: ImportMsg | null;
  showMsg: (text: string, ok: boolean) => void;
} {
  const [importMsg, setImportMsg] = useState<ImportMsg | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showMsg = useCallback((text: string, ok: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setImportMsg({ text, ok });
    timerRef.current = setTimeout(() => setImportMsg(null), 3000);
  }, []);

  return { importMsg, showMsg };
}

export function ImportBanner({ P, msg }: { P: Palette; msg: ImportMsg | null }) {
  if (!msg) return null;
  return (
    <div
      style={{
        marginBottom: 14,
        padding: "8px 14px",
        borderRadius: 8,
        fontSize: 13,
        background: msg.ok
          ? P.isDark
            ? "#1a2e1a"
            : "#f0faf0"
          : P.isDark
            ? "#2e1a1a"
            : "#faf0f0",
        color: msg.ok
          ? P.isDark
            ? "#6ecf6e"
            : "#2a7a2a"
          : P.isDark
            ? "#cf6e6e"
            : "#9a2a2a",
        border: `1px solid ${msg.ok ? (P.isDark ? "#2d4a2d" : "#c8e6c8") : P.isDark ? "#4a2d2d" : "#e6c8c8"}`,
      }}
    >
      {msg.text}
    </div>
  );
}
