"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { usePalette } from "@/hooks/usePalette";
import { useQuotes } from "@/hooks/useQuotes";
import { Sidebar } from "@/components/Sidebar";
import { TodayPane } from "@/components/panes/TodayPane";
import { HoldingsPane } from "@/components/panes/HoldingsPane";
import { WatchPane } from "@/components/panes/WatchPane";
import { AddWatchModal } from "@/components/modals/AddWatchModal";
import { HoldingModal } from "@/components/modals/HoldingModal";
import type { ModalState } from "@/components/panes/types";

export function TidalApp() {
  const store = useStore();
  const P = usePalette();
  const indices = useQuotes();
  const [modal, setModal] = useState<ModalState>(null);

  // avoid hydration flash: render plain background until local state is loaded
  if (!store.hydrated) {
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
      <Sidebar P={P} indices={indices} />

      <main style={{ overflowY: "auto", overflowX: "hidden" }}>
        <div style={{ padding: "30px 40px 48px", maxWidth: 1080, margin: "0 auto" }}>
          {store.tab === "today" && <TodayPane P={P} openModal={setModal} />}
          {store.tab === "holdings" && <HoldingsPane P={P} openModal={setModal} />}
          {store.tab === "watch" && <WatchPane P={P} openModal={setModal} />}
        </div>
      </main>

      {modal?.type === "watch" && (
        <AddWatchModal P={P} onClose={() => setModal(null)} />
      )}
      {modal?.type === "holding" && (
        <HoldingModal P={P} editCode={modal.code} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
