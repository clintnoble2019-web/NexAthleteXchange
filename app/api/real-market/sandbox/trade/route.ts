import { NextResponse } from "next/server";
import { TradeSide } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { publicRequestUrl } from "@/lib/public-url";
import { realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import { executeSandboxRealTrade } from "@/lib/real-market-sandbox";

function redirectStatus(req: Request, key: "rm" | "rmError", message: string) {
  const url = publicRequestUrl(req, "/real-market/sandbox");
  url.searchParams.set(key, message);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: Request) {
  if (!realMarketSandboxPreviewEnabled()) {
    return NextResponse.redirect(publicRequestUrl(req, "/real-market"), 303);
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(publicRequestUrl(req, "/login?status=session-required"), 303);

  const form = await req.formData();
  const athleteId = String(form.get("athleteId") || "");
  const side = String(form.get("side") || "") as TradeSide;
  const quantity = Number(form.get("quantity"));

  if (!athleteId || !Object.values(TradeSide).includes(side)) {
    return redirectStatus(req, "rmError", "Invalid sandbox trade request.");
  }

  try {
    await executeSandboxRealTrade(user.id, athleteId, side, quantity);
    return redirectStatus(req, "rm", `Sandbox ${side.toLowerCase()} completed with the $2.00 test fee.`);
  } catch (error) {
    return redirectStatus(req, "rmError", error instanceof Error ? error.message : "Sandbox trade failed.");
  }
}
