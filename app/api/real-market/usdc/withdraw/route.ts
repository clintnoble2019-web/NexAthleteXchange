import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasAcceptedCurrentTerms } from "@/lib/real-market-compliance";
import { providerIdentityVerified } from "@/lib/provider-identity";
import { consumeRateLimit } from "@/lib/request-security";
import { publicRequestUrl } from "@/lib/public-url";
import { realMarketCustomerTestEnabled } from "@/lib/real-market";
import { startCircleUsdcWithdrawal } from "@/lib/provider-funding";

export async function POST(req: Request) {
  if (!realMarketCustomerTestEnabled()) return NextResponse.json({ error: "Provider funding is unavailable." }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(publicRequestUrl(req, "/login"), 303);
  if (!(await hasAcceptedCurrentTerms(user.id))) return NextResponse.redirect(publicRequestUrl(req, "/terms/accept?next=/real-market/funding"), 303);
  if (!(await providerIdentityVerified(user.id))) return NextResponse.redirect(publicRequestUrl(req, "/real-market/verify?provider=1&next=/real-market/funding"), 303);
  if (!(await consumeRateLimit("usdc-withdraw", user.id, 4, 300))) return NextResponse.json({ error: "Please wait before requesting another withdrawal." }, { status: 429 });
  const form = await req.formData();
  const amount = String(form.get("amount") || "").trim();
  const destination = String(form.get("destination") || "").trim();
  const confirmed = String(form.get("confirm") || "") === "YES";
  const url = publicRequestUrl(req, "/real-market/funding");
  if (!confirmed) {
    url.searchParams.set("error", "Confirm the amount, Solana Devnet network, USDC token, and destination before submitting.");
    return NextResponse.redirect(url, 303);
  }
  try {
    const funding = await startCircleUsdcWithdrawal(user.id, amount, destination);
    url.searchParams.set("notice", `Provider-funded Devnet USDC withdrawal submitted for screening and confirmation. Reference ${funding.id.slice(-8)}.`);
  } catch (error) {
    url.searchParams.set("error", error instanceof Error ? error.message : "USDC withdrawal failed.");
  }
  return NextResponse.redirect(url, 303);
}
