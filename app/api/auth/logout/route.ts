import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { publicRequestUrl } from "@/lib/public-url";

export async function POST(req: Request) {
  await destroySession();
  return NextResponse.redirect(publicRequestUrl(req, "/login?status=logged-out"), 303);
}
