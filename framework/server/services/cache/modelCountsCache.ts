import IntRedisCache from 'services/cache/IntRedisCache';

export default new IntRedisCache({
  redisNamespace: 'count',
  lruMaxSize: 10_000,
});
