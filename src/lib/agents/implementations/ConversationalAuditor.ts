/**
 * Conversational Auditor — AEO Wing
 *
 * Analyzes content for voice search alignment and
 * natural language query optimization.
 * Uses Gemini Flash for fast inference.
 */

import { BaseAgent } from '../base';
import type { AgentExecutionContext } from '../base';

export class ConversationalAuditor extends BaseAgent {
  protected buildPrompt(context: AgentExecutionContext): string {
    return `You are analyzing the web page at: ${context.url}

## Task
Audit the page content for voice search and conversational AI alignment. Identify how well the content answers natural language queries and suggest improvements.

## Page Content
${context.pageContent ? context.pageContent.slice(0, 8000) : 'Page content not available — provide general voice search optimization recommendations based on URL structure.'}

## Required Output (JSON)
Return a JSON object with:
{
  "voiceSearchReadiness": "low|medium|high",
  "conversationalQueries": [
    {
      "query": "natural language question users might ask",
      "currentAnswer": "how the page currently answers this (or null)",
      "optimizedAnswer": "suggested natural language answer",
      "intent": "informational|navigational|transactional"
    }
  ],
  "nlpIssues": [
    {
      "issue": "description of NLP/readability issue",
      "location": "where in the content",
      "fix": "how to fix it"
    }
  ],
  "readabilityScore": {
    "gradeLevel": "estimated reading grade level",
    "sentenceComplexity": "low|medium|high",
    "jargonLevel": "low|medium|high"
  },
  "questionVariants": [
    {
      "baseQuestion": "core question",
      "variants": ["how...", "what...", "why...", "when..."]
    }
  ],
  "faqSuggestions": [
    { "question": "suggested FAQ question", "answer": "suggested concise answer" }
  ],
  "recommendations": ["prioritized voice search optimization recommendations"]
}`;
  }

  protected getSystemInstruction(): string {
    return 'You are the Conversational Auditor, an expert AEO agent specializing in voice search optimization and conversational AI readiness. You understand natural language processing, question intent classification, and how voice assistants (Google Assistant, Alexa, Siri) extract answers. Always return valid JSON.';
  }

  protected scoreOutput(result: Record<string, unknown>): number {
    let score = 50;

    // Has conversational queries
    const queries = result.conversationalQueries as unknown[];
    if (Array.isArray(queries)) {
      score += Math.min(queries.length * 4, 15);
    }

    // Has readability analysis
    if (result.readabilityScore && typeof result.readabilityScore === 'object') score += 10;

    // Has FAQ suggestions
    const faqs = result.faqSuggestions as unknown[];
    if (Array.isArray(faqs) && faqs.length > 0) score += 10;

    // Has question variants
    const variants = result.questionVariants as unknown[];
    if (Array.isArray(variants) && variants.length > 0) score += 5;

    // Has recommendations
    const recs = result.recommendations as unknown[];
    if (Array.isArray(recs) && recs.length > 0) score += 10;

    return Math.min(score, 100);
  }
}
