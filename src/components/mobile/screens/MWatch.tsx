"use client";

import { useCallback, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { usePalette } from "@/hooks/usePalette";
import { cFmtPct, cMove } from "@/lib/format";
import { MCard } from "@/components/mobile/ui/MCard";
import { MEmpty } from "@/components/mobile/ui/MEmpty";
import { Spark } from "@/components/shared/charts/Spark";
import type { WatchSortKey } from "@/lib/types";

type SheetState = { type: "watch" } | { type: "holding"; code?: string } | null;

interface MWatchProps {
  goDetail: (code: string) => void;
  openSheet: (s: SheetState) => void;
}

const SORT_CHIPS: { key: WatchSortKey; label: string }[] = [
  { key: "today", label: "今日" },
  { key: "price", label: "现价" },
  { key: "name", label: "代码" },
];

function MSwipeRow({ children, onDelete, P }: { children: React.ReactNode; onDelete: () => void; P: ReturnType<typeof usePalette> }) {
  const [dx, setDx] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    dragging.current = true;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const diff = e.clientX - startX.current;
    setDx(Math.min(0, Math.max(-84, diff)));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    setDx((prev) => (prev < -42 ? -84 : 0));
  }, []);

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* Delete button behind */}
      <div
        onClick={onDelete}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 84,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: cMove(1, P.isDark ? "dark" : "light"),
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        移除
      </div>
      {/* Content */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging.current ? "none" : "transform .2s ease",
          background: P.panel,
          position: "relative",
          zIndex: 1,
          touchAction: "pan-y",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function MWatch({ goDetail, openSheet }: MWatchProps) {
  const store = useStore();
  const P = usePalette();
  const { sortedWatch, sortW, toggleSortW, theme, removeWatch } = store;

  if (sortedWatch.length === 0) {
    return (
      <div style={{ padding: "60px 0" }}>
        <MEmpty P={P} text="还没有自选 · 关注感兴趣的标的" actionLabel="＋ 添加自选" onAction={() => openSheet({ type: "watch" })} />
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Search trigger */}
      <button
        onClick={() => openSheet({ type: "watch" })}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "12px 14px",
          background: P.isDark ? "#16161a" : "#faf9f5",
          border: `1px solid ${P.line}`,
          borderRadius: 12,
          cursor: "pointer",
          color: P.subtle,
          fontSize: 15,
        }}
      >
        <span style={{ fontSize: 18 }}>⌕</span>
        搜索添加自选
      </button>

      {/* Sort chips */}
      <div style={{ display: "flex", gap: 8, padding: "0 2px" }}>
        {SORT_CHIPS.map((chip) => {
          const active = sortW.key === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => toggleSortW(chip.key)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                background: active ? P.accentSoft : P.chipBg,
                color: active ? P.accent : P.muted,
                border: "none",
                cursor: "pointer",
              }}
            >
              {chip.label}{active ? (sortW.dir === "desc" ? " ↓" : " ↑") : ""}
            </button>
          );
        })}
      </div>

      {/* Watch list */}
      <MCard P={P} pad={0} style={{ overflow: "hidden" }}>
        {sortedWatch.map((w, i) => (
          <MSwipeRow key={w.code} onDelete={() => removeWatch(w.code)} P={P}>
            <div
              onClick={() => goDetail(w.code)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "13px 16px",
                cursor: "pointer",
                borderTop: i > 0 ? `1px solid ${P.lineSoft}` : undefined,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: P.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
                <div style={{ fontSize: 11, color: P.subtle, marginTop: 2 }}>{w.code} · {w.market} · {store.typeLabel(w)}</div>
              </div>
              <Spark data={[]} width={48} height={18} color={cMove(w.todayPct, theme)} />
              <div style={{ textAlign: "right", marginLeft: 12, minWidth: 64 }}>
                <div style={{ fontSize: 13.5, fontVariantNumeric: "tabular-nums", color: P.text }}>{w.price.toFixed(2)}</div>
                <span style={{
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: cMove(w.todayPct, theme) + "18",
                  color: cMove(w.todayPct, theme),
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {cFmtPct(w.todayPct)}
                </span>
              </div>
            </div>
          </MSwipeRow>
        ))}
      </MCard>
    </div>
  );
}
