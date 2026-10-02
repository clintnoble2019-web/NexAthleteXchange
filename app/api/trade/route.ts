import { publicError } from "@/lib/public-error";
import { NextResponse } from "next/server";
import { TradeSide } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { executeTrade } from "@/lib/trading";
import { consumeRateLimit, safeReturnTo as validatedReturnTo } from "@/lib/request-security";
import { publicRequestUrl } from "@/lib/public-url";

function safeReturnTo(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  return validatedReturnTo(path);
}

function redirectWithStatus(req: Request, returnTo: string, key: "trade" | "tradeError", value: string) {
  const url = publicRequestUrl(req, returnTo);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(publicRequestUrl(req, "/login?status=session-required"), 303);

  if (!(await consumeRateLimit("trade", user.id, 30))) return redirectWithStatus(req, "/portfolio", "tradeError", "Please wait a moment before trading again.");
  const form = await req.formData();
  const returnTo = safeReturnTo(form.get("returnTo"));
  const athleteId = String(form.get("athleteId") || "");
  const side = String(form.get("side") || "") as TradeSide;
  const quantity = Number(form.get("quantity"));
  const requestKey = String(form.get("requestKey") || "");
  if (!requestKey) return redirectWithStatus(req, returnTo, "tradeError", "Refresh the page before placing this trade.");

  if (!athleteId || ![TradeSide.BUY, TradeSide.SELL].includes(side)) {
    return redirectWithStatus(req, returnTo, "tradeError", "Invalid trade request.");
  }

  try {
    await executeTrade(user.id, athleteId, side, quantity, requestKey);
    return redirectWithStatus(req, returnTo, "trade", side);
  } catch (error) {
    return redirectWithStatus(req, returnTo, "tradeError", publicError(error, "Trade failed."));
  }
}
