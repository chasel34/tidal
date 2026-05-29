import { NextResponse } from "next/server";
import { getSdk } from "@/lib/sdk";
import type { Category, SearchResultDTO } from "@/lib/types";

export const runtime = "nodejs";

interface RawSearchResult {
  code: string;
  name: string;
  market: string;
  type: string;
  category?: Category;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ results: [] });
  try {
    const raw = (await getSdk().search(q)) as RawSearchResult[];
    const results: SearchResultDTO[] = raw.map((r) => ({
      code: r.code,
      name: r.name,
      market: r.market,
      type: r.type,
      category: r.category ?? "other",
    }));
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { results: [], error: (e as Error).message },
      { status: 502 }
    );
  }
}
