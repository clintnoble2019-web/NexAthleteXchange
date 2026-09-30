import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAcceptedCurrentTerms } from "@/lib/real-market-compliance";
import { realMarketCustomerTestEnabled, realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import { personaConfigured } from "@/lib/persona";

export default async function VerifyIdentity({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!realMarketSandboxPreviewEnabled()) redirect("/real-market");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await hasAcceptedCurrentTerms(user.id))) redirect("/terms/accept?next=/real-market/verify");

  const params = await searchParams;
  const enrollment = await prisma.realEnrollment.findUnique({ where: { userId: user.id } });
  if (enrollment?.status === "VERIFIED" && enrollment.environment === "SANDBOX") redirect(realMarketCustomerTestEnabled() ? "/real-market/test" : "/real-market/sandbox");
  const providerReady = personaConfigured();
  const personaEnrollment = enrollment?.providerRef?.startsWith("persona:");

  return <main className="shell"><section className="card form">
    <span className="tradeBadge sellBadge">IDENTITY &amp; ELIGIBILITY</span>
    <h1>Verify your identity</h1>
    <p>Real Market access requires identity, age, sanctions, and eligibility verification. Each verified person can have one Real Market account.</p>
    {params.error && <div role="alert" className="notice">{params.error}</div>}

    {providerReady ? <>
      {!personaEnrollment || enrollment?.status === "REJECTED" ? <form action="/api/real-market/kyc/start" method="post"><button>Verify securely with Persona</button></form> : <div role="status" className="notice">
        {enrollment?.status === "REVIEW" ? "Your verification requires compliance review. Trading and funding remain blocked." : "Your secure verification is being processed. This page will unlock after an approved provider result is received."}
      </div>}
      <p className="muted">Identity documents are collected by the verification provider. NexAthleteXchange stores the provider decision and hashed identifiers needed for account controls, not your identity-document images or document numbers.</p>
    </> : <>
      {!enrollment ? <form action="/api/real-market/enroll" method="post"><button>Start sandbox verification</button></form> : <div role="status" className="notice">{enrollment.status === "REJECTED" ? "Verification was declined. Contact support to request a review." : "Your sandbox verification is awaiting administrator review."}</div>}
      <p className="muted">Persona is not connected in this environment, so this remains the isolated administrator-reviewed sandbox flow. Do not submit identity documents or personal identification numbers here.</p>
    </>}

    <p className="muted">Your Terms acceptance is recorded separately from identity verification. Live trading will require both a current agreement and an approved production verification result in an eligible jurisdiction.</p>
    <Link className="button secondary" href="/terms">Review Terms</Link>
    <Link className="button secondary" href="/market">Continue in Free Market</Link>
  </section></main>;
}
