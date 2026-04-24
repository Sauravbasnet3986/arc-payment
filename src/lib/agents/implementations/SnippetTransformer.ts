/**
 * Snippet Transformer — AEO Wing
 *
 * Restructures page content to win featured snippets,
 * answer boxes, and other SERP features.
 * Uses Gemini Pro for complex content restructuring.
 */

import { BaseAgent } from '../base';
import type { AgentExecutionContext } from '../base';

export class SnippetTransformer extends BaseAgent {
  protected buildPrompt(context: AgentExecutionContext): string {
    return `You are analyzing the web page at: ${context.url}

## Task
Analyze the page content and restructure it to maximize chances of winning featured snippets, answer boxes, and other SERP features.

## Page Content
${context.pageContent ? context.pageContent.slice(0, 8000) : 'Page content not available — provide general snippet optimization recommendations based on URL structure.'}

## Required Output (JSON)
Return a JSON object with:
{
  "snippetOpportunities": [
    {
      "type": "paragraph|list|table|definition",
      "targetQuery": "the search query this would answer",
      "currentContent": "existing content that could be optimized",
      "optimizedContent": "restructured content for snippet extraction",
      "confidence": "low|medium|high"
    }
  ],
  "answerBoxTargets": [
    {
      "question": "target question for answer box",
      "conciseAnswer": "40-60 word answer optimized for extraction",
      "supportingContent": "additional context"
    }
  ],
  "tableSnippetOpportunities": [
    {
      "topic": "what the table would cover",
      "headers": ["col1", "col2"],
      "sampleRows": [["val1", "val2"]]
    }
  ],
  "listSnippetOpportunities": [
    {
      "topic": "list topic",
      "type": "ordered|unordered",
      "items": ["item1", "item2"]
    }
  ],
  "currentSnippetReadiness": "low|medium|high",
  "recommendations": ["prioritized snippet optimization recommendations"]
}`;
  }

  protected getSystemInstruction(): string {
    return 'You are the Snippet Transformer, an expert AEO agent specializing in featured snippet optimization. You understand how Google extracts paragraphs, lists, tables, and definitions for Position 0 results. Restructure content to maximize snippet extraction probability. Always return valid JSON.';
  }

  protected scoreOutput(result: Record<string, unknown>): number {
    let score = 50;

    // Has snippet opportunities
    const snippets = result.snippetOpportunities as unknown[];
    if (Array.isArray(snippets)) {
      score += Math.min(snippets.length * 5, 15);
    }

    // Has answer box targets
    const answers = result.answerBoxTargets as unknown[];
    if (Array.isArray(answers) && answers.length > 0) score += 10;

    // Has table or list snippet opportunities
    const tables = result.tableSnippetOpportunities as unknown[];
    const lists = result.listSnippetOpportunities as unknown[];
    if ((Array.isArray(tables) && tables.length > 0) ||
        (Array.isArray(lists) && lists.length > 0)) {
      score += 10;
    }

    // Has recommendations
    const recs = result.recommendations as unknown[];
    if (Array.isArray(recs) && recs.length > 0) score += 10;

    // Has readiness assessment
    if (result.currentSnippetReadiness) score += 5;

    return Math.min(score, 100);
  }
}
