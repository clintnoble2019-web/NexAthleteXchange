import { prisma } from "@/lib/prisma";

export function startOfCurrentWeekUtc(now = new Date()) {
  const value = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = value.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  value.setUTCDate(value.getUTCDate() - daysSinceMonday);
  return value;
}

export function portfolioValue(
  walletBalance: number,
  positions: Array<{ quantity: unknown; athlete: { currentPrice: unknown } }>,
) {
  return walletBalance + positions.reduce(
    (sum, position) => sum + Number(position.quantity) * Number(position.athlete.currentPrice),
    0,
  );
}

export async function snapshotWeeklyBaselines(now = new Date()) {
  const weekStart = startOfCurrentWeekUtc(now);
  const users = await prisma.user.findMany({
    where: { accountFrozen: false, leaderboardEligible: true },
    include: {
      wallet: true,
      positions: { include: { athlete: { select: { currentPrice: true } } } },
    },
  });

  if (!users.length) return { weekStart, created: 0 };

  const rows = users.map((user) => ({
    userId: user.id,
    weekStart,
    startValue: portfolioValue(Number(user.wallet?.balance || 0), user.positions),
  }));

  const result = await prisma.weeklyPortfolioBaseline.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return { weekStart, created: result.count };
}

export async function loadWeeklyLeaderboard(limit = 100) {
  const weekStart = startOfCurrentWeekUtc();
  const users = await prisma.user.findMany({
    where: { accountFrozen: false, leaderboardEligible: true },
    include: {
      wallet: true,
      positions: { include: { athlete: { select: { currentPrice: true } } } },
      weeklyBaselines: { where: { weekStart }, take: 1 },
    },
  });

  return users
    .map((user) => {
      const currentValue = portfolioValue(Number(user.wallet?.balance || 0), user.positions);
      const startValue = Number(user.weeklyBaselines[0]?.startValue || 5000);
      const weeklyPnl = currentValue - startValue;
      const weeklyReturn = startValue > 0 ? weeklyPnl / startValue * 100 : 0;
      return {
        userId: user.id,
        username: user.username,
        currentValue,
        startValue,
        weeklyPnl,
        weeklyReturn,
        hasBaseline: Boolean(user.weeklyBaselines[0]),
      };
    })
    .sort((a, b) => b.weeklyReturn - a.weeklyReturn || b.currentValue - a.currentValue)
    .slice(0, limit);
}
