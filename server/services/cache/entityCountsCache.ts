import IntRedisCache from 'services/cache/IntRedisCache';

export default new IntRedisCache({
  redisNamespace: 'count',
  redisTtl: 10 * 60 * 1000,
  lruTtl: 60 * 1000,
  lruMaxSize: 10_000,
});
