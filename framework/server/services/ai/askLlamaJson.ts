import type {
  BedrockRuntimeClient as BedrockRuntimeClientType,
  InvokeModelCommand as InvokeModelCommandType,
} from '@aws-sdk/client-bedrock-runtime';
import { AWS_ACCESS_ID, AWS_BEDROCK_REGION } from 'config/serverConfig';

// import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
let bedrockClient: BedrockRuntimeClientType | null = null;
let Command: typeof InvokeModelCommandType | null = null;
let importPromise: Promise<{
  bedrockClient: BedrockRuntimeClientType,
  Command: typeof InvokeModelCommandType,
}> | null = null;

const decoder = new TextDecoder('utf-8');

function cleanJsonObj(str: string): string {
  const firstIdx = str.indexOf('{');
  const lastIdx = str.lastIndexOf('}');
  if (firstIdx === -1 || lastIdx === -1) {
    throw new Error(`detectLabels: invalid JSON: ${str}`);
  }
  return str.slice(firstIdx, lastIdx + 1);
}

function cleanJsonArr(str: string): string {
  const firstIdx = str.indexOf('[');
  const lastIdx = str.lastIndexOf(']');
  if (firstIdx === -1 || lastIdx === -1) {
    throw new Error(`detectLabels: invalid JSON: ${str}`);
  }
  return str.slice(firstIdx, lastIdx + 1);
}

function validateResponseObj(
  fields: ObjectOf<{ type: string, description: string }>,
  obj: unknown,
): boolean {
  return TS.isObj(obj)
    && TS.objEntries(fields).every(([key, desc]) => desc.type.endsWith('?') || key in obj)
    && Object.keys(obj).every(key => Object.prototype.hasOwnProperty.call(fields, key));
}

export default async function askLlamaJson<
  Fields extends ObjectOf<{ type: string, description: string }>,
  IsArray extends boolean = false,
>({
  modelId = 'us.meta.llama3-2-11b-instruct-v1:0',
  context,
  isArray,
  fields,
  image,
  maxOutputLength = 512,
}: {
  modelId?: string,
  context?: string,
  isArray?: IsArray,
  fields: Fields,
  image?: Buffer,
  maxOutputLength?: number,
}): Promise<
  IsArray extends true
    ? { [K in keyof Fields]: unknown }[]
    : { [K in keyof Fields]: unknown }
> {
  const imgStr = image?.toString('base64');
  if (imgStr && imgStr.length > 1_000_000) {
    throw new Error('askLlamaJson: image too large');
  }

  if (!bedrockClient || !Command) {
    importPromise ??= import('@aws-sdk/client-bedrock-runtime')
      .then(({ BedrockRuntimeClient, InvokeModelCommand }) => ({
        bedrockClient: new BedrockRuntimeClient({
          region: AWS_BEDROCK_REGION,
          credentials: {
            accessKeyId: AWS_ACCESS_ID,
            secretAccessKey: process.env.AWS_SECRET_KEY,
          },
        }),
        Command: InvokeModelCommand,
      }));
    ({ bedrockClient, Command } = await importPromise);
  }

  const fieldsEntries = TS.objEntries(fields);
  const format = `{${fieldsEntries.map(([key, val]) => `"${key}":${val.type}`).join(',')}}${isArray ? '[]' : ''}`;
  const prompt = [
    `Generate ${isArray ? 'a JSON array' : 'JSON'} with the format ${format}`,
    'JSON fields:',
    ...fieldsEntries.map(([key, val]) => `${key}: ${val.description}`),
    '',
    ...(context ? [context] : []),
    'No text outside the JSON.',
  ].join('\n');
  const jsonPrefix = `${isArray ? '[' : ''}{"${fieldsEntries[0][0].endsWith('?') ? '' : `${fieldsEntries[0][0]}":`}`;

  const command = new Command({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      prompt: [
        '<|begin_of_text|>',
        '<|start_header_id|>user<|end_header_id|>',
        image ? '<|image|>' : '',
        prompt,
        '<|eot_id|>',
        '<|start_header_id|>assistant<|end_header_id|>',
        jsonPrefix,
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

  const fullOutput = jsonPrefix + output.generation;
  const parsed = JSON.parse(isArray ? cleanJsonArr(fullOutput) : cleanJsonObj(fullOutput));
  return isArray
    ? TS.assertType(
      parsed,
      arr => Array.isArray(arr) && arr.every(val => validateResponseObj(fields, val)),
      new Error(`askLlamaJson: invalid decoded: ${output.generation.slice(0, 200)}`),
    )
    : TS.assertType(
      parsed,
      val => validateResponseObj(fields, val),
      new Error(`askLlamaJson: invalid decoded: ${output.generation.slice(0, 200)}`),
    );
}
