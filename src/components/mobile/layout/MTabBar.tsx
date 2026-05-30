"use client";

import type { Palette } from "@/lib/theme";
import type { TabId } from "@/lib/types";

interface MTabBarProps {
  P: Palette;
  tab: TabId;
  setTab: (t: TabId) => void;
}

function IconToday({ active, P: _P }: { active: boolean; P: Palette }) {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13l9-9 9 9" />
      <path d="M5 11v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
      {active && <rect x="9.5" y="13.5" width="5" height="6.5" rx="1" fill="currentColor" stroke="none" />}
    </svg>
  );
}

function IconHoldings({ active, P }: { active: boolean; P: Palette }) {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2.5" fill={active ? "currentColor" : "none"} />
      <path d="M3 9h18" stroke={active ? P.panel : "currentColor"} />
      <path d="M7 13h5" stroke={active ? P.panel : "currentColor"} strokeLinecap="round" />
    </svg>
  );
}

function IconWatch({ active }: { active: boolean }) {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 17l-5.2 2.6 1-5.8-4.2-4.1 5.8-.8z" strokeLinejoin="round" />
    </svg>
  );
}

const tabs: { id: TabId; label: string; Icon: typeof IconToday }[] = [
  { id: "today", label: "今天", Icon: IconToday },
  { id: "holdings", label: "持仓", Icon: IconHoldings },
  { id: "watch", label: "自选", Icon: IconWatch },
];

export function MTabBar({ P, tab, setTab }: MTabBarProps) {
  return (
    <nav
      style={{
        display: "flex",
        borderTop: `1px solid ${P.line}`,
        background: P.isDark ? "rgba(22,22,25,0.86)" : "rgba(255,255,255,0.86)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "9px 0 7px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: active ? P.accent : P.subtle,
              fontWeight: active ? 600 : 500,
            }}
          >
            <Icon active={active} P={P} />
            <span style={{ fontSize: 10.5 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
