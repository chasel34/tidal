"use client";

import { useCallback, useMemo, useState } from "react";
import {
  aiIsConfigured,
  aiResolve,
  matchInstrument,
  reconstructHolding,
  screenshotSearchQueries,
  type ExtractedRow,
  type Instrument,
  type MatchStatus,
} from "@tidal/core";
import { apiQuotes, apiSearch } from "@/lib/api-client";
import { fileToDownscaledDataUrl, ocrExtract } from "@/lib/ocr-client";
import { useAiByok } from "@/store/useAiByok";
import { useStore } from "@/store/useStore";

export type OcrStep = "gate" | "upload" | "scan" | "review" | "done" | "error";
export type OcrTarget = "holding" | "watch";

export interface ReviewRow {
  id: string;
  raw: ExtractedRow;
  name: string;
  instrument: Instrument | null;
  status: MatchStatus;
  /** Editable, persisted fields — seeded from the reconstruction. */
  shares: string;
  cost: string;
  price: number;
  include: boolean;
}

let rowSeq = 0;

function trimNum(n: number, dp: number): string {
  return String(Math.round(n * 10 ** dp) / 10 ** dp);
}

/** Seed the editable 份额/成本 from 持仓反推; blank when it can't be derived. */
function seedReconstruction(raw: ExtractedRow, price: number): { shares: string; cost: string } {
  const d = reconstructHolding(raw, price);
  if (!d) return { shares: "", cost: "" };
  return { shares: trimNum(d.shares, 2), cost: trimNum(d.cost, 4) };
}

async function fetchPrice(inst: Instrument): Promise<number> {
  try {
    const qs = await apiQuotes([inst]);
    return qs[0]?.price ?? 0;
  } catch {
    return 0;
  }
}

/** Try progressively-trimmed queries until one returns candidates. */
async function searchCandidates(row: ExtractedRow): Promise<Instrument[]> {
  for (const q of screenshotSearchQueries(row)) {
    const found = await apiSearch(q);
    if (found.length) return found;
  }
  return [];
}

export function useOcrImport(defaultTarget: OcrTarget = "holding") {
  const state = useAiByok();
  const configured = aiIsConfigured(state);
  const addHolding = useStore((s) => s.addHolding);
  const addWatch = useStore((s) => s.addWatch);

  const [step, setStep] = useState<OcrStep>(configured ? "upload" : "gate");
  const [target, setTarget] = useState<OcrTarget>(defaultTarget);
  const [src, setSrc] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [error, setError] = useState<string>("");
  const [imported, setImported] = useState({ added: 0, skipped: 0 });

  const recognize = useCallback(
    async (dataUrl: string) => {
      setStep("scan");
      setError("");
      try {
        const cfg = aiResolve(state);
        const extracted = await ocrExtract(dataUrl, cfg);
        if (!extracted.length) {
          setError("未能从截图识别到任何标的，换一张更清晰的持仓截图试试。");
          setStep("error");
          return;
        }
        const candidatesList = await Promise.all(extracted.map(searchCandidates));
        const matched = extracted.map((raw, i) => {
          const m = matchInstrument(raw, candidatesList[i]);
          return { raw, ...m };
        });
        const prices = await Promise.all(
          matched.map((m) => (m.instrument ? fetchPrice(m.instrument) : Promise.resolve(0))),
        );
        const built: ReviewRow[] = matched.map((m, i) => ({
          id: `r${rowSeq++}`,
          raw: m.raw,
          name: m.raw.name,
          instrument: m.instrument,
          status: m.status,
          ...seedReconstruction(m.raw, prices[i]),
          price: prices[i],
          include: m.status === "matched",
        }));
        setRows(built);
        setStep("review");
      } catch (e) {
        setError(e instanceof Error ? e.message : "识别失败");
        setStep("error");
      }
    },
    [state],
  );

  const pickFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      try {
        const dataUrl = await fileToDownscaledDataUrl(file);
        setSrc(dataUrl);
        await recognize(dataUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : "读取图片失败");
        setStep("error");
      }
    },
    [recognize],
  );

  const editRow = useCallback((id: string, patch: Partial<ReviewRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }, []);

  const setRowInstrument = useCallback(async (id: string, inst: Instrument) => {
    setRows((rs) =>
      rs.map((r) =>
        r.id === id ? { ...r, instrument: inst, status: "matched", include: true } : r,
      ),
    );
    const price = await fetchPrice(inst);
    setRows((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        // seed 份额/成本 once we have a price, unless the user already typed them
        const seeded =
          r.shares === "" && r.cost === "" ? seedReconstruction(r.raw, price) : {};
        return { ...r, price, ...seeded };
      }),
    );
  }, []);

  const isImportable = useCallback(
    (r: ReviewRow) => {
      if (!r.instrument || !r.include) return false;
      if (target === "watch") return true;
      return Number(r.shares) > 0 && Number(r.cost) > 0;
    },
    [target],
  );

  const importableCount = useMemo(
    () => rows.filter(isImportable).length,
    [rows, isImportable],
  );

  const confirm = useCallback(() => {
    let added = 0;
    rows.forEach((r) => {
      if (!isImportable(r) || !r.instrument) return;
      if (target === "holding") {
        addHolding(r.instrument, Number(r.shares), Number(r.cost));
      } else {
        addWatch(r.instrument);
      }
      added += 1;
    });
    setImported({ added, skipped: rows.length - added });
    setStep("done");
  }, [rows, isImportable, target, addHolding, addWatch]);

  const reset = useCallback(() => {
    setStep(aiIsConfigured(state) ? "upload" : "gate");
    setSrc(null);
    setRows([]);
    setError("");
    setImported({ added: 0, skipped: 0 });
  }, [state]);

  return {
    step,
    target,
    src,
    rows,
    error,
    imported,
    configured,
    setTarget,
    setStep,
    pickFile,
    recognize,
    editRow,
    removeRow,
    setRowInstrument,
    isImportable,
    importableCount,
    confirm,
    reset,
  };
}
