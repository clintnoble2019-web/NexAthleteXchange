import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requestSource } from "@/lib/request-security";
import {
  REAL_MARKET_TERMS_CANONICAL,
  REAL_MARKET_TERMS_VERSION,
} from "@/lib/real-market-terms";

export {
  REAL_MARKET_TERMS_EFFECTIVE_DATE,
  REAL_MARKET_TERMS_TITLE,
  REAL_MARKET_TERMS_VERSION,
} from "@/lib/real-market-terms";

export const REAL_MARKET_TERMS_ACTION = "REAL_MARKET_TERMS_ACCEPTED";
export const REAL_MARKET_TERMS_HASH = crypto.createHash("sha256").update(REAL_MARKET_TERMS_CANONICAL).digest("hex");

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fixtureAcceptanceAllowed() {
  return process.env.FOUNDATION4_TEST_DATABASE === "1" || process.env.SCOUT_TEST_DATABASE === "1";
}

function acceptedDetails(details: Record<string, unknown>) {
  const currentDocument = details?.termsVersion === REAL_MARKET_TERMS_VERSION && details?.termsHash === REAL_MARKET_TERMS_HASH;
  if (!currentDocument) return false;
  if (details?.fixtureOnly === true && fixtureAcceptanceAllowed()) return true;
  return details?.ageConfirmed === true &&
    details?.locationConfirmed === true &&
    details?.accountOwnerConfirmed === true &&
    details?.identityComplianceConfirmed === true &&
    details?.productNatureConfirmed === true &&
    details?.marketRiskConfirmed === true &&
    details?.fundingRiskConfirmed === true &&
    details?.prohibitedConductConfirmed === true &&
    details?.liveLaunchConfirmed === true &&
    details?.agreementConfirmed === true &&
    details?.electronicConsent === true &&
    details?.electronicAccessConfirmed === true &&
    details?.signatureConfirmed === true &&
    details?.signatureMethod === "CLICKWRAP_PLUS_TYPED_SIGNATURE";
}

export async function hasAcceptedCurrentTerms(userId: string) {
  const events = await prisma.adminAuditEvent.findMany({
    where: { actorId: userId, targetId: userId, action: REAL_MARKET_TERMS_ACTION },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return events.some((event) => acceptedDetails(event.details as Record<string, unknown>));
}

export async function recordCurrentTermsAcceptance(req: Request, userId: string, input: {
  country: string;
  region: string;
  ageConfirmed: boolean;
  locationConfirmed: boolean;
  accountOwnerConfirmed: boolean;
  identityComplianceConfirmed: boolean;
  productNatureConfirmed: boolean;
  marketRiskConfirmed: boolean;
  fundingRiskConfirmed: boolean;
  prohibitedConductConfirmed: boolean;
  liveLaunchConfirmed: boolean;
  agreementConfirmed: boolean;
  electronicConsent: boolean;
  electronicAccessConfirmed: boolean;
  signatureText: string;
}) {
  const country = input.country.trim().toUpperCase();
  const region = input.region.trim().toUpperCase();
  const signatureText = input.signatureText.trim().toUpperCase().replace(/\s+/g, " ");

  if (!/^[A-Z]{2,3}$/.test(country)) throw new Error("Enter a valid country code.");
  if (!/^[A-Z0-9 .'-]{2,60}$/.test(region)) throw new Error("Enter a valid state, province, or region.");

  const acknowledgements = [
    input.ageConfirmed,
    input.locationConfirmed,
    input.accountOwnerConfirmed,
    input.identityComplianceConfirmed,
    input.productNatureConfirmed,
    input.marketRiskConfirmed,
    input.fundingRiskConfirmed,
    input.prohibitedConductConfirmed,
    input.liveLaunchConfirmed,
    input.agreementConfirmed,
    input.electronicConsent,
    input.electronicAccessConfirmed,
  ];
  if (acknowledgements.some(value => !value) || signatureText !== "I AGREE") {
    throw new Error("All required Terms acknowledgements and the electronic signature must be completed.");
  }

  if (await hasAcceptedCurrentTerms(userId)) return;

  const sourceHash = hash(`terms-source:${requestSource(req)}`);
  const userAgentHash = hash(`terms-ua:${req.headers.get("user-agent") || "unknown"}`);
  await prisma.adminAuditEvent.create({
    data: {
      actorId: userId,
      targetId: userId,
      action: REAL_MARKET_TERMS_ACTION,
      reason: "User affirmatively accepted the current NexAthleteXchange Terms of Service and Real Market Agreement.",
      details: {
        termsVersion: REAL_MARKET_TERMS_VERSION,
        termsHash: REAL_MARKET_TERMS_HASH,
        acceptedAt: new Date().toISOString(),
        country,
        region,
        ageConfirmed: true,
        locationConfirmed: true,
        accountOwnerConfirmed: true,
        identityComplianceConfirmed: true,
        productNatureConfirmed: true,
        marketRiskConfirmed: true,
        fundingRiskConfirmed: true,
        prohibitedConductConfirmed: true,
        liveLaunchConfirmed: true,
        agreementConfirmed: true,
        electronicConsent: true,
        electronicAccessConfirmed: true,
        signatureConfirmed: true,
        signatureMethod: "CLICKWRAP_PLUS_TYPED_SIGNATURE",
        acceptedDocuments: ["TERMS_OF_SERVICE", "PRIVACY_NOTICE", "REAL_MARKET_RISK_DISCLOSURE"],
        productModel: "LIMITED_SUPPLY_DIGITAL_ATHLETE_COLLECTIBLES",
        sourceHash,
        userAgentHash,
      },
    },
  });
}
