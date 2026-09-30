import crypto from "node:crypto";
import { circleBlockchain, validSolanaAddress } from "@/lib/circle-wallets";

const DEFAULT_CIRCLE_API = "https://api.circle.com";

export function circleComplianceConfigured() {
  return process.env.CIRCLE_COMPLIANCE_SCREENING_ENABLED === "1" && Boolean(process.env.CIRCLE_API_KEY?.trim());
}

export async function screenCircleAddress(address: string, requestKey = crypto.randomUUID()) {
  if (!circleComplianceConfigured()) throw new Error("Circle Compliance Engine address screening is not enabled.");
  if (!validSolanaAddress(address)) throw new Error("Enter a valid Solana destination address.");
  const apiKey = process.env.CIRCLE_API_KEY!.trim();
  const base = process.env.CIRCLE_API_BASE?.trim() || DEFAULT_CIRCLE_API;
  const response = await fetch(`${base}/v1/w3s/compliance/screening/addresses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Request-Id": crypto.randomUUID() },
    body: JSON.stringify({ idempotencyKey: requestKey, address, chain: circleBlockchain() }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) throw new Error(body?.message || `Circle address screening failed (${response.status}).`);
  const result = String(body?.result || body?.data?.result || "").toUpperCase();
  const decision = body?.decision || body?.data?.decision || {};
  const actions = Array.isArray(decision?.actions) ? decision.actions.map((item: unknown) => String(item).toUpperCase()) : [];
  if (result === "DENIED" || actions.includes("DENY") || actions.includes("FREEZE_WALLET")) {
    throw new Error("This destination cannot receive a Real Market withdrawal under the current compliance controls.");
  }
  if (actions.includes("REVIEW") || result === "REVIEW") {
    throw new Error("This destination requires compliance review before a withdrawal can be sent.");
  }
  return { result: result || "APPROVED", ruleName: String(decision?.ruleName || ""), actions };
}
