"use client";

import { useCallback, useRef, useState } from "react";
import { Settings } from "lucide-react";
import { typeLabel, usePortfolioDerived, useStore } from "@/store/useStore";
import { usePalette } from "@/hooks/usePalette";
import { useQuotes } from "@/hooks/useQuotes";
import { MShell } from "@/components/mobile/layout/MShell";
import { MTopBar } from "@/components/mobile/layout/MTopBar";
import { MTabBar } from "@/components/mobile/layout/MTabBar";
import { MToday } from "@/components/mobile/screens/MToday";
import { MHoldings } from "@/components/mobile/screens/MHoldings";
import { MWatch } from "@/components/mobile/screens/MWatch";
import { MStockDetail } from "@/components/mobile/screens/MStockDetail";
import { MFundDetail } from "@/components/mobile/screens/MFundDetail";
import { MAddWatchSheet } from "@/components/mobile/sheets/MAddWatchSheet";
import { MHoldingSheet } from "@/components/mobile/sheets/MHoldingSheet";
import { MOcrImportSheet } from "@/components/mobile/sheets/MOcrImportSheet";
import { MSettingsSheet } from "@/components/mobile/sheets/MSettingsSheet";
import { useSyncBootstrap } from "@/hooks/useSyncBootstrap";
import type { OcrTarget } from "@/hooks/useOcrImport";

type SheetState =
  | { type: "watch" }
  | { type: "holding"; code?: string }
  | { type: "ocr"; target?: OcrTarget }
  | { type: "settings"; view?: "ai" | "sync" }
  | null;

export function MobileApp() {
  const P = usePalette();
  useQuotes(); // start quote polling
  useSyncBootstrap();

  const [detail, setDetail] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const tab = useStore((state) => state.tab);
  const setTab = useStore((state) => state.setTab);
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const watch = useStore((state) => state.watch);
  const addWatch = useStore((state) => state.addWatch);
  const { holdingsFull, watchFull, sortedHoldings, sortedWatch } = usePortfolioDerived();

  const goDetail = useCallback((code: string) => {
    setDetail(code);
    scrollRef.current?.scrollTo(0, 0);
  }, []);

  const handleSetTab = useCallback((t: typeof tab) => {
    setTab(t);
    setDetail(null);
    scrollRef.current?.scrollTo(0, 0);
  }, [setTab]);

  const openSheet = useCallback((s: SheetState) => setSheet(s), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  // Determine detail instrument info
  const detailInst = detail
    ? holdingsFull.find((h) => h.code === detail) || watchFull.find((w) => w.code === detail) || null
    : null;

  const isFund = detailInst ? detailInst.category === "fund" && detailInst.market?.toLowerCase() === "jj" : false;

  // Top bar config
  let topTitle = "";
  let topSub: string | undefined;
  let topOnBack: (() => void) | undefined;
  let topRight: React.ReactNode = undefined;

  if (detail && detailInst) {
    topTitle = detailInst.name;
    topSub = `${detailInst.code} · ${typeLabel(detailInst)}`;
    topOnBack = () => setDetail(null);
    const inWatch = watch.some((w) => w.code === detail);
    topRight = !inWatch ? (
      <button
        onClick={() => { if (detailInst) addWatch(detailInst); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: P.accent, fontSize: 14, fontWeight: 600 }}
      >
        ＋ 自选
      </button>
    ) : undefined;
  } else {
    const tabTitles = { today: "我的资产", holdings: "持仓", watch: "自选" };
    topTitle = tabTitles[tab];
    if (tab === "today") {
      topSub = undefined;
    } else if (tab === "holdings") {
      topSub = `${sortedHoldings.length} 只标的`;
    } else {
      topSub = `${sortedWatch.length} 只关注`;
    }
    topRight = (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => setSheet({ type: "settings" })}
          aria-label="设置"
          style={{
            background: "transparent",
            border: `1px solid ${P.line}`,
            color: P.muted,
            width: 38,
            height: 38,
            borderRadius: 19,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Settings size={18} />
        </button>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="切换主题"
          style={{
            background: "transparent",
            border: `1px solid ${P.line}`,
            color: P.muted,
            width: 38,
            height: 38,
            borderRadius: 19,
            cursor: "pointer",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {theme === "dark" ? "☾" : "☀"}
        </button>
      </div>
    );
  }

  return (
    <MShell P={P}>
      <MTopBar P={P} title={topTitle} sub={topSub} onBack={topOnBack} right={topRight} />
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {detail ? (
          isFund ? (
            <MFundDetail code={detail} onBack={() => setDetail(null)} openSheet={openSheet} />
          ) : (
            <MStockDetail code={detail} onBack={() => setDetail(null)} openSheet={openSheet} />
          )
        ) : tab === "today" ? (
          <MToday goDetail={goDetail} openSheet={openSheet} />
        ) : tab === "holdings" ? (
          <MHoldings goDetail={goDetail} openSheet={openSheet} />
        ) : (
          <MWatch goDetail={goDetail} openSheet={openSheet} />
        )}
      </div>
      {!detail && <MTabBar P={P} tab={tab} setTab={handleSetTab} />}

      {/* Sheets */}
      {sheet?.type === "watch" && <MAddWatchSheet P={P} onClose={closeSheet} />}
      {sheet?.type === "holding" && <MHoldingSheet P={P} onClose={closeSheet} editCode={sheet.code} />}
      {sheet?.type === "ocr" && (
        <MOcrImportSheet
          P={P}
          defaultTarget={sheet.target}
          onOpenSettings={() => setSheet({ type: "settings", view: "ai" })}
          onClose={closeSheet}
        />
      )}
      {sheet?.type === "settings" && (
        <MSettingsSheet P={P} initialView={sheet.view} onClose={closeSheet} />
      )}
    </MShell>
  );
}
