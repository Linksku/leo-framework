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

export default async function askLlama({
  modelId = 'us.meta.llama3-2-11b-instruct-v1:0',
  prompt,
  outputPrefix,
  image,
  maxOutputLength = 512,
}: {
  modelId?: string,
  prompt: string,
  outputPrefix?: string,
  image?: Buffer,
  maxOutputLength?: number,
}): Promise<string> {
  const imgStr = image?.toString('base64');
  if (imgStr && imgStr.length > 1_000_000) {
    throw new Error('askLlama: image too large');
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
        outputPrefix,
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
    new Error(`askLlama: invalid response: ${decoded.slice(0, 200)}`),
  );

  if (output.prompt_token_count && output.prompt_token_count > 5000) {
    ErrorLogger.warn(new Error('askLlamaJson: prompt_token_count > 5000'), { prompt });
  } else if (output.generation_token_count
      && output.generation_token_count > 5000
      && output.generation_token_count > maxOutputLength) {
    ErrorLogger.warn(
      new Error('askLlamaJson: generation_token_count > 5000'),
      { generation: output.generation },
    );
  }

  return outputPrefix + output.generation;
}
