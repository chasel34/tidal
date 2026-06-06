"use client";

import type { Palette } from "@/lib/theme";
import type { IndexQuote, TabId } from "@/lib/types";
import { cFmtPct, cMove } from "@/lib/format";
import { useStore } from "@/store/useStore";
import { ThemeToggle } from "@/components/shared/ui/ThemeToggle";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "today", label: "今天", icon: "◉" },
  { id: "holdings", label: "持仓", icon: "◧" },
  { id: "watch", label: "自选", icon: "✦" },
];

function SideLabel({ children, P }: { children: React.ReactNode; P: Palette }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        color: P.subtle,
        letterSpacing: "0.12em",
        padding: "0 12px 8px",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

export function Sidebar({
  P,
  indices,
  onOpenAiSettings,
}: {
  P: Palette;
  indices: IndexQuote[];
  onOpenAiSettings: () => void;
}) {
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const tab = useStore((state) => state.tab);
  const setTab = useStore((state) => state.setTab);
  const resetAll = useStore((state) => state.resetAll);
  return (
    <aside
      style={{
        borderRight: `1px solid ${P.line}`,
        padding: "22px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 22,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              background: P.accent,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            盘
          </div>
          <div style={{ fontSize: 14.5, color: P.text }}>我的看板</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={onOpenAiSettings}
            title="智能识别设置"
            style={{
              background: "transparent",
              border: "none",
              color: P.muted,
              fontSize: 16,
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
            }}
          >
            ⚙
          </button>
          <ThemeToggle theme={theme} setTheme={setTheme} P={P} />
        </div>
      </div>

      <div>
        <SideLabel P={P}>导航</SideLabel>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                width: "100%",
                padding: "9px 12px",
                borderRadius: 9,
                border: "none",
                background: active
                  ? P.isDark
                    ? "#26262e"
                    : "#f0ede5"
                  : "transparent",
                color: active ? P.text : P.muted,
                cursor: "pointer",
                font: "inherit",
                fontSize: 13.5,
                textAlign: "left",
                marginBottom: 2,
              }}
            >
              <span style={{ width: 16, textAlign: "center", opacity: 0.85 }}>
                {t.icon}
              </span>
              {t.label}
            </button>
          );
        })}
      </div>

      <div>
        <SideLabel P={P}>大盘</SideLabel>
        {indices.map((idx) => {
          const c = cMove(idx.pct, theme);
          return (
            <div
              key={idx.code}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "7px 12px",
                fontSize: 12,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span style={{ color: P.muted }}>{idx.name}</span>
              <span style={{ color: idx.value ? c : P.subtle }}>
                {idx.value ? cFmtPct(idx.pct) : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "auto",
          padding: "12px 4px 0",
          borderTop: `1px solid ${P.line}`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 11, color: P.subtle }}>
          数据每 15 秒刷新 · 来自 stock-sdk
        </div>
        <button
          onClick={() => {
            if (confirm("确定要清空所有持仓与自选吗？")) resetAll();
          }}
          style={{
            background: "transparent",
            border: "none",
            color: P.subtle,
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
            padding: 0,
          }}
        >
          ↺ 清空数据
        </button>
      </div>
    </aside>
  );
}
