/**
 * Gemini AI Client
 *
 * Wrapper around Google Gemini API for Pro/Flash models.
 * All 8 agents use this client for their LLM inference tasks.
 */

import { env } from '@/lib/env';

export type GeminiModelId =
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-image'; // registry alias — remapped to gemini-2.5-flash below

interface GeminiResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Remap model IDs that don't exist in the Gemini API.
 * 'gemini-2.5-flash-image' is NOT a real generateContent model.
 * Vision is built into gemini-2.5-flash natively.
 */
function resolveModel(model: GeminiModelId): string {
  if (model === 'gemini-2.5-flash-image') return 'gemini-2.5-flash';
  return model;
}

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
    prompt,
    systemInstruction,
    temperature = 0.7,
    // Gemini 2.5 Flash/Pro are reasoning models — they consume tokens on
    // internal thinking before writing output. 4096 causes empty responses.
    maxOutputTokens = 8192,
  } = params;

  const model = resolveModel(params.model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: systemInstruction
      ? { parts: [{ text: systemInstruction }] }
      : undefined,
    generationConfig: { temperature, maxOutputTokens },
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if ([429, 500, 502, 503, 504].includes(res.status)) {
        const errorBody = await res.text();
        // Quota errors: throw immediately so the orchestrator applies
        // long back-off (15-45s). Short retries here won't help.
        if (res.status === 429 || /quota|resource_exhausted|billing/i.test(errorBody)) {
          throw new Error(`Gemini quota exceeded: ${errorBody}`);
        }
        lastError = new Error(`Gemini transient error: ${res.status} ${errorBody}`);
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }

      if (!res.ok) {
        throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
      }

      const data = await res.json();
      const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const usage = data.usageMetadata ?? {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
        totalTokenCount: 0,
      };

      if (!text) {
        const finishReason = data.candidates?.[0]?.finishReason;
        console.warn(`[Gemini/${model}] Empty text response, finishReason=${finishReason}`);
      }

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
      // Don't retry quota errors — bubble up immediately for orchestrator back-off
      if (lastError.message.includes('quota exceeded')) throw lastError;
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }

  throw lastError ?? new Error('Gemini API call failed');
}

/**
 * Call Gemini with an image for vision analysis.
 * Uses gemini-2.5-flash which handles vision natively.
 */
export async function callGeminiVision(params: {
  imageUrl: string;
  prompt: string;
}): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // gemini-2.5-flash handles vision natively — no separate vision model needed
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;

  let imagePart: Record<string, unknown>;
  if (params.imageUrl.startsWith('data:')) {
    const [header, data] = params.imageUrl.split(',');
    const mimeType = header.replace('data:', '').replace(';base64', '');
    imagePart = { inlineData: { mimeType, data } };
  } else {
    imagePart = { fileData: { mimeType: 'image/jpeg', fileUri: params.imageUrl } };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: params.prompt }, imagePart] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini Vision error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}