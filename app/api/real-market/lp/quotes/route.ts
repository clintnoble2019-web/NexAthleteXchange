import { NextResponse } from "next/server";
import { LiquidityQuoteSide } from "@prisma/client";
import { realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import {
  authenticateSandboxLiquidityProvider,
  cancelAllSandboxProviderQuotes,
  cancelSandboxLiquidityQuote,
  submitSandboxLiquidityQuote,
} from "@/lib/liquidity-provider-sandbox";

function bearer(req: Request) {
  const value = req.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function sourceIp(req: Request) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
}

function side(value: unknown) {
  if (value === LiquidityQuoteSide.BID || value === LiquidityQuoteSide.ASK) return value;
  throw new Error("Quote side must be BID or ASK.");
}

export async function POST(req: Request) {
  if (!realMarketSandboxPreviewEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const provider = await authenticateSandboxLiquidityProvider(bearer(req), sourceIp(req));
    const body = await req.json();
    const quote = await submitSandboxLiquidityQuote({
      providerId: provider.id,
      instrumentId: String(body.instrumentId || ""),
      side: side(body.side),
      price: String(body.price || ""),
      quantity: String(body.quantity || ""),
    });
    return NextResponse.json({ ok: true, quote });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Quote rejected" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (!realMarketSandboxPreviewEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const provider = await authenticateSandboxLiquidityProvider(bearer(req), sourceIp(req));
    const body = await req.json();
    if (body.all === true) {
      await cancelAllSandboxProviderQuotes(provider.id);
      return NextResponse.json({ ok: true, cancelled: "all" });
    }
    await cancelSandboxLiquidityQuote(provider.id, String(body.instrumentId || ""), side(body.side));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cancel rejected" }, { status: 400 });
  }
}
