/**
 * Agent type definitions — all 8 agents in the SEO + AEO swarm.
 */

export type AgentWing = 'SEO' | 'AEO';

export type GeminiModel =
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-image';

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
  /** Circle wallet address on Arc Testnet (set after wallet creation) */
  walletAddress?: string;
  /** Circle wallet ID for SDK operations */
  walletId?: string;
}

export interface AgentOutput {
  agentId: string;
  status: AgentStatus;
  result: Record<string, unknown> | null;
  qualityScore: number | null;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  /** Number of retries attempted (0 = first try succeeded) */
  retryCount?: number;
  /** x402 payment signature (e.g. EIP-3009 or EIP-2612) */
  paymentData?: string;
}
