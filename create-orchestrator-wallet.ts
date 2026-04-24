import fs from "node:fs";
import path from "node:path";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const ENV_PATH = path.resolve(".env.local");
const HEX_32_BYTES = /^[a-fA-F0-9]{64}$/;

function upsertEnvVar(key: string, value: string): void {
  const nextLine = `${key}=${value}`;
  const raw = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  const lines = raw.split(/\r?\n/);

  const updated: string[] = [];
  let wroteKey = false;

  for (const line of lines) {
    if (line.trimStart().startsWith(`${key}=`)) {
      if (!wroteKey) {
        updated.push(nextLine);
        wroteKey = true;
      }
      continue;
    }
    updated.push(line);
  }

  if (!wroteKey) {
    if (updated.length > 0 && updated[updated.length - 1] !== "") {
      updated.push("");
    }
    updated.push(nextLine);
  }

  fs.writeFileSync(ENV_PATH, `${updated.join("\n").replace(/\n+$/, "")}\n`, "utf8");
}

function getRequiredApiKey(): string {
  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  if (!apiKey || apiKey.includes("your_circle_api_key_here")) {
    throw new Error("CIRCLE_API_KEY is missing or still set to a placeholder in .env.local");
  }
  return apiKey;
}

function getRequiredEntitySecret(): string {
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET?.trim();
  if (!entitySecret || !HEX_32_BYTES.test(entitySecret)) {
    throw new Error(
      "CIRCLE_ENTITY_SECRET must be a 32-byte hex value. Run setup-entity-secret.ts first."
    );
  }
  return entitySecret;
}

async function main() {
  const apiKey = getRequiredApiKey();
  const entitySecret = getRequiredEntitySecret();

  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });

  const walletSet = (await client.createWalletSet({
    name: `SEO Swarm Orchestrator ${Date.now()}`,
  })).data?.walletSet;

  if (!walletSet?.id) {
    throw new Error("Failed to create wallet set.");
  }

  const wallet = (await client.createWallets({
    walletSetId: walletSet.id,
    blockchains: ["ARC-TESTNET"],
    count: 1,
    accountType: "EOA",
  })).data?.wallets?.[0];

  if (!wallet?.id || !wallet.address) {
    throw new Error("Failed to create orchestrator wallet.");
  }

  upsertEnvVar("ORCHESTRATOR_WALLET_ID", wallet.id);

  console.log(`ORCHESTRATOR_WALLET_ID=${wallet.id}`);
  console.log(`Address: ${wallet.address}`);
  console.log("ORCHESTRATOR_WALLET_ID has been written to .env.local");
  console.log("Fund this address with testnet USDC from https://faucet.circle.com");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
