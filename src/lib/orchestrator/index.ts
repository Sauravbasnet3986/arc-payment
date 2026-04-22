/**
 * Orchestrator — Cognitive Hub
 *
 * Receives a target URL, decomposes it into 8 sub-tasks,
 * dispatches to agents in parallel, validates output quality,
 * authorizes settlement, and assembles the consolidated report.
 */

import { AGENTS } from '@/lib/agents/registry';
import type {
  SwarmRunRequest,
  SwarmJob,
  SwarmJobStatus,
  ConsolidatedReport,
  ReportSection,
} from '@/types/swarm';
import type { AgentOutput } from '@/types/agent';
import type { SettlementRecord } from '@/types/payment';

function generateJobId(): string {
  return `swarm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new swarm job from a run request.
 */
export function createSwarmJob(request: SwarmRunRequest): SwarmJob {
  const selectedAgents = request.agents.length > 0
    ? AGENTS.filter((a) => request.agents.includes(a.id))
    : AGENTS;

  return {
    id: generateJobId(),
    status: 'pending' as SwarmJobStatus,
    url: request.url,
    agentOutputs: selectedAgents.map((a) => ({
      agentId: a.id,
      status: 'queued' as const,
      result: null,
      qualityScore: null,
      startedAt: null,
      completedAt: null,
      error: null,
    })),
    settlements: [],
    totalCostUSDC: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    report: null,
  };
}

/**
 * Assemble a consolidated report from all agent outputs.
 */
export function assembleReport(
  job: SwarmJob,
  outputs: AgentOutput[]
): ConsolidatedReport {
  const completedOutputs = outputs.filter((o) => o.status === 'complete');

  const seoOutputs = completedOutputs.filter((o) => {
    const agent = AGENTS.find((a) => a.id === o.agentId);
    return agent?.wing === 'SEO';
  });

  const aeoOutputs = completedOutputs.filter((o) => {
    const agent = AGENTS.find((a) => a.id === o.agentId);
    return agent?.wing === 'AEO';
  });

  const avgScore = (arr: AgentOutput[]) =>
    arr.length > 0
      ? arr.reduce((s, o) => s + (o.qualityScore ?? 0), 0) / arr.length
      : 0;

  const sections: ReportSection[] = completedOutputs.map((output) => {
    const agent = AGENTS.find((a) => a.id === output.agentId)!;
    return {
      agentId: agent.id,
      agentName: agent.name,
      wing: agent.wing,
      title: agent.task,
      findings: [],
      recommendations: [],
      data: output.result ?? {},
    };
  });

  return {
    jobId: job.id,
    url: job.url,
    seoScore: Math.round(avgScore(seoOutputs)),
    aeoScore: Math.round(avgScore(aeoOutputs)),
    overallScore: Math.round(avgScore(completedOutputs)),
    sections,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate total settlement cost for a set of outputs.
 */
export function calculateTotalCost(settlements: SettlementRecord[]): number {
  return settlements.reduce(
    (sum, s) => sum + parseFloat(s.amountUSDC),
    0
  );
}
