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
import type { CircleDeveloperControlledWalletsClient, TokenBlockchain } from '@circle-fin/developer-controlled-wallets';

// Re-export the client type for use across the codebase
export type CircleClient = CircleDeveloperControlledWalletsClient;

// ── Client singleton ────────────────────────────────────────
let _client: CircleClient | null = null;

/**
 * Get or create the Circle SDK client.
 *
 * Usage:
 * ```ts
 * const client = await getCircleClient();
 * if (!client) { /* demo mode *\/ }
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
    const { initiateDeveloperControlledWalletsClient } = await import(
      '@circle-fin/developer-controlled-wallets'
    );

    _client = initiateDeveloperControlledWalletsClient({
      apiKey: env.CIRCLE_API_KEY,
      entitySecret: env.CIRCLE_ENTITY_SECRET,
    });

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
  BLOCKCHAIN: env.CIRCLE_WALLET_BLOCKCHAIN as TokenBlockchain,
  USDC_TOKEN_ADDRESS: env.ARC_TESTNET_USDC,
  FEE_CONFIG: { type: 'level' as const, config: { feeLevel: 'MEDIUM' as const } },
} as const;
