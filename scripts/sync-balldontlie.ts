import { PrismaClient, Sport } from "@prisma/client";
import { getBdlActivePlayers, getBdlTeams, type BdlSport } from "../lib/balldontlie";

const prisma = new PrismaClient();

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function syncSport(sport: BdlSport) {
  const prismaSport = Sport[sport];
  const [teams, players] = await Promise.all([getBdlTeams(sport), getBdlActivePlayers(sport)]);

  for (const team of teams) {
    await prisma.team.upsert({
      where: { sport_abbreviation: { sport: prismaSport, abbreviation: team.abbreviation } },
      update: {
        providerKey: `bdl:${sport}:team:${team.id}`,
        dataProvider: "balldontlie",
        league: sport,
        name: team.name,
        city: team.city,
        conference: team.conference,
        division: team.division,
        active: true
      },
      create: {
        providerKey: `bdl:${sport}:team:${team.id}`,
        dataProvider: "balldontlie",
        sport: prismaSport,
        league: sport,
        name: team.name,
        abbreviation: team.abbreviation,
        city: team.city,
        conference: team.conference,
        division: team.division
      }
    });
  }

  let created = 0;
  let updated = 0;
  for (const player of players) {
    const providerKey = `bdl:${sport}:player:${player.id}`;
    const existing = await prisma.athlete.findFirst({
      where: { OR: [{ providerKey }, { sport: prismaSport, name: player.name }] }
    });

    if (existing) {
      await prisma.athlete.update({
        where: { id: existing.id },
        data: {
          providerKey,
          dataProvider: "balldontlie",
          league: sport,
          team: player.team.abbreviation,
          position: player.position,
          active: true
        }
      });
      updated++;
    } else {
      await prisma.athlete.create({
        data: {
          providerKey,
          dataProvider: "balldontlie",
          name: player.name,
          slug: `${sport.toLowerCase()}-${player.id}-${slugify(player.name)}`,
          sport: prismaSport,
          league: sport,
          team: player.team.abbreviation,
          position: player.position,
          currentPrice: 10,
          previousPrice: 10,
          performance: 50,
          active: true,
          marketEnabled: false
        }
      });
      created++;
    }
  }

  console.log(`${sport}: ${teams.length} teams synced, ${updated} existing players updated, ${created} roster players imported pending pricing.`);
}

async function main() {
  await syncSport("NBA");
  await syncSport("MLB");
}

main().finally(() => prisma.$disconnect());
