import hasProp from './hasProp';

export default function getAs<T>(
  obj: Partial<Record<PropertyKey, any>>,
  prop: PropertyKey,
): T {
  if (obj === null || typeof obj !== 'object') {
    throw new Error('getAs: obj isn\'t an object.');
  }
  if (!hasProp(obj, prop)) {
    throw new Error(`getAs: prop "${String(prop)}" is missing.`);
  }
  return obj[prop] as T;
}
