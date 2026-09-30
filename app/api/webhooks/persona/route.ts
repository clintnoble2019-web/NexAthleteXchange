import { NextResponse } from "next/server";
import { processPersonaWebhook, personaWebhookConfigured } from "@/lib/persona";

export async function POST(req: Request) {
  if (!personaWebhookConfigured()) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const rawBody = await req.text();
  try {
    const result = await processPersonaWebhook(rawBody, req.headers.get("persona-signature"));
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook rejected.";
    const signatureFailure = message.includes("signature");
    return NextResponse.json({ error: message }, { status: signatureFailure ? 401 : 400 });
  }
}
