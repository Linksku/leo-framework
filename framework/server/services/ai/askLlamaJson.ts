import type {
  BedrockRuntimeClient as BedrockRuntimeClientType,
  InvokeModelCommand as InvokeModelCommandType,
} from '@aws-sdk/client-bedrock-runtime';

// import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
let bedrockClient: BedrockRuntimeClientType | null = null;
let Command: typeof InvokeModelCommandType | null = null;
let importPromise: Promise<{
  bedrockClient: BedrockRuntimeClientType,
  Command: typeof InvokeModelCommandType,
}> | null = null;

const decoder = new TextDecoder('utf-8');

function cleanJson(str: string): string {
  const firstIdx = str.indexOf('{');
  const lastIdx = str.lastIndexOf('}');
  if (firstIdx === -1 || lastIdx === -1) {
    throw new Error(`detectLabels: invalid JSON: ${str}`);
  }
  return str.slice(firstIdx, lastIdx + 1);
}

export default async function askLlamaJson<
  Fields extends ObjectOf<{ type: string, description: string }>,
>({
  modelId = 'us.meta.llama3-2-11b-instruct-v1:0',
  context,
  fields,
  image,
  maxOutputLength = 512,
}: {
  modelId?: string,
  context?: string,
  fields: Fields,
  image?: Buffer,
  maxOutputLength?: number,
}): Promise<{
  [K in keyof Fields]: unknown;
}> {
  const imgStr = image?.toString('base64');
  if (imgStr && imgStr.length > 1_000_000) {
    throw new Error('askLlamaJson: image too large');
  }

  if (!bedrockClient || !Command) {
    importPromise ??= import('@aws-sdk/client-bedrock-runtime')
      .then(({ BedrockRuntimeClient, InvokeModelCommand }) => ({
        bedrockClient: new BedrockRuntimeClient({
          region: process.env.AWS_BEDROCK_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_ID,
            secretAccessKey: process.env.AWS_SECRET_KEY,
          },
        }),
        Command: InvokeModelCommand,
      }));
    ({ bedrockClient, Command } = await importPromise);
  }

  const prompt = [
    `Respond in valid JSON with the format: {${TS.objEntries(fields).map(([key, val]) => `"${key}":${val.type}`).join(',')}}`,
    'No text outside the JSON.',
    ...(context ? [context] : []),
    'Fields:',
    ...TS.objEntries(fields).map(([key, val]) => `${key}: ${val.description}`),
  ].join('\n');

  const command = new Command({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      prompt: [
        '<|begin_of_text|>',
        '<|start_header_id|>user<|end_header_id|>',
        '<|image|>',
        prompt,
        '<|eot_id|>',
        '<|start_header_id|>assistant<|end_header_id|>',
      ].join(''),
      images: imgStr ? [imgStr] : undefined, // doesn't support multiple images
      max_gen_len: maxOutputLength,
    }),
  });
  const resp = await bedrockClient.send(command);

  const decoded = decoder.decode(resp.body);
  const output = TS.assertType<{
    generation: string,
    prompt_token_count?: number,
    generation_token_count?: number,
  }>(
    JSON.parse(decoded),
    val => TS.isObj(val) && typeof val.generation === 'string',
    new Error(`askLlamaJson: invalid response: ${decoded.slice(0, 200)}`),
  );

  if (output.prompt_token_count && output.prompt_token_count > 5000) {
    ErrorLogger.warn(new Error('askLlamaJson: prompt_token_count > 5000'), { prompt });
  } else if (output.generation_token_count && output.generation_token_count > 5000) {
    ErrorLogger.warn(
      new Error('askLlamaJson: generation_token_count > 5000'),
      { generation: output.generation },
    );
  }

  const parsed = JSON.parse(cleanJson(output.generation));
  return TS.assertType<{
    [K in keyof Fields]: unknown;
  }>(
    parsed,
    val => TS.isObj(val) && TS.objEntries(fields).every(pair => pair[0] in val),
    new Error(`askLlamaJson: invalid response: ${output.generation.slice(0, 200)}`),
  );
}
