import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PricingInputs = {
  performanceScore: number;
  recentFormScore: number;
  marketDemandScore: number;
};

export const pricingConfig = {
  performanceWeight: 0.7,
  recentFormWeight: 0.2,
  marketDemandWeight: 0.1,
  maxDailyMovePct: 0.12,
};

export function calculateNextPrice(currentPrice: number, inputs: PricingInputs) {
  const normalized =
    ((inputs.performanceScore - 50) / 50) * pricingConfig.performanceWeight +
    ((inputs.recentFormScore - 50) / 50) * pricingConfig.recentFormWeight +
    ((inputs.marketDemandScore - 50) / 50) * pricingConfig.marketDemandWeight;

  const bounded = Math.max(-pricingConfig.maxDailyMovePct, Math.min(pricingConfig.maxDailyMovePct, normalized * 0.05));
  return Math.max(1, Number((currentPrice * (1 + bounded)).toFixed(2)));
}

export async function repriceAthlete(athleteId: string, inputs: PricingInputs) {
  return prisma.$transaction(async (tx) => {
    const athlete = await tx.athlete.findUnique({ where: { id: athleteId } });
    if (!athlete) throw new Error("Athlete not found");

    const nextPrice = calculateNextPrice(Number(athlete.currentPrice), inputs);
    const updated = await tx.athlete.update({
      where: { id: athleteId },
      data: { previousPrice: athlete.currentPrice, currentPrice: new Prisma.Decimal(nextPrice) }
    });
    await tx.priceSnapshot.create({ data: { athleteId, price: updated.currentPrice } });
    return updated;
  });
}
