import { NextResponse } from "next/server";
import { RealFundingType, TradeSide } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { realMarketCustomerTestEnabled } from "@/lib/real-market";
import { publicRequestUrl } from "@/lib/public-url";
import { publicError } from "@/lib/public-error";
import { consumeRateLimit } from "@/lib/request-security";
import { cancelScoutOrder, placeScoutOrder, transferScoutTestCash } from "@/lib/scout-market";

export async function POST(req: Request) {
  if (!realMarketCustomerTestEnabled()) return NextResponse.json({ error: "Customer test market is unavailable." }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to use the test market." }, { status: 401 });
  if (!(await consumeRateLimit("scout-test-actions", user.id, 60))) return NextResponse.json({ error: "Please wait before submitting another request." }, { status: 429 });
  const form = await req.formData();
  const field = (key: string) => String(form.get(key) || "");
  const athleteId = field("athleteId");
  const wantsJson = req.headers.get("accept")?.includes("application/json");
  function reply(message: string, failed = false, result?: { id: string; status?: string }) {
    if (wantsJson) return NextResponse.json(failed ? { error: message } : { message, ...result }, { status: failed ? 400 : 200 });
    const url = publicRequestUrl(req, "/real-market/test");
    if (athleteId) url.searchParams.set("athlete", athleteId);
    url.searchParams.set(failed ? "error" : "notice", message);
    return NextResponse.redirect(url, 303);
  }
  try {
    switch (field("action")) {
      case "ORDER": {
        const order = await placeScoutOrder({ userId: user.id, athleteId, side: field("side") as TradeSide, price: field("price"), quantity: field("quantity"), requestKey: field("requestKey") });
        return reply(`Order ${order.status.toLowerCase()}. Unfilled quantity: ${Number(order.remaining).toFixed(2)}.`, false, { id: order.id, status: order.status });
      }
      case "CANCEL": {
        const order = await cancelScoutOrder(user.id, field("orderId"));
        return reply(`Order ${order.status.toLowerCase()}.`, false, { id: order.id, status: order.status });
      }
      case "CASH": {
        const transfer = await transferScoutTestCash(user.id, field("type") as RealFundingType, field("amount"), field("requestKey"));
        return reply("Fake cash action recorded. No real money moved.", false, { id: transfer.id });
      }
      case "GRANT":
        return reply("Free share grants are disabled. Buy shares from the sandbox market to build a position.", true);
      default:
        return reply("Choose a valid test action.", true);
    }
  } catch (error) {
    return reply(publicError(error, "The test action could not be completed."), true);
  }
}
