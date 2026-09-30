import Link from "next/link";
export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const params = await searchParams;
  return <main className="shell"><section className="card form"><h1>Reset your password</h1>{params.sent && <p className="notice successNotice" role="status">If your account is eligible, you’ll receive a reset link when email delivery is available.</p>}{params.error && <p className="notice errorNotice" role="alert">The reset link could not be used. Request a new link or try again later.</p>}<form action="/api/auth/recovery" method="post"><label>Email<input name="email" type="email" autoComplete="email" required/></label><button>Send reset link</button></form><Link href="/login">Back to login</Link></section></main>;
}
