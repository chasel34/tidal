"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  aiDefaultState,
  aiNormalize,
  type AiByokState,
  type OcrProviderId,
} from "@tidal/core";

export type OcrField = "apiKey" | "baseURL" | "model";

interface AiByokStore extends AiByokState {
  hydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  setActiveProvider: (id: OcrProviderId) => void;
  setField: (id: OcrProviderId, field: OcrField, value: string) => void;
}

/**
 * AI 识别配置 (BYOK) for 截图导入 — kept in its own localStorage key, separate
 * from the main store, and deliberately NOT part of the export/import backup so
 * the API key never travels in a shareable file (ADR 0005).
 */
export const useAiByok = create<AiByokStore>()(
  persist(
    (set) => ({
      ...aiDefaultState(),
      hydrated: false,
      setHydrated: (hydrated) => set({ hydrated }),
      setActiveProvider: (id) => set({ activeProvider: id }),
      setField: (id, field, value) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [id]: { ...state.providers[id], [field]: value },
          },
        })),
    }),
    {
      name: "tidal-ai-byok-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeProvider: state.activeProvider,
        providers: state.providers,
      }),
      merge: (persisted, current) => ({ ...current, ...aiNormalize(persisted) }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

// Hydrate on the client once (mirrors the main store's manual rehydrate).
if (typeof window !== "undefined") {
  void useAiByok.persist.rehydrate();
}
