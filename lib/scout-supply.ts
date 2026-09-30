export const scoutSupply = Object.freeze({
  totalPerAthlete: 100_000,
  housePerAthlete: 60_000,
  publicFloatPerAthlete: 20_000,
  liquidityReservePerAthlete: 15_000,
  treasuryPerAthlete: 5_000,
  houseCashPerSport: 2_000_000,
  targetVisibleNotional: 5_000,
  minVisibleDepth: 50,
  maxVisibleDepth: 250,
});

const allocated =
  scoutSupply.housePerAthlete +
  scoutSupply.publicFloatPerAthlete +
  scoutSupply.liquidityReservePerAthlete +
  scoutSupply.treasuryPerAthlete;

if (allocated !== scoutSupply.totalPerAthlete) {
  throw new Error(`Scout supply buckets must total ${scoutSupply.totalPerAthlete} shares.`);
}

export const scoutSystemUsers = Object.freeze({
  publicFloat: "nex_public_float",
  liquidityReserve: "nex_liquidity_reserve",
  treasury: "nex_treasury",
  houseNBA: "nex_house_nba",
  houseNFL: "nex_house_nfl",
  houseMLB: "nex_house_mlb",
});

export function scoutHouseUsername(sport: string) {
  switch (sport) {
    case "NBA": return scoutSystemUsers.houseNBA;
    case "NFL": return scoutSystemUsers.houseNFL;
    case "MLB": return scoutSystemUsers.houseMLB;
    default: throw new Error(`No sandbox House market maker is configured for ${sport}.`);
  }
}

export function visibleQuoteDepth(referencePrice: number, multiplier = 1) {
  const raw = Math.round((scoutSupply.targetVisibleNotional / Math.max(referencePrice, 0.01)) * multiplier);
  return Math.max(scoutSupply.minVisibleDepth, Math.min(scoutSupply.maxVisibleDepth, raw));
}

function floorCent(value: number) {
  return Math.max(0.01, Math.floor((value + Number.EPSILON) * 100) / 100);
}

function ceilCent(value: number) {
  return Math.max(0.01, Math.ceil((value - Number.EPSILON) * 100) / 100);
}

export function houseQuoteLevels(referencePrice: number) {
  const reference = Math.max(referencePrice, 0.01);
  const halfSpread = Math.max(0.05, reference * 0.0025);
  return {
    // The displayed/reference price is executable for normal customer buys.
    // Deeper House inventory remains above reference so larger orders still experience slippage.
    bid1: floorCent(reference - halfSpread),
    bid2: floorCent(reference - halfSpread * 2.25),
    ask1: ceilCent(reference),
    ask2: ceilCent(reference + halfSpread),
    depth1: visibleQuoteDepth(reference),
    depth2: visibleQuoteDepth(reference, 1.5),
  };
}
