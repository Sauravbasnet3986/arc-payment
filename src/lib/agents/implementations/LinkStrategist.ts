/**
 * Link Strategist — SEO Wing
 *
 * Analyzes internal link graph, topical authority mapping,
 * orphan page detection, and link equity distribution.
 * Uses Gemini Flash for fast inference.
 */

import { BaseAgent } from '../base';
import type { AgentExecutionContext } from '../base';

export class LinkStrategist extends BaseAgent {
  protected buildPrompt(context: AgentExecutionContext): string {
    return `You are analyzing the web page at: ${context.url}

## Task
Analyze the internal and external link structure, topical authority signals, and link equity distribution on this page.

## Page Content (HTML)
${context.pageContent ? context.pageContent.slice(0, 8000) : 'Page content not available — provide general link strategy recommendations based on URL structure.'}

## Required Output (JSON)
Return a JSON object with:
{
  "internalLinks": {
    "count": 0,
    "uniqueDestinations": 0,
    "links": [
      { "href": "/path", "anchorText": "text", "context": "where in page" }
    ]
  },
  "externalLinks": {
    "count": 0,
    "domains": ["list of external domains linked to"],
    "nofollowCount": 0
  },
  "topicalAuthority": {
    "primaryTopic": "main topic of the page",
    "topicCluster": ["related topics that should be linked"],
    "authorityScore": "low|medium|high"
  },
  "orphanPageRisk": "low|medium|high",
  "linkEquityIssues": ["pages receiving too much/too little link equity"],
  "missingInternalLinks": ["topics/pages that should be linked to from this page"],
  "anchorTextOptimization": ["anchor texts that could be improved"],
  "recommendations": ["prioritized link strategy recommendations"]
}`;
  }

  protected getSystemInstruction(): string {
    return 'You are the Link Strategist, an expert SEO agent specializing in internal linking, topical authority, and link equity distribution. You understand PageRank flow, topic clusters, pillar-cluster models, and anchor text optimization. Always return valid JSON.';
  }

  protected scoreOutput(result: Record<string, unknown>): number {
    let score = 50;

    // Has internal link analysis
    if (result.internalLinks && typeof result.internalLinks === 'object') score += 15;

    // Has topical authority assessment
    if (result.topicalAuthority && typeof result.topicalAuthority === 'object') score += 10;

    // Has missing link suggestions
    const missing = result.missingInternalLinks as unknown[];
    if (Array.isArray(missing) && missing.length > 0) score += 10;

    // Has recommendations
    const recs = result.recommendations as unknown[];
    if (Array.isArray(recs) && recs.length > 0) score += 10;

    // Has anchor text optimization
    const anchors = result.anchorTextOptimization as unknown[];
    if (Array.isArray(anchors) && anchors.length > 0) score += 5;

    return Math.min(score, 100);
  }
}
