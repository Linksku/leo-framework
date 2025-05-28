import askLlama from './askLlama';
import {
  StringToType,
  cleanJsonObj,
  cleanJsonArr,
  validateResponseObj,
} from './jsonHelpers';

export default async function askLlamaJson<
  Type extends string,
  Fields extends Record<string, { type: Type, description: string }>,
  ReturnArray extends boolean = false,
>({
  modelId = 'us.meta.llama3-2-11b-instruct-v1:0',
  context,
  returnArray,
  fields,
  image,
  maxOutputLength = 1024,
}: {
  modelId?: string,
  context?: string,
  returnArray?: ReturnArray,
  fields: Fields,
  image?: Buffer,
  maxOutputLength?: number,
}): Promise<
  ReturnArray extends true
    ? { [K in keyof Fields]: StringToType<Fields[K]['type']> }[]
    : { [K in keyof Fields]: StringToType<Fields[K]['type']> }
> {
  const fieldsEntries = TS.objEntries(fields);
  const format = `{${fieldsEntries.map(([key, val]) => `"${key}":${val.type}`).join(',')}}${returnArray ? '[]' : ''}`;
  const systemPrompt = [
    `Generate ${returnArray ? 'a JSON array' : 'JSON'} with the format ${format}`,
    'No text outside the JSON.',
  ].join('\n');
  const userPrompt = [
    'JSON fields:',
    ...fieldsEntries.map(([key, val]) => `${key}: ${val.description}`),
    '',
    ...(context ? [context] : []),
  ].join('\n');
  const outputPrefix = `${returnArray ? '[' : ''}{"${fieldsEntries[0][0].endsWith('?') ? '' : `${fieldsEntries[0][0]}":`}`;

  const fullOutput = await askLlama({
    modelId,
    systemPrompt,
    userPrompt,
    outputPrefix,
    image,
    maxOutputLength,
  });

  const parsed = JSON.parse(returnArray ? cleanJsonArr(fullOutput) : cleanJsonObj(fullOutput));
  return returnArray
    ? TS.assertType(
      parsed,
      arr => Array.isArray(arr) && arr.every(val => validateResponseObj(fields, val)),
      new Error(`askLlamaJson: invalid decoded: ${fullOutput.slice(0, 200)}`),
    )
    : TS.assertType(
      parsed,
      val => validateResponseObj(fields, val),
      new Error(`askLlamaJson: invalid decoded: ${fullOutput.slice(0, 200)}`),
    );
}
