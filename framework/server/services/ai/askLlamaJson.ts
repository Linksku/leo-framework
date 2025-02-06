import askLlama from './askLlama';

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
  ReturnArray extends boolean = false,
>({
  modelId = 'us.meta.llama3-2-11b-instruct-v1:0',
  context,
  returnArray,
  fields,
  image,
  maxOutputLength = 512,
}: {
  modelId?: string,
  context?: string,
  returnArray?: ReturnArray,
  fields: Fields,
  image?: Buffer,
  maxOutputLength?: number,
}): Promise<
  ReturnArray extends true
    ? { [K in keyof Fields]: unknown }[]
    : { [K in keyof Fields]: unknown }
> {
  const fieldsEntries = TS.objEntries(fields);
  const format = `{${fieldsEntries.map(([key, val]) => `"${key}":${val.type}`).join(',')}}${returnArray ? '[]' : ''}`;
  const prompt = [
    `Generate ${returnArray ? 'a JSON array' : 'JSON'} with the format ${format}`,
    'JSON fields:',
    ...fieldsEntries.map(([key, val]) => `${key}: ${val.description}`),
    '',
    ...(context ? [context] : []),
    'No text outside the JSON.',
  ].join('\n');
  const outputPrefix = `${returnArray ? '[' : ''}{"${fieldsEntries[0][0].endsWith('?') ? '' : `${fieldsEntries[0][0]}":`}`;

  const fullOutput = await askLlama({
    modelId,
    prompt,
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
