import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/password-recovery";
import { consumeRateLimit, requestSource } from "@/lib/request-security";
import { publicRequestUrl } from "@/lib/public-url";

export async function POST(req: Request) {
  if (!(await consumeRateLimit("reset-source", requestSource(req), process.env.TRUST_PROXY_IP === "1" ? 20 : 1000, 3600))) return NextResponse.redirect(publicRequestUrl(req, "/forgot-password?error=rate"), 303);
  const form = await req.formData();
  try {
    await resetPassword(String(form.get("token") || ""), String(form.get("password") || ""));
    return NextResponse.redirect(publicRequestUrl(req, "/login?status=password-reset"), 303);
  } catch {
    return NextResponse.redirect(publicRequestUrl(req, "/forgot-password?error=invalid"), 303);
  }
}
