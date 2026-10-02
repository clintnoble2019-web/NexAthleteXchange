import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { beginSandboxEnrollment } from "@/lib/identity";
import { realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import { consumeRateLimit } from "@/lib/request-security";
import { publicRequestUrl } from "@/lib/public-url";

export async function POST(req: Request) {
  if (!realMarketSandboxPreviewEnabled()) return NextResponse.redirect(publicRequestUrl(req, "/real-market"), 303);
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(publicRequestUrl(req, "/login"), 303);
  if (!(await consumeRateLimit("enrollment", user.id, 5))) return NextResponse.json({ error: "Please wait before trying again." }, { status: 429 });
  await beginSandboxEnrollment(user.id);
  return NextResponse.redirect(publicRequestUrl(req, "/real-market/verify"), 303);
}
