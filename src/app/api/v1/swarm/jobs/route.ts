/**
 * GET /api/v1/swarm/jobs
 *
 * Returns a list of recent swarm jobs from the in-memory store.
 * Used by the dashboard to show job history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { listJobs, getJobCount } from '@/lib/orchestrator/jobStore';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    parseInt(searchParams.get('limit') ?? '20', 10),
    50
  );

  const jobs = listJobs(limit);

  return NextResponse.json({
    jobs: jobs.map((job) => ({
      id: job.id,
      status: job.status,
      url: job.url,
      agentCount: job.agentOutputs.length,
      completedAgents: job.agentOutputs.filter(
        (o) => o.status === 'complete'
      ).length,
      failedAgents: job.agentOutputs.filter(
        (o) => o.status === 'failed'
      ).length,
      totalCostUSDC: job.totalCostUSDC,
      overallScore: job.report?.overallScore ?? null,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    })),
    total: getJobCount(),
  });
}
