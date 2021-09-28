import JsonRedisCache from 'services/cache/JsonRedisCache';

export default new JsonRedisCache<number[]>({
  redisNamespace: 'idArr',
  redisTtl: 10 * 60 * 1000,
  lruTtl: 60 * 1000,
  lruMaxSize: 10_000,
});
