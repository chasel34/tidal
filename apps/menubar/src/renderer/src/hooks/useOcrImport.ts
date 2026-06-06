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
import { useConfig, useMenubarStore } from "@/store/useMenubarStore";

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

/** Downscale a screenshot file to a JPEG data URL (longest side ≤ maxDim). */
function fileToDataUrl(file: File, maxDim = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("无法解析图片"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function useMenubarOcrImport(defaultTarget: OcrTarget = "holding") {
  const config = useConfig();
  const patch = useMenubarStore((s) => s.patchConfig);
  const configured = aiIsConfigured(config.ai);

  const [step, setStep] = useState<OcrStep>(configured ? "upload" : "gate");
  const [target, setTarget] = useState<OcrTarget>(defaultTarget);
  const [src, setSrc] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [error, setError] = useState("");
  const [imported, setImported] = useState({ added: 0, skipped: 0 });

  const fetchPrice = useCallback(
    async (inst: Instrument): Promise<number> => {
      try {
        const qs = await window.tidal.refreshQuotes([inst], config);
        return qs[0]?.price ?? 0;
      } catch {
        return 0;
      }
    },
    [config],
  );

  const recognize = useCallback(
    async (dataUrl: string) => {
      setStep("scan");
      setError("");
      try {
        const extracted = await window.tidal.ocrExtract(dataUrl, aiResolve(config.ai));
        if (!extracted.length) {
          setError("未能从截图识别到任何标的，换一张更清晰的持仓截图试试。");
          setStep("error");
          return;
        }
        const candidates = await Promise.all(
          extracted.map(async (r) => {
            for (const query of screenshotSearchQueries(r)) {
              const found = await window.tidal.search(query).catch(() => []);
              if (found.length) return found;
            }
            return [];
          }),
        );
        const matched = extracted.map((raw, i) => ({ raw, ...matchInstrument(raw, candidates[i]) }));
        const prices = await Promise.all(
          matched.map((m) => (m.instrument ? fetchPrice(m.instrument) : Promise.resolve(0))),
        );
        setRows(
          matched.map((m, i) => ({
            id: `r${rowSeq++}`,
            raw: m.raw,
            name: m.raw.name,
            instrument: m.instrument,
            status: m.status,
            ...seedReconstruction(m.raw, prices[i]),
            price: prices[i],
            include: m.status === "matched",
          })),
        );
        setStep("review");
      } catch (e) {
        setError(e instanceof Error ? e.message : "识别失败");
        setStep("error");
      }
    },
    [config.ai, fetchPrice],
  );

  const pickFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      try {
        const dataUrl = await fileToDataUrl(file);
        setSrc(dataUrl);
        await recognize(dataUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : "读取图片失败");
        setStep("error");
      }
    },
    [recognize],
  );

  const editRow = useCallback((id: string, p: Partial<ReviewRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }, []);
  const removeRow = useCallback((id: string) => {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }, []);
  const setRowInstrument = useCallback(
    async (id: string, inst: Instrument) => {
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
          const seeded = r.shares === "" && r.cost === "" ? seedReconstruction(r.raw, price) : {};
          return { ...r, price, ...seeded };
        }),
      );
    },
    [fetchPrice],
  );

  const isImportable = useCallback(
    (r: ReviewRow) => {
      if (!r.instrument || !r.include) return false;
      if (target === "watch") return true;
      return Number(r.shares) > 0 && Number(r.cost) > 0;
    },
    [target],
  );

  const importableCount = useMemo(() => rows.filter(isImportable).length, [rows, isImportable]);

  const confirm = useCallback(async () => {
    const holdings = [...config.holdings];
    const watch = [...config.watch];
    let added = 0;
    rows.forEach((r) => {
      if (!isImportable(r) || !r.instrument) return;
      if (target === "holding") {
        const idx = holdings.findIndex((h) => h.instrument.code === r.instrument!.code);
        const item = { instrument: r.instrument, shares: Number(r.shares), cost: Number(r.cost) };
        if (idx >= 0) holdings[idx] = item;
        else holdings.push(item);
      } else {
        if (!watch.some((w) => w.code === r.instrument!.code)) watch.unshift(r.instrument);
      }
      added += 1;
    });
    await patch(target === "holding" ? { holdings } : { watch });
    setImported({ added, skipped: rows.length - added });
    setStep("done");
  }, [rows, isImportable, target, config.holdings, config.watch, patch]);

  const reset = useCallback(() => {
    setStep(aiIsConfigured(config.ai) ? "upload" : "gate");
    setSrc(null);
    setRows([]);
    setError("");
    setImported({ added: 0, skipped: 0 });
  }, [config.ai]);

  return {
    step,
    target,
    src,
    rows,
    error,
    imported,
    configured,
    setTarget,
    pickFile,
    editRow,
    removeRow,
    setRowInstrument,
    isImportable,
    importableCount,
    confirm,
    reset,
  };
}
