export const metadata = { referrer: "no-referrer" as const, robots: { index: false, follow: false } };
export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <main className="shell"><section className="card form"><h1>Choose a new password</h1><form action="/api/auth/reset-password" method="post"><input type="hidden" name="token" value={params.token || ""}/><label>New password<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required/></label><button>Update password</button></form><p className="muted">Reset links expire after 30 minutes and can be used once.</p></section></main>;
}
