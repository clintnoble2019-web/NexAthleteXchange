"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body style={{ fontFamily: "Arial, sans-serif", padding: 32 }}><h1>NexAthleteXchange is temporarily unavailable</h1><p>Please try again in a moment. Check your portfolio before resubmitting a trade.</p><button onClick={reset}>Try again</button></body></html>;
}
