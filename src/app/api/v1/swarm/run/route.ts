/**
 * POST /api/v1/swarm/run
 *
 * Entry point for triggering a swarm optimization run.
 * Receives target URL, agent selection, and budget cap.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSwarmJob } from '@/lib/orchestrator';
import { AGENTS, TOTAL_SWARM_COST } from '@/lib/agents';
import type { SwarmRunRequest } from '@/types/swarm';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SwarmRunRequest;

    // Validate URL
    if (!body.url || !isValidUrl(body.url)) {
      return NextResponse.json(
        { error: 'Invalid or missing URL' },
        { status: 400 }
      );
    }

    // Validate budget
    const budgetCap = body.budgetCap ?? 0.10;
    if (budgetCap < TOTAL_SWARM_COST) {
      return NextResponse.json(
        {
          error: `Budget cap ($${budgetCap}) is below minimum swarm cost ($${TOTAL_SWARM_COST})`,
          minimumCost: TOTAL_SWARM_COST,
        },
        { status: 400 }
      );
    }

    // Validate agent selection
    if (body.agents?.length > 0) {
      const invalidAgents = body.agents.filter(
        (id) => !AGENTS.find((a) => a.id === id)
      );
      if (invalidAgents.length > 0) {
        return NextResponse.json(
          { error: `Unknown agent IDs: ${invalidAgents.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Create the swarm job
    const job = createSwarmJob({
      url: body.url,
      agents: body.agents ?? [],
      budgetCap,
      webhookUrl: body.webhookUrl,
    });

    // In production: dispatch job to background queue
    // For now: return the job object immediately
    return NextResponse.json(
      {
        success: true,
        job: {
          id: job.id,
          status: job.status,
          url: job.url,
          agentCount: job.agentOutputs.length,
          estimatedCost: TOTAL_SWARM_COST,
        },
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Swarm run error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
