export default function getModelCacheKey<T extends ModelClass>(
  Model: T,
  key: ModelIndex<T>,
  obj: ObjectOf<any>,
): string {
  if (!process.env.PRODUCTION) {
    const invalidKey = key.find(k => obj[k] === undefined);
    if (invalidKey) {
      throw new Error(`getModelCacheKey(${Model.name}.${invalidKey}): prop is undefined`);
    }
  }
  const pairs = key.map(k => `${k}=${obj[k]}`);
  return `${Model.type}.${pairs.join(',')}`;
}
