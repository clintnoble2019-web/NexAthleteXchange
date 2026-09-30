import { NextResponse } from "next/server";
import { realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import {
  authenticateSandboxLiquidityProvider,
  getSandboxLiquidityProviderSnapshot,
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
    const snapshot = await getSandboxLiquidityProviderSnapshot(provider.id);
    return NextResponse.json({
      provider: {
        code: snapshot.provider.code,
        name: snapshot.provider.name,
        status: snapshot.provider.status,
        makerFee: snapshot.provider.makerFee,
        maxSpreadBps: snapshot.provider.maxSpreadBps,
        minQuoteDepth: snapshot.provider.minQuoteDepth,
        maxGrossExposure: snapshot.provider.maxGrossExposure,
        maxPerAthleteExposure: snapshot.provider.maxPerAthleteExposure,
        quoteTtlSeconds: snapshot.provider.quoteTtlSeconds,
        lastHeartbeatAt: snapshot.provider.lastHeartbeatAt,
      },
      wallet: snapshot.provider.wallet,
      inventory: snapshot.provider.inventory,
      activeQuotes: snapshot.provider.quotes,
      inventoryValue: snapshot.inventoryValue,
      quotedNotional: snapshot.quotedNotional,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
