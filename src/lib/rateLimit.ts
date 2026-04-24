/**
 * Rate Limiter — In-Memory Token Bucket
 *
 * Provides per-identifier rate limiting for API endpoints.
 * Uses a token bucket algorithm with configurable capacity
 * and refill rate.
 *
 * Sufficient for single-instance testnet — swap with Redis
 * for multi-instance production deployments.
 */

import { NextResponse } from 'next/server';

// ── Configuration ───────────────────────────────────────────

export interface RateLimitOptions {
  /** Maximum number of tokens (requests) in the bucket */
  maxTokens: number;
  /** Tokens added per second */
  refillRate: number;
  /** Identifier prefix for namespace isolation */
  prefix?: string;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

// ── Default profiles ────────────────────────────────────────

export const RATE_LIMITS = {
  /** Swarm run endpoints — expensive operations */
  write: { maxTokens: 10, refillRate: 10 / 60, prefix: 'write' } as RateLimitOptions,
  /** Read-only endpoints — status, jobs listing */
  read: { maxTokens: 60, refillRate: 60 / 60, prefix: 'read' } as RateLimitOptions,
  /** Admin endpoints */
  admin: { maxTokens: 5, refillRate: 5 / 60, prefix: 'admin' } as RateLimitOptions,
} as const;

// ── Store ───────────────────────────────────────────────────

const buckets = new Map<string, Bucket>();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  // Remove buckets that haven't been used in 10 minutes
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > 10 * 60 * 1000) {
      buckets.delete(key);
    }
  }
}

// ── Core ────────────────────────────────────────────────────

/**
 * Check if a request is allowed under the rate limit.
 *
 * @param identifier - Unique identifier (e.g., IP address, API key)
 * @param options - Rate limit configuration
 * @returns Object with `allowed` flag and `retryAfterMs` if blocked
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = RATE_LIMITS.write
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  cleanup();

  const key = `${options.prefix ?? 'default'}:${identifier}`;
  const now = Date.now();

  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: options.maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(
    options.maxTokens,
    bucket.tokens + elapsed * options.refillRate
  );
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      retryAfterMs: 0,
    };
  }

  // Calculate when the next token will be available
  const deficit = 1 - bucket.tokens;
  const retryAfterMs = Math.ceil((deficit / options.refillRate) * 1000);

  return {
    allowed: false,
    remaining: 0,
    retryAfterMs,
  };
}

/**
 * Extract client identifier from a request (IP address or fallback).
 */
export function getClientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'anonymous';
}

/**
 * Create a 429 Too Many Requests response.
 */
export function rateLimitResponse(retryAfterMs: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests',
      retryAfterMs,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
        'X-RateLimit-Reset': new Date(Date.now() + retryAfterMs).toISOString(),
      },
    }
  );
}
