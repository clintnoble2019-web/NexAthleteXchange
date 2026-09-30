import Link from "next/link";

type LoginParams = { error?: string; status?: string };

export default async function Login({ searchParams }: { searchParams: Promise<LoginParams> }) {
  const params = await searchParams;
  return <main className="shell"><section className="card form">
    <h1>Welcome back</h1>
    {params.status === "logged-out" && <div className="notice successNotice">You’re logged out. Your account is secure, and we’ll be here when you’re ready to scout again.</div>}
    {params.error === "invalid" && <div className="notice errorNotice">We couldn’t sign you in with those details. Check your email and password, then try again.</div>}
    <form action="/api/auth/login" method="post"><input name="email" type="email" placeholder="Email" required/><input name="password" type="password" placeholder="Password" required/><button type="submit">Log in</button></form>
    <p className="muted">New here? <Link href="/signup">Create account</Link></p>
  </section></main>;
}
