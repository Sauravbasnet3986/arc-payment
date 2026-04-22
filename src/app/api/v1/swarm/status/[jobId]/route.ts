/**
 * GET /api/v1/swarm/status/[jobId]
 *
 * Returns the current status of a swarm run.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json(
      { error: 'Missing jobId parameter' },
      { status: 400 }
    );
  }

  // TODO: Look up job from persistent store (Redis, DB, etc.)
  // For now: return a placeholder status
  return NextResponse.json({
    jobId,
    status: 'pending',
    message: 'Job status tracking will be connected to persistent storage.',
    agents: [],
    settlements: [],
  });
}
