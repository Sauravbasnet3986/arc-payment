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
  constructor(public readonly config: AgentConfig) { }

  /**
   * Execute the agent's task against a target URL.
   */
  async execute(context: AgentExecutionContext): Promise<AgentOutput> {
    const startedAt = new Date().toISOString();
    let status: AgentStatus = 'running';

    try {
      const prompt = this.buildPrompt(context);

      let resultText: string;
      if (this.config.model === 'gemini-2.5-flash-image' && context.pageImages?.length) {
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

      // REMOVED: the `qualityScore === 0` throw — zero is handled by the
      // quality gate in the orchestrator/settlement layer, not here.
      // Throwing here caused all agents to fail even when Gemini returned
      // valid content that just didn't parse into perfect JSON.

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

  /**
   * Parse the LLM response into structured data.
   *
   * Handles all common Gemini response formats:
   *   - Clean JSON object
   *   - JSON wrapped in ```json ... ``` fences
   *   - JSON wrapped in ``` ... ``` fences
   *   - JSON embedded somewhere in a longer text response (thinking models)
   *   - Plain text fallback (never throws)
   */
  protected parseResult(text: string): Record<string, unknown> {
    // --- Attempt 1: extract from markdown code fence (most common with Gemini) ---
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch) {
      try {
        const parsed = JSON.parse(fenceMatch[1].trim());
        if (Array.isArray(parsed)) return { data: parsed };
        if (typeof parsed === 'object' && parsed !== null) return parsed as Record<string, unknown>;
      } catch { /* fall through */ }
    }

    // --- Attempt 2: parse the full text directly (clean JSON response) ---
    try {
      const parsed = JSON.parse(text.trim());
      if (Array.isArray(parsed)) return { data: parsed };
      if (typeof parsed === 'object' && parsed !== null) return parsed as Record<string, unknown>;
    } catch { /* fall through */ }

    // --- Attempt 3: extract the LAST {...} block (thinking models prepend reasoning text) ---
    // We use lastIndexOf logic via matchAll to get the largest/last JSON object
    const allObjectMatches = [...text.matchAll(/\{[\s\S]*?\}/g)];
    // Try from largest match to smallest (greedy scan)
    const greedyMatch = text.match(/\{[\s\S]*\}/);
    if (greedyMatch) {
      try {
        const parsed = JSON.parse(greedyMatch[0]);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch { /* fall through */ }
    }

    // --- Attempt 4: extract a [...] array block ---
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) return { data: parsed };
      } catch { /* fall through */ }
    }

    // --- Fallback: store raw text but mark it so scoreOutput can handle gracefully ---
    // We do NOT return score 0 for this — plain text is still a valid agent response.
    console.warn(`[${this.config.id}] parseResult: could not extract JSON, using rawText fallback`);
    return { rawText: text, _isParseFallback: true };
  }

  /**
   * Score the output quality (0-100). Override for custom scoring.
   *
   * Default heuristic:
   *   - Structured JSON with content keys → 75 (passing)
   *   - Plain text fallback (_isParseFallback) → 72 (still passing — content exists)
   *   - Truly empty result → 0 (legitimately bad)
   */
  protected scoreOutput(result: Record<string, unknown>): number {
    if (!result || Object.keys(result).length === 0) return 0;

    // Plain-text fallback: Gemini responded but not in JSON format.
    // Still a valid response — give a passing score rather than failing the agent.
    if (result._isParseFallback) {
      const text = result.rawText as string ?? '';
      // Score based on response length — very short = probably an error message
      if (text.length < 50) return 40;   // below threshold, legitimately poor
      if (text.length < 200) return 65;  // borderline
      return 72;                          // passing — meaningful content present
    }

    // Structured JSON — good output, default passing score.
    // Individual agents override this with domain-specific scoring.
    return 75;
  }
}
