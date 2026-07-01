import type { Instrument } from "@/lib/types";
import type { OcrTarget } from "@/hooks/useOcrImport";

export type ModalState =
  | { type: "watch" }
  | { type: "holding"; code?: string }
  | { type: "ocr"; target?: OcrTarget }
  | { type: "aiSettings" }
  | { type: "sync" }
  | null;

export interface PaneProps {
  openModal: (m: ModalState) => void;
}

/** A row for the mini-lists on the Today pane. */
export interface MiniRow extends Instrument {
  todayPct: number;
  daily?: number[];
}
