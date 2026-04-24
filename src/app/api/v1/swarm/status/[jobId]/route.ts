/**
 * GET /api/v1/swarm/status/[jobId]
 *
 * Returns the current status of a swarm run.
 * Supports two modes:
 *   1. JSON (default) — returns job snapshot
 *   2. SSE (Accept: text/event-stream) — streams updates until job completes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/orchestrator/jobStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json(
      { error: 'Missing jobId parameter' },
      { status: 400 }
    );
  }

  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json(
      { error: 'Job not found', jobId },
      { status: 404 }
    );
  }

  // Check if client wants SSE streaming
  const acceptHeader = request.headers.get('accept') ?? '';
  if (acceptHeader.includes('text/event-stream')) {
    return streamJobStatus(jobId);
  }

  // Default: return JSON snapshot
  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    url: job.url,
    agentOutputs: job.agentOutputs,
    settlements: job.settlements,
    totalCostUSDC: job.totalCostUSDC,
    report: job.report,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
}

/**
 * SSE streaming mode — polls the job store every 1s and
 * emits updates until the job reaches a terminal state.
 */
function streamJobStatus(jobId: string): Response {
  const encoder = new TextEncoder();
  const TERMINAL = ['complete', 'failed'];
  const POLL_INTERVAL = 1000;
  const MAX_DURATION = 5 * 60 * 1000; // 5 minute timeout

  const stream = new ReadableStream({
    start(controller) {
      const startTime = Date.now();
      let lastStatus = '';

      const interval = setInterval(() => {
        // Timeout guard
        if (Date.now() - startTime > MAX_DURATION) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'timeout', message: 'Stream timed out after 5 minutes' })}\n\n`
            )
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          clearInterval(interval);
          controller.close();
          return;
        }

        const job = getJob(jobId);

        if (!job) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: 'Job not found' })}\n\n`
            )
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          clearInterval(interval);
          controller.close();
          return;
        }

        // Only emit when status changes or new data arrives
        const currentState = JSON.stringify({
          status: job.status,
          agentsDone: job.agentOutputs.filter((o) => o.status === 'complete' || o.status === 'failed').length,
          settlementsCount: job.settlements.length,
        });

        if (currentState !== lastStatus) {
          lastStatus = currentState;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'job:update',
                jobId: job.id,
                status: job.status,
                agentOutputs: job.agentOutputs,
                settlements: job.settlements,
                totalCostUSDC: job.totalCostUSDC,
                report: job.report,
                completedAt: job.completedAt,
              })}\n\n`
            )
          );
        }

        // Close stream when job is done
        if (TERMINAL.includes(job.status)) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          clearInterval(interval);
          controller.close();
        }
      }, POLL_INTERVAL);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
