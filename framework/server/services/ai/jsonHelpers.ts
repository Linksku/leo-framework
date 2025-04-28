import { jsonrepair } from 'jsonrepair';

export function cleanJsonObj(str: string): string {
  const firstIdx = str.indexOf('{');
  if (firstIdx === -1) {
    throw new Error(`cleanJsonObj: invalid JSON: ${str}`);
  }
  return jsonrepair(str.slice(firstIdx));
}

export function cleanJsonArr(str: string): string {
  const firstIdx = str.indexOf('[');
  if (firstIdx === -1) {
    throw new Error(`cleanJsonArr: invalid JSON: ${str}`);
  }
  return jsonrepair(str.slice(firstIdx));
}

export type StringToType<T extends string> =
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

export function validateResponseObj(
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
