"use client";

import { useMemo, useState } from "react";
import { formatNexPoints } from "@/lib/nexpoints";

type Props = {
  athleteId: string;
  athleteName: string;
  side: "BUY" | "SELL";
  price: number;
  returnTo: string;
  maxShares?: number;
  compact?: boolean;
};

const PRESETS = [0.25, 0.5, 1, 5];

export default function ShareTradeForm({ athleteId, athleteName, side, price, returnTo, maxShares, compact = false }: Props) {
  const startingShares = side === "SELL" && maxShares != null ? Math.min(1, maxShares) : 1;
  const [shares, setShares] = useState(String(startingShares));
  const numericShares = Number(shares);
  const validShares = Number.isFinite(numericShares) && numericShares >= 0.01;
  const withinMax = maxShares == null || numericShares <= maxShares;
  const estimate = useMemo(() => validShares ? price * numericShares : 0, [price, numericShares, validShares]);
  const availablePresets = PRESETS.filter((value) => maxShares == null || value <= maxShares);

  return <form className={compact ? "shareTrade compactShareTrade" : "shareTrade"} action="/api/trade" method="post">
    <input type="hidden" name="athleteId" value={athleteId}/>
    <input type="hidden" name="side" value={side}/>
    <input type="hidden" name="returnTo" value={returnTo}/>

    <div className="shareTradeTop">
      <span className="shareLabel">Shares</span>
      {!compact && <span className="muted smallText">Fractional trading from 0.01 shares</span>}
    </div>

    {!compact && <div className="sharePresets" aria-label={`${side === "BUY" ? "Buy" : "Sell"} share presets`}>
      {availablePresets.map((value) => <button type="button" className="sharePreset" key={value} onClick={() => setShares(String(value))}>{value}</button>)}
      {side === "SELL" && maxShares != null && <button type="button" className="sharePreset" onClick={() => setShares(String(maxShares))}>Max</button>}
    </div>}

    <div className="shareTradeLine">
      <input
        aria-label={`${side === "BUY" ? "Buy" : "Sell"} ${athleteName} shares`}
        name="quantity"
        type="number"
        min="0.01"
        step="0.01"
        max={maxShares}
        inputMode="decimal"
        value={shares}
        onChange={(event) => setShares(event.target.value)}
      />
      <button disabled={!validShares || !withinMax}>{side === "BUY" ? "Buy shares" : "Sell shares"}</button>
    </div>

    {!compact && <div className="shareEstimate"><span className="muted">Estimated {side === "BUY" ? "cost" : "proceeds"}</span><strong>{formatNexPoints(estimate)}</strong></div>}
  </form>;
}
