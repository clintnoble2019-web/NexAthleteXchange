import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runLiveMarketUpdate, runSeasonMarketUpdate } from "@/lib/market-engine";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.MARKET_CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = new URL(request.url).searchParams.get("mode") ?? "live";

  try {
    if (mode === "baseline") {
      const result = await runSeasonMarketUpdate(prisma);
      return NextResponse.json({ ok: true, result });
    }
    if (mode === "live") {
      const result = await runLiveMarketUpdate(prisma);
      return NextResponse.json({ ok: true, result });
    }
    return NextResponse.json({ error: "Unknown market tick mode" }, { status: 400 });
  } catch (error) {
    console.error("Automatic market tick failed", error);
    return NextResponse.json({ error: "Market tick failed" }, { status: 500 });
  }
}
