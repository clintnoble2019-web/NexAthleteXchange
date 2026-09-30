import { publicError } from "@/lib/public-error";
import { sandboxAccessVerified } from "@/lib/beta-controls";
import { hasAcceptedCurrentTerms } from "@/lib/real-market-compliance";
import { consumeRateLimit } from "@/lib/request-security";
import { NextResponse } from "next/server";
import { RealFundingRail, RealFundingType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { publicRequestUrl } from "@/lib/public-url";
import { realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import { simulateSandboxFunding } from "@/lib/real-market-sandbox";

function redirectStatus(req: Request, key: "rm" | "rmError", message: string) {
  const url = publicRequestUrl(req, "/real-market/sandbox");
  url.searchParams.set(key, message);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: Request) {
  if (!realMarketSandboxPreviewEnabled()) return NextResponse.redirect(publicRequestUrl(req, "/real-market"), 303);
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(publicRequestUrl(req, "/login?status=session-required"), 303);
  if (!(await hasAcceptedCurrentTerms(user.id))) {
    const url = publicRequestUrl(req, "/terms/accept");
    url.searchParams.set("next", "/real-market/sandbox");
    return NextResponse.redirect(url, 303);
  }
  if (!(await sandboxAccessVerified(user.id))) return NextResponse.redirect(publicRequestUrl(req, "/real-market/verify"), 303);
  if (!(await consumeRateLimit("sandbox-actions", user.id, 30))) return NextResponse.json({ error: "Please wait before submitting another sandbox request." }, { status: 429 });
  const form = await req.formData();
  const type = String(form.get("type") || "") as RealFundingType;
  const rail = String(form.get("rail") || "") as RealFundingRail;
  const amount = String(form.get("amount") || "");
  const externalAddress = String(form.get("externalAddress") || "").trim();

  if (!Object.values(RealFundingType).includes(type) || !Object.values(RealFundingRail).includes(rail)) return redirectStatus(req, "rmError", "Invalid sandbox funding request.");

  try {
    const result = await simulateSandboxFunding(user.id, type, rail, amount, externalAddress || undefined);
    if (result.funding.status === "FAILED") return redirectStatus(req, "rmError", result.funding.failureReason || "Sandbox transaction failed.");
    const verb = type === RealFundingType.DEPOSIT ? "deposit" : "withdrawal";
    return redirectStatus(req, "rm", `Sandbox ${verb} completed.`);
  } catch (error) {
    return redirectStatus(req, "rmError", publicError(error, "Sandbox funding failed."));
  }
}
