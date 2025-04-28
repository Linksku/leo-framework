import askDeepSeek from './askDeepSeek';
import {
  StringToType,
  cleanJsonObj,
  cleanJsonArr,
  validateResponseObj,
} from './jsonHelpers';

export default async function askDeepSeekJson<
  Type extends string,
  Fields extends Record<string, { type: Type, description: string }>,
  ReturnArray extends boolean = false,
>({
  returnArray,
  fields,
  context,
  prompt,
  maxOutputLength = 1024,
}: {
  returnArray?: ReturnArray,
  fields: Fields,
  context?: string,
  prompt: string,
  maxOutputLength?: number,
}): Promise<
  ReturnArray extends true
    ? { [K in keyof Fields]: StringToType<Fields[K]['type']> }[]
    : { [K in keyof Fields]: StringToType<Fields[K]['type']> }
> {
  const fieldsEntries = TS.objEntries(fields);
  const format = `{${
    fieldsEntries
      .map(([key, val]) => `"${key}":${val.type}`)
      .join(',')
  }}${returnArray ? '[]' : ''}`;
  const systemPrompt = [
    `You are a JSON generator, only return ${returnArray ? 'a JSON array' : 'JSON'} with the format ${format}`,
    'JSON fields:',
    ...fieldsEntries.map(([key, val]) => `${key}: ${val.description}`),
    '',
    ...(context ? [context] : []),
    'No text outside the JSON.',
  ].join('\n');
  const outputPrefix = `${returnArray ? '[' : ''}{"${
    fieldsEntries[0][0].endsWith('?')
      ? ''
      : `${fieldsEntries[0][0]
  }":`}`;

  const fullOutput = await askDeepSeek({
    systemPrompt,
    userMsg: prompt,
    outputPrefix,
    maxOutputLength,
  });

  const parsed = JSON.parse(returnArray ? cleanJsonArr(fullOutput) : cleanJsonObj(fullOutput));
  return returnArray
    ? TS.assertType(
      parsed,
      arr => Array.isArray(arr) && arr.every(val => validateResponseObj(fields, val)),
      new Error(`askDeepSeekJson: invalid decoded: ${fullOutput.slice(0, 200)}`),
    )
    : TS.assertType(
      parsed,
      val => validateResponseObj(fields, val),
      new Error(`askDeepSeekJson: invalid decoded: ${fullOutput.slice(0, 200)}`),
    );
}
