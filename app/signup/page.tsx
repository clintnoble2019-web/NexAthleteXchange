import { realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import Link from "next/link";
import { NEXPOINTS_SYMBOL } from "@/lib/nexpoints";

type SignupParams = { error?: string };

export default async function Signup({ searchParams }: { searchParams: Promise<SignupParams> }) {
  const params = await searchParams;
  return <main className="shell"><section className="card form">
    <h1>Create your account</h1>
    <p className="muted">Start with {NEXPOINTS_SYMBOL}5,000 in NexPoints. No real-money value.</p>
    {params.error === "exists" && <div className="notice errorNotice">That email or username is already in use. Try another one, or log in if it’s yours.</div>}
    {params.error === "invalid" && <div className="notice errorNotice">We couldn’t create the account yet. Use a valid email, a username with 3–24 letters, numbers, or underscores, and a password with at least 8 characters.</div>}
    {params.error === "rate" && <div role="alert" className="notice errorNotice">Please wait before creating another account.</div>}
    <form action="/api/auth/signup" method="post"><input aria-label="Username" autoComplete="username" name="username" placeholder="Username" pattern="[a-zA-Z0-9_]+" required minLength={3} maxLength={24}/><input aria-label="Email" autoComplete="email" name="email" type="email" placeholder="Email" required/><input aria-label="Password" autoComplete="new-password" name="password" type="password" placeholder="Password" required minLength={8} maxLength={128}/>{realMarketSandboxPreviewEnabled() && <label>Account access<select name="market"><option value="FREE">Free Market</option><option value="REAL">Real Market sandbox — Terms and identity check next</option></select></label>}<button type="submit">Create account</button></form>
    <p className="muted">After account creation, you must review and electronically accept the <Link href="/terms">Terms of Service</Link>. Real Market also requires identity and eligibility verification.</p>
    <p className="muted">Already have an account? <Link href="/login">Log in</Link></p>
  </section></main>;
}
