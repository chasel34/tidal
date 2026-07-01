"use client";

import { useEffect } from "react";
import { useTidalStore } from "@/store/useStore";
import { useSync } from "@/store/useSync";

/**
 * Wires 组合同步 into the app lifecycle (web surface, ADR 0007):
 *  - pull-on-open: once both stores have hydrated, reconcile with the cloud.
 *  - debounced push-on-change: any edit to the 组合核心 marks local dirty.
 * No background sync — exactly the "打开页面拉取，更改后稍候上传" model.
 */
export function useSyncBootstrap(): void {
  const hydrated = useTidalStore((s) => s.hydrated);
  const syncHydrated = useSync((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated || !syncHydrated) return;
    void useSync.getState().bootstrapPull();
    // run once after both stores are ready
  }, [hydrated, syncHydrated]);

  useEffect(() => {
    let prev = {
      holdings: useTidalStore.getState().holdings,
      watch: useTidalStore.getState().watch,
      cash: useTidalStore.getState().cash,
    };
    const unsub = useTidalStore.subscribe((s) => {
      if (s.holdings !== prev.holdings || s.watch !== prev.watch || s.cash !== prev.cash) {
        prev = { holdings: s.holdings, watch: s.watch, cash: s.cash };
        useSync.getState().markLocalDirty();
      }
    });
    return unsub;
  }, []);
}
