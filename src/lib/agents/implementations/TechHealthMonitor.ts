/**
 * Tech Health Monitor — SEO Wing
 *
 * Audits Core Web Vitals, mobile friendliness, broken links,
 * and technical SEO health indicators.
 * Uses Gemini Flash for fast inference.
 */

import { BaseAgent } from '../base';
import type { AgentExecutionContext } from '../base';

export class TechHealthMonitor extends BaseAgent {
  protected buildPrompt(context: AgentExecutionContext): string {
    return `You are analyzing the web page at: ${context.url}

## Task
Perform a comprehensive technical SEO health audit including Core Web Vitals assessment, mobile friendliness, broken link detection, and technical issues.

## Page Content (HTML)
${context.pageContent ? context.pageContent.slice(0, 10000) : 'Page content not available — provide general technical SEO recommendations based on URL structure.'}

## Required Output (JSON)
Return a JSON object with:
{
  "coreWebVitals": {
    "lcp": { "status": "good|needs-improvement|poor", "observations": "what affects LCP" },
    "fid": { "status": "good|needs-improvement|poor", "observations": "what affects FID" },
    "cls": { "status": "good|needs-improvement|poor", "observations": "what affects CLS" }
  },
  "mobileAudit": {
    "viewportMeta": true,
    "responsiveDesign": true,
    "touchTargetSizing": true,
    "fontSizing": true,
    "issues": ["list of mobile issues"]
  },
  "technicalIssues": [
    { "severity": "critical|warning|info", "issue": "description", "fix": "how to fix" }
  ],
  "brokenLinks": ["list of potentially broken URLs found in the HTML"],
  "performanceObservations": ["inline scripts blocking render", "large images without lazy loading", etc.],
  "securityFlags": ["mixed content", "missing CSP header", etc.],
  "structuredDataPresent": true,
  "canonicalTag": "URL or null",
  "robotsMeta": "index,follow or noindex,nofollow etc.",
  "recommendations": ["prioritized list of technical fixes"]
}`;
  }

  protected getSystemInstruction(): string {
    return 'You are the Tech Health Monitor, an expert SEO agent specializing in technical site audits. You understand Core Web Vitals (LCP, FID, CLS), HTML semantics, mobile UX, performance optimization, and security best practices. Analyze the HTML structure for technical issues. Always return valid JSON.';
  }

  protected scoreOutput(result: Record<string, unknown>): number {
    let score = 50;

    // Has Core Web Vitals assessment
    if (result.coreWebVitals && typeof result.coreWebVitals === 'object') score += 15;

    // Has mobile audit
    if (result.mobileAudit && typeof result.mobileAudit === 'object') score += 10;

    // Has technical issues identified
    const issues = result.technicalIssues as unknown[];
    if (Array.isArray(issues) && issues.length > 0) score += 10;

    // Has recommendations
    const recs = result.recommendations as unknown[];
    if (Array.isArray(recs) && recs.length > 0) score += 10;

    // Has performance observations
    const perf = result.performanceObservations as unknown[];
    if (Array.isArray(perf) && perf.length > 0) score += 5;

    return Math.min(score, 100);
  }
}
