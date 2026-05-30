import { NextResponse } from "next/server";
import { getSdk, bareCode } from "@/lib/sdk";
import { buildFundProfile, type EastmoneyPort, type SdkPort } from "@/lib/fund-profile";
import type { FundProfile } from "@/lib/types";

export const runtime = "nodejs";

const PROFILE_TTL_MS = 10 * 60_000;
const profileCache = new Map<string, { at: number; data: FundProfile }>();

const eastmoneyAdapter: EastmoneyPort = {
  async fetchPingzhongScript(code) {
    const res = await fetch(
      `https://fund.eastmoney.com/pingzhongdata/${code}.js`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: `https://fund.eastmoney.com/${code}.html`,
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return "";
    return res.text();
  },
};

function sdkAdapter(): SdkPort {
  const sdk = getSdk();
  return {
    getFundNavHistory: async (code) => {
      const h = await sdk.getFundNavHistory(code) as { items?: { date: string; nav: number }[] };
      return h.items ?? [];
    },
    getFundQuotes: (codes) => sdk.getFundQuotes(codes) as Promise<{ name?: string; accNav?: number; navDate?: string }[]>,
    getSimpleQuotes: (codes) => sdk.getSimpleQuotes(codes) as Promise<{ code: string; name: string; changePercent: number }[]>,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = bareCode((searchParams.get("code") ?? "").trim());
  if (!code || !/^[a-zA-Z0-9]{4,10}$/.test(code))
    return NextResponse.json({ profile: null }, { status: 400 });

  const cached = profileCache.get(code);
  if (cached && Date.now() - cached.at < PROFILE_TTL_MS) {
    return NextResponse.json({ profile: cached.data });
  }

  const profile = await buildFundProfile(code, eastmoneyAdapter, sdkAdapter());
  profileCache.set(code, { at: Date.now(), data: profile });
  return NextResponse.json({ profile });
}
