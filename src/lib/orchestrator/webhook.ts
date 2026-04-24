/**
 * Webhook Emitter — Fire-and-Forget Job Completion Notifications
 *
 * POSTs a WebhookPayload to the user-provided URL when a
 * swarm job completes. Includes HMAC-SHA256 signature for
 * verification and retries with exponential backoff.
 */

import type { WebhookPayload } from '@/types/swarm';

// ── Configuration ───────────────────────────────────────────
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const TIMEOUT_MS = 10_000;

/**
 * Compute HMAC-SHA256 signature for webhook payload verification.
 * Returns null if no WEBHOOK_SECRET is configured.
 */
async function computeSignature(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Emit a webhook notification for a completed job.
 *
 * - POSTs JSON to the target URL
 * - Retries up to 3 times with exponential backoff (1s, 2s, 4s)
 * - Includes HMAC-SHA256 signature in `X-Swarm-Signature` header
 * - Never throws — logs errors and returns success/failure boolean
 *
 * @param url - Target webhook URL
 * @param payload - Job completion data
 * @returns true if any attempt received a 2xx response
 */
export async function emitWebhook(
  url: string,
  payload: WebhookPayload
): Promise<boolean> {
  const body = JSON.stringify(payload);

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'ArcSwarm-Webhook/1.0',
    'X-Swarm-Job-Id': payload.jobId,
  };

  // Add HMAC signature if secret is configured
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    try {
      const signature = await computeSignature(body, secret);
      headers['X-Swarm-Signature'] = `sha256=${signature}`;
    } catch (error) {
      console.warn('⚠️  Failed to compute webhook signature:', error);
    }
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        console.log(
          `✅ Webhook delivered to ${url} (attempt ${attempt + 1}, status ${res.status})`
        );
        return true;
      }

      console.warn(
        `⚠️  Webhook attempt ${attempt + 1} failed: ${res.status} ${res.statusText}`
      );
    } catch (error) {
      console.warn(
        `⚠️  Webhook attempt ${attempt + 1} error:`,
        error instanceof Error ? error.message : error
      );
    }

    // Wait before retry (exponential backoff)
    if (attempt < MAX_RETRIES - 1) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  console.error(`❌ Webhook delivery failed after ${MAX_RETRIES} attempts: ${url}`);
  return false;
}
