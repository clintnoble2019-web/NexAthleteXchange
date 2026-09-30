import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasAcceptedCurrentTerms } from "@/lib/real-market-compliance";
import { sandboxAccessVerified } from "@/lib/beta-controls";
import { consumeRateLimit } from "@/lib/request-security";
import { publicRequestUrl } from "@/lib/public-url";
import { realMarketCustomerTestEnabled } from "@/lib/real-market";
import { ensureUsdcDepositWallet } from "@/lib/provider-funding";

export async function POST(req: Request) {
  if (!realMarketCustomerTestEnabled()) return NextResponse.json({ error: "Provider funding is available only in the Real Market test environment." }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(publicRequestUrl(req, "/login"), 303);
  if (!(await hasAcceptedCurrentTerms(user.id))) return NextResponse.redirect(publicRequestUrl(req, "/terms/accept?next=/real-market/funding"), 303);
  if (!(await sandboxAccessVerified(user.id))) return NextResponse.redirect(publicRequestUrl(req, "/real-market/verify"), 303);
  if (!(await consumeRateLimit("usdc-wallet", user.id, 3, 300))) return NextResponse.json({ error: "Please wait before requesting another deposit wallet." }, { status: 429 });
  const url = publicRequestUrl(req, "/real-market/funding");
  try {
    await ensureUsdcDepositWallet(user.id);
    url.searchParams.set("notice", "Solana Devnet USDC deposit wallet is ready.");
  } catch (error) {
    url.searchParams.set("error", error instanceof Error ? error.message : "USDC wallet setup failed.");
  }
  return NextResponse.redirect(url, 303);
}
