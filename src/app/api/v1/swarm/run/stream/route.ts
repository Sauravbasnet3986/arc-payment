/**
 * POST /api/v1/swarm/run/stream
 *
 * Server-Sent Events endpoint for streaming swarm execution progress.
 * Creates a job, dispatches all agents, and streams real-time updates
 * as agents complete, settlements finalize, and the report assembles.
 */

import { NextRequest } from 'next/server';
import { createSwarmJob, executeSwarmJob } from '@/lib/orchestrator';
import { AGENTS, TOTAL_SWARM_COST } from '@/lib/agents';
import { checkRateLimit, getClientId, RATE_LIMITS } from '@/lib/rateLimit';
import { normalizeSwarmUrl } from '@/lib/url';
import type { SwarmRunRequest } from '@/types/swarm';
import type { SwarmProgressEvent } from '@/lib/orchestrator';

export async function POST(request: NextRequest) {
  // Rate limit check
  const { allowed, retryAfterMs } = checkRateLimit(
    getClientId(request),
    RATE_LIMITS.write
  );
  if (!allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfterMs,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
        },
      }
    );
  }

  try {
    const body = (await request.json()) as SwarmRunRequest;

    // Validate + normalize URL
    const normalizedUrl = normalizeSwarmUrl(body.url ?? '');
    if (!normalizedUrl) {
      return new Response(
        JSON.stringify({ error: 'Invalid or unsupported URL. Use http(s) format.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate budget
    const budgetCap = body.budgetCap ?? 0.10;
    if (budgetCap < TOTAL_SWARM_COST) {
      return new Response(
        JSON.stringify({
          error: `Budget cap ($${budgetCap}) is below minimum swarm cost ($${TOTAL_SWARM_COST})`,
          minimumCost: TOTAL_SWARM_COST,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate agent selection
    if (body.agents?.length > 0) {
      const invalidAgents = body.agents.filter(
        (id) => !AGENTS.find((a) => a.id === id)
      );
      if (invalidAgents.length > 0) {
        return new Response(
          JSON.stringify({ error: `Unknown agent IDs: ${invalidAgents.join(', ')}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create the swarm job
    const job = createSwarmJob({
      url: normalizedUrl,
      agents: body.agents ?? [],
      budgetCap,
      webhookUrl: body.webhookUrl,
    });

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Track whether the controller is still open.
        // The browser or a proxy can close the connection at any time —
        // guard every enqueue/close call so we never throw ERR_INVALID_STATE.
        let closed = false;

        const safeEnqueue = (chunk: Uint8Array) => {
          if (closed) return;
          try {
            controller.enqueue(chunk);
          } catch {
            closed = true;
          }
        };

        const safeClose = () => {
          if (closed) return;
          closed = true;
          try {
            controller.close();
          } catch {
            // already closed — ignore
          }
        };

        const sendEvent = (event: SwarmProgressEvent) => {
          if (closed) return; // client disconnected — stop sending
          const data = JSON.stringify(event);
          safeEnqueue(encoder.encode(`data: ${data}\n\n`));
        };

        // Send a heartbeat every 15s so the browser doesn't time out
        // during the batched agent execution (can take 60-120s).
        const heartbeat = setInterval(() => {
          safeEnqueue(encoder.encode(': heartbeat\n\n'));
        }, 15000);

        // Execute the swarm job with progress streaming
        executeSwarmJob(job, sendEvent)
          .then(() => {
            clearInterval(heartbeat);
            safeEnqueue(encoder.encode('data: [DONE]\n\n'));
            safeClose();
          })
          .catch((error) => {
            clearInterval(heartbeat);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            sendEvent({ type: 'job:error', error: errorMsg });
            safeEnqueue(encoder.encode('data: [DONE]\n\n'));
            safeClose();
          });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        // Tell Next.js / any proxy not to buffer this response
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Swarm stream error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}