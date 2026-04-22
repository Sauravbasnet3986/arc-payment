/**
 * Circle Developer-Controlled Wallets SDK — Client Initialization
 *
 * Singleton client instance configured from environment variables.
 * The SDK handles entity secret encryption, MPC key generation,
 * and idempotency automatically.
 *
 * @see https://developers.circle.com/wallets/dev-controlled
 */

import { env } from '@/lib/env';

// ── Types for Circle SDK ────────────────────────────────────
// These mirror the SDK's types so the rest of the codebase
// doesn't need to import directly from the SDK package until
// it's installed and configured.

export interface CircleClient {
  createWalletSet: (params: { name: string }) => Promise<unknown>;
  createWallets: (params: {
    blockchains: string[];
    count: number;
    walletSetId: string;
    metadata?: Array<{ name: string; refId: string }>;
  }) => Promise<unknown>;
  createTransaction: (params: {
    blockchain: string;
    walletId: string;
    destinationAddress: string;
    amount: string[];
    tokenAddress: string;
    fee: { type: string; config: { feeLevel: string } };
  }) => Promise<unknown>;
  getWalletTokenBalance: (params: { id: string }) => Promise<unknown>;
  listTransactions: (params: {
    walletIds: string[];
    txType?: string;
  }) => Promise<unknown>;
  getTransaction: (params: { id: string }) => Promise<unknown>;
  deriveWalletByAddress: (params: {
    sourceBlockchain: string;
    walletAddress: string;
  }) => Promise<unknown>;
}

// ── Client singleton ────────────────────────────────────────
let _client: CircleClient | null = null;

/**
 * Get or create the Circle SDK client.
 *
 * Usage:
 * ```ts
 * const client = await getCircleClient();
 * const wallets = await client.createWallets({ ... });
 * ```
 *
 * When CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET are not set,
 * this returns null — allowing the app to start without
 * Circle credentials during development.
 */
export async function getCircleClient(): Promise<CircleClient | null> {
  if (_client) return _client;

  if (!env.CIRCLE_API_KEY || !env.CIRCLE_ENTITY_SECRET) {
    console.warn(
      '⚠️  Circle SDK not initialized — CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET missing.'
    );
    return null;
  }

  try {
    // Dynamic import so the app doesn't crash if the SDK
    // package isn't installed yet.
    const { initiateDeveloperControlledWalletsClient } = await import(
      '@circle-fin/developer-controlled-wallets'
    );

    _client = initiateDeveloperControlledWalletsClient({
      apiKey: env.CIRCLE_API_KEY,
      entitySecret: env.CIRCLE_ENTITY_SECRET,
    }) as unknown as CircleClient;

    console.log('✅ Circle SDK client initialized');
    return _client;
  } catch (error) {
    console.error('❌ Failed to initialize Circle SDK:', error);
    return null;
  }
}

/**
 * Circle constants for Arc Testnet.
 */
export const CIRCLE_CONSTANTS = {
  BLOCKCHAIN: env.CIRCLE_WALLET_BLOCKCHAIN,
  USDC_TOKEN_ADDRESS: env.ARC_TESTNET_USDC,
  FEE_CONFIG: { type: 'level' as const, config: { feeLevel: 'MEDIUM' as const } },
} as const;
