import type {
  BedrockRuntimeClient as BedrockRuntimeClientType,
  InvokeModelCommand as InvokeModelCommandType,
  InvokeModelWithResponseStreamCommand as InvokeModelWithResponseStreamCommandType,
  ResponseStream,
} from '@aws-sdk/client-bedrock-runtime';
import QuickLRU from 'quick-lru';

import { AWS_ACCESS_ID, AWS_BEDROCK_REGION } from 'config/serverConfig';

// import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
let bedrockClient: BedrockRuntimeClientType | null = null;
let Command: typeof InvokeModelCommandType | null = null;
let StreamCommand: typeof InvokeModelWithResponseStreamCommandType | null = null;
let importPromise: Promise<{
  bedrockClient: BedrockRuntimeClientType,
  Command: typeof InvokeModelCommandType,
  StreamCommand: typeof InvokeModelWithResponseStreamCommandType,
}> | null = null;

// Mostly for dev
const cache = new QuickLRU<string, string>({ maxSize: 1000 });

const decoder = new TextDecoder('utf-8');

async function* transformAsyncIterable(
  outputPrefix: string | undefined,
  body: AsyncIterable<ResponseStream>,
): AsyncIterable<string> {
  yield outputPrefix ?? '';
  for await (const chunk of body) {
    const decoded = decoder.decode(chunk.chunk?.bytes);
    const output = TS.assertType<{
      generation: string,
      prompt_token_count?: number,
      generation_token_count?: number,
    }>(
      JSON.parse(decoded),
      val => TS.isObj(val) && typeof val.generation === 'string',
      new Error(`transformAsyncIterable: invalid response: ${decoded.slice(0, 200)}`),
    );
    yield output.generation;
  }
}

export default async function askLlama<
  Ret extends T extends true ? AsyncIterable<string> : string,
  T extends boolean | undefined = undefined,
>({
  modelId = 'us.meta.llama3-2-11b-instruct-v1:0',
  prompt,
  outputPrefix,
  image,
  stream,
  maxOutputLength = 1024,
}: {
  modelId?: string,
  prompt: string,
  outputPrefix?: string,
  image?: Buffer,
  stream?: T,
  maxOutputLength?: number,
}): Promise<Ret> {
  prompt = prompt.trim();

  const imgStr = image?.toString('base64');
  if (imgStr && imgStr.length > 1_000_000) {
    throw new Error('askLlama: image too large');
  }

  if (!bedrockClient || !Command || !StreamCommand) {
    importPromise ??= import('@aws-sdk/client-bedrock-runtime')
      .then(({
        BedrockRuntimeClient,
        InvokeModelCommand,
        InvokeModelWithResponseStreamCommand,
      }) => ({
        bedrockClient: new BedrockRuntimeClient({
          region: AWS_BEDROCK_REGION,
          credentials: {
            accessKeyId: AWS_ACCESS_ID,
            secretAccessKey: process.env.AWS_SECRET_KEY,
          },
        }),
        Command: InvokeModelCommand,
        StreamCommand: InvokeModelWithResponseStreamCommand,
      }));
    ({ bedrockClient, Command, StreamCommand } = await importPromise);
  }

  const fullPrompt = [
    '<|begin_of_text|>',
    '<|start_header_id|>user<|end_header_id|>',
    image ? '<|image|>' : '',
    prompt,
    '<|eot_id|>',
    '<|start_header_id|>assistant<|end_header_id|>',
    outputPrefix,
  ].join('');

  const cached = cache.get(fullPrompt);
  if (!image && cached) {
    return cached as Ret;
  }

  const body = JSON.stringify({
    prompt: fullPrompt,
    images: imgStr ? [imgStr] : undefined, // doesn't support multiple images
    max_gen_len: Math.round(maxOutputLength / 4),
  });
  if (stream) {
    const resp = await bedrockClient.send(new StreamCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body,
    }));

    if (!resp.body) {
      throw new Error('askLlama: no response');
    }

    return transformAsyncIterable(outputPrefix, resp.body) as Ret;
  }

  const resp = await bedrockClient.send(new Command({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body,
  }));

  const decoded = decoder.decode(resp.body);
  const output = TS.assertType<{
    generation: string,
    prompt_token_count?: number,
    generation_token_count?: number,
  }>(
    JSON.parse(decoded),
    val => TS.isObj(val) && typeof val.generation === 'string',
    new Error(`askLlama: invalid response: ${decoded.slice(0, 200)}`),
  );

  if (output.prompt_token_count && output.prompt_token_count > 5000) {
    ErrorLogger.warn(new Error('askLlama: prompt_token_count > 5000'), { prompt });
  } else if (output.generation_token_count
    && output.generation_token_count > 5000
    && output.generation_token_count > maxOutputLength) {
    ErrorLogger.warn(
      new Error('askLlama: generation_token_count > 5000'),
      { generation: output.generation },
    );
  }

  const fullOutput = outputPrefix + output.generation;
  if (!image) {
    cache.set(fullPrompt, fullOutput);
  }
  return fullOutput as Ret;
}
