import { NextResponse } from "next/server";
import { getSdk, bareCode } from "@/lib/sdk";
import type { FundNavPoint } from "@/lib/types";

export const runtime = "nodejs";

interface RawNavItem {
  date: string;
  nav: number;
}

const NAV_TTL_MS = 10 * 60_000;
const NAV_CACHE_MAX = 500;
const navCache = new Map<string, { at: number; points: FundNavPoint[] }>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = bareCode((searchParams.get("code") ?? "").trim());
  if (!code || !/^[a-zA-Z0-9]{4,10}$/.test(code))
    return NextResponse.json({ points: [] }, { status: 400 });

  const cached = navCache.get(code);
  if (cached && Date.now() - cached.at < NAV_TTL_MS) {
    return NextResponse.json({ points: cached.points });
  }

  try {
    const h = (await getSdk().getFundNavHistory(code)) as {
      items?: RawNavItem[];
    };
    const points: FundNavPoint[] = (h.items ?? [])
      .filter((p) => p.nav != null)
      .map((p) => ({ date: p.date, nav: p.nav }));
    navCache.set(code, { at: Date.now(), points });
    // cap the per-instance cache — codes are attacker-controllable input
    if (navCache.size > NAV_CACHE_MAX) {
      navCache.delete(navCache.keys().next().value!);
    }
    return NextResponse.json({ points });
  } catch (e) {
    // 502 keeps the failure out of client caches so the next request retries
    return NextResponse.json(
      { points: [], error: (e as Error)?.message ?? "fetch failed" },
      { status: 502 }
    );
  }
}
