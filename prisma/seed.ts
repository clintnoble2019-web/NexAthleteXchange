import { PrismaClient, Sport } from "@prisma/client";
const prisma = new PrismaClient();

const athletes = [
  ["Shohei Ohtani", "shohei-ohtani", "LAD", "DH/SP", 58.20, 56.85, 98],
  ["Aaron Judge", "aaron-judge", "NYY", "OF", 52.40, 51.70, 96],
  ["Bobby Witt Jr.", "bobby-witt-jr", "KC", "SS", 41.85, 40.90, 92],
  ["Juan Soto", "juan-soto", "NYM", "OF", 44.15, 43.80, 94],
  ["Paul Skenes", "paul-skenes", "PIT", "SP", 38.60, 37.20, 95],
  ["Julio Rodriguez", "julio-rodriguez", "SEA", "OF", 31.75, 32.10, 86],
  ["Gunnar Henderson", "gunnar-henderson", "BAL", "SS", 39.10, 38.45, 91],
  ["Vladimir Guerrero Jr.", "vladimir-guerrero-jr", "TOR", "1B", 34.55, 33.90, 89]
] as const;

async function main() {
  for (const [name, slug, team, position, currentPrice, previousPrice, performance] of athletes) {
    await prisma.athlete.upsert({
      where: { slug },
      update: { currentPrice, previousPrice, performance, team, position, active: true },
      create: { name, slug, sport: Sport.MLB, league: "MLB", team, position, currentPrice, previousPrice, performance }
    });
  }
}
main().finally(() => prisma.$disconnect());
