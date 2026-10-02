import { NextRequest, NextResponse } from "next/server";
import { publicRequestUrl } from "@/lib/public-url";

export function proxy(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return NextResponse.next();
  // These routes use bearer/secret authentication rather than browser cookies.
  if (req.nextUrl.pathname.startsWith("/api/real-market/lp/") || req.nextUrl.pathname.startsWith("/api/internal/")) return NextResponse.next();
  const origin = req.headers.get("origin");
  const allowedOrigin = process.env.APP_ORIGIN || publicRequestUrl(req, "/").origin;
  if (!origin || origin !== allowedOrigin || req.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Please submit this request from NexAthleteXchange." }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
