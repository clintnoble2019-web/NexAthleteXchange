"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(Math.round(intervalMs / 1000));

  useEffect(() => {
    const tick = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          router.refresh();
          return Math.round(intervalMs / 1000);
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [intervalMs, router]);

  return <span className="liveRefresh"><span className="liveDot"/>Live market · refresh in {seconds}s</span>;
}
