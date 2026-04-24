/**
 * Schema Engineer — AEO Wing
 *
 * Generates and validates JSON-LD structured data for
 * enhanced search engine understanding and rich results.
 * Uses Gemini Pro for complex schema generation.
 */

import { BaseAgent } from '../base';
import type { AgentExecutionContext } from '../base';

export class SchemaEngineer extends BaseAgent {
  protected buildPrompt(context: AgentExecutionContext): string {
    return `You are analyzing the web page at: ${context.url}

## Task
Generate comprehensive JSON-LD structured data (schema.org) for this page and validate any existing structured data.

## Page Content
${context.pageContent ? context.pageContent.slice(0, 8000) : 'Page content not available — generate recommended schema types based on URL structure and domain.'}

## Required Output (JSON)
Return a JSON object with:
{
  "existingSchemas": [
    { "type": "schema.org type found", "valid": true, "issues": ["list of issues"] }
  ],
  "generatedSchemas": [
    {
      "type": "schema.org type (e.g., Article, Product, FAQ, Organization)",
      "jsonLd": { "@context": "https://schema.org", "@type": "...", "..." : "..." },
      "purpose": "why this schema is recommended"
    }
  ],
  "richResultEligibility": {
    "faqPage": true,
    "howTo": false,
    "article": true,
    "breadcrumb": true,
    "product": false,
    "localBusiness": false
  },
  "missingSchemas": ["schema types that should be added"],
  "validationErrors": ["any errors in existing structured data"],
  "recommendations": ["actionable structured data recommendations"]
}

IMPORTANT: The "jsonLd" fields must contain valid JSON-LD that can be directly placed in a <script type="application/ld+json"> tag.`;
  }

  protected getSystemInstruction(): string {
    return 'You are the Schema Engineer, an expert AEO (Answer Engine Optimization) agent specializing in JSON-LD structured data. You understand all schema.org types, Google rich result requirements, and structured data best practices. Generate production-ready JSON-LD. Always return valid JSON.';
  }

  protected scoreOutput(result: Record<string, unknown>): number {
    let score = 50;

    // Has generated schemas
    const schemas = result.generatedSchemas as unknown[];
    if (Array.isArray(schemas)) {
      score += Math.min(schemas.length * 8, 20);
    }

    // Has rich result eligibility analysis
    if (result.richResultEligibility && typeof result.richResultEligibility === 'object') score += 10;

    // Has missing schemas identified
    const missing = result.missingSchemas as unknown[];
    if (Array.isArray(missing) && missing.length > 0) score += 5;

    // Has recommendations
    const recs = result.recommendations as unknown[];
    if (Array.isArray(recs) && recs.length > 0) score += 10;

    // Validate that generated schemas have jsonLd
    if (Array.isArray(schemas) && schemas.length > 0) {
      const hasJsonLd = schemas.some(
        (s) => typeof s === 'object' && s !== null && 'jsonLd' in (s as Record<string, unknown>)
      );
      if (hasJsonLd) score += 5;
    }

    return Math.min(score, 100);
  }
}
