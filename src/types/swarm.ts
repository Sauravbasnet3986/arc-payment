/**
 * Swarm run, job, and report type definitions.
 */

import type { AgentOutput } from './agent';
import type { SettlementRecord } from './payment';

export type SwarmJobStatus =
  | 'pending'
  | 'running'
  | 'settling'
  | 'complete'
  | 'failed';

export interface SwarmRunRequest {
  url: string;
  agents: string[];        // agent IDs to include (empty = all 8)
  budgetCap: number;       // max USDC spend for this run
  webhookUrl?: string;     // optional callback URL on completion
}

export interface SwarmJob {
  id: string;
  status: SwarmJobStatus;
  url: string;
  agentOutputs: AgentOutput[];
  settlements: SettlementRecord[];
  totalCostUSDC: number;
  startedAt: string;
  completedAt: string | null;
  report: ConsolidatedReport | null;
  /** Optional webhook URL — POST results here on completion */
  webhookUrl?: string;
}

export interface ConsolidatedReport {
  jobId: string;
  url: string;
  seoScore: number;
  aeoScore: number;
  overallScore: number;
  sections: ReportSection[];
  generatedAt: string;
}

export interface ReportSection {
  agentId: string;
  agentName: string;
  wing: 'SEO' | 'AEO';
  title: string;
  findings: string[];
  recommendations: string[];
  data: Record<string, unknown>;
}

export interface WebhookPayload {
  jobId: string;
  status: SwarmJobStatus;
  url: string;
  totalCostUSDC: number;
  report: ConsolidatedReport;
  settlements: SettlementRecord[];
  completedAt: string;
}
