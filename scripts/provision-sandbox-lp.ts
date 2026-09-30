import { PrismaClient, RealMarketEnvironment } from "@prisma/client";
import {
  createSandboxLiquidityProvider,
  setSandboxProviderInventory,
  syncSandboxRealMarketUniverse,
} from "../lib/liquidity-provider-sandbox";

const prisma = new PrismaClient();

async function main() {
  const code = (process.env.LP_CODE || "").trim();
  const name = (process.env.LP_NAME || "").trim();
  if (!code || !name) throw new Error("Set LP_CODE and LP_NAME before provisioning a sandbox liquidity provider.");

  const initialCash = Number(process.env.LP_INITIAL_CASH || "100000");
  const inventoryPerInstrument = Number(process.env.LP_INVENTORY_PER_INSTRUMENT || "100");
  const ipAllowlist = (process.env.LP_IP_ALLOWLIST || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const universe = await syncSandboxRealMarketUniverse();
  const { provider, apiKey } = await createSandboxLiquidityProvider({
    code,
    name,
    initialCash,
    ipAllowlist,
    maxSpreadBps: Number(process.env.LP_MAX_SPREAD_BPS || "500"),
    minQuoteDepth: Number(process.env.LP_MIN_QUOTE_DEPTH || "100"),
    maxGrossExposure: Number(process.env.LP_MAX_GROSS_EXPOSURE || "100000"),
    maxPerAthleteExposure: Number(process.env.LP_MAX_PER_ATHLETE_EXPOSURE || "10000"),
    quoteTtlSeconds: Number(process.env.LP_QUOTE_TTL_SECONDS || "30"),
  });

  const instruments = await prisma.realMarketInstrument.findMany({
    where: { environment: RealMarketEnvironment.SANDBOX },
    select: { id: true },
  });
  for (const instrument of instruments) {
    await setSandboxProviderInventory(provider.id, instrument.id, inventoryPerInstrument);
  }

  console.log("Sandbox LP provisioned.");
  console.log("Universe:", universe);
  console.log("Provider:", provider.code, provider.name);
  console.log("Sandbox API key (shown once):", apiKey);
  console.log("Store this sandbox key securely. Only its SHA-256 hash is stored in the database.");
}

main().finally(() => prisma.$disconnect());
