import getModelColDataLoader, { ColVal } from 'services/dataLoader/getModelColDataLoader';
import getPartialUniqueIndex from 'utils/models/getPartialUniqueIndex';
import { redisCache } from './modelsCache';
import { getModelCacheKey } from './utils/getModelCacheKey';

export default {
  async get<T extends ModelClass>(
    rc: Nullish<RequestContext>,
    Model: T,
    partial: ModelPartial<T>,
    col: ModelKey<T>,
  ): Promise<ColVal> {
    const uniqueIndex = getPartialUniqueIndex(Model, partial);
    if (!uniqueIndex) {
      return null;
    }

    const cacheKey = getModelCacheKey(Model, uniqueIndex, partial);
    const fromRedis = await redisCache.getWithRc(
      rc,
      cacheKey,
      !Model.cacheable,
    );
    if (fromRedis !== undefined) {
      if (fromRedis === null) {
        return undefined;
      }
      return (fromRedis as ModelInstance<T>)[col] as ColVal;
    }

    return getModelColDataLoader(Model, col).load(partial);
  },
};
