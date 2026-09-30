import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requestSource } from "@/lib/request-security";

export const REAL_MARKET_TERMS_VERSION = "2026-09-30-v1";
export const REAL_MARKET_TERMS_EFFECTIVE_DATE = "September 30, 2026";
export const REAL_MARKET_TERMS_ACTION = "REAL_MARKET_TERMS_ACCEPTED";

const TERMS_DIGEST_SOURCE = [
  "NexAthleteXchange Terms of Service",
  REAL_MARKET_TERMS_VERSION,
  "limited-supply digital athlete collectibles",
  "market price determined by bids asks and completed trades",
  "performance data is research only and does not create a cash entitlement",
  "no equity athlete ownership dividend guaranteed profit or guaranteed redemption",
  "identity age sanctions location and payment eligibility required before live use",
  "one verified Real Market account per person",
  "no wash trading manipulation fraud multi-accounting or sanctions evasion",
  "customer funds and company funds must remain separately accounted",
  "electronic records and disclosures consent",
].join("|");

export const REAL_MARKET_TERMS_HASH = crypto.createHash("sha256").update(TERMS_DIGEST_SOURCE).digest("hex");

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function hasAcceptedCurrentTerms(userId: string) {
  const events = await prisma.adminAuditEvent.findMany({
    where: { actorId: userId, targetId: userId, action: REAL_MARKET_TERMS_ACTION },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return events.some((event) => {
    const details = event.details as Record<string, unknown>;
    return details?.termsVersion === REAL_MARKET_TERMS_VERSION &&
      details?.termsHash === REAL_MARKET_TERMS_HASH &&
      details?.ageConfirmed === true &&
      details?.agreementConfirmed === true &&
      details?.electronicConsent === true &&
      details?.locationConfirmed === true;
  });
}

export async function recordCurrentTermsAcceptance(req: Request, userId: string, input: {
  country: string;
  region: string;
  ageConfirmed: boolean;
  agreementConfirmed: boolean;
  electronicConsent: boolean;
  locationConfirmed: boolean;
  riskConfirmed: boolean;
}) {
  const country = input.country.trim().toUpperCase();
  const region = input.region.trim().toUpperCase();
  if (!/^[A-Z]{2,3}$/.test(country)) throw new Error("Enter a valid country code.");
  if (!/^[A-Z0-9 -]{2,40}$/.test(region)) throw new Error("Enter a valid state, province, or region.");
  if (!input.ageConfirmed || !input.agreementConfirmed || !input.electronicConsent || !input.locationConfirmed || !input.riskConfirmed) {
    throw new Error("All required Terms and eligibility acknowledgements must be accepted.");
  }

  if (await hasAcceptedCurrentTerms(userId)) return;

  const sourceHash = hash(`terms-source:${requestSource(req)}`);
  const userAgentHash = hash(`terms-ua:${req.headers.get("user-agent") || "unknown"}`);
  await prisma.adminAuditEvent.create({
    data: {
      actorId: userId,
      targetId: userId,
      action: REAL_MARKET_TERMS_ACTION,
      reason: "User accepted NexAthleteXchange Terms of Service and Real Market disclosures.",
      details: {
        termsVersion: REAL_MARKET_TERMS_VERSION,
        termsHash: REAL_MARKET_TERMS_HASH,
        acceptedAt: new Date().toISOString(),
        country,
        region,
        ageConfirmed: true,
        agreementConfirmed: true,
        electronicConsent: true,
        locationConfirmed: true,
        riskConfirmed: true,
        productModel: "LIMITED_SUPPLY_DIGITAL_ATHLETE_COLLECTIBLES",
        sourceHash,
        userAgentHash,
      },
    },
  });
}
