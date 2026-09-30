import Link from "next/link";

type LoginParams = { error?: string; status?: string };

export default async function Login({ searchParams }: { searchParams: Promise<LoginParams> }) {
  const params = await searchParams;
  return <main className="shell"><section className="card form">
    <h1>Welcome back</h1>
    {params.status === "logged-out" && <div className="notice successNotice">You’re logged out. Your account is secure, and we’ll be here when you’re ready to scout again.</div>}
    {params.status === "session-required" && <div className="notice errorNotice">Your session ended. Log back in and you can pick up right where you left off.</div>}
    {params.error === "invalid" && <div className="notice errorNotice">We couldn’t sign you in with those details. Check your email and password, then try again.</div>}
    {params.error === "rate" && <div role="alert" className="notice errorNotice">Too many attempts. Please wait a few minutes before trying again.</div>}
    {params.status === "password-reset" && <div role="status" className="notice successNotice">Your password was updated. Sign in with your new password.</div>}
    <form action="/api/auth/login" method="post"><input aria-label="Email" autoComplete="email" name="email" type="email" placeholder="Email" required/><input aria-label="Password" autoComplete="current-password" name="password" type="password" placeholder="Password" required/><button type="submit">Log in</button></form>
    <p><Link href="/forgot-password">Forgot password?</Link></p>
    <p className="muted">New here? <Link href="/signup">Create account</Link></p>
  </section></main>;
}
