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
    model: 'gemini-3-flash',
    task: 'Meta-title & description rewrite for CTR optimization',
    costUSDC: 0.008,
    icon: '🏗️',
  },
  {
    id: 'keyword-specialist',
    name: 'Keyword Specialist',
    slug: 'keyword-specialist',
    wing: 'SEO',
    model: 'gemini-3-flash',
    task: 'LSI keyword clusters + density scoring',
    costUSDC: 0.007,
    icon: '🔑',
  },
  {
    id: 'tech-health-monitor',
    name: 'Tech Health Monitor',
    slug: 'tech-health-monitor',
    wing: 'SEO',
    model: 'gemini-3-flash',
    task: 'Core Web Vitals, broken links, mobile audit',
    costUSDC: 0.006,
    icon: '🩺',
  },
  {
    id: 'link-strategist',
    name: 'Link Strategist',
    slug: 'link-strategist',
    wing: 'SEO',
    model: 'gemini-3-flash',
    task: 'Topical authority + internal link graph analysis',
    costUSDC: 0.005,
    icon: '🔗',
  },

  // ── AEO Wing ──────────────────────────────────────────────
  {
    id: 'schema-engineer',
    name: 'Schema Engineer',
    slug: 'schema-engineer',
    wing: 'AEO',
    model: 'gemini-3-pro',
    task: 'JSON-LD structured data generation + validation',
    costUSDC: 0.009,
    icon: '📐',
  },
  {
    id: 'snippet-transformer',
    name: 'Snippet Transformer',
    slug: 'snippet-transformer',
    wing: 'AEO',
    model: 'gemini-3-pro',
    task: 'Featured snippet answer block restructuring',
    costUSDC: 0.008,
    icon: '✂️',
  },
  {
    id: 'conversational-auditor',
    name: 'Conversational Auditor',
    slug: 'conversational-auditor',
    wing: 'AEO',
    model: 'gemini-3-flash',
    task: 'Voice query alignment + NL rephrasing',
    costUSDC: 0.006,
    icon: '🗣️',
  },
  {
    id: 'alttext-agent',
    name: 'Alt-Text Agent',
    slug: 'alttext-agent',
    wing: 'AEO',
    model: 'gemini-3-vision',
    task: 'Vision-based descriptive alt text generation',
    costUSDC: 0.005,
    icon: '🖼️',
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
