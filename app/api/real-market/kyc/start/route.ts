import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasAcceptedCurrentTerms } from "@/lib/real-market-compliance";
import { consumeRateLimit } from "@/lib/request-security";
import { publicRequestUrl } from "@/lib/public-url";
import { realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import { createPersonaInquiry, personaConfigured } from "@/lib/persona";

export async function POST(req: Request) {
  if (!realMarketSandboxPreviewEnabled()) return NextResponse.redirect(publicRequestUrl(req, "/real-market"), 303);
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(publicRequestUrl(req, "/login?status=session-required"), 303);
  if (!(await hasAcceptedCurrentTerms(user.id))) {
    const terms = publicRequestUrl(req, "/terms/accept");
    terms.searchParams.set("next", "/real-market/verify");
    return NextResponse.redirect(terms, 303);
  }
  if (!personaConfigured()) return NextResponse.json({ error: "Provider-backed verification is not configured yet." }, { status: 503 });
  if (!(await consumeRateLimit("persona-kyc-start", user.id, 4, 300))) return NextResponse.json({ error: "Please wait before starting verification again." }, { status: 429 });
  try {
    const returnUrl = publicRequestUrl(req, "/real-market/verify").toString();
    const inquiry = await createPersonaInquiry(user.id, returnUrl);
    return NextResponse.redirect(inquiry.url, 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Identity verification could not be started.";
    const url = publicRequestUrl(req, "/real-market/verify");
    url.searchParams.set("error", message);
    return NextResponse.redirect(url, 303);
  }
}
