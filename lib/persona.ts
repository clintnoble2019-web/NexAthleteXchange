import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cancelScoutOrdersTx } from "@/lib/scout-market";

const DEFAULT_PERSONA_API = "https://api.withpersona.com/api/v1";
const DEFAULT_PERSONA_HOSTED = "https://inquiry.withpersona.com/verify";
const DEFAULT_PERSONA_VERSION = "2025-10-27";
const WEBHOOK_TOLERANCE_SECONDS = 300;

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function personaConfigured() {
  return Boolean(process.env.PERSONA_API_KEY?.trim() && process.env.PERSONA_INQUIRY_TEMPLATE_ID?.trim());
}

export function personaWebhookConfigured() {
  return Boolean(process.env.PERSONA_WEBHOOK_SECRET?.trim());
}

function personaHeaders() {
  return {
    Authorization: `Bearer ${required("PERSONA_API_KEY")}`,
    "Content-Type": "application/json",
    "Persona-Version": process.env.PERSONA_API_VERSION?.trim() || DEFAULT_PERSONA_VERSION,
  };
}

async function personaRequest(path: string, init?: RequestInit) {
  const base = process.env.PERSONA_API_BASE?.trim() || DEFAULT_PERSONA_API;
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(personaHeaders())) headers.set(key, value);
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (body as { errors?: Array<{ title?: string; details?: string }> })?.errors?.[0];
    throw new Error(message?.details || message?.title || `Persona request failed (${response.status}).`);
  }
  return body as Record<string, any>;
}

export async function createPersonaInquiry(userId: string, redirectUri: string) {
  if (!personaConfigured()) throw new Error("Persona identity verification is not configured.");
  const existing = await prisma.realEnrollment.findUnique({ where: { userId } });
  const existingInquiry = existing?.providerRef?.startsWith("persona:") ? existing.providerRef.slice("persona:".length) : null;
  let inquiryId: string | null = existingInquiry;

  if (!inquiryId || existing?.status === "REJECTED") {
    const result = await personaRequest("/inquiries", {
      method: "POST",
      body: JSON.stringify({
        data: {
          attributes: { "inquiry-template-id": required("PERSONA_INQUIRY_TEMPLATE_ID") },
          meta: { "auto-create-account-reference-id": userId },
        },
      }),
    });
    const returnedInquiryId = String(result?.data?.id || "");
    if (!/^inq_[A-Za-z0-9]+$/.test(returnedInquiryId)) throw new Error("Persona did not return a valid inquiry identifier.");
    inquiryId = returnedInquiryId;
    await prisma.realEnrollment.upsert({
      where: { userId },
      create: { userId, environment: "SANDBOX", status: "PENDING", providerRef: `persona:${inquiryId}` },
      update: { environment: "SANDBOX", status: "PENDING", providerRef: `persona:${inquiryId}`, reviewedAt: null },
    });
    await prisma.adminAuditEvent.create({
      data: {
        actorId: userId,
        targetId: userId,
        action: "PERSONA_INQUIRY_STARTED",
        reason: "User started provider-backed identity verification.",
        details: { provider: "PERSONA", inquiryHash: hash(inquiryId), environment: "SANDBOX" },
      },
    });
  }

  if (!inquiryId) throw new Error("Persona inquiry could not be initialized.");
  const hosted = new URL(process.env.PERSONA_HOSTED_FLOW_ORIGIN?.trim() || DEFAULT_PERSONA_HOSTED);
  hosted.searchParams.set("inquiry-id", inquiryId);
  hosted.searchParams.set("redirect-uri", redirectUri);
  return { inquiryId, url: hosted.toString() };
}

export async function retrievePersonaInquiry(inquiryId: string) {
  if (!/^inq_[A-Za-z0-9]+$/.test(inquiryId)) throw new Error("Invalid Persona inquiry identifier.");
  return personaRequest(`/inquiries/${encodeURIComponent(inquiryId)}`);
}

export function verifyPersonaWebhook(rawBody: string, signatureHeader: string | null, nowSeconds = Math.floor(Date.now() / 1000)) {
  const secret = process.env.PERSONA_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;
  const pairs = signatureHeader.trim().split(/\s+/).filter(Boolean);
  const firstTimestamp = pairs[0]?.match(/(?:^|,)t=(\d+)/)?.[1];
  if (!firstTimestamp) return false;
  const timestamp = Number(firstTimestamp);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > WEBHOOK_TOLERANCE_SECONDS) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${firstTimestamp}.${rawBody}`).digest("hex");
  return pairs.some(pair => {
    const candidate = pair.match(/(?:^|,)v1=([0-9a-fA-F]+)/)?.[1];
    if (!candidate || candidate.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(expected, "hex"));
  });
}

function allowedLocation(country: string, region: string) {
  const rules = (process.env.REAL_MARKET_ALLOWED_REGIONS || "").split(",").map(x => x.trim().toUpperCase()).filter(Boolean);
  if (!rules.length) return true; // Sandbox may run before a live jurisdiction allowlist is approved.
  const c = country.toUpperCase(), r = region.toUpperCase();
  return rules.some(rule => rule === c || rule === `${c}-*` || rule === `${c}:${r}` || rule === `${c}-${r}`);
}

function inquirySignals(inquiry: Record<string, any>) {
  const attrs = inquiry?.data?.attributes || {};
  const relationships = inquiry?.data?.relationships || {};
  const accountId = relationships?.account?.data?.id ? String(relationships.account.data.id) : "";
  const sessions = Array.isArray(inquiry?.included)
    ? inquiry.included.filter((item: Record<string, any>) => item?.type === "inquiry-session")
    : [];
  const latestSession = sessions.sort((a: Record<string, any>, b: Record<string, any>) => {
    const at = Date.parse(String(a?.attributes?.["created-at"] || "")) || 0;
    const bt = Date.parse(String(b?.attributes?.["created-at"] || "")) || 0;
    return bt - at;
  })[0];
  const session = latestSession?.attributes || {};
  const country = String(session["gps-country-code"] || session["country-code"] || "").toUpperCase();
  const region = String(session["region-code"] || "").toUpperCase();
  const vpn = session["is-vpn"] === true;
  const proxy = session["is-proxy"] === true;
  const tor = session["is-tor"] === true;
  const datacenter = session["is-datacenter"] === true;
  const threatLevel = String(session["threat-level"] || "").toLowerCase();
  return { attrs, accountId, country, region, vpn, proxy, tor, datacenter, threatLevel, hasSession: Boolean(latestSession) };
}

export async function processPersonaWebhook(rawBody: string, signatureHeader: string | null) {
  if (!verifyPersonaWebhook(rawBody, signatureHeader)) throw new Error("Invalid Persona webhook signature.");
  const envelope = JSON.parse(rawBody) as Record<string, any>;
  const eventId = String(envelope?.data?.id || "");
  const eventName = String(envelope?.data?.attributes?.name || "");
  if (!/^evt_[A-Za-z0-9]+$/.test(eventId)) throw new Error("Persona webhook is missing an event identifier.");
  const prior = await prisma.adminAuditEvent.findFirst({ where: { action: "PERSONA_WEBHOOK_RECEIVED", targetId: eventId } });
  if (prior) return { duplicate: true, eventName };
  const payload = envelope?.data?.attributes?.payload?.data || {};
  const inquiryId = String(payload?.id || "");

  if (!eventName.startsWith("inquiry.") || !/^inq_[A-Za-z0-9]+$/.test(inquiryId)) {
    await prisma.adminAuditEvent.create({ data: { actorId: "persona", targetId: eventId, action: "PERSONA_WEBHOOK_RECEIVED", reason: "Non-decision Persona event acknowledged.", details: { eventName } } });
    return { duplicate: false, eventName, ignored: true };
  }

  const inquiry = await retrievePersonaInquiry(inquiryId);
  const attrs = inquiry?.data?.attributes || {};
  const userId = String(attrs["reference-id"] || "");
  if (!userId) throw new Error("Persona inquiry is missing the NexGame reference identifier.");
  const enrollment = await prisma.realEnrollment.findUnique({ where: { userId } });
  if (!enrollment || enrollment.providerRef !== `persona:${inquiryId}`) throw new Error("Persona inquiry does not match the enrolled account.");
  const signals = inquirySignals(inquiry);
  const providerApproved = eventName === "inquiry.approved" && String(attrs.status || "").toLowerCase() === "approved";
  const providerDeclined = eventName === "inquiry.declined" || String(attrs.status || "").toLowerCase() === "declined";
  const locationBlocked = Boolean(signals.country && !allowedLocation(signals.country, signals.region));
  const networkRisk = signals.vpn || signals.proxy || signals.tor || signals.datacenter || ["high", "very_high", "very-high"].includes(signals.threatLevel);
  let nextStatus = providerApproved ? "VERIFIED" : providerDeclined ? "REJECTED" : "REVIEW";
  if (providerApproved && (!signals.accountId || locationBlocked || networkRisk)) nextStatus = "REVIEW";
  const identityHash = signals.accountId ? hash(`persona-account:${signals.accountId}`) : null;

  try {
    await prisma.$transaction(async tx => {
      const current = await tx.realEnrollment.findUniqueOrThrow({ where: { userId } });
      if (current.providerRef !== `persona:${inquiryId}`) throw new Error("Persona inquiry changed during review.");
      await tx.realEnrollment.update({
        where: { userId },
        data: {
          status: nextStatus,
          identityHash: nextStatus === "VERIFIED" ? (current.identityHash || identityHash) : current.identityHash,
          reviewedAt: new Date(),
        },
      });
      if (nextStatus !== "VERIFIED") await cancelScoutOrdersTx(tx, { userId }, `Identity status changed to ${nextStatus}`);
      await tx.adminAuditEvent.create({
        data: {
          actorId: "persona",
          targetId: userId,
          action: `PERSONA_IDENTITY_${nextStatus}`,
          reason: "Provider-backed Real Market identity decision processed.",
          details: {
            eventId,
            eventName,
            inquiryHash: hash(inquiryId),
            identityHash,
            country: signals.country || null,
            region: signals.region || null,
            locationBlocked,
            networkRisk,
            sessionSignalsPresent: signals.hasSession,
            threatLevel: signals.threatLevel || null,
            providerStatus: String(attrs.status || ""),
            tagCount: Array.isArray(attrs.tags) ? attrs.tags.length : 0,
          },
        },
      });
      await tx.adminAuditEvent.create({ data: { actorId: "persona", targetId: eventId, action: "PERSONA_WEBHOOK_RECEIVED", reason: "Persona event processed.", details: { eventName, userId } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      await prisma.realEnrollment.update({ where: { userId }, data: { status: "REVIEW", reviewedAt: new Date() } });
      await prisma.adminAuditEvent.create({ data: { actorId: "persona", targetId: userId, action: "PERSONA_DUPLICATE_IDENTITY_REVIEW", reason: "Provider identity is already reserved to another Real Market account.", details: { inquiryHash: hash(inquiryId) } } });
      return { duplicate: false, eventName, status: "REVIEW" };
    }
    throw error;
  }
  return { duplicate: false, eventName, status: nextStatus };
}
