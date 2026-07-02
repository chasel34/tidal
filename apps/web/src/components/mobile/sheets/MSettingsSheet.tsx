"use client";

// Merged 设置 sheet (design/project/calm-mobile/m-settings.jsx). A menu that
// pushes to 智能识别 / 备份与同步 sub-pages inside the same bottom sheet, with a
// back chevron in the header — replacing the old separate ☁ / ⚙ top-bar buttons.

import { useState } from "react";
import { ChevronRight, RefreshCcw, Sparkles } from "lucide-react";
import type { Palette } from "@/lib/theme";
import { useAiByok } from "@/store/useAiByok";
import { MSheet } from "@/components/mobile/ui/MSheet";
import { MAiSettingsBody } from "@/components/mobile/sheets/MAiSettingsSheet";
import { SyncBody } from "@/components/shared/sync/SyncSettingsModal";

type View = "menu" | "ai" | "sync";

function MenuRow({
  P,
  icon: Icon,
  label,
  sub,
  status,
  onClick,
}: {
  P: Palette;
  icon: typeof Sparkles;
  label: string;
  sub: string;
  status?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        width: "100%",
        textAlign: "left",
        background: P.panel,
        border: `1px solid ${P.line}`,
        borderRadius: 16,
        padding: "15px 16px",
        cursor: "pointer",
        fontFamily: "inherit",
        marginBottom: 10,
      }}
    >
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          flexShrink: 0,
          background: P.accentSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={19} color={P.accent} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15.5, color: P.text, fontWeight: 500 }}>
          {label}
        </span>
        <span style={{ display: "block", fontSize: 12.5, color: P.subtle, marginTop: 2 }}>
          {sub}
        </span>
      </span>
      {status}
      <ChevronRight size={18} color={P.subtle} />
    </button>
  );
}

export function MSettingsSheet({
  P,
  onClose,
  initialView = "menu",
}: {
  P: Palette;
  onClose: () => void;
  initialView?: View;
}) {
  const [view, setView] = useState<View>(initialView);
  const configured = useAiByok((s) => !!s.providers[s.activeProvider]?.apiKey?.trim());

  const title = view === "ai" ? "智能识别" : view === "sync" ? "备份与同步" : "设置";
  const sub = view === "ai" ? "截图识别 · BYOK" : undefined;

  return (
    <MSheet
      P={P}
      title={title}
      sub={sub}
      onClose={onClose}
      onBack={view === "menu" ? undefined : () => setView("menu")}
    >
      {view === "menu" && (
        <div style={{ paddingBottom: 4 }}>
          <MenuRow
            P={P}
            icon={Sparkles}
            label="智能识别"
            sub="截图导入 · 自带大模型 API"
            onClick={() => setView("ai")}
            status={
              <span
                style={{
                  fontSize: 12,
                  color: configured ? (P.isDark ? "#37c98c" : "#0f9d63") : P.subtle,
                  marginRight: 2,
                }}
              >
                {configured ? "已配置" : "未配置"}
              </span>
            }
          />
          <MenuRow
            P={P}
            icon={RefreshCcw}
            label="备份与同步"
            sub="Google Drive 云同步"
            onClick={() => setView("sync")}
          />
        </div>
      )}

      {view === "ai" && <MAiSettingsBody P={P} />}

      {view === "sync" && <SyncBody P={P} isMobile />}
    </MSheet>
  );
}
