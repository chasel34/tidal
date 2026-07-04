import type { OcrTarget } from "@/hooks/useOcrImport";

/** Which bottom sheet is open — single source shared by MobileApp and screens. */
export type SheetState =
  | { type: "watch" }
  | { type: "holding"; code?: string }
  | { type: "ocr"; target?: OcrTarget }
  | { type: "settings"; view?: "ai" | "sync" }
  | null;
