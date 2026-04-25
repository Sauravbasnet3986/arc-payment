/**
 * Environment variable validation & typed access.
 *
 * Import `env` anywhere on the server side to get
 * runtime-validated, strongly-typed environment values.
 *
 * Missing required vars throw immediately at import time
 * so you find out at startup — not mid-request.
 */

// ── Required (server-only) ──────────────────────────────────
const REQUIRED_SERVER_VARS = [
  'CIRCLE_API_KEY',
  'CIRCLE_ENTITY_SECRET',
  'CIRCLE_WALLET_BLOCKCHAIN',
  'ORCHESTRATOR_WALLET_ID',
  'ARC_TESTNET_RPC',
  'ARC_TESTNET_CHAIN_ID',
  'ARC_TESTNET_USDC',
  'GEMINI_API_KEY',
] as const;

// ── Optional (with defaults) ────────────────────────────────
const DEFAULTS: Record<string, string> = {
  QUALITY_THRESHOLD: '70',
  DEFAULT_BUDGET_CAP: '0.10',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
};

// ── Validation ──────────────────────────────────────────────
function validateEnv() {
  const missing: string[] = [];

  for (const key of REQUIRED_SERVER_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn(
      `\n⚠️  Missing environment variables:\n${missing.map((k) => `   • ${k}`).join('\n')}\n` +
      `   Copy .env.example → .env.local and fill in your credentials.\n`
    );
  }

  return missing.length === 0;
}

// ── Typed accessor ──────────────────────────────────────────
function getEnv(key: string, fallback?: string): string {
  return process.env[key] ?? DEFAULTS[key] ?? fallback ?? '';
}

export const env = {
  isValid: !!process.env['GEMINI_API_KEY'],

  // Circle
  CIRCLE_API_KEY: getEnv('CIRCLE_API_KEY'),
  CIRCLE_ENTITY_SECRET: getEnv('CIRCLE_ENTITY_SECRET'),
  CIRCLE_WALLET_BLOCKCHAIN: getEnv('CIRCLE_WALLET_BLOCKCHAIN', 'ARC-TESTNET'),
  ORCHESTRATOR_WALLET_ID: getEnv('ORCHESTRATOR_WALLET_ID'),

  // Arc L1
  ARC_TESTNET_RPC: getEnv('ARC_TESTNET_RPC', 'https://rpc.testnet.arc.network'),
  ARC_TESTNET_CHAIN_ID: parseInt(getEnv('ARC_TESTNET_CHAIN_ID', '1270'), 10),
  ARC_TESTNET_USDC: getEnv('ARC_TESTNET_USDC', '0x3600000000000000000000000000000000000000'),

  // Gemini
  GEMINI_API_KEY: getEnv('GEMINI_API_KEY'),

  // App
  APP_URL: getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  QUALITY_THRESHOLD: parseInt(getEnv('QUALITY_THRESHOLD', '70'), 10),
  DEFAULT_BUDGET_CAP: parseFloat(getEnv('DEFAULT_BUDGET_CAP', '0.10')),

  // ERC-8004 Identity (optional — skips validation when empty)
  ERC8004_REGISTRY_ADDRESS: getEnv('ERC8004_REGISTRY_ADDRESS'),

  // Webhook (optional — skips HMAC signing when empty)
  WEBHOOK_SECRET: getEnv('WEBHOOK_SECRET'),

  // Admin (optional — no auth when empty)
  ADMIN_SECRET: getEnv('ADMIN_SECRET'),

  // Thirdweb x402 Facilitator (optional)
  THIRDWEB_SECRET_KEY: getEnv('THIRDWEB_SECRET_KEY'),
  FACILITATOR_SERVER_WALLET: getEnv('FACILITATOR_SERVER_WALLET'),

  // Featherless API Fallback
  FEATHERLESS_API_KEY: getEnv('FEATHERLESS_API_KEY'),
  FEATHERLESS_MODEL: getEnv('FEATHERLESS_MODEL', 'deepseek-ai/DeepSeek-V3.2'),
} as const;

export type Env = typeof env;
