import { NextResponse } from "next/server";
import { RealMarketEnvironment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import { authenticateSandboxLiquidityProvider } from "@/lib/liquidity-provider-sandbox";

function bearer(req: Request) {
  const value = req.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function sourceIp(req: Request) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
}

export async function GET(req: Request) {
  if (!realMarketSandboxPreviewEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const provider = await authenticateSandboxLiquidityProvider(bearer(req), sourceIp(req));
    const instruments = await prisma.realMarketInstrument.findMany({
      where: { environment: RealMarketEnvironment.SANDBOX },
      include: { athlete: { select: { id: true, name: true, slug: true, sport: true, team: true, position: true } } },
      orderBy: [{ athlete: { sport: "asc" } }, { launchRank: "asc" }],
    });
    return NextResponse.json({ provider: provider.code, environment: "SANDBOX", instruments });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
