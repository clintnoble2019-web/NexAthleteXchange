import { PrismaClient, Sport } from "@prisma/client";
const prisma = new PrismaClient();

const athletes = [
  { name: "Nikola Jokic", slug: "nikola-jokic", sport: Sport.NBA, team: "DEN", position: "C", currentPrice: 57.60, previousPrice: 56.90, performance: 98 },
  { name: "Shai Gilgeous-Alexander", slug: "shai-gilgeous-alexander", sport: Sport.NBA, team: "OKC", position: "G", currentPrice: 55.20, previousPrice: 54.35, performance: 98 },
  { name: "Luka Doncic", slug: "luka-doncic", sport: Sport.NBA, team: "LAL", position: "G", currentPrice: 52.80, previousPrice: 52.10, performance: 96 },
  { name: "Giannis Antetokounmpo", slug: "giannis-antetokounmpo", sport: Sport.NBA, team: "MIL", position: "F", currentPrice: 50.40, previousPrice: 49.75, performance: 96 },
  { name: "Victor Wembanyama", slug: "victor-wembanyama", sport: Sport.NBA, team: "SAS", position: "C", currentPrice: 47.90, previousPrice: 46.80, performance: 95 },
  { name: "Anthony Edwards", slug: "anthony-edwards", sport: Sport.NBA, team: "MIN", position: "G", currentPrice: 43.25, previousPrice: 42.70, performance: 93 },
  { name: "Stephen Curry", slug: "stephen-curry", sport: Sport.NBA, team: "GSW", position: "G", currentPrice: 41.60, previousPrice: 40.95, performance: 92 },
  { name: "Jayson Tatum", slug: "jayson-tatum", sport: Sport.NBA, team: "BOS", position: "F", currentPrice: 40.80, previousPrice: 40.20, performance: 92 },
  { name: "Shohei Ohtani", slug: "shohei-ohtani", sport: Sport.MLB, team: "LAD", position: "DH/SP", currentPrice: 58.20, previousPrice: 56.85, performance: 98 },
  { name: "Aaron Judge", slug: "aaron-judge", sport: Sport.MLB, team: "NYY", position: "OF", currentPrice: 52.40, previousPrice: 51.70, performance: 96 },
  { name: "Bobby Witt Jr.", slug: "bobby-witt-jr", sport: Sport.MLB, team: "KC", position: "SS", currentPrice: 41.85, previousPrice: 40.90, performance: 92 },
  { name: "Juan Soto", slug: "juan-soto", sport: Sport.MLB, team: "NYM", position: "OF", currentPrice: 44.15, previousPrice: 43.80, performance: 94 },
  { name: "Paul Skenes", slug: "paul-skenes", sport: Sport.MLB, team: "PIT", position: "SP", currentPrice: 38.60, previousPrice: 37.20, performance: 95 },
  { name: "Julio Rodriguez", slug: "julio-rodriguez", sport: Sport.MLB, team: "SEA", position: "OF", currentPrice: 31.75, previousPrice: 32.10, performance: 86 },
  { name: "Gunnar Henderson", slug: "gunnar-henderson", sport: Sport.MLB, team: "BAL", position: "SS", currentPrice: 39.10, previousPrice: 38.45, performance: 91 },
  { name: "Vladimir Guerrero Jr.", slug: "vladimir-guerrero-jr", sport: Sport.MLB, team: "TOR", position: "1B", currentPrice: 34.55, previousPrice: 33.90, performance: 89 }
];

const teamNames: Record<string, string> = {
  DEN: "Denver Nuggets", OKC: "Oklahoma City Thunder", LAL: "Los Angeles Lakers", MIL: "Milwaukee Bucks",
  SAS: "San Antonio Spurs", MIN: "Minnesota Timberwolves", GSW: "Golden State Warriors", BOS: "Boston Celtics",
  LAD: "Los Angeles Dodgers", NYY: "New York Yankees", KC: "Kansas City Royals", NYM: "New York Mets",
  PIT: "Pittsburgh Pirates", SEA: "Seattle Mariners", BAL: "Baltimore Orioles", TOR: "Toronto Blue Jays"
};

async function main() {
  for (const athleteData of athletes) {
    await prisma.team.upsert({
      where: { sport_abbreviation: { sport: athleteData.sport, abbreviation: athleteData.team } },
      update: { name: teamNames[athleteData.team], league: athleteData.sport, active: true },
      create: { sport: athleteData.sport, league: athleteData.sport, abbreviation: athleteData.team, name: teamNames[athleteData.team] }
    });

    const athlete = await prisma.athlete.upsert({
      where: { slug: athleteData.slug },
      update: { ...athleteData, league: athleteData.sport, active: true, marketEnabled: true },
      create: { ...athleteData, league: athleteData.sport, marketEnabled: true }
    });

    if ((await prisma.priceSnapshot.count({ where: { athleteId: athlete.id } })) === 0) {
      for (const [index, multiplier] of [0.91, 0.93, 0.95, 0.94, 0.97, 0.99, 1.00].entries()) {
        await prisma.priceSnapshot.create({
          data: {
            athleteId: athlete.id,
            price: Number((Number(athleteData.currentPrice) * multiplier).toFixed(4)),
            source: "seed-history",
            createdAt: new Date(Date.now() - (6 - index) * 86400000)
          }
        });
      }
    }
  }
}

main().finally(() => prisma.$disconnect());
