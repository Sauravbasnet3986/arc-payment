/**
 * Keyword Specialist — SEO Wing
 *
 * Extracts LSI (Latent Semantic Indexing) keyword clusters,
 * analyzes keyword density, and identifies semantic gaps.
 * Uses Gemini Flash for fast inference.
 */

import { BaseAgent } from '../base';
import type { AgentExecutionContext } from '../base';

export class KeywordSpecialist extends BaseAgent {
  protected buildPrompt(context: AgentExecutionContext): string {
    return `You are analyzing the web page at: ${context.url}

## Task
Perform comprehensive keyword analysis including LSI keyword clusters, density scoring, and semantic gap identification.

## Page Content
${context.pageContent ? context.pageContent.slice(0, 8000) : 'Page content not available — analyze based on URL structure and domain.'}

## Required Output (JSON)
Return a JSON object with:
{
  "primaryKeyword": "the main target keyword detected",
  "primaryKeywordDensity": 0.0,
  "lsiClusters": [
    {
      "theme": "cluster theme",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "relevanceScore": 0.0
    }
  ],
  "semanticGaps": ["topics/keywords that are missing but should be included"],
  "keywordDensityMap": {
    "keyword": { "count": 0, "density": 0.0 }
  },
  "overOptimized": ["keywords that appear too frequently"],
  "underOptimized": ["keywords that should appear more"],
  "recommendations": ["actionable keyword optimization recommendations"],
  "competitiveKeywords": ["keywords competitors likely rank for"]
}`;
  }

  protected getSystemInstruction(): string {
    return 'You are the Keyword Specialist, an expert SEO agent specializing in semantic keyword analysis. You understand LSI, TF-IDF, keyword clustering, and search intent mapping. Identify keyword opportunities and density issues. Always return valid JSON.';
  }

  protected scoreOutput(result: Record<string, unknown>): number {
    let score = 50;

    // Has primary keyword identified
    if (result.primaryKeyword && typeof result.primaryKeyword === 'string') score += 10;

    // Has LSI clusters
    const clusters = result.lsiClusters as unknown[];
    if (Array.isArray(clusters)) {
      score += Math.min(clusters.length * 5, 15);
    }

    // Has semantic gaps identified
    const gaps = result.semanticGaps as unknown[];
    if (Array.isArray(gaps) && gaps.length > 0) score += 10;

    // Has recommendations
    const recs = result.recommendations as unknown[];
    if (Array.isArray(recs) && recs.length > 0) score += 10;

    // Has density map
    if (result.keywordDensityMap && typeof result.keywordDensityMap === 'object') score += 5;

    return Math.min(score, 100);
  }
}
