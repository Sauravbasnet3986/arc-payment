/**
 * POST /api/v1/admin/wallets/setup
 *
 * Creates a Circle wallet set + 8 agent wallets on Arc Testnet.
 * Protected by ADMIN_SECRET header check.
 *
 * Returns the wallet addresses mapped to agent IDs so they
 * can be configured in the agent registry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { createAgentWallets } from '@/lib/circle/wallets';
import { checkRateLimit, getClientId, rateLimitResponse, RATE_LIMITS } from '@/lib/rateLimit';

function validateAdmin(request: NextRequest): boolean {
  if (!env.ADMIN_SECRET) return true; // No secret configured = open (dev mode)
  const header = request.headers.get('x-admin-secret');
  return header === env.ADMIN_SECRET;
}

export async function POST(request: NextRequest) {
  // Auth check
  if (!validateAdmin(request)) {
    return NextResponse.json(
      { error: 'Unauthorized — invalid or missing X-Admin-Secret header' },
      { status: 401 }
    );
  }

  // Rate limit
  const { allowed, retryAfterMs } = checkRateLimit(
    getClientId(request),
    RATE_LIMITS.admin
  );
  if (!allowed) return rateLimitResponse(retryAfterMs);

  // Check Circle credentials
  if (!env.CIRCLE_API_KEY || !env.CIRCLE_ENTITY_SECRET) {
    return NextResponse.json(
      {
        error: 'Circle credentials not configured',
        hint: 'Set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET in .env.local',
      },
      { status: 503 }
    );
  }

  try {
    const result = await createAgentWallets();

    return NextResponse.json({
      success: true,
      walletSetId: result.walletSetId,
      wallets: result.wallets,
      instructions: [
        'Copy the wallet addresses below into your agent registry (src/lib/agents/registry.ts)',
        'Fund each wallet with testnet USDC via faucet.circle.com',
        'Set ORCHESTRATOR_WALLET_ID in .env.local to the orchestrator wallet ID',
      ],
    });
  } catch (error) {
    console.error('Wallet setup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Wallet setup failed' },
      { status: 500 }
    );
  }
}
