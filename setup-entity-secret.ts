import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

const ENV_PATH = path.resolve(".env.local");
const OUTPUT_DIR = path.resolve("./output");
const HEX_32_BYTES = /^[a-fA-F0-9]{64}$/;

type CircleApiError = Error & {
  code?: number;
  status?: number;
};

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

async function main() {
  const apiKey = getRequiredApiKey();
  const existingSecret = process.env.CIRCLE_ENTITY_SECRET?.trim();

  if (existingSecret && HEX_32_BYTES.test(existingSecret)) {
    console.log("CIRCLE_ENTITY_SECRET already set in environment. Skipping registration.");
    return;
  }

  const entitySecret = crypto.randomBytes(32).toString("hex");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  try {
    await registerEntitySecretCiphertext({
      apiKey,
      entitySecret,
      recoveryFileDownloadPath: OUTPUT_DIR,
    });
  } catch (error) {
    const circleError = error as CircleApiError;
    if (circleError.status === 409 || circleError.code === 156015) {
      throw new Error(
        "Circle entity secret is already configured for this API key. Reuse the original CIRCLE_ENTITY_SECRET from your secure backup."
      );
    }
    throw error;
  }

  upsertEnvVar("CIRCLE_ENTITY_SECRET", entitySecret);
  console.log("Entity secret registered and written to .env.local");
  console.log("Back up the recovery file in ./output/ securely.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
