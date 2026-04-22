/**
 * Agent type definitions — all 8 agents in the SEO + AEO swarm.
 */

export type AgentWing = 'SEO' | 'AEO';

export type GeminiModel = 'gemini-3-pro' | 'gemini-3-flash' | 'gemini-3-vision';

export type AgentStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'validating'
  | 'complete'
  | 'failed';

export interface AgentConfig {
  id: string;
  name: string;
  slug: string;
  wing: AgentWing;
  model: GeminiModel;
  task: string;
  costUSDC: number;
  icon: string;
}

export interface AgentOutput {
  agentId: string;
  status: AgentStatus;
  result: Record<string, unknown> | null;
  qualityScore: number | null;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}
