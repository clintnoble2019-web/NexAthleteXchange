import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasAcceptedCurrentTerms } from "@/lib/real-market-compliance";
import { providerIdentityVerified } from "@/lib/provider-identity";
import { consumeRateLimit } from "@/lib/request-security";
import { publicRequestUrl } from "@/lib/public-url";
import { realMarketCustomerTestEnabled } from "@/lib/real-market";
import { syncCircleUsdcDeposit, syncPendingCircleWithdrawals } from "@/lib/provider-funding";

export async function POST(req: Request) {
  if (!realMarketCustomerTestEnabled()) return NextResponse.json({ error: "Provider funding is unavailable." }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(publicRequestUrl(req, "/login"), 303);
  if (!(await hasAcceptedCurrentTerms(user.id))) return NextResponse.redirect(publicRequestUrl(req, "/terms/accept?next=/real-market/funding"), 303);
  if (!(await providerIdentityVerified(user.id))) return NextResponse.redirect(publicRequestUrl(req, "/real-market/verify?provider=1&next=/real-market/funding"), 303);
  if (!(await consumeRateLimit("usdc-sync", user.id, 12, 60))) return NextResponse.json({ error: "Please wait before checking funding again." }, { status: 429 });
  const url = publicRequestUrl(req, "/real-market/funding");
  try {
    const [deposit, withdrawals] = await Promise.all([syncCircleUsdcDeposit(user.id), syncPendingCircleWithdrawals(user.id)]);
    const completed = withdrawals.filter(item => item.funding?.status === "COMPLETED").length;
    url.searchParams.set("notice", `Funding synced. New provider-funded Devnet USDC: ${deposit.credited}${completed ? ` · ${completed} withdrawal completed` : ""}. Fake market cash was not changed.`);
  } catch (error) {
    url.searchParams.set("error", error instanceof Error ? error.message : "Funding sync failed.");
  }
  return NextResponse.redirect(url, 303);
}
