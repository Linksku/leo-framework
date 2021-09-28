export default function getProperty<T extends any>(
  obj: any,
  key: string | number,
): T | undefined {
  if (obj === null || typeof obj !== 'object') {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(`getProperty: obj isn't an object.`);
    }

    return undefined;
  }
  return obj[key];
}
