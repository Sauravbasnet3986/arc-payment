/**
 * Base Agent — Execution Contract
 *
 * All 8 agents implement this interface. The orchestrator
 * calls execute() and receives a structured output.
 */

import type { AgentConfig, AgentOutput, AgentStatus } from '@/types/agent';
import { callGemini, callGeminiVision } from '@/lib/gemini/client';

export interface AgentExecutionContext {
  url: string;
  pageContent?: string;
  pageImages?: string[];
  additionalContext?: Record<string, unknown>;
}

/**
 * Base agent class — extend per agent for custom prompts/logic.
 *
 * Usage:
 * ```ts
 * class MetadataArchitect extends BaseAgent {
 *   protected buildPrompt(ctx) { return `Analyze meta tags for ${ctx.url}`; }
 * }
 * ```
 */
export abstract class BaseAgent {
  constructor(public readonly config: AgentConfig) {}

  /**
   * Execute the agent's task against a target URL.
   */
  async execute(context: AgentExecutionContext): Promise<AgentOutput> {
    const startedAt = new Date().toISOString();
    let status: AgentStatus = 'running';

    try {
      const prompt = this.buildPrompt(context);

      let resultText: string;
      if (this.config.model === 'gemini-3-vision' && context.pageImages?.length) {
        resultText = await callGeminiVision({
          imageUrl: context.pageImages[0],
          prompt,
        });
      } else {
        const response = await callGemini({
          model: this.config.model,
          prompt,
          systemInstruction: this.getSystemInstruction(),
          temperature: 0.3,
        });
        resultText = response.text;
      }

      const result = this.parseResult(resultText);
      const qualityScore = this.scoreOutput(result);
      status = 'complete';

      return {
        agentId: this.config.id,
        status,
        result,
        qualityScore,
        startedAt,
        completedAt: new Date().toISOString(),
        error: null,
      };
    } catch (error) {
      status = 'failed';
      return {
        agentId: this.config.id,
        status,
        result: null,
        qualityScore: null,
        startedAt,
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /** Build the LLM prompt for this agent's task. Override per agent. */
  protected abstract buildPrompt(context: AgentExecutionContext): string;

  /** System instruction for the LLM. Override for custom behavior. */
  protected getSystemInstruction(): string {
    return `You are the ${this.config.name}, a specialized ${this.config.wing} optimization agent. ${this.config.task}. Return your analysis as structured JSON.`;
  }

  /** Parse the LLM response into structured data. Override for custom parsing. */
  protected parseResult(text: string): Record<string, unknown> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { rawText: text };
    } catch {
      return { rawText: text };
    }
  }

  /** Score the output quality (0-100). Override for custom scoring. */
  protected scoreOutput(result: Record<string, unknown>): number {
    // Default: basic heuristic — penalize empty results
    if (!result || Object.keys(result).length === 0) return 0;
    if ('rawText' in result) return 50;
    return 75;
  }
}
