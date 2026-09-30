import { NextResponse } from "next/server";
import { realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import {
  authenticateSandboxLiquidityProvider,
  recordSandboxLiquidityHeartbeat,
} from "@/lib/liquidity-provider-sandbox";

function bearer(req: Request) {
  const value = req.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function sourceIp(req: Request) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
}

export async function POST(req: Request) {
  if (!realMarketSandboxPreviewEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const provider = await authenticateSandboxLiquidityProvider(bearer(req), sourceIp(req));
    const updated = await recordSandboxLiquidityHeartbeat(provider.id);
    return NextResponse.json({ ok: true, provider: updated.code, heartbeatAt: updated.lastHeartbeatAt });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
