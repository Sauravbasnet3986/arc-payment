/**
 * Alt-Text Agent — AEO Wing
 *
 * Uses Gemini Vision to generate descriptive, accessible
 * alt text for images found on the page.
 * Uses Gemini Vision for image analysis.
 */

import { BaseAgent } from '../base';
import type { AgentExecutionContext } from '../base';

export class AltTextAgent extends BaseAgent {
  protected buildPrompt(context: AgentExecutionContext): string {
    const hasImages = context.pageImages && context.pageImages.length > 0;

    if (hasImages) {
      return `You are analyzing images from the web page at: ${context.url}

## Task
Generate descriptive, accessible alt text for the provided image(s). The alt text should be:
- Descriptive and specific
- Concise (125 characters or less per image)
- Contextually relevant to the page content
- Accessible for screen readers
- SEO-optimized with relevant keywords where natural

## Page Context
${context.pageContent ? context.pageContent.slice(0, 3000) : 'No additional page context available.'}

## Required Output (JSON)
Return a JSON object with:
{
  "images": [
    {
      "originalAlt": "existing alt text if available",
      "generatedAlt": "your descriptive alt text",
      "charCount": 0,
      "isDecorative": false,
      "seoKeywordsIncluded": ["relevant keywords naturally included"],
      "accessibilityCompliance": "wcag-aa|wcag-aaa"
    }
  ],
  "overallAccessibilityScore": "low|medium|high",
  "missingAltCount": 0,
  "decorativeImageCount": 0,
  "recommendations": ["accessibility and alt text recommendations"]
}`;
    }

    // Fallback when no images are provided — analyze HTML for image tags
    return `You are analyzing the web page at: ${context.url}

## Task
Analyze the page HTML for <img> tags and assess alt text quality. For images missing alt text, suggest appropriate alt text based on context clues (filename, surrounding text, page topic).

## Page Content (HTML)
${context.pageContent ? context.pageContent.slice(0, 8000) : 'Page content not available — provide general alt text recommendations.'}

## Required Output (JSON)
Return a JSON object with:
{
  "images": [
    {
      "src": "image source URL or filename",
      "originalAlt": "existing alt text or null",
      "generatedAlt": "suggested alt text based on context",
      "charCount": 0,
      "isDecorative": false,
      "needsAttention": true
    }
  ],
  "overallAccessibilityScore": "low|medium|high",
  "missingAltCount": 0,
  "emptyAltCount": 0,
  "decorativeImageCount": 0,
  "recommendations": ["accessibility and alt text recommendations"]
}`;
  }

  protected getSystemInstruction(): string {
    return 'You are the Alt-Text Agent, an expert AEO agent specializing in image accessibility and alt text generation. You understand WCAG 2.1 guidelines, screen reader behavior, and how search engines index image content. Generate descriptive, concise, and accessible alt text. Always return valid JSON.';
  }

  protected scoreOutput(result: Record<string, unknown>): number {
    let score = 50;

    // Has image analysis
    const images = result.images as unknown[];
    if (Array.isArray(images)) {
      score += Math.min(images.length * 5, 15);

      // Check if generated alt text is provided
      const withAlt = images.filter(
        (img) => typeof img === 'object' && img !== null &&
        'generatedAlt' in (img as Record<string, unknown>)
      );
      if (withAlt.length > 0) score += 10;
    }

    // Has accessibility score
    if (result.overallAccessibilityScore) score += 5;

    // Has recommendations
    const recs = result.recommendations as unknown[];
    if (Array.isArray(recs) && recs.length > 0) score += 10;

    // Has count metrics
    if (typeof result.missingAltCount === 'number') score += 5;

    return Math.min(score, 100);
  }
}
