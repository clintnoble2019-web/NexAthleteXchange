import { NextResponse } from "next/server";
import { TradeSide } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { executeTrade } from "@/lib/trading";

function safeReturnTo(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  if (!path.startsWith("/") || path.startsWith("//")) return "/market";
  return path;
}

function redirectWithStatus(req: Request, returnTo: string, key: "trade" | "tradeError", value: string) {
  const url = new URL(returnTo, req.url);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url), 303);

  const form = await req.formData();
  const returnTo = safeReturnTo(form.get("returnTo"));
  const athleteId = String(form.get("athleteId") || "");
  const side = String(form.get("side") || "") as TradeSide;
  const quantity = Number(form.get("quantity"));

  if (!athleteId || ![TradeSide.BUY, TradeSide.SELL].includes(side)) {
    return redirectWithStatus(req, returnTo, "tradeError", "Invalid trade request.");
  }

  try {
    await executeTrade(user.id, athleteId, side, quantity);
    return redirectWithStatus(req, returnTo, "trade", side);
  } catch (error) {
    return redirectWithStatus(req, returnTo, "tradeError", error instanceof Error ? error.message : "Trade failed.");
  }
}
