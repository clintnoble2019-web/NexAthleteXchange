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
    url.searchParams.set("rmError", error instanceof Error ? error.message : "Retirement cashout failed.");
    return NextResponse.redirect(url, 303);
  }
}
