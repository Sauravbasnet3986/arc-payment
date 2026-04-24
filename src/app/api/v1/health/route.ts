/**
 * GET /api/v1/health
 *
 * System readiness probe. Returns the health status of
 * all external dependencies: Circle SDK, Gemini API, Arc RPC.
 */

import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

export async function GET() {
  const checks: Record<string, HealthCheck> = {};

  // 1. Environment validation
  checks.environment = env.isValid
    ? { status: 'pass', message: 'All required env vars present' }
    : { status: 'warn', message: 'Missing env vars — running in demo mode' };

  // 2. Circle SDK
  if (env.CIRCLE_API_KEY && env.CIRCLE_ENTITY_SECRET) {
    try {
      const { getCircleClient } = await import('@/lib/circle/client');
      const client = await getCircleClient();
      checks.circle = client
        ? { status: 'pass', message: 'Circle SDK initialized' }
        : { status: 'fail', message: 'Circle SDK failed to initialize' };
    } catch (error) {
      checks.circle = {
        status: 'fail',
        message: `Circle SDK error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  } else {
    checks.circle = { status: 'warn', message: 'Circle credentials not configured' };
  }

  // 3. Gemini API key
  checks.gemini = env.GEMINI_API_KEY
    ? { status: 'pass', message: 'Gemini API key present' }
    : { status: 'warn', message: 'GEMINI_API_KEY not set — agents will fail' };

  // 4. Arc RPC
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(env.ARC_TESTNET_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      checks.arcRpc = {
        status: 'pass',
        message: `Arc RPC reachable (chainId: ${data.result ?? 'unknown'})`,
      };
    } else {
      checks.arcRpc = { status: 'fail', message: `Arc RPC returned ${res.status}` };
    }
  } catch (error) {
    checks.arcRpc = {
      status: 'fail',
      message: `Arc RPC unreachable: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }

  // 5. ERC-8004 registry
  checks.erc8004 = env.ERC8004_REGISTRY_ADDRESS
    ? { status: 'pass', message: `Registry: ${env.ERC8004_REGISTRY_ADDRESS.slice(0, 10)}…` }
    : { status: 'warn', message: 'ERC-8004 registry not configured (grace mode)' };

  // Determine overall status
  const statuses = Object.values(checks).map((c) => c.status);
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';

  if (statuses.every((s) => s === 'pass')) {
    overallStatus = 'healthy';
  } else if (statuses.some((s) => s === 'fail')) {
    overallStatus = 'unhealthy';
  } else {
    overallStatus = 'degraded';
  }

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      checks,
    },
    { status: statusCode }
  );
}
