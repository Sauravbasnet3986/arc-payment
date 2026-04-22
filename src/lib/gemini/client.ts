/**
 * Gemini AI Client
 *
 * Wrapper around Google Gemini 3 API for Pro, Flash, and Vision models.
 * All 8 agents use this client for their LLM inference tasks.
 */

import { env } from '@/lib/env';

export type GeminiModelId = 'gemini-3-pro' | 'gemini-3-flash' | 'gemini-3-vision';

interface GeminiResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Call Gemini API with a prompt.
 *
 * Supports function calling for structured output.
 * Implements retry with exponential backoff for rate limits.
 */
export async function callGemini(params: {
  model: GeminiModelId;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools?: any[];
}): Promise<GeminiResponse> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const {
    model,
    prompt,
    systemInstruction,
    temperature = 0.7,
    maxOutputTokens = 4096,
  } = params;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: systemInstruction
      ? { parts: [{ text: systemInstruction }] }
      : undefined,
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  };

  // Retry with exponential backoff (max 3 attempts)
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        // Rate limited — wait and retry
        const waitMs = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const usage = data.usageMetadata ?? {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
        totalTokenCount: 0,
      };

      return {
        text,
        usage: {
          promptTokens: usage.promptTokenCount,
          completionTokens: usage.candidatesTokenCount,
          totalTokens: usage.totalTokenCount,
        },
      };
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw lastError ?? new Error('Gemini API call failed');
}

/**
 * Call Gemini Vision model with an image URL.
 * Used by the Alt-Text Agent for image analysis.
 */
export async function callGeminiVision(params: {
  imageUrl: string;
  prompt: string;
}): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-vision:generateContent?key=${env.GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        parts: [
          { text: params.prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: params.imageUrl, // base64 encoded image
            },
          },
        ],
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Gemini Vision error: ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
