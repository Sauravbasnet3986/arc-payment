/**
 * Agent Registry — All 8 Swarm Agents
 *
 * Centralized configuration for every agent in the SEO + AEO swarm.
 * Includes model assignments, costs, and task descriptions.
 */

import type { AgentConfig } from '@/types/agent';

export const AGENTS: AgentConfig[] = [
  // ── SEO Wing ──────────────────────────────────────────────
  {
    id: 'metadata-architect',
    name: 'Metadata Architect',
    slug: 'metadata-architect',
    wing: 'SEO',
    model: 'gemini-2.5-flash',
    task: 'Meta-title & description rewrite for CTR optimization',
    costUSDC: 0.008,
    walletAddress: '0x5011d88062158fdf3771db1a44c2c487d17300a6',
  },
  {
    id: 'keyword-specialist',
    name: 'Keyword Specialist',
    slug: 'keyword-specialist',
    wing: 'SEO',
    model: 'gemini-2.5-flash',
    task: 'LSI keyword clusters + density scoring',
    costUSDC: 0.007,
    walletAddress: '0x4ccd66927246520dddcb1513265d358e59a4b015',
  },
  {
    id: 'tech-health-monitor',
    name: 'Tech Health Monitor',
    slug: 'tech-health-monitor',
    wing: 'SEO',
    model: 'gemini-2.5-flash',
    task: 'Core Web Vitals, broken links, mobile audit',
    costUSDC: 0.006,
    walletAddress: '0x22dd63619b0d67f5744f2b43d9de12e2b174b2b4',
  },
  {
    id: 'link-strategist',
    name: 'Link Strategist',
    slug: 'link-strategist',
    wing: 'SEO',
    model: 'gemini-2.5-flash',
    task: 'Topical authority + internal link graph analysis',
    costUSDC: 0.005,
    walletAddress: '0xfb1109fe0374bc6a723c559d51ebff0b0fed8158',
  },

  // ── AEO Wing ──────────────────────────────────────────────
  {
    id: 'schema-engineer',
    name: 'Schema Engineer',
    slug: 'schema-engineer',
    wing: 'AEO',
    model: 'gemini-2.5-flash',
    task: 'JSON-LD structured data generation + validation',
    costUSDC: 0.009,
    walletAddress: '0xa7b7c8df2b295f6068a5b4ab31ad1e69744e2bdd',
  },
  {
    id: 'snippet-transformer',
    name: 'Snippet Transformer',
    slug: 'snippet-transformer',
    wing: 'AEO',
    model: 'gemini-2.5-flash',
    task: 'Featured snippet answer block restructuring',
    costUSDC: 0.008,
    walletAddress: '0xc3ba1d12ba433134ca735ffaa7ed2d2d389a172f',
  },
  {
    id: 'conversational-auditor',
    name: 'Conversational Auditor',
    slug: 'conversational-auditor',
    wing: 'AEO',
    model: 'gemini-2.5-flash',
    task: 'Voice query alignment + NL rephrasing',
    costUSDC: 0.006,
    walletAddress: '0x1b94037ab6553c61f1c553efe379fb58cec5ac3f',
  },
  {
    id: 'alttext-agent',
    name: 'Alt-Text Agent',
    slug: 'alttext-agent',
    wing: 'AEO',
    model: 'gemini-2.5-flash',
    task: 'Vision-based descriptive alt text generation',
    costUSDC: 0.005,
    walletAddress: '0xb39a9d0cce0c675b10439c8870dde14b020b6f7d',
  },
];

/** Total cost of a full swarm run */
export const TOTAL_SWARM_COST = AGENTS.reduce((sum, a) => sum + a.costUSDC, 0);

/** Get agent by ID */
export function getAgent(id: string): AgentConfig | undefined {
  return AGENTS.find((a) => a.id === id);
}

/** Get all agents in a wing */
export function getAgentsByWing(wing: 'SEO' | 'AEO'): AgentConfig[] {
  return AGENTS.filter((a) => a.wing === wing);
}
