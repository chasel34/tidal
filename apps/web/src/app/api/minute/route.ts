import { NextResponse } from "next/server";
import { getSdk } from "@/lib/sdk";
import type { MinutePoint } from "@/lib/types";

export const runtime = "nodejs";

interface RawMinute {
  time: string; // "YYYY-MM-DD HH:mm"
  close: number | null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") ?? "").trim();
  if (!code) return NextResponse.json({ points: [] });

  try {
    const raw = (await getSdk().getMinuteKline(code)) as RawMinute[];
    if (!raw.length) return NextResponse.json({ points: [] });
    const lastDay = (raw[raw.length - 1].time ?? "").split(" ")[0];
    const points: MinutePoint[] = raw
      .filter((p) => p.time?.startsWith(lastDay) && p.close != null)
      .map((p) => ({ time: p.time.split(" ")[1] ?? p.time, close: p.close! }));
    return NextResponse.json({ points });
  } catch (e) {
    return NextResponse.json(
      { points: [], error: (e as Error)?.message ?? "fetch failed" },
      { status: 502 }
    );
  }
}
