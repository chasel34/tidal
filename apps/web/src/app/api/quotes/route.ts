import { NextResponse } from "next/server";
import { fetchQuotes, type QuoteRequestItem } from "@/lib/quote-service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { items?: QuoteRequestItem[] };
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return NextResponse.json({ quotes: [] });
    const quotes = await fetchQuotes(items);
    return NextResponse.json({ quotes });
  } catch (e) {
    console.error("[api/quotes] quote refresh failed", e);
    return NextResponse.json(
      { quotes: [], error: (e as Error)?.message ?? "quote refresh failed" },
      { status: 502 }
    );
  }
}
