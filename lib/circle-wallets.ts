import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const DEFAULT_CIRCLE_API = "https://api.circle.com";
const WALLET_AUDIT_ACTION = "CIRCLE_WALLET_CREATED";
const TESTNET_CHAIN = "SOL-DEVNET";

export type CircleWalletRecord = {
  walletId: string;
  address: string;
  blockchain: string;
  walletSetId: string;
};

export type CircleTransaction = {
  id: string;
  state: string;
  transactionType?: string;
  operation?: string;
  walletId?: string;
  tokenId?: string;
  amounts?: string[];
  sourceAddress?: string;
  destinationAddress?: string;
  txHash?: string;
  errorReason?: string;
  transactionScreeningEvaluation?: { actions?: string[]; ruleName?: string };
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function circleBase() {
  return process.env.CIRCLE_API_BASE?.trim() || DEFAULT_CIRCLE_API;
}

export function circleBlockchain() {
  return process.env.CIRCLE_BLOCKCHAIN?.trim() || TESTNET_CHAIN;
}

export function circleConfigured() {
  return Boolean(
    process.env.CIRCLE_API_KEY?.trim() &&
    process.env.CIRCLE_ENTITY_SECRET?.trim() &&
    process.env.CIRCLE_WALLET_SET_ID?.trim() &&
    process.env.CIRCLE_USDC_TOKEN_ID?.trim(),
  );
}

export function assertCircleTestnet() {
  if (circleBlockchain() !== TESTNET_CHAIN) {
    throw new Error("NexGame Circle funding is locked to SOL-DEVNET while live funds are disabled.");
  }
}

function uuidFromSeed(seed: string) {
  const bytes = Buffer.from(crypto.createHash("sha256").update(seed).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function circleRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${circleBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${required("CIRCLE_API_KEY")}`,
      "Content-Type": "application/json",
      "X-Request-Id": crypto.randomUUID(),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (body as { message?: string })?.message || `Circle request failed (${response.status}).`;
    throw new Error(message);
  }
  return body as Record<string, any>;
}

async function entityPublicKey() {
  const response = await circleRequest("/v1/w3s/config/entity/publicKey");
  const key = String(response?.data?.publicKey || "");
  if (!key) throw new Error("Circle did not return an entity public key.");
  return key;
}

async function entitySecretCiphertext() {
  assertCircleTestnet();
  const secret = required("CIRCLE_ENTITY_SECRET");
  if (!/^[0-9a-fA-F]{64}$/.test(secret)) throw new Error("CIRCLE_ENTITY_SECRET must be a 32-byte hexadecimal secret.");
  const publicKey = await entityPublicKey();
  return crypto.publicEncrypt(
    {
      key: publicKey.includes("BEGIN PUBLIC KEY") ? publicKey : `-----BEGIN PUBLIC KEY-----\n${publicKey.match(/.{1,64}/g)?.join("\n") || publicKey}\n-----END PUBLIC KEY-----`,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(secret, "hex"),
  ).toString("base64");
}

export async function getCircleWalletRecord(userId: string): Promise<CircleWalletRecord | null> {
  const event = await prisma.adminAuditEvent.findFirst({
    where: { targetId: userId, action: WALLET_AUDIT_ACTION },
    orderBy: { createdAt: "desc" },
  });
  if (!event) return null;
  const details = event.details as Record<string, unknown>;
  const walletId = String(details.walletId || ""), address = String(details.address || ""), blockchain = String(details.blockchain || ""), walletSetId = String(details.walletSetId || "");
  if (!walletId || !address || !blockchain || !walletSetId) return null;
  return { walletId, address, blockchain, walletSetId };
}

export async function ensureCircleWallet(userId: string) {
  assertCircleTestnet();
  if (!circleConfigured()) throw new Error("Circle USDC funding is not configured.");
  const existing = await getCircleWalletRecord(userId);
  if (existing) return existing;
  const walletSetId = required("CIRCLE_WALLET_SET_ID");
  const blockchain = circleBlockchain();
  const response = await circleRequest("/v1/w3s/developer/wallets", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: uuidFromSeed(`nexgame-circle-wallet:${userId}:${walletSetId}:${blockchain}`),
      accountType: "EOA",
      blockchains: [blockchain],
      count: 1,
      walletSetId,
      entitySecretCiphertext: await entitySecretCiphertext(),
      metadata: [{ name: "NexGame Real Market", refId: userId }],
    }),
  });
  const wallet = response?.data?.wallets?.[0];
  const record = {
    walletId: String(wallet?.id || ""),
    address: String(wallet?.address || ""),
    blockchain: String(wallet?.blockchain || ""),
    walletSetId: String(wallet?.walletSetId || walletSetId),
  };
  if (!record.walletId || !record.address || record.blockchain !== blockchain) throw new Error("Circle returned an invalid Solana wallet response.");
  await prisma.adminAuditEvent.create({
    data: {
      actorId: userId,
      targetId: userId,
      action: WALLET_AUDIT_ACTION,
      reason: "Provider-controlled USDC deposit wallet created.",
      details: { provider: "CIRCLE", ...record, asset: "USDC", environment: "SANDBOX" },
    },
  });
  return record;
}

export async function getCircleWalletBalances(walletId: string) {
  assertCircleTestnet();
  const response = await circleRequest(`/v1/w3s/wallets/${encodeURIComponent(walletId)}/balances`);
  return (response?.data?.tokenBalances || []) as Array<{ amount: string; token: { id: string; blockchain: string; symbol?: string; isNative?: boolean; tokenAddress?: string } }>;
}

export async function getCircleUsdcBalance(walletId: string) {
  const tokenId = required("CIRCLE_USDC_TOKEN_ID");
  const balances = await getCircleWalletBalances(walletId);
  const usdc = balances.find(item => item.token?.id === tokenId && item.token?.blockchain === circleBlockchain());
  return usdc ? Number(usdc.amount) : 0;
}

export async function getCircleNativeSolBalance(walletId: string) {
  const balances = await getCircleWalletBalances(walletId);
  const sol = balances.find(item => item.token?.blockchain === circleBlockchain() && item.token?.isNative === true);
  return sol ? Number(sol.amount) : 0;
}

export function validSolanaAddress(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

export async function createCircleUsdcTransfer(input: { walletId: string; destinationAddress: string; amount: string; fundingId: string }) {
  assertCircleTestnet();
  if (!validSolanaAddress(input.destinationAddress)) throw new Error("Enter a valid Solana destination address.");
  if (!/^\d{1,7}(\.\d{1,6})?$/.test(input.amount) || Number(input.amount) <= 0) throw new Error("Enter a valid USDC amount.");
  const response = await circleRequest("/v1/w3s/developer/transactions/transfer", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: uuidFromSeed(`nexgame-circle-transfer:${input.fundingId}`),
      walletId: input.walletId,
      tokenId: required("CIRCLE_USDC_TOKEN_ID"),
      destinationAddress: input.destinationAddress,
      amounts: [input.amount],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      refId: input.fundingId,
      entitySecretCiphertext: await entitySecretCiphertext(),
    }),
  });
  const id = String(response?.data?.id || response?.data?.transaction?.id || "");
  if (!id) throw new Error("Circle did not return a transaction identifier.");
  return { id };
}

export async function getCircleTransaction(id: string): Promise<CircleTransaction> {
  const response = await circleRequest(`/v1/w3s/transactions/${encodeURIComponent(id)}`);
  const tx = response?.data?.transaction;
  if (!tx?.id || !tx?.state) throw new Error("Circle returned an invalid transaction response.");
  return tx as CircleTransaction;
}

export async function verifyCircleWebhook(rawBody: string, signature: string | null, keyId: string | null) {
  if (!signature || !keyId || !process.env.CIRCLE_API_KEY?.trim()) return false;
  if (!/^[0-9a-fA-F-]{36}$/.test(keyId)) return false;
  const response = await circleRequest(`/v2/notifications/publicKey/${encodeURIComponent(keyId)}`);
  if (response?.data?.algorithm !== "ECDSA_SHA_256") return false;
  const publicKeyBase64 = String(response?.data?.publicKey || "");
  if (!publicKeyBase64) return false;
  const der = Buffer.from(publicKeyBase64, "base64");
  let key: crypto.KeyObject;
  try {
    key = crypto.createPublicKey({ key: der, format: "der", type: "spki" });
  } catch {
    return false;
  }
  const signatureBytes = Buffer.from(signature, "base64");
  return crypto.verify("sha256", Buffer.from(rawBody, "utf8"), key, signatureBytes);
}
