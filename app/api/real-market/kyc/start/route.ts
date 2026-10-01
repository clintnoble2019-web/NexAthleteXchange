import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasAcceptedCurrentTerms } from "@/lib/real-market-compliance";
import { consumeRateLimit, safeReturnTo } from "@/lib/request-security";
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

  const form = await req.formData();
  const next = safeReturnTo(String(form.get("next") || ""), "/real-market/test");
  const providerFunding = next === "/real-market/funding";
  const verifyUrl = publicRequestUrl(req, "/real-market/verify");
  verifyUrl.searchParams.set("next", next);
  if (providerFunding) verifyUrl.searchParams.set("provider", "1");

  if (!personaConfigured()) {
    verifyUrl.searchParams.set("error", "Persona provider KYC is required but is not configured in this environment.");
    return NextResponse.redirect(verifyUrl, 303);
  }
  if (!(await consumeRateLimit("persona-kyc-start", user.id, 4, 300))) return NextResponse.json({ error: "Please wait before starting verification again." }, { status: 429 });
  try {
    const inquiry = await createPersonaInquiry(user.id, verifyUrl.toString());
    return NextResponse.redirect(inquiry.url, 303);
  } catch (error) {
    verifyUrl.searchParams.set("error", error instanceof Error ? error.message : "Identity verification could not be started.");
    return NextResponse.redirect(verifyUrl, 303);
  }
}
