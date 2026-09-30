import Link from "next/link";
import { NEXPOINTS_SYMBOL } from "@/lib/nexpoints";

export default function Signup() {
  return <main className="shell"><section className="card form"><h1>Create your account</h1><p className="muted">Start with {NEXPOINTS_SYMBOL}5,000 in NexPoints. No real-money value.</p><form action="/api/auth/signup" method="post"><input name="username" placeholder="Username" required minLength={3}/><input name="email" type="email" placeholder="Email" required/><input name="password" type="password" placeholder="Password" required minLength={8}/><button type="submit">Create account</button></form><p className="muted">Already have an account? <Link href="/login">Log in</Link></p></section></main>;
}
