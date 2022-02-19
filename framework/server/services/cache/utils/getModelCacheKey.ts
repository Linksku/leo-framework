export default function getModelCacheKey<T extends ModelClass>(
  Model: T,
  key: ModelIndex<T>,
  obj: ObjectOf<any>,
): string {
  if (Array.isArray(key)) {
    if (process.env.NODE_ENV !== 'production') {
      const invalidKey = key.find(k => obj[k] === undefined);
      if (invalidKey) {
        throw new Error(`getModelCacheKey(${Model.name}.${invalidKey}): prop is undefined`);
      }
    }
    const pairs = key.map(k => `${k}=${obj[k]}`);
    return `${Model.type}.${pairs.join(',')}`;
  }

  if (process.env.NODE_ENV !== 'production' && obj[key] === undefined) {
    throw new Error(`getModelCacheKey(${Model.name}.${key}): obj field is undefined`);
  }
  return `${Model.type}.${key}=${obj[key]}`;
}
