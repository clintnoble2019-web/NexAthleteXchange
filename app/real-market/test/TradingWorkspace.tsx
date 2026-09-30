"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./workspace.module.css";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
type AthleteChoice = { id: string; name: string; sport: string; team: string; price: number; previous: number };

export function MobileAthletePicker({ athletes, selected }: { athletes: AthleteChoice[]; selected?: string }) {
  const router = useRouter();
  return <div className={styles.mobilePicker}><label htmlFor="mobile-athlete">Trade an athlete</label><select id="mobile-athlete" value={selected || ""} onChange={e => router.push(`/real-market/test?athlete=${encodeURIComponent(e.target.value)}`)}>{athletes.map(a => <option key={a.id} value={a.id}>{a.name} · {a.sport}</option>)}</select></div>;
}

export function AthleteList({ athletes, selected }: { athletes: AthleteChoice[]; selected?: string }) {
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState("All");
  const sports = ["All", ...new Set(athletes.map(a => a.sport))];
  const filtered = athletes.filter(a => (sport === "All" || a.sport === sport) && `${a.name} ${a.team}`.toLowerCase().includes(query.toLowerCase()));
  return <aside className={styles.athleteRail} aria-label="Athlete market">
    <div className={styles.sectionHead}><h2>Athletes</h2><span>{athletes.length}</span></div>
    <input className={styles.search} type="search" aria-label="Search athletes" placeholder="Search athletes" value={query} onChange={e => setQuery(e.target.value)} />
    <div className={styles.sportFilters} aria-label="Filter by sport">{sports.map(s => <button type="button" key={s} aria-pressed={sport === s} onClick={() => setSport(s)}>{s}</button>)}</div>
    <div className={styles.athleteList}>{filtered.map(a => {
      const change = a.previous > 0 ? (a.price - a.previous) / a.previous * 100 : 0;
      return <Link className={`${styles.athleteRow} ${selected === a.id ? styles.selectedAthlete : ""}`} href={`/real-market/test?athlete=${encodeURIComponent(a.id)}`} key={a.id} aria-current={selected === a.id ? "page" : undefined}>
        <span className={styles.avatar} aria-hidden="true">{a.name.split(" ").map(n => n[0]).slice(0, 2).join("")}</span>
        <span className={styles.athleteName}><strong>{a.name}</strong><small>{a.sport} · {a.team}</small></span>
        <span className={styles.athletePrice}><strong>{money(a.price)}</strong><small className={change < 0 ? styles.negative : styles.positive}>{change > 0 ? "+" : ""}{change.toFixed(2)}%</small></span>
      </Link>;
    })}</div>
    {filtered.length === 0 && <p className={styles.empty}>No athletes match your search.</p>}
    <p className={styles.caption}>Prices are performance references. Orders trade at matched customer prices.</p>
  </aside>;
}

export function ReferenceChart({ points, name, currentPrice, previousPrice }: { points: { time: string; price: number }[]; name: string; currentPrice: number; previousPrice: number }) {
  const [range, setRange] = useState("1W");
  const [hover, setHover] = useState<number | null>(null);
  const lastTime = points.length ? new Date(points[points.length - 1].time).getTime() : 0;
  const days: Record<string, number> = { "1D": 1, "1W": 7, "1M": 30, "ALL": Infinity };
  const visible = points.filter(p => new Date(p.time).getTime() >= lastTime - days[range] * 86400000);
  const values = visible.map(p => p.price);
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 1;
  const pad = Math.max((high - low) * .18, high * .01, .01);
  const min = low - pad, max = high + pad;
  const width = 640, height = 210;
  const start = visible.length ? new Date(visible[0].time).getTime() : 0;
  const span = Math.max(lastTime - start, 1);
  const coords = visible.map(p => ({ x: 8 + (new Date(p.time).getTime() - start) / span * (width - 16), y: 14 + (max - p.price) / (max - min) * (height - 28) }));
  const line = coords.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const highlighted = hover === null ? null : visible[hover];
  const shownPrice = highlighted?.price ?? currentPrice;
  const baseline = visible.length > 1 ? visible[0].price : previousPrice;
  const change = shownPrice - baseline;
  const percent = baseline > 0 ? change / baseline * 100 : 0;
  const labels: Record<string, string> = { "1D": "Past day", "1W": "Past week", "1M": "Past month", "ALL": "Recorded history" };
  const colorClass = visible.length > 1 && visible[visible.length - 1].price < visible[0].price ? styles.downChart : "";
  return <><div className={styles.assetPrice}>{money(shownPrice)}</div><div className={`${styles.assetChange} ${change < 0 ? styles.negative : styles.positive}`}><span>{change >= 0 ? "+" : ""}{money(change)} ({change >= 0 ? "+" : ""}{percent.toFixed(2)}%)</span><small>{visible.length > 1 ? labels[range] : "vs. previous reference"}</small></div><div className={`${styles.chart} ${colorClass}`}>
    <div className={styles.chartLabel}><span>Reference price history</span><span>{highlighted ? `${money(highlighted.price)} · ${new Date(highlighted.time).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}` : "Sandbox data"}</span></div>
    {visible.length > 1 ? <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${name} reference price history, ${range}. From ${money(visible[0].price)} to ${money(visible[visible.length - 1].price)}.`} onPointerMove={e => {
      const box = e.currentTarget.getBoundingClientRect();
      const target = (e.clientX - box.left) / box.width * width;
      let index = 0; for (let i = 1; i < coords.length; i++) if (Math.abs(coords[i].x - target) < Math.abs(coords[index].x - target)) index = i;
      setHover(index);
    }} onPointerLeave={() => setHover(null)}>
      <path d={`${line} L${coords[coords.length - 1].x},${height} L${coords[0].x},${height} Z`} fill="currentColor" opacity=".045" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {hover !== null && coords[hover] && <><line x1={coords[hover].x} x2={coords[hover].x} y1="0" y2={height} stroke="currentColor" opacity=".3"/><circle cx={coords[hover].x} cy={coords[hover].y} r="4" fill="currentColor"/></>}
    </svg> : <div className={styles.chartEmpty}><strong>{values.length ? money(values[0]) : "No history yet"}</strong><span>More recorded prices are needed to show this range.</span></div>}
    {visible.length > 1 && <div className={styles.chartDates}><span>{new Date(visible[0].time).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span><span>{new Date(visible[visible.length - 1].time).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span></div>}
    <div className={styles.rangeButtons} aria-label="Price history range">{Object.keys(days).map(r => <button type="button" key={r} aria-pressed={r === range} onClick={() => { setRange(r); setHover(null); }}>{r}</button>)}</div>
  </div></>;
}

export function OrderTicket({ athleteId, name, price: initialPrice, availableCash, availableShares, bestBid, bestAsk, open, buyKey, sellKey }: { athleteId: string; name: string; price: number; availableCash: number; availableShares: number; bestBid: number | null; bestAsk: number | null; open: boolean; buyKey: string; sellKey: string }) {
  const [side, setSide] = useState("BUY");
  const [price, setPrice] = useState(initialPrice.toFixed(2));
  const [quantity, setQuantity] = useState("1");
  const [review, setReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const p = Number(price), q = Number(quantity);
  const notional = p * q;
  const backing = Math.ceil(notional * 100 - 1e-8) / 100 + 2;
  const valid = Number.isFinite(notional) && p > 0 && q > 0 && p <= 1000000 && q <= 1000000 && notional >= 2.01 && notional <= 1000000 && Math.abs(p * 100 - Math.round(p * 100)) < 1e-6 && Math.abs(q * 100 - Math.round(q * 100)) < 1e-6;
  const funded = side === "BUY" ? availableCash >= backing : availableShares >= q && availableCash >= 2;
  const opposingPrice = side === "BUY" ? bestAsk : bestBid;
  const crossesBook = opposingPrice !== null && (side === "BUY" ? p >= opposingPrice : p <= opposingPrice);
  const warning = !open ? "Orders are paused for this athlete." : !valid ? "Use a 0.01 price and share increment, with at least $2.01 in order value." : !funded ? (side === "BUY" ? "Add test cash to cover the order and fee." : "You need available shares and $2 in test cash.") : "";
  return <aside className={styles.ticket} aria-label="Order ticket">
    <div className={styles.tradeTabs} role="tablist" aria-label="Trade side">{["BUY", "SELL"].map(s => <button key={s} type="button" role="tab" id={`trade-${s}`} aria-selected={side === s} aria-controls="trade-ticket" onClick={() => { setSide(s); setReview(false); }}>{s === "BUY" ? "Buy" : "Sell"}</button>)}</div>
    <div id="trade-ticket" role="tabpanel" aria-labelledby={`trade-${side}`}>
      <h2>{side === "BUY" ? "Buy" : "Sell"} {name}</h2><div className={styles.orderType}>Limit order <span>Good until canceled</span></div>
      <form action="/api/real-market/test/actions" method="post" onSubmit={e => {
        if (!valid || !funded || !open || submitting) { e.preventDefault(); return; }
        if (!review) { e.preventDefault(); setReview(true); } else setSubmitting(true);
      }}>
        <input type="hidden" name="action" value="ORDER"/><input type="hidden" name="athleteId" value={athleteId}/><input type="hidden" name="side" value={side}/><input type="hidden" name="requestKey" value={side === "BUY" ? buyKey : sellKey}/>
        <div className={styles.quoteStrip}><div><span>Best bid</span><strong>{bestBid === null ? "—" : money(bestBid)}</strong></div><div><span>Best ask</span><strong>{bestAsk === null ? "—" : money(bestAsk)}</strong></div></div>
        <label className={styles.orderField}>Limit price <span><span aria-hidden="true">$</span><input aria-label="Limit price" name="price" type="number" min="0.01" max="1000000" step="0.01" value={price} required readOnly={review} onChange={e => { setPrice(e.target.value); setReview(false); }}/></span></label>
        <label className={styles.orderField}>Shares <input aria-label="Shares" name="quantity" type="number" min="0.01" max="1000000" step="0.01" value={quantity} required readOnly={review} onChange={e => { setQuantity(e.target.value); setReview(false); }}/></label>
        {!review && <div className={styles.ticketTools}>{opposingPrice !== null && <button type="button" disabled={!open} onClick={() => setPrice(opposingPrice.toFixed(2))}>Use best {side === "BUY" ? "ask" : "bid"}</button>}<a href="#test-funding">Add test cash</a></div>}
        <div className={styles.ticketSummary}><div><span>Order value</span><strong>{money(Number.isFinite(notional) ? notional : 0)}</strong></div><div><span>First-fill fee</span><strong>$2.00</strong></div><div className={styles.ticketTotal}><span>{side === "BUY" ? "Cash reserved" : "Estimated proceeds"}</span><strong>{money(Number.isFinite(notional) ? (side === "BUY" ? backing : notional - 2) : 0)}</strong></div></div>
        {warning && <p className={styles.ticketWarning} role="status">{warning}</p>}
        {review && <div className={styles.review} role="status"><strong>Review your {side.toLowerCase()}</strong><p>{q.toFixed(2)} shares at {money(p)} {side === "BUY" ? "or less" : "or more"}.</p><p>{crossesBook ? "Your limit crosses the current book. A fill depends on eligible counterparties and available quantity." : "Your order will wait for a matching customer."}</p><p>{side === "BUY" ? `${money(backing)} in test cash will be held.` : `${q.toFixed(2)} shares and $2.00 in test cash will be held.`} Cancel any unfilled remainder to release its backing.</p></div>}
        <button className={styles.primary} type="submit" disabled={!open || !valid || !funded || submitting}>{submitting ? "Submitting order…" : review ? `Place limit ${side.toLowerCase()}` : "Review order"}</button>
        {review && <button className={styles.editOrder} type="button" onClick={() => setReview(false)}>Edit order</button>}
      </form>
      <div className={styles.buyingPower}><span>{side === "BUY" ? "Buying power" : "Available shares"}</span><strong>{side === "BUY" ? money(availableCash) : availableShares.toFixed(2)}</strong></div>
      <p className={styles.caption}>Customer orders only. The $2 fee applies once on the first fill. Unfilled orders have no fee.</p>
      <span className={styles.simulated}>Simulated trading · No real money</span>
    </div>
  </aside>;
}

export function ActivityTabs({ panels, initialActive = 0 }: { panels: { label: string; count: number; content: React.ReactNode }[]; initialActive?: number }) {
  const [active, setActive] = useState(initialActive);
  return <section className={styles.activity} aria-label="Your market activity"><div className={styles.activityTabs} role="tablist" aria-label="Activity view">{panels.map((p, i) => <button key={p.label} id={`activity-tab-${i}`} type="button" role="tab" aria-controls={`activity-panel-${i}`} aria-selected={active === i} onClick={() => setActive(i)}>{p.label}<span>{p.count}</span></button>)}</div>{panels.map((p, i) => <div key={p.label} id={`activity-panel-${i}`} role="tabpanel" aria-labelledby={`activity-tab-${i}`} hidden={active !== i}>{p.content}</div>)}</section>;
}
