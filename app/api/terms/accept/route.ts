import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordCurrentTermsAcceptance } from "@/lib/real-market-compliance";
import { consumeRateLimit, safeReturnTo } from "@/lib/request-security";
import { publicRequestUrl } from "@/lib/public-url";

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const expected = process.env.APP_ORIGIN || new URL(req.url).origin;
  return !origin || origin === expected;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(publicRequestUrl(req, "/login"), 303);
  if (!(await consumeRateLimit("terms-accept", user.id, 10, 3600))) return NextResponse.json({ error: "Please wait before trying again." }, { status: 429 });

  const form = await req.formData();
  const next = safeReturnTo(String(form.get("next") || ""), "/market");
  try {
    await recordCurrentTermsAcceptance(req, user.id, {
      country: String(form.get("country") || ""),
      region: String(form.get("region") || ""),
      ageConfirmed: form.get("ageConfirmed") === "yes",
      locationConfirmed: form.get("locationConfirmed") === "yes",
      accountOwnerConfirmed: form.get("accountOwnerConfirmed") === "yes",
      identityComplianceConfirmed: form.get("identityComplianceConfirmed") === "yes",
      productNatureConfirmed: form.get("productNatureConfirmed") === "yes",
      marketRiskConfirmed: form.get("marketRiskConfirmed") === "yes",
      fundingRiskConfirmed: form.get("fundingRiskConfirmed") === "yes",
      prohibitedConductConfirmed: form.get("prohibitedConductConfirmed") === "yes",
      liveLaunchConfirmed: form.get("liveLaunchConfirmed") === "yes",
      agreementConfirmed: form.get("agreementConfirmed") === "yes",
      electronicConsent: form.get("electronicConsent") === "yes",
      electronicAccessConfirmed: form.get("electronicAccessConfirmed") === "yes",
      signatureText: String(form.get("signatureText") || ""),
    });
    return NextResponse.redirect(publicRequestUrl(req, next), 303);
  } catch {
    const url = publicRequestUrl(req, "/terms/accept");
    url.searchParams.set("next", next);
    url.searchParams.set("error", "required");
    return NextResponse.redirect(url, 303);
  }
}
