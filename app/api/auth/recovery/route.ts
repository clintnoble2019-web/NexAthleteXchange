import { NextResponse } from "next/server";
import { consumeRateLimit, requestSource } from "@/lib/request-security";
import { requestPasswordRecovery } from "@/lib/password-recovery";
import { publicRequestUrl } from "@/lib/public-url";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase().slice(0, 254);
  const sourceAllowed = await consumeRateLimit("recovery-source", requestSource(req), process.env.TRUST_PROXY_IP === "1" ? 20 : 1000, 3600);
  const emailAllowed = await consumeRateLimit("recovery-email", email, 3, 3600);
  if (sourceAllowed && emailAllowed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    await requestPasswordRecovery(email).catch(() => console.error("Password recovery email could not be delivered."));
  }
  return NextResponse.redirect(publicRequestUrl(req, "/forgot-password?sent=1"), 303);
}
