import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/beta-controls";
import { applyAdminAction, correctAthletePrice, AdminAction } from "@/lib/admin";
import { reserveRewardClaim, reviewSandboxIdentity } from "@/lib/identity";
import { realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import { consumeRateLimit } from "@/lib/request-security";
import { publicRequestUrl } from "@/lib/public-url";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.id)) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  if (!(await consumeRateLimit("admin", user.id, 30))) return NextResponse.json({ error: "Please wait before submitting another action." }, { status: 429 });
  const form = await req.formData();
  const action = String(form.get("action") || "");
  const targetId = String(form.get("targetId") || "");
  const reason = String(form.get("reason") || "");
  const url = publicRequestUrl(req, "/admin");
  try {
    if (action === "VERIFY_IDENTITY" || action === "REJECT_IDENTITY" || action === "RESERVE_REWARD" || action === "SUSPEND_LP") {
      if (!realMarketSandboxPreviewEnabled()) throw new Error("Sandbox preview must be enabled for this action.");
    }
    if (action === "VERIFY_IDENTITY" || action === "REJECT_IDENTITY") {
      await reviewSandboxIdentity(user.id, targetId, action === "VERIFY_IDENTITY" ? "VERIFIED" : "REJECTED", String(form.get("identityToken") || ""), reason);
    } else if (action === "RESERVE_REWARD") {
      await reserveRewardClaim(user.id, targetId, String(form.get("campaign") || ""), reason);
    } else if (action === "CORRECT_PRICE") {
      await correctAthletePrice(user.id, targetId, String(form.get("price") || ""), reason);
    } else {
      await applyAdminAction(user.id, action as AdminAction, targetId, reason);
    }
    url.searchParams.set("status", "Action saved and recorded in the audit log.");
  } catch (error) {
    const message = error instanceof Error && !error.message.includes("prisma.") ? error.message : "The action could not be saved. Check the selected record and try again.";
    url.searchParams.set("error", message.slice(0, 250));
  }
  return NextResponse.redirect(url, 303);
}
