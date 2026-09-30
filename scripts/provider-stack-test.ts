import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifyPersonaWebhook } from "../lib/persona";
import { assertCircleTestnet, validSolanaAddress } from "../lib/circle-wallets";

const priorPersonaSecret = process.env.PERSONA_WEBHOOK_SECRET;
const priorCircleChain = process.env.CIRCLE_BLOCKCHAIN;

try {
  process.env.PERSONA_WEBHOOK_SECRET = "provider-stack-test-secret";
  const raw = JSON.stringify({ data: { id: "evt_test", attributes: { name: "inquiry.approved" } } });
  const now = 1_800_000_000;
  const signature = crypto.createHmac("sha256", process.env.PERSONA_WEBHOOK_SECRET).update(`${now}.${raw}`).digest("hex");

  assert.equal(verifyPersonaWebhook(raw, `t=${now},v1=${signature}`, now), true, "valid Persona signature should pass");
  assert.equal(verifyPersonaWebhook(raw + " ", `t=${now},v1=${signature}`, now), false, "modified Persona payload should fail");
  assert.equal(verifyPersonaWebhook(raw, `t=${now - 301},v1=${signature}`, now), false, "stale Persona signature should fail");
  assert.equal(verifyPersonaWebhook(raw, `t=${now},v1=${"0".repeat(64)}`, now), false, "wrong Persona signature should fail");

  assert.equal(validSolanaAddress("11111111111111111111111111111111"), true, "valid base58 Solana address should pass");
  assert.equal(validSolanaAddress("0OIl-not-a-solana-address"), false, "invalid base58 Solana address should fail");

  process.env.CIRCLE_BLOCKCHAIN = "SOL-DEVNET";
  assert.doesNotThrow(() => assertCircleTestnet(), "Solana Devnet must be allowed");
  process.env.CIRCLE_BLOCKCHAIN = "SOL";
  assert.throws(() => assertCircleTestnet(), /locked to SOL-DEVNET/, "mainnet must be blocked while live funds are disabled");

  console.log("Provider stack security test: PASS (Persona signatures, replay window, Solana address validation, Circle mainnet lock)");
} finally {
  if (priorPersonaSecret === undefined) delete process.env.PERSONA_WEBHOOK_SECRET;
  else process.env.PERSONA_WEBHOOK_SECRET = priorPersonaSecret;
  if (priorCircleChain === undefined) delete process.env.CIRCLE_BLOCKCHAIN;
  else process.env.CIRCLE_BLOCKCHAIN = priorCircleChain;
}
