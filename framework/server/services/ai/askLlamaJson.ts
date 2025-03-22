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

type StringToType<T extends string> =
  T extends 'string' ? string
  : T extends 'string?' ? string | undefined
  : T extends 'string[]' ? string[]
  : T extends 'string[]?' ? string[] | undefined
  : T extends 'number' ? number
  : T extends 'number?' ? number | undefined
  : T extends 'number[]' ? number[]
  : T extends 'number[]?' ? number[] | undefined
  : T extends 'boolean' ? boolean
  : T extends 'boolean?' ? boolean | undefined
  : T extends 'boolean[]' ? boolean[]
  : T extends 'boolean[]?' ? boolean[] | undefined
  : unknown;

function validateResponseObj(
  fields: Record<string, { type: string, description: string }>,
  obj: unknown,
): boolean {
  if (!TS.isObj(obj)
    || !TS.objEntries(fields).every(([key, desc]) => desc.type.endsWith('?') || key in obj)
    || !Object.keys(obj).every(key => Object.prototype.hasOwnProperty.call(fields, key))) {
    return false;
  }

  for (const [key, desc] of TS.objEntries(fields)) {
    const val = obj[key];
    if (desc.type.endsWith('?') && val === undefined) {
      continue;
    }
    const type = desc.type.endsWith('?') ? desc.type.slice(0, -1) : desc.type;

    if (type === 'string' && typeof val !== 'string') {
      return false;
    }
    if (type === 'string[]'
      && (!Array.isArray(val) || !val.every(val2 => typeof val2 === 'string'))) {
      return false;
    }
    if (type === 'number' && typeof val !== 'number') {
      return false;
    }
    if (type === 'number[]'
      && (!Array.isArray(val) || !val.every(val2 => typeof val2 === 'number'))) {
      return false;
    }
    if (type === 'boolean' && typeof val !== 'boolean') {
      return false;
    }
    if (type === 'boolean[]'
      && (!Array.isArray(val) || !val.every(val2 => typeof val2 === 'boolean'))) {
      return false;
    }
  }

  return true;
}

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
