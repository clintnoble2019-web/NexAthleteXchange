"use client";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="shell"><section className="card form" role="alert"><h1>We couldn’t load this page</h1><p>Please try again. If you submitted a trade, check your portfolio before submitting another.</p><div className="filterActions"><button onClick={reset}>Try again</button><Link className="button secondary" href="/portfolio">Check portfolio</Link></div></section></main>;
}
