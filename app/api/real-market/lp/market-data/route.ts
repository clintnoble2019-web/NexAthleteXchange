import { NextResponse } from "next/server";
import { RealMarketEnvironment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import {
  authenticateSandboxLiquidityProvider,
  getSandboxTopOfBook,
} from "@/lib/liquidity-provider-sandbox";

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
      include: { athlete: { select: { name: true, sport: true, team: true, position: true } } },
      orderBy: [{ athlete: { sport: "asc" } }, { launchRank: "asc" }],
    });
    const markets = await Promise.all(instruments.map(async (instrument) => {
      const book = await getSandboxTopOfBook(instrument.id);
      return {
        instrumentId: instrument.id,
        athlete: instrument.athlete,
        status: instrument.status,
        referencePrice: instrument.referencePrice,
        frozenSettlementPrice: instrument.frozenSettlementPrice,
        retirementDeadline: instrument.retirementDeadline,
        bid: book.bid ? { price: book.bid.price, remaining: book.bid.remaining, provider: book.bid.provider.code, expiresAt: book.bid.expiresAt } : null,
        ask: book.ask ? { price: book.ask.price, remaining: book.ask.remaining, provider: book.ask.provider.code, expiresAt: book.ask.expiresAt } : null,
      };
    }));
    return NextResponse.json({ provider: provider.code, environment: "SANDBOX", generatedAt: new Date(), markets });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
