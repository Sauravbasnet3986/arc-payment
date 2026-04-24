/**
 * GET /api/v1/admin/wallets/balance
 *
 * Check the USDC balance of a specific wallet.
 * Used to verify wallets are funded before running swarm.
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { getWalletBalance } from '@/lib/circle/wallets';
import { checkRateLimit, getClientId, rateLimitResponse, RATE_LIMITS } from '@/lib/rateLimit';

function validateAdmin(request: NextRequest): boolean {
  if (!env.ADMIN_SECRET) return true;
  const header = request.headers.get('x-admin-secret');
  return header === env.ADMIN_SECRET;
}

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const walletId = searchParams.get('walletId');

  if (!walletId) {
    return NextResponse.json(
      { error: 'Missing walletId query parameter' },
      { status: 400 }
    );
  }

  if (!env.CIRCLE_API_KEY || !env.CIRCLE_ENTITY_SECRET) {
    return NextResponse.json(
      { error: 'Circle credentials not configured' },
      { status: 503 }
    );
  }

  try {
    const balances = await getWalletBalance(walletId);

    return NextResponse.json({
      walletId,
      balances,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
