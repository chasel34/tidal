import { NextResponse } from "next/server";
import { getSdk } from "@/lib/sdk";
import type { KlinePoint } from "@/lib/types";

export const runtime = "nodejs";

interface RawKline {
  date: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
}

function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 420); // enough trading days to cover 1Y
  return (
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0")
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") ?? "").trim();
  const start = searchParams.get("start") ?? defaultStart();
  if (!code) return NextResponse.json({ points: [] });

  try {
    const raw = (await getSdk().getHistoryKline(code, {
      period: "daily",
      adjust: "qfq",
      startDate: start,
    })) as RawKline[];
    const points: KlinePoint[] = raw
      .filter((k) => k.close != null)
      .map((k) => ({
        date: k.date,
        open: k.open ?? k.close!,
        close: k.close!,
        high: k.high ?? k.close!,
        low: k.low ?? k.close!,
        volume: k.volume ?? 0,
      }));
    return NextResponse.json({ points });
  } catch (e) {
    return NextResponse.json(
      { points: [], error: (e as Error)?.message ?? "fetch failed" },
      { status: 502 }
    );
  }
}
