import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sandboxAccessVerified } from "@/lib/beta-controls";
import { prisma } from "@/lib/prisma";
import { realMarketCustomerTestEnabled } from "@/lib/real-market";
import { ensureScoutWallet, visibleScoutOrders } from "@/lib/scout-market";
import { formatRealMoney as money } from "@/lib/real-market-sandbox";
import { ActivityTabs, AthleteList, MobileAthletePicker, OrderTicket, ReferenceChart } from "./TradingWorkspace";
import styles from "./workspace.module.css";

export const metadata = { title: "Test Market | NexAthleteXchange", robots: { index: false, follow: false } };
const action = "/api/real-market/test/actions";
function cashForm(type: "DEPOSIT" | "WITHDRAWAL") {
  return <form action={action} method="post"><h3>{type === "DEPOSIT" ? "Add test cash" : "Withdraw test cash"}</h3><input type="hidden" name="action" value="CASH"/><input type="hidden" name="type" value={type}/><input type="hidden" name="requestKey" value={randomUUID()}/><label>Amount ($)<input name="amount" type="number" min="0.01" max="1000000" step="0.01" defaultValue={type === "DEPOSIT" ? "1000" : "25"} required/></label><button>{type === "DEPOSIT" ? "Add test cash" : "Test withdrawal"}</button><small>Simulated cash only. No bank or crypto transfer.</small></form>;
}
export default async function ScoutTestMarket({ searchParams }: { searchParams: Promise<{ athlete?: string; notice?: string; error?: string }> }) {
  if (!realMarketCustomerTestEnabled()) redirect("/real-market");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await sandboxAccessVerified(user.id))) redirect("/real-market/verify");
  const params = await searchParams;
  const [control, account, instruments] = await Promise.all([
    prisma.betaControl.findUnique({ where: { id: "global" } }), ensureScoutWallet(user.id),
    prisma.realMarketInstrument.findMany({ where: { environment: "SANDBOX", status: { not: "RETIRED" } }, include: { athlete: true }, orderBy: [{ athlete: { sport: "asc" } }, { athlete: { name: "asc" } }], take: 60 }),
  ]);
  const selected = instruments.find(item => item.athleteId === params.athlete) || instruments[0];
  const athleteId = selected?.athleteId;
  const [positions, orders, fills, entries, grant, bids, asks, history] = await Promise.all([
    prisma.scoutPosition.findMany({ where: { userId: user.id, quantity: { gt: 0 } }, include: { athlete: true }, orderBy: { athlete: { name: "asc" } } }),
    prisma.scoutOrder.findMany({ where: { userId: user.id }, include: { athlete: true }, orderBy: { sequence: "desc" }, take: 40 }),
    prisma.scoutFill.findMany({ where: { OR: [{ buyOrder: { userId: user.id } }, { sellOrder: { userId: user.id } }] }, include: { buyOrder: { include: { athlete: true } }, sellOrder: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20 }),
    prisma.scoutLedgerEntry.findMany({ where: { userId: user.id }, orderBy: { sequence: "desc" }, take: 20 }),
    athleteId ? prisma.scoutInventoryGrant.findUnique({ where: { userId_athleteId: { userId: user.id, athleteId } } }) : null,
    athleteId ? prisma.scoutOrder.groupBy({ by: ["price"], where: { ...visibleScoutOrders(athleteId), side: "BUY" }, _sum: { remaining: true }, orderBy: { price: "desc" }, take: 10 }) : [],
    athleteId ? prisma.scoutOrder.groupBy({ by: ["price"], where: { ...visibleScoutOrders(athleteId), side: "SELL" }, _sum: { remaining: true }, orderBy: { price: "asc" }, take: 10 }) : [],
    athleteId ? prisma.priceSnapshot.findMany({ where: { athleteId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 240 }) : [],
  ]);
  const referenceValue = positions.reduce((sum, p) => sum + Number(p.quantity) * Number(p.athlete.currentPrice), 0);
  const availableCash = Number(account.balance.sub(account.reservedCash));
  const position = positions.find(p => p.athleteId === athleteId);
  const availableShares = position ? Number(position.quantity.sub(position.reservedQuantity)) : 0;
  const open = !!(selected?.status === "ACTIVE" && selected.athlete.active && selected.athlete.marketEnabled && !control?.sandboxPaused);
  const price = Number(selected?.athlete.currentPrice || 0), previous = Number(selected?.athlete.previousPrice || 0);
  const athleteChoices = instruments.map(i => ({ id:i.athleteId, name:i.athlete.name, sport:i.athlete.sport, team:i.athlete.team, price:Number(i.athlete.currentPrice), previous:Number(i.athlete.previousPrice) }));
  const chartPoints = [...history].reverse().map(p => ({ time: p.createdAt.toISOString(), price: Number(p.price) }));
  if (selected && (!chartPoints.length || selected.athlete.updatedAt.getTime() > new Date(chartPoints[chartPoints.length - 1].time).getTime())) chartPoints.push({ time: selected.athlete.updatedAt.toISOString(), price });
  const book = (title: string, levels: typeof bids, sell = false) => {
    const maxQuantity = Math.max(1, ...levels.map(l => Number(l._sum.remaining || 0)));
    return <div><div className={styles.depthTitle}><strong className={sell ? styles.negative : styles.positive}>{title}</strong><span>Shares</span></div>{!open ? <p className={styles.empty}>Trading paused</p> : !levels.length ? <p className={styles.empty}>No resting {sell ? "asks" : "bids"}</p> : levels.map(l => <div className={styles.depthRow} key={String(l.price)}><i className={`${styles.depthFill} ${sell ? styles.askFill : ""}`} style={{ width: `${Number(l._sum.remaining || 0) / maxQuantity * 100}%` }} aria-hidden="true"/><strong className={sell ? styles.negative : styles.positive}>{money(l.price)}</strong><span>{Number(l._sum.remaining).toFixed(2)}</span></div>)}</div>;
  };
  const positionsPanel = !positions.length ? <p className={styles.empty}>Your positions will appear here. Buy shares from another tester or claim the one-time test allocation.</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Athlete</th><th>Shares</th><th>Available</th><th>Held for sells</th><th>Cost basis</th><th>Reference value</th></tr></thead><tbody>{positions.map(p => <tr key={p.id}><td><Link href={`/real-market/test?athlete=${encodeURIComponent(p.athleteId)}`}>{p.athlete.name}</Link><small>{p.athlete.sport} · {p.athlete.team}</small></td><td>{Number(p.quantity).toFixed(2)}</td><td>{Number(p.quantity.sub(p.reservedQuantity)).toFixed(2)}</td><td>{Number(p.reservedQuantity).toFixed(2)}</td><td>{money(p.costBasis)}</td><td>{money(Number(p.quantity) * Number(p.athlete.currentPrice))}</td></tr>)}</tbody></table></div>;
  const ordersPanel = !orders.length ? <p className={styles.empty}>No orders yet. Place a funded limit order to get started.</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Athlete</th><th>Side</th><th>Limit price</th><th>Filled / total</th><th>Status</th><th>Cash held</th><th>Fee paid</th><th></th></tr></thead><tbody>{orders.map(o => <tr key={o.id}><td>{o.athlete.name}</td><td className={o.side === "BUY" ? styles.positive : styles.negative}>{o.side}</td><td>{money(o.price)}</td><td>{Number(o.quantity.sub(o.remaining)).toFixed(2)} / {Number(o.quantity).toFixed(2)}</td><td><span className={styles.status}>{o.status}</span>{o.cancelReason && <small>{o.cancelReason}</small>}</td><td>{money(o.cashHold)}</td><td>{money(o.feePaid)}</td><td>{["OPEN", "PARTIAL"].includes(o.status) && <form action={action} method="post"><input type="hidden" name="action" value="CANCEL"/><input type="hidden" name="orderId" value={o.id}/><input type="hidden" name="athleteId" value={o.athleteId}/><button>Cancel remainder</button></form>}</td></tr>)}</tbody></table></div>;
  const fillsPanel = !fills.length ? <p className={styles.empty}>No completed trades yet. A fill appears when your order matches another customer.</p> : <div className={styles.ledgerList}>{fills.map(f => <div key={f.id} className={styles.ledgerRow}><div><strong>{f.buyOrder.athlete.name}</strong><small>{f.buyOrder.userId === user.id ? "Bought" : "Sold"} {Number(f.quantity).toFixed(2)} shares at {money(f.price)}</small></div><div className={styles.ledgerValue}><strong>{money(f.gross)}</strong><small>Fee {money(f.buyOrder.userId === user.id ? f.buyFee : f.sellFee)}{f.sellOrder.userId === user.id ? ` · Realized test P/L ${money(f.sellerPnl)}` : ""}</small></div></div>)}</div>;
  const auditPanel = !entries.length ? <p className={styles.empty}>Your funding, holds, fills, and fees will appear here.</p> : <div className={styles.ledgerList}>{entries.map(e => <div key={e.id} className={styles.ledgerRow}><div><strong>{e.type.replaceAll("_", " ")}</strong><small>Cash held after event: {money(e.reservedAfter)}</small></div><div className={styles.ledgerValue}><strong>{money(e.amount)}</strong><small>Balance {money(e.balance)}</small></div></div>)}</div>;
  return <main className={styles.dashboard}>
    <header className={styles.topline}><div><span className={styles.eyebrow}>Your trading workspace</span><h1>Real Market</h1></div><span className={styles.testPill}>Test account · Fake money</span></header>
    {params.notice && <div role="status" className={styles.notice}>{params.notice}</div>}{params.error && <div role="alert" className={`${styles.notice} ${styles.error}`}>{params.error}</div>}
    <section className={styles.summary} aria-label="Account overview"><div className={styles.summaryMetric}><span>Test portfolio value</span><strong>{money(Number(account.balance) + referenceValue)}</strong><small>Test cash + reference holdings value</small></div><div className={styles.summaryMetric}><span>Buying power</span><strong>{money(availableCash)}</strong></div><div className={styles.summaryMetric}><span>Cash held</span><strong>{money(account.reservedCash)}</strong></div><div className={styles.summaryMetric}><span>Holdings reference</span><strong>{money(referenceValue)}</strong></div><a className={styles.summaryLink} href="#test-funding">Manage test cash</a></section>
    <MobileAthletePicker selected={athleteId} athletes={athleteChoices}/>
    <div className={styles.workspace}>
      <section className={styles.asset} aria-label="Selected athlete">{selected ? <>
        <header className={styles.assetHeader}><div><h2 className={styles.assetName}>{selected.athlete.name}</h2><p className={styles.assetMeta}>{selected.athlete.sport} · {selected.athlete.team} · {selected.athlete.position}</p></div><span className={`${styles.marketState} ${!open ? styles.paused : ""}`}>{open ? "Market open" : "Orders paused"}</span></header>
        <ReferenceChart key={selected.athleteId} name={selected.athlete.name} points={chartPoints} currentPrice={price} previousPrice={previous}/>
        <section className={styles.orderBook}><div className={styles.orderBookHeader}><h2>Order book</h2><Link className={styles.refresh} href={`/real-market/test?athlete=${encodeURIComponent(selected.athleteId)}`}>Refresh</Link></div><div className={styles.depthColumns}>{book("Buy bids", bids)}{book("Sell asks", asks, true)}</div><p className={styles.caption}>Funded customer orders · Top 10 price levels · Best price, then arrival time</p></section>
        <div className={styles.allocation}><div><h3>Practice with test shares</h3><p>One-time allocation of 10 simulated shares per athlete.</p></div>{grant ? <span>Allocation claimed</span> : <form action={action} method="post"><input type="hidden" name="action" value="GRANT"/><input type="hidden" name="athleteId" value={selected.athleteId}/><button disabled={!open}>Claim 10 test shares</button></form>}</div>
      </> : <p className={styles.empty}>The test market is being prepared. Check back shortly.</p>}</section>
      {selected && <OrderTicket key={selected.athleteId} athleteId={selected.athleteId} name={selected.athlete.name} price={price} availableCash={availableCash} availableShares={availableShares} bestBid={bids.length ? Number(bids[0].price) : null} bestAsk={asks.length ? Number(asks[0].price) : null} open={open} buyKey={randomUUID()} sellKey={randomUUID()}/>}
      <AthleteList selected={athleteId} athletes={athleteChoices}/>
    </div>
    <ActivityTabs initialActive={params.notice?.startsWith("Order ") ? 1 : 0} panels={[{ label:"Positions", count:positions.length, content:positionsPanel },{ label:"Orders", count:orders.length, content:ordersPanel },{ label:"Fills", count:fills.length, content:fillsPanel },{ label:"Cash activity", count:entries.length, content:auditPanel }]}/>
    <details className={styles.funding}><summary>Manage test cash</summary><div className={styles.fundingForms} id="test-funding">{cashForm("DEPOSIT")}{cashForm("WITHDRAWAL")}</div></details>
    <footer className={styles.footer}>This is a simulated customer market. Cash, shares, fees, and withdrawals have no real monetary value. Reference prices are research valuations, not guaranteed sale or redemption prices. Test balances are separate from Free Market. Real-money trading remains disabled.</footer>
  </main>;
}
