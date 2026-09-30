import { prisma } from "../lib/prisma";

async function main() {
  const now = new Date();
  const rateBefore = new Date(now.getTime() - 2 * 86400000);
  const tokenBefore = new Date(now.getTime() - 7 * 86400000);
  const [rateLimits, sessions, tokens] = await Promise.all([
    prisma.rateLimitWindow.deleteMany({ where: { windowStart: { lt: rateBefore } } }),
    prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: tokenBefore } } }),
  ]);
  console.log({ rateLimits: rateLimits.count, sessions: sessions.count, expiredResetTokens: tokens.count });
}
main().finally(() => prisma.$disconnect());
