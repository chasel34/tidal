"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { usePalette } from "@/hooks/usePalette";
import { useQuotes } from "@/hooks/useQuotes";
import { Sidebar } from "@/components/pc/Sidebar";
import { TodayPane } from "@/components/pc/panes/TodayPane";
import { HoldingsPane } from "@/components/pc/panes/HoldingsPane";
import { WatchPane } from "@/components/pc/panes/WatchPane";
import { AddWatchModal } from "@/components/pc/modals/AddWatchModal";
import { HoldingModal } from "@/components/pc/modals/HoldingModal";
import { OcrImportModal } from "@/components/pc/modals/OcrImportModal";
import { AiSettingsModal } from "@/components/pc/modals/AiSettingsModal";
import type { ModalState } from "@/components/pc/panes/types";

export function TidalApp() {
  const hydrated = useStore((state) => state.hydrated);
  const tab = useStore((state) => state.tab);
  const P = usePalette();
  const indices = useQuotes();
  const [modal, setModal] = useState<ModalState>(null);

  // avoid hydration flash: render plain background until local state is loaded
  if (!hydrated) {
    return <div style={{ width: "100%", height: "100vh", background: P.bg }} />;
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        background: P.bg,
        color: P.text,
        fontFamily: "'PingFang SC', 'Inter', system-ui, -apple-system, sans-serif",
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        overflow: "hidden",
      }}
    >
      <Sidebar P={P} indices={indices} onOpenAiSettings={() => setModal({ type: "aiSettings" })} />

      <main style={{ overflowY: "auto", overflowX: "hidden" }}>
        <div style={{ padding: "30px 40px 48px", maxWidth: 1080, margin: "0 auto" }}>
          {tab === "today" && <TodayPane P={P} openModal={setModal} />}
          {tab === "holdings" && <HoldingsPane P={P} openModal={setModal} />}
          {tab === "watch" && <WatchPane P={P} openModal={setModal} />}
        </div>
      </main>

      {modal?.type === "watch" && (
        <AddWatchModal P={P} onClose={() => setModal(null)} />
      )}
      {modal?.type === "holding" && (
        <HoldingModal P={P} editCode={modal.code} onClose={() => setModal(null)} />
      )}
      {modal?.type === "ocr" && (
        <OcrImportModal
          P={P}
          defaultTarget={modal.target}
          onOpenSettings={() => setModal({ type: "aiSettings" })}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "aiSettings" && (
        <AiSettingsModal P={P} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
