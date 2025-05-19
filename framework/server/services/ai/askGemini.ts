import type { GoogleGenAI } from '@google/genai';
import QuickLRU from 'quick-lru';

let client: GoogleGenAI | null = null;
let importPromise: Promise<{ GoogleGenAI: typeof GoogleGenAI }> | null = null;

const cache = new QuickLRU<string, string>({ maxSize: 1000 });

export default async function askGemini({
  modelId = '2.5-flash',
  systemPrompt,
  msgHistory,
  userMsg,
  outputPrefix,
  maxOutputLength = 1024,
}: {
  modelId?:
    | '2.5-flash'
    | '2.0-flash-lite',
  systemPrompt: string,
  msgHistory?: { role: 'user' | 'assistant', content: string }[],
  userMsg: string,
  outputPrefix?: string,
  maxOutputLength?: number,
}): Promise<string> {
  systemPrompt = systemPrompt.trim();
  userMsg = userMsg.trim();

  if (!client) {
    importPromise ??= import('@google/genai');
    const { GoogleGenAI } = await importPromise;
    client = new GoogleGenAI(process.env.GEMINI_SECRET_KEY ?? '');
  }

  const cacheKey = `${systemPrompt}|${userMsg}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const res = await client.models.generateContent({
    model: {
      '2.5-flash': 'models/gemini-2.5-flash-preview-04-17',
      '2.0-flash-lite': 'models/gemini-2.0-flash-lite',
    }[modelId],
    contents: [
      ...(msgHistory ?? []).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
      { role: 'user', parts: [{ text: userMsg }] },
    ],
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: Math.round(maxOutputLength / 4),
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  });

  if (!res.text) {
    throw new Error('askGemini: empty response');
  }
  const output = `${outputPrefix ?? ''}${res.text.trim() ?? ''}`;

  cache.set(cacheKey, output);
  return output;
}
