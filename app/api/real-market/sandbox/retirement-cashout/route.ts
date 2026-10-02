import { publicError } from "@/lib/public-error";
import { sandboxAccessVerified } from "@/lib/beta-controls";
import { consumeRateLimit } from "@/lib/request-security";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { publicRequestUrl } from "@/lib/public-url";
import { realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import { cashOutRetiringSandboxPosition } from "@/lib/retirement-cashout-sandbox";

export async function POST(req: Request) {
  if (!realMarketSandboxPreviewEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(publicRequestUrl(req, "/login?status=session-required"), 303);

  try {
    if (!(await sandboxAccessVerified(user.id))) return NextResponse.redirect(publicRequestUrl(req, "/real-market/verify"), 303);
    if (!(await consumeRateLimit("sandbox-actions", user.id, 30))) return NextResponse.json({ error: "Please wait before submitting another sandbox request." }, { status: 429 });
    const form = await req.formData();
    const athleteId = String(form.get("athleteId") || "");
    const quantityRaw = String(form.get("quantity") || "").trim();
    if (!athleteId) throw new Error("Athlete is required.");
    const result = await cashOutRetiringSandboxPosition(user.id, athleteId, quantityRaw ? quantityRaw : undefined);
    const url = publicRequestUrl(req, "/real-market/sandbox");
    url.searchParams.set("rm", `${result.athlete} retirement cashout completed at the frozen settlement price.`);
    return NextResponse.redirect(url, 303);
  } catch (error) {
    const url = publicRequestUrl(req, "/real-market/sandbox");
    url.searchParams.set("rmError", publicError(error, "Retirement cashout failed."));
    return NextResponse.redirect(url, 303);
  }
}
