import type OpenAI from 'openai';
import type { ChatCompletionChunk, ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { Stream } from 'openai/streaming';
import QuickLRU from 'quick-lru';

let client: OpenAI | null = null;
let importPromise: Promise<{ default: typeof OpenAI }> | null = null;

const cache = new QuickLRU<string, string>({ maxSize: 1000 });

async function* transformAsyncIterable(
  outputPrefix: string | undefined,
  completion: Stream<ChatCompletionChunk>,
): AsyncIterable<string> {
  yield outputPrefix ?? '';
  for await (const chunk of completion) {
    yield chunk.choices[0].delta.content ?? '';
  }
}

async function askDeepSeek<
  Ret extends T extends true ? AsyncIterable<string> : string,
  T extends boolean | undefined = undefined,
>({
  modelId = 'deepseek-chat',
  systemPrompt,
  msgHistory,
  userMsg,
  outputPrefix,
  stream,
  maxOutputLength = 1024,
}: {
  modelId?: 'deepseek-chat' | 'deepseek-reasoner',
  systemPrompt: string,
  msgHistory?: ChatCompletionMessageParam[],
  userMsg: string,
  outputPrefix?: string,
  stream?: T,
  maxOutputLength?: number,
}): Promise<Ret> {
  systemPrompt = systemPrompt.trim();
  userMsg = userMsg.trim();

  if (!client) {
    importPromise ??= import('openai');
    const { default: OpenAI } = await importPromise;
    client = new OpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: process.env.DEEPSEEK_SECRET_KEY,
    });
  }

  if (!stream) {
    const cacheKey = `${systemPrompt}|${userMsg}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached as Ret;
    }
  }

  const completion = await client.chat.completions.create({
    model: modelId,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...(msgHistory ?? []),
      {
        role: 'user',
        content: userMsg,
      },
      ...(outputPrefix
        ? [{
          role: 'assistant' as const,
          content: outputPrefix,
          // @ts-expect-error DeepSeek beta
          prefix: true,
        }]
        : []),
    ],
    stream,
    // response_format: responseFormat === 'json'
    //   ? { type: 'json_object' }
    //   : undefined,
    max_tokens: Math.round(maxOutputLength / 4),
  });

  if (completion.choices) {
    if (!completion.choices[0].message.content) {
      throw new Error('askDeepSeek: empty response');
    }
    const output = `${outputPrefix ?? ''}${completion.choices[0].message.content}`;

    const cacheKey = `${systemPrompt}|${userMsg}`;
    cache.set(cacheKey, output);
    return output as Ret;
  }

  return transformAsyncIterable(outputPrefix, completion) as Ret;
}

export default askDeepSeek;
