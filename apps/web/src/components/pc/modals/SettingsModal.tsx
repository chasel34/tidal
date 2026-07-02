"use client";

// Merged 设置 modal (design/project/calm/web-settings.jsx). A single entry that
// folds 智能识别 (BYOK AI) and 备份与同步 (Google Drive) under one segmented
// switcher — replacing the old separate ☁ / ⚙ header buttons.

import { useState } from "react";
import type { Palette } from "@/lib/theme";
import { Modal } from "@/components/shared/ui/Modal";
import { AiSettingsBody } from "@/components/pc/modals/AiSettingsModal";
import { SyncBody } from "@/components/shared/sync/SyncSettingsModal";

export type SettingsTab = "ai" | "sync";

function Segmented({
  P,
  value,
  onChange,
}: {
  P: Palette;
  value: SettingsTab;
  onChange: (v: SettingsTab) => void;
}) {
  const options: { value: SettingsTab; label: string }[] = [
    { value: "ai", label: "智能识别" },
    { value: "sync", label: "备份与同步" },
  ];
  return (
    <div style={{ display: "flex", background: P.chipBg, borderRadius: 10, padding: 3, gap: 2 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              flex: 1,
              padding: "8px 10px",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: active ? 500 : 400,
              background: active ? P.panel : "transparent",
              color: active ? P.text : P.muted,
              boxShadow: active
                ? P.isDark
                  ? "0 1px 3px rgba(0,0,0,0.4)"
                  : "0 1px 3px rgba(40,30,20,0.1)"
                : "none",
              transition: "background .15s",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsModal({
  P,
  onClose,
  initialTab = "ai",
}: {
  P: Palette;
  onClose: () => void;
  initialTab?: SettingsTab;
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  return (
    <Modal P={P} title="设置" onClose={onClose} width={480}>
      <div style={{ marginBottom: 18 }}>
        <Segmented P={P} value={tab} onChange={setTab} />
      </div>
      {tab === "ai" && <AiSettingsBody P={P} />}
      {tab === "sync" && <SyncBody P={P} />}
    </Modal>
  );
}
