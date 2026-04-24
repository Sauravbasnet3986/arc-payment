/**
 * Agent Implementations — Factory + Barrel Export
 *
 * Creates concrete agent instances from AgentConfig.
 * Maps agent IDs to their implementation classes.
 */

import type { AgentConfig } from '@/types/agent';
import { BaseAgent } from '../base';
import { MetadataArchitect } from './MetadataArchitect';
import { KeywordSpecialist } from './KeywordSpecialist';
import { TechHealthMonitor } from './TechHealthMonitor';
import { LinkStrategist } from './LinkStrategist';
import { SchemaEngineer } from './SchemaEngineer';
import { SnippetTransformer } from './SnippetTransformer';
import { ConversationalAuditor } from './ConversationalAuditor';
import { AltTextAgent } from './AltTextAgent';

/** Map of agent ID → concrete class constructor */
const AGENT_CLASSES: Record<string, new (config: AgentConfig) => BaseAgent> = {
  'metadata-architect': MetadataArchitect,
  'keyword-specialist': KeywordSpecialist,
  'tech-health-monitor': TechHealthMonitor,
  'link-strategist': LinkStrategist,
  'schema-engineer': SchemaEngineer,
  'snippet-transformer': SnippetTransformer,
  'conversational-auditor': ConversationalAuditor,
  'alttext-agent': AltTextAgent,
};

/**
 * Create a concrete agent instance from an AgentConfig.
 *
 * Usage:
 * ```ts
 * import { AGENTS } from '@/lib/agents/registry';
 * const agent = createAgent(AGENTS[0]);
 * const output = await agent.execute({ url: 'https://example.com' });
 * ```
 */
export function createAgent(config: AgentConfig): BaseAgent {
  const AgentClass = AGENT_CLASSES[config.id];
  if (!AgentClass) {
    throw new Error(`No implementation found for agent: ${config.id}`);
  }
  return new AgentClass(config);
}

export {
  MetadataArchitect,
  KeywordSpecialist,
  TechHealthMonitor,
  LinkStrategist,
  SchemaEngineer,
  SnippetTransformer,
  ConversationalAuditor,
  AltTextAgent,
};
