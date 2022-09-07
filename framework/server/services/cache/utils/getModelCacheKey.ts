export function getModelCacheKey<T extends ModelClass>(
  Model: T,
  index: ModelIndex<T>,
  obj: ObjectOf<any>,
): string {
  if (!process.env.PRODUCTION) {
    const invalidKey = index.find(k => obj[k] === undefined);
    if (invalidKey) {
      throw new Error(`getModelCacheKey(${Model.name}.${invalidKey}): prop is undefined`);
    }
  }

  const pairs = index.map(k => `${k}=${obj[k]}`);
  return `${Model.type}.${pairs.join(',')}`;
}

export function getModelIdsCacheKey<T extends ModelClass>(
  Model: T,
  partial: ModelPartial<T>,
): string {
  const keys = TS.objKeys(partial).sort();
  if (!process.env.PRODUCTION) {
    const undefinedKey = keys.find(k => partial[k] === undefined);
    if (undefinedKey) {
      throw new Error(`getModelIdsCacheKey(${Model.name}.${undefinedKey}): prop is undefined`);
    }

    const nonNumKey = keys.find(k => partial[k] === undefined);
    if (nonNumKey) {
      throw new Error(`getModelIdsCacheKey(${Model.name}.${nonNumKey}): prop isn't number`);
    }
  }

  return `${Model.type}.${keys.map(k => `${k}=${partial[k]}`).join(',')}`;
}
