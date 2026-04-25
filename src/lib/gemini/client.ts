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

// --- Concurrency Limiter ---
// Featherless limits orgs to 4 concurrency units. 
// DeepSeek-V3.2 costs 4 units per request, so we can only allow 1 at a time.
class ConcurrencyLimiter {
  private queue: (() => void)[] = [];
  private active = 0;
  constructor(private concurrency: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.concurrency) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    } else {
      this.active--;
    }
  }
}

const featherlessLimiter = new ConcurrencyLimiter(1);

// --- Featherless Fallback ---
async function callFeatherlessFallback(params: {
  model: string;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<GeminiResponse> {
  if (!env.FEATHERLESS_API_KEY) {
    throw new Error('FEATHERLESS_API_KEY not configured for fallback');
  }

  const featherlessModel = env.FEATHERLESS_MODEL || params.model;
  
  const messages = [];
  if (params.systemInstruction) {
    messages.push({ role: 'system', content: params.systemInstruction });
  }
  messages.push({ role: 'user', content: params.prompt });

  console.log(`[Featherless/${featherlessModel}] Queuing fallback generation...`);
  await featherlessLimiter.acquire();
  
  try {
    console.log(`[Featherless/${featherlessModel}] Starting API request...`);
    const res = await fetch('https://api.featherless.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.FEATHERLESS_API_KEY}`,
      },
      body: JSON.stringify({
        model: featherlessModel,
        messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxOutputTokens ?? 8192,
      }),
    });

    if (!res.ok) {
      throw new Error(`Featherless API error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    const usage = data.usage ?? {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    return {
      text,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
    };
  } finally {
    featherlessLimiter.release();
  }
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
        // Quota errors: fallback immediately
        if (res.status === 429 || /quota|resource_exhausted|billing/i.test(errorBody)) {
          console.warn(`[Gemini/${model}] Quota exceeded or rate limited. Triggering Featherless fallback...`);
          if (env.FEATHERLESS_API_KEY) {
            await new Promise((r) => setTimeout(r, 2000)); // 2s wait
            return await callFeatherlessFallback(params);
          }
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
      // Fallback for quota errors that throw early
      if (lastError.message.includes('quota exceeded') && env.FEATHERLESS_API_KEY) {
        console.warn(`[Gemini/${model}] Caught quota error. Triggering Featherless fallback...`);
        await new Promise((r) => setTimeout(r, 2000)); // 2s wait
        return await callFeatherlessFallback(params);
      } else if (lastError.message.includes('quota exceeded')) {
        throw lastError;
      }
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }

  // Exhausted all 5 retries. Fallback if configured.
  if (env.FEATHERLESS_API_KEY) {
    console.warn(`[Gemini/${model}] All retries failed. Triggering Featherless fallback...`);
    await new Promise((r) => setTimeout(r, 2000)); // 2s wait
    return await callFeatherlessFallback(params);
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