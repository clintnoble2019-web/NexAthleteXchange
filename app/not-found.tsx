import Link from "next/link";
export default function NotFound() {
  return <main className="shell"><section className="card form"><h1>Page not found</h1><p>This page may have moved.</p><Link className="button" href="/market">Open market</Link></section></main>;
}
