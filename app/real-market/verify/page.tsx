import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAcceptedCurrentTerms } from "@/lib/real-market-compliance";
import { realMarketCustomerTestEnabled, realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import { personaConfigured } from "@/lib/persona";
import { safeReturnTo } from "@/lib/request-security";

export default async function VerifyIdentity({ searchParams }: { searchParams: Promise<{ error?: string; provider?: string; next?: string }> }) {
  if (!realMarketSandboxPreviewEnabled()) redirect("/real-market");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await hasAcceptedCurrentTerms(user.id))) redirect("/terms/accept?next=/real-market/verify");

  const params = await searchParams;
  const enrollment = await prisma.realEnrollment.findUnique({ where: { userId: user.id } });
  const providerRequested = params.provider === "1" || params.next === "/real-market/funding";
  const providerVerified = Boolean(enrollment?.status === "VERIFIED" && enrollment.environment === "SANDBOX" && enrollment.providerRef?.startsWith("persona:"));
  const next = safeReturnTo(params.next, providerRequested ? "/real-market/funding" : (realMarketCustomerTestEnabled() ? "/real-market/test" : "/real-market/sandbox"));

  if (providerRequested && providerVerified) redirect(next);
  if (!providerRequested && enrollment?.status === "VERIFIED" && enrollment.environment === "SANDBOX") redirect(realMarketCustomerTestEnabled() ? "/real-market/test" : "/real-market/sandbox");

  const providerReady = personaConfigured();
  const personaEnrollment = enrollment?.providerRef?.startsWith("persona:");

  return <main className="shell"><section className="card form">
    <span className="tradeBadge sellBadge">IDENTITY &amp; ELIGIBILITY</span>
    <h1>{providerRequested ? "Complete provider KYC" : "Verify your identity"}</h1>
    <p>{providerRequested ? "Provider funding requires Persona-backed identity, age, sanctions, and eligibility verification. An older administrator-approved sandbox identity is not enough to access USDC funding." : "Real Market access requires identity, age, sanctions, and eligibility verification. Each verified person can have one Real Market account."}</p>
    {params.error && <div role="alert" className="notice">{params.error}</div>}

    {providerRequested ? <>
      {!providerReady ? <div role="status" className="notice"><strong>Provider KYC is required but not configured.</strong><br/>USDC funding stays locked until the operator configures Persona Sandbox credentials and the approved verification flow.</div> : !personaEnrollment || enrollment?.status === "REJECTED" ? <form action="/api/real-market/kyc/start" method="post"><input type="hidden" name="next" value={next}/><button>Verify securely with Persona</button></form> : <div role="status" className="notice">
        {enrollment?.status === "REVIEW" ? "Your Persona verification requires compliance review. Provider funding remains blocked." : "Your Persona verification is being processed. Provider funding will unlock only after an approved provider result is received."}
      </div>}
      <p className="muted">Identity documents are collected by Persona. NexAthleteXchange stores provider decisions and hashed identifiers needed for account controls, not your identity-document images or document numbers.</p>
    </> : providerReady ? <>
      {!personaEnrollment || enrollment?.status === "REJECTED" ? <form action="/api/real-market/kyc/start" method="post"><input type="hidden" name="next" value={next}/><button>Verify securely with Persona</button></form> : <div role="status" className="notice">
        {enrollment?.status === "REVIEW" ? "Your verification requires compliance review. Trading and funding remain blocked." : "Your secure verification is being processed. This page will unlock after an approved provider result is received."}
      </div>}
      <p className="muted">Identity documents are collected by the verification provider. NexAthleteXchange stores the provider decision and hashed identifiers needed for account controls, not your identity-document images or document numbers.</p>
    </> : <>
      {!enrollment ? <form action="/api/real-market/enroll" method="post"><button>Start sandbox verification</button></form> : <div role="status" className="notice">{enrollment.status === "REJECTED" ? "Verification was declined. Contact support to request a review." : "Your sandbox verification is awaiting administrator review."}</div>}
      <p className="muted">Persona is not connected in this environment, so ordinary fake-money market testing can still use the isolated administrator-reviewed sandbox flow. Provider USDC funding cannot.</p>
    </>}

    <p className="muted">Your Terms acceptance is recorded separately from identity verification. Provider funding requires the current agreement plus an approved Persona result.</p>
    <Link className="button secondary" href="/terms">Review Terms</Link>
    <Link className="button secondary" href="/market">Continue in Free Market</Link>
  </section></main>;
}
