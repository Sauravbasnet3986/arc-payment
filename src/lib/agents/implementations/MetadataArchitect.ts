/**
 * Metadata Architect — SEO Wing
 *
 * Analyzes and rewrites <title> and <meta description> tags
 * for maximum CTR (click-through rate) optimization.
 * Uses Gemini Flash for fast inference.
 */

import { BaseAgent } from '../base';
import type { AgentExecutionContext } from '../base';

export class MetadataArchitect extends BaseAgent {
  protected buildPrompt(context: AgentExecutionContext): string {
    return `You are analyzing the web page at: ${context.url}

## Task
Analyze the current meta tags (title, description, OG tags) and rewrite them for maximum CTR optimization.

## Page Content
${context.pageContent ? context.pageContent.slice(0, 8000) : 'Page content not available — analyze based on URL structure and domain.'}

## Required Output (JSON)
Return a JSON object with:
{
  "currentTitle": "the existing <title> tag text",
  "currentDescription": "the existing <meta description> text",
  "currentOgTitle": "existing og:title if found",
  "currentOgDescription": "existing og:description if found",
  "rewrittenTitle": "your optimized title (max 60 chars)",
  "rewrittenDescription": "your optimized description (max 160 chars)",
  "rewrittenOgTitle": "optimized og:title",
  "rewrittenOgDescription": "optimized og:description",
  "titleCharCount": 0,
  "descriptionCharCount": 0,
  "ctrImprovementEstimate": "percentage estimate of CTR improvement",
  "issues": ["list of issues found with current meta tags"],
  "recommendations": ["list of actionable recommendations"]
}`;
  }

  protected getSystemInstruction(): string {
    return 'You are the Metadata Architect, an expert SEO agent specializing in meta tag optimization. You understand search engine result page (SERP) display rules, character limits, and psychological triggers that improve click-through rates. Always return valid JSON.';
  }

  protected scoreOutput(result: Record<string, unknown>): number {
    let score = 50; // Base score for any response

    // Has rewritten title within char limit
    const title = result.rewrittenTitle as string | undefined;
    if (title && typeof title === 'string') {
      score += 10;
      if (title.length <= 60 && title.length >= 30) score += 10;
    }

    // Has rewritten description within char limit
    const desc = result.rewrittenDescription as string | undefined;
    if (desc && typeof desc === 'string') {
      score += 10;
      if (desc.length <= 160 && desc.length >= 80) score += 10;
    }

    // Has issues identified
    const issues = result.issues as unknown[];
    if (Array.isArray(issues) && issues.length > 0) score += 5;

    // Has recommendations
    const recs = result.recommendations as unknown[];
    if (Array.isArray(recs) && recs.length > 0) score += 5;

    return Math.min(score, 100);
  }
}
