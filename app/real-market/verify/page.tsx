import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAcceptedCurrentTerms } from "@/lib/real-market-compliance";
import { realMarketCustomerTestEnabled, realMarketSandboxPreviewEnabled } from "@/lib/real-market";

export default async function VerifyIdentity() {
  if (!realMarketSandboxPreviewEnabled()) redirect("/real-market");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await hasAcceptedCurrentTerms(user.id))) redirect("/terms/accept?next=/real-market/verify");

  const enrollment = await prisma.realEnrollment.findUnique({ where: { userId: user.id } });
  if (enrollment?.status === "VERIFIED" && enrollment.environment === "SANDBOX") redirect(realMarketCustomerTestEnabled() ? "/real-market/test" : "/real-market/sandbox");
  return <main className="shell"><section className="card form">
    <span className="tradeBadge sellBadge">SANDBOX IDENTITY CHECK</span>
    <h1>Verify your identity</h1>
    <p>Real Market access requires identity and eligibility verification. Each verified person can have one Real Market account.</p>
    {!enrollment ? <form action="/api/real-market/enroll" method="post"><button>Start sandbox verification</button></form> : <div role="status" className="notice">{enrollment.status === "REJECTED" ? "Verification was declined. Contact support to request a review." : "Your sandbox verification is awaiting administrator review."}</div>}
    <p className="muted">This is a test workflow. Live identity, age, sanctions, and location verification are not connected. Do not submit identity documents or personal identification numbers here.</p>
    <p className="muted">Your Terms acceptance is recorded separately from identity verification. Live trading will require both a current agreement and an approved production verification result.</p>
    <Link className="button secondary" href="/terms">Review Terms</Link>
    <Link className="button secondary" href="/market">Continue in Free Market</Link>
  </section></main>;
}
