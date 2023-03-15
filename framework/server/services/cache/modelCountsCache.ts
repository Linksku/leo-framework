import IntRedisCache from 'services/cache/IntRedisCache';
import { MODEL_COUNT } from 'consts/coreRedisNamespaces';

export default new IntRedisCache({
  redisNamespace: MODEL_COUNT,
  lruMaxSize: 10_000,
});
